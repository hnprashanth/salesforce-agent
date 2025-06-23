import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as Backend from '../lib/backend-stack';

describe('Backend Stack', () => {
  let app: cdk.App;
  let stack: Backend.BackendStack;
  let template: Template;

  beforeAll(() => {
    app = new cdk.App();
    stack = new Backend.BackendStack(app, 'MyTestStack');
    template = Template.fromStack(stack);
  });

  test('Lambda Functions Created', () => {
    // 3 main functions + log retention functions
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs18.x',
      Handler: 'index.handler',
    });
  });

  test('API Gateway Created', () => {
    template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
    
    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
      Name: 'Salesforce Agent API',
    });
  });

  test('Lambda Layer Created', () => {
    template.resourceCountIs('AWS::Lambda::LayerVersion', 1);
    
    template.hasResourceProperties('AWS::Lambda::LayerVersion', {
      CompatibleRuntimes: ['nodejs18.x'],
    });
  });

  test('API Endpoints Created', () => {
    template.hasResourceProperties('AWS::ApiGateway::Resource', {
      PathPart: 'auth',
    });
    
    template.hasResourceProperties('AWS::ApiGateway::Resource', {
      PathPart: 'salesforce',
    });
    
    template.hasResourceProperties('AWS::ApiGateway::Resource', {
      PathPart: 'login',
    });
    
    template.hasResourceProperties('AWS::ApiGateway::Resource', {
      PathPart: 'callback',
    });
    
    template.hasResourceProperties('AWS::ApiGateway::Resource', {
      PathPart: 'chat',
    });
    
    template.hasResourceProperties('AWS::ApiGateway::Resource', {
      PathPart: 'opportunities',
    });
  });

  test('CloudWatch Log Retention Configured', () => {
    // Check that log retention custom resources exist
    template.hasResourceProperties('Custom::LogRetention', {
      RetentionInDays: 7
    });
  });

  test('DynamoDB Table Created', () => {
    template.resourceCountIs('AWS::DynamoDB::Table', 1);
    
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'salesforce-agent-sessions',
      BillingMode: 'PAY_PER_REQUEST',
    });
  });

  test('KMS Key Created', () => {
    template.resourceCountIs('AWS::KMS::Key', 1);
    
    template.hasResourceProperties('AWS::KMS::Key', {
      Description: 'KMS key for encrypting OAuth tokens',
      EnableKeyRotation: true,
    });
  });
});
