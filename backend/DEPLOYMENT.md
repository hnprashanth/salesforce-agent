# AWS CDK Deployment Guide

This guide covers the deployment of the Salesforce Agent AWS infrastructure using CDK.

## Prerequisites

1. **AWS CLI configured** with appropriate credentials
2. **Node.js 18+** installed
3. **AWS CDK CLI** installed globally: `npm install -g aws-cdk`
4. **AWS account** with sufficient permissions

## Environment Setup

The infrastructure supports three environments:
- `dev` - Development environment
- `staging` - Staging environment  
- `prod` - Production environment

### Bootstrap CDK (One-time setup)

```bash
cd backend
npm run bootstrap
```

## Deployment Commands

### Development Environment
```bash
npm run deploy:dev
```

### Staging Environment
```bash
npm run deploy:staging
```

### Production Environment
```bash
npm run deploy:prod
```

## Infrastructure Components

### ✅ Completed Components

#### DynamoDB Tables
- **SessionTable**: Stores user session data with TTL
- **CacheTable**: Caches Salesforce data to reduce API calls
- **ChatHistoryTable**: Stores chat conversation history

#### Secrets Manager
- **SalesforceCredentials**: OAuth client ID, secret, redirect URI
- **OpenAICredentials**: OpenAI API key
- **JWTSecret**: JWT signing secret

#### Lambda Functions
- **SalesforceAuthFunction**: Handles OAuth flow
- **ChatFunction**: AI chat processing
- **OpportunityFunction**: Salesforce opportunity operations
- **AccountFunction**: Salesforce account operations

#### API Gateway
- RESTful API with CORS enabled
- Environment-specific endpoints
- Logging and metrics enabled

#### CloudWatch Monitoring
- **Dashboard**: Real-time metrics visualization
- **Alarms**: Error rate monitoring
- **Logs**: Centralized logging with retention policies

#### Security
- **KMS Encryption**: Customer-managed keys for data encryption
- **IAM Roles**: Least privilege access principles
- **VPC**: Optional VPC deployment for enhanced security

## Configuration

### Required Secrets Configuration

After deployment, configure the following secrets in AWS Secrets Manager:

#### 1. Salesforce Credentials
```bash
aws secretsmanager update-secret \
  --secret-id "salesforce-agent/dev/salesforce-credentials" \
  --secret-string '{
    "clientId": "your-salesforce-client-id",
    "clientSecret": "your-salesforce-client-secret", 
    "redirectUri": "https://your-api-url/auth/salesforce/callback"
  }'
```

#### 2. OpenAI Credentials
```bash
aws secretsmanager update-secret \
  --secret-id "salesforce-agent/dev/openai-credentials" \
  --secret-string '{
    "apiKey": "your-openai-api-key"
  }'
```

### Environment Variables

The following environment variables are automatically configured:
- `NODE_ENV`: Environment name (dev/staging/prod)
- `SESSION_TABLE_NAME`: DynamoDB session table name
- `CACHE_TABLE_NAME`: DynamoDB cache table name
- `CHAT_HISTORY_TABLE_NAME`: DynamoDB chat history table name
- `KMS_KEY_ID`: KMS key for encryption
- `SALESFORCE_CREDENTIALS_SECRET`: Salesforce credentials secret name
- `OPENAI_CREDENTIALS_SECRET`: OpenAI credentials secret name
- `JWT_SECRET_NAME`: JWT secret name

## Monitoring & Alerts

### CloudWatch Dashboard
Access the dashboard via the output URL after deployment:
```
https://console.aws.amazon.com/cloudwatch/home#dashboards:name=SalesforceAgent-{environment}
```

### Available Metrics
- **API Gateway**: Request count, latency, error rates
- **Lambda Functions**: Invocations, errors, duration
- **DynamoDB**: Read/write capacity, throttling

### Alerts
- **API Error Alarm**: Triggers on high client error rates
- **Lambda Error Alarm**: Triggers on function errors
- **SNS Topic**: Sends alerts to configured endpoints

## Security Best Practices

### Implemented Security Features
- ✅ **Encryption at Rest**: All DynamoDB tables encrypted with customer-managed KMS keys
- ✅ **Encryption in Transit**: HTTPS/TLS for all API communications
- ✅ **Secrets Management**: API keys stored in AWS Secrets Manager
- ✅ **IAM Least Privilege**: Functions have minimal required permissions
- ✅ **Key Rotation**: KMS keys configured for automatic rotation

### Additional Security Recommendations
- Configure SNS topic email subscriptions for alerts
- Set up VPC endpoints for enhanced network security
- Enable AWS CloudTrail for audit logging
- Configure AWS Config for compliance monitoring

## Cost Optimization

### Pay-per-Request Resources
- **DynamoDB**: Billed only for actual usage
- **Lambda**: Billed per invocation and duration
- **API Gateway**: Billed per request

### Cost Monitoring
- CloudWatch dashboard includes cost-related metrics
- Set up billing alerts for cost control
- Use AWS Cost Explorer for detailed cost analysis

## Troubleshooting

### Common Issues

#### 1. Deployment Failures
```bash
# Check CDK diff before deployment
npm run diff:dev

# Verify AWS credentials
aws sts get-caller-identity
```

#### 2. Lambda Function Errors
```bash
# View function logs
aws logs tail /aws/lambda/BackendStack-ChatFunction --follow
```

#### 3. API Gateway Issues
```bash
# Test API endpoint
curl -X GET https://your-api-url/api/opportunities
```

### Rollback Procedure
```bash
# Destroy environment (be careful with prod!)
npm run destroy:dev
```

## Maintenance

### Regular Tasks
- **Monitor CloudWatch alarms**
- **Review Lambda function performance**
- **Update dependencies** in package.json
- **Rotate API keys** in Secrets Manager
- **Review cost reports**

### Updates
```bash
# Deploy updates
npm run deploy:dev

# Check differences before prod deployment
npm run diff:prod
```