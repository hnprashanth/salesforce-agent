# Salesforce Agent Backend

AWS SAM serverless backend for the Salesforce Agent application.

## Architecture

This backend consists of:
- **Chat Function**: Handles AI-powered chat interactions
- **Salesforce Auth Function**: Manages OAuth authentication with Salesforce
- **Opportunity Function**: CRUD operations for Salesforce opportunity records
- **Shared Dependencies Layer**: Common utilities and dependencies

## Prerequisites

- AWS CLI configured
- AWS SAM CLI installed
- Node.js 18.x
- Salesforce developer account with connected app

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in AWS Systems Manager Parameter Store or Secrets Manager:
- `OPENAI_API_KEY`: Your OpenAI API key
- `SALESFORCE_CLIENT_ID`: Salesforce connected app client ID
- `SALESFORCE_CLIENT_SECRET`: Salesforce connected app client secret
- `SALESFORCE_INSTANCE_URL`: Your Salesforce instance URL

## Development

### Local Development
```bash
# Build the application
sam build

# Start local API
sam local start-api

# Run with environment variables
sam local start-api --env-vars env.json
```

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Linting
```bash
# Check code style
npm run lint

# Fix linting issues
npm run lint:fix
```

## Deployment

### Deploy to AWS
```bash
# Deploy with guided prompts (first time)
sam deploy --guided

# Deploy with existing configuration
sam deploy

# Deploy to specific environment
sam deploy --config-env staging
```

### Environment-specific Deployments
```bash
# Development
sam deploy --config-env dev

# Staging
sam deploy --config-env staging

# Production
sam deploy --config-env prod
```

## API Endpoints

### Chat
- `POST /chat` - Send message to AI agent

### Authentication
- `GET /auth/salesforce/authorize` - Start Salesforce OAuth flow
- `GET /auth/salesforce/callback` - Handle OAuth callback

### Opportunities
- `GET /opportunities` - List opportunities
- `POST /opportunities` - Create new opportunity
- `PUT /opportunities/{id}` - Update opportunity

## Configuration

### samconfig.toml
Environment-specific configuration is managed in `samconfig.toml`:
- `dev`: Development environment with debug logging
- `staging`: Staging environment with info logging
- `prod`: Production environment with warn logging

### template.yaml
Main SAM template defining:
- Lambda functions and their configurations
- API Gateway setup with CORS
- Cognito User Pool for authentication
- CloudWatch Log Groups with retention policies
- Environment-specific parameters

## Monitoring

CloudWatch logs are automatically configured for all Lambda functions with 7-day retention. You can view logs using:

```bash
# Tail logs for chat function
sam logs -n ChatFunction --stack-name salesforce-agent --tail

# View logs for specific time range
sam logs -n ChatFunction --stack-name salesforce-agent --start-time 2024-01-01T00:00:00 --end-time 2024-01-02T00:00:00
```

## Security

- All functions use AWS X-Ray for distributed tracing
- Sensitive configuration stored in AWS Secrets Manager
- CORS configured for frontend integration
- Cognito authentication for protected endpoints
- CloudWatch logging for audit trails

## Troubleshooting

### Common Issues

1. **OpenAI API errors**: Verify API key is set correctly
2. **Salesforce connection issues**: Check OAuth credentials and redirect URLs
3. **CORS errors**: Ensure frontend domain is properly configured
4. **Permission errors**: Verify IAM roles have necessary permissions

### Debugging

1. Check CloudWatch logs for error details
2. Use `sam local start-api` for local debugging
3. Enable debug logging by setting `LogLevel=debug`
4. Use AWS X-Ray for distributed tracing analysis