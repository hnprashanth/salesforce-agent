import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import * as path from 'path';

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Environment-specific parameters
    const environment = this.node.tryGetContext('environment') || 'dev';
    const isProduction = environment === 'prod';

    // Create KMS key for encryption
    const encryptionKey = new kms.Key(this, 'EncryptionKey', {
      description: 'KMS key for encrypting sensitive data',
      enableKeyRotation: true,
      keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
      keySpec: kms.KeySpec.SYMMETRIC_DEFAULT,
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Create Secrets Manager secrets for API keys and credentials
    const salesforceCredentials = new secretsmanager.Secret(this, 'SalesforceCredentials', {
      secretName: `salesforce-agent/${environment}/salesforce-credentials`,
      description: 'Salesforce OAuth credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          clientId: '',
          clientSecret: '',
          redirectUri: ''
        }),
        generateStringKey: 'placeholder',
        excludeCharacters: '"@/\\',
      },
      encryptionKey: encryptionKey,
    });

    const openaiCredentials = new secretsmanager.Secret(this, 'OpenAICredentials', {
      secretName: `salesforce-agent/${environment}/openai-credentials`,
      description: 'OpenAI API credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          apiKey: ''
        }),
        generateStringKey: 'placeholder',
        excludeCharacters: '"@/\\',
      },
      encryptionKey: encryptionKey,
    });

    const jwtSecret = new secretsmanager.Secret(this, 'JWTSecret', {
      secretName: `salesforce-agent/${environment}/jwt-secret`,
      description: 'JWT signing secret',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: 'secret',
        passwordLength: 64,
        excludeCharacters: '"@/\\',
      },
      encryptionKey: encryptionKey,
    });

    // Create DynamoDB tables
    const sessionTable = new dynamodb.Table(this, 'SessionTable', {
      tableName: `salesforce-agent-sessions-${environment}`,
      partitionKey: {
        name: 'sessionId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: encryptionKey,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: isProduction,
      },
      timeToLiveAttribute: 'expiresAt',
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    const cacheTable = new dynamodb.Table(this, 'CacheTable', {
      tableName: `salesforce-agent-cache-${environment}`,
      partitionKey: {
        name: 'key',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: encryptionKey,
      timeToLiveAttribute: 'ttl',
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    const chatHistoryTable = new dynamodb.Table(this, 'ChatHistoryTable', {
      tableName: `salesforce-agent-chat-history-${environment}`,
      partitionKey: {
        name: 'sessionId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.NUMBER,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: encryptionKey,
      timeToLiveAttribute: 'expiresAt',
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Add Global Secondary Index for chat history queries
    chatHistoryTable.addGlobalSecondaryIndex({
      indexName: 'UserSessionIndex',
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.NUMBER,
      },
    });

    // Create shared layer for common dependencies
    const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../src/layers/shared')),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      description: 'Shared dependencies for Lambda functions',
    });

    // Create enhanced IAM role for Lambda functions
    const lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        DynamoDBAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan',
              ],
              resources: [
                sessionTable.tableArn,
                cacheTable.tableArn,
                chatHistoryTable.tableArn,
                `${chatHistoryTable.tableArn}/index/*`,
              ],
            }),
          ],
        }),
        SecretsManagerAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'secretsmanager:GetSecretValue',
              ],
              resources: [
                salesforceCredentials.secretArn,
                openaiCredentials.secretArn,
                jwtSecret.secretArn,
              ],
            }),
          ],
        }),
        KMSAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'kms:Decrypt',
                'kms:DescribeKey',
              ],
              resources: [encryptionKey.keyArn],
            }),
          ],
        }),
      },
    });

    // Create Lambda function for Salesforce authentication
    const salesforceAuthFunction = new lambda.Function(this, 'SalesforceAuthFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../src/functions/salesforce-auth')),
      handler: 'index.handler',
      environment: {
        NODE_ENV: environment,
        SESSION_TABLE_NAME: sessionTable.tableName,
        KMS_KEY_ID: encryptionKey.keyId,
        SALESFORCE_CREDENTIALS_SECRET: salesforceCredentials.secretName,
        JWT_SECRET_NAME: jwtSecret.secretName,
      },
      layers: [sharedLayer],
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      role: lambdaExecutionRole,
      logRetention: isProduction ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
    });

    // Create Lambda function for AI Chat
    const chatFunction = new lambda.Function(this, 'ChatFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../src/functions/chat')),
      handler: 'index.handler',
      environment: {
        NODE_ENV: environment,
        SESSION_TABLE_NAME: sessionTable.tableName,
        CACHE_TABLE_NAME: cacheTable.tableName,
        CHAT_HISTORY_TABLE_NAME: chatHistoryTable.tableName,
        OPENAI_CREDENTIALS_SECRET: openaiCredentials.secretName,
      },
      layers: [sharedLayer],
      timeout: cdk.Duration.seconds(60),
      memorySize: 1024,
      role: lambdaExecutionRole,
      logRetention: isProduction ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
    });

    // Create Lambda function for Opportunity management
    const opportunityFunction = new lambda.Function(this, 'OpportunityFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../src/functions/opportunity')),
      handler: 'index.handler',
      environment: {
        NODE_ENV: environment,
        SESSION_TABLE_NAME: sessionTable.tableName,
        CACHE_TABLE_NAME: cacheTable.tableName,
        SALESFORCE_CREDENTIALS_SECRET: salesforceCredentials.secretName,
      },
      layers: [sharedLayer],
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      role: lambdaExecutionRole,
      logRetention: isProduction ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
    });

    // Create Lambda function for Account management
    const accountFunction = new lambda.Function(this, 'AccountFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../src/functions/account')),
      handler: 'index.handler',
      environment: {
        NODE_ENV: environment,
        SESSION_TABLE_NAME: sessionTable.tableName,
        CACHE_TABLE_NAME: cacheTable.tableName,
        SALESFORCE_CREDENTIALS_SECRET: salesforceCredentials.secretName,
      },
      layers: [sharedLayer],
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      role: lambdaExecutionRole,
      logRetention: isProduction ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
    });

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'SalesforceAgentApi', {
      restApiName: `Salesforce Agent API - ${environment}`,
      description: `API for Salesforce Agent backend (${environment})`,
      deployOptions: {
        stageName: environment,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: !isProduction,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
      },
    });

    // Create API endpoints
    const authResource = api.root.addResource('auth');
    const salesforceAuthResource = authResource.addResource('salesforce');
    
    // OAuth endpoints
    const loginResource = salesforceAuthResource.addResource('login');
    loginResource.addMethod('GET', new apigateway.LambdaIntegration(salesforceAuthFunction));
    
    const callbackResource = salesforceAuthResource.addResource('callback');
    callbackResource.addMethod('GET', new apigateway.LambdaIntegration(salesforceAuthFunction));
    
    const refreshResource = salesforceAuthResource.addResource('refresh');
    refreshResource.addMethod('POST', new apigateway.LambdaIntegration(salesforceAuthFunction));
    
    const logoutResource = salesforceAuthResource.addResource('logout');
    logoutResource.addMethod('POST', new apigateway.LambdaIntegration(salesforceAuthFunction));

    const chatResource = api.root.addResource('chat');
    chatResource.addMethod('POST', new apigateway.LambdaIntegration(chatFunction));

    // API endpoints
    const apiResource = api.root.addResource('api');
    
    // Opportunity endpoints
    const opportunityResource = apiResource.addResource('opportunity');
    const opportunityIdResource = opportunityResource.addResource('{id}');
    opportunityIdResource.addMethod('GET', new apigateway.LambdaIntegration(opportunityFunction));
    opportunityIdResource.addMethod('PUT', new apigateway.LambdaIntegration(opportunityFunction));
    
    const opportunitiesResource = apiResource.addResource('opportunities');
    opportunitiesResource.addMethod('GET', new apigateway.LambdaIntegration(opportunityFunction));
    
    // Account endpoints
    const accountResource = apiResource.addResource('account');
    const accountIdResource = accountResource.addResource('{id}');
    const accountHistoryResource = accountIdResource.addResource('history');
    accountHistoryResource.addMethod('GET', new apigateway.LambdaIntegration(accountFunction));

    // Create SNS topic for alerts
    const alertTopic = new sns.Topic(this, 'AlertTopic', {
      topicName: `salesforce-agent-alerts-${environment}`,
      displayName: `Salesforce Agent Alerts (${environment})`,
    });

    // Create CloudWatch Dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'SalesforceAgentDashboard', {
      dashboardName: `SalesforceAgent-${environment}`,
    });

    // Add widgets to dashboard
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Gateway Requests',
        left: [
          api.metricCount(),
          api.metricLatency(),
        ],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'Lambda Function Metrics',
        left: [
          salesforceAuthFunction.metricInvocations(),
          chatFunction.metricInvocations(),
          opportunityFunction.metricInvocations(),
          accountFunction.metricInvocations(),
        ],
        right: [
          salesforceAuthFunction.metricErrors(),
          chatFunction.metricErrors(),
          opportunityFunction.metricErrors(),
          accountFunction.metricErrors(),
        ],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'DynamoDB Metrics',
        left: [
          sessionTable.metricConsumedReadCapacityUnits(),
          cacheTable.metricConsumedReadCapacityUnits(),
          chatHistoryTable.metricConsumedReadCapacityUnits(),
        ],
        right: [
          sessionTable.metricConsumedWriteCapacityUnits(),
          cacheTable.metricConsumedWriteCapacityUnits(),
          chatHistoryTable.metricConsumedWriteCapacityUnits(),
        ],
        width: 12,
        height: 6,
      })
    );

    // Create CloudWatch Alarms
    const apiErrorAlarm = new cloudwatch.Alarm(this, 'ApiErrorAlarm', {
      metric: api.metricClientError({
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10,
      evaluationPeriods: 2,
      alarmDescription: 'API Gateway client errors',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    const lambdaErrorAlarm = new cloudwatch.Alarm(this, 'LambdaErrorAlarm', {
      metric: new cloudwatch.MathExpression({
        expression: 'm1 + m2 + m3 + m4',
        usingMetrics: {
          m1: salesforceAuthFunction.metricErrors(),
          m2: chatFunction.metricErrors(),
          m3: opportunityFunction.metricErrors(),
          m4: accountFunction.metricErrors(),
        },
        period: cdk.Duration.minutes(5),
      }),
      threshold: 5,
      evaluationPeriods: 2,
      alarmDescription: 'Lambda function errors',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Add alarm actions
    apiErrorAlarm.addAlarmAction({
      bind: () => ({ alarmActionArn: alertTopic.topicArn }),
    });
    lambdaErrorAlarm.addAlarmAction({
      bind: () => ({ alarmActionArn: alertTopic.topicArn }),
    });

    // Output important values
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL',
    });

    new cdk.CfnOutput(this, 'SalesforceCredentialsSecret', {
      value: salesforceCredentials.secretName,
      description: 'Salesforce credentials secret name',
    });

    new cdk.CfnOutput(this, 'OpenAICredentialsSecret', {
      value: openaiCredentials.secretName,
      description: 'OpenAI credentials secret name',
    });

    new cdk.CfnOutput(this, 'AlertTopicArn', {
      value: alertTopic.topicArn,
      description: 'SNS topic ARN for alerts',
    });
  }
}