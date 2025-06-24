import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create KMS key for token encryption
    const tokenEncryptionKey = new kms.Key(this, 'TokenEncryptionKey', {
      description: 'KMS key for encrypting OAuth tokens',
      enableKeyRotation: true,
      keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
      keySpec: kms.KeySpec.SYMMETRIC_DEFAULT,
    });

    // Create DynamoDB table for session management
    const sessionTable = new dynamodb.Table(this, 'SessionTable', {
      tableName: 'salesforce-agent-sessions',
      partitionKey: {
        name: 'sessionId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      timeToLiveAttribute: 'expiresAt',
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
    });

    // Create shared layer for common dependencies
    const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../src/layers/shared')),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      description: 'Shared dependencies for Lambda functions',
    });

    // Create Lambda function for Salesforce authentication
    const salesforceAuthFunction = new lambda.Function(this, 'SalesforceAuthFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../src/functions/salesforce-auth')),
      handler: 'index.handler',
      environment: {
        NODE_ENV: 'production',
        SESSION_TABLE_NAME: sessionTable.tableName,
        KMS_KEY_ID: tokenEncryptionKey.keyId,
        SALESFORCE_CLIENT_ID: process.env.SALESFORCE_CLIENT_ID || '',
        SALESFORCE_CLIENT_SECRET: process.env.SALESFORCE_CLIENT_SECRET || '',
        SALESFORCE_REDIRECT_URI: process.env.SALESFORCE_REDIRECT_URI || '',
      },
      layers: [sharedLayer],
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Create Lambda function for AI Chat
    const chatFunction = new lambda.Function(this, 'ChatFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../src/functions/chat')),
      handler: 'index.handler',
      environment: {
        NODE_ENV: 'production',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
        SESSION_TABLE_NAME: sessionTable.tableName,
      },
      layers: [sharedLayer],
      timeout: cdk.Duration.seconds(60),
      memorySize: 1024,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Create Lambda function for Opportunity management
    const opportunityFunction = new lambda.Function(this, 'OpportunityFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../src/functions/opportunity')),
      handler: 'index.handler',
      environment: {
        NODE_ENV: 'production',
      },
      layers: [sharedLayer],
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'SalesforceAgentApi', {
      restApiName: 'Salesforce Agent API',
      description: 'API for Salesforce Agent backend',
      deployOptions: {
        stageName: 'prod',
        // Disable stage logging to avoid CloudWatch role error
        loggingLevel: apigateway.MethodLoggingLevel.OFF,
        dataTraceEnabled: false,
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

    // Grant permissions to Lambda functions
    sessionTable.grantReadWriteData(salesforceAuthFunction);
    sessionTable.grantReadData(chatFunction);
    tokenEncryptionKey.grantEncryptDecrypt(salesforceAuthFunction);

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

    const opportunityResource = api.root.addResource('opportunities');
    opportunityResource.addMethod('GET', new apigateway.LambdaIntegration(opportunityFunction));
    opportunityResource.addMethod('POST', new apigateway.LambdaIntegration(opportunityFunction));
    opportunityResource.addMethod('PUT', new apigateway.LambdaIntegration(opportunityFunction));

    // Output the API URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });
  }
}
