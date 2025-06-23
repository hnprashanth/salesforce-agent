# Local Development Setup

## Running Lambda Functions Locally

### Using SAM CLI for Local Testing

Although we're using CDK, you can still use SAM CLI for local testing:

1. Generate SAM template from CDK:
   ```bash
   npx cdk synth --no-staging > template.yaml
   ```

2. Start local API:
   ```bash
   sam local start-api
   ```

### Environment Configuration

Create a `.env.local` file for local development:
```
SALESFORCE_CLIENT_ID=your_client_id
SALESFORCE_CLIENT_SECRET=your_client_secret
SALESFORCE_INSTANCE_URL=https://your-instance.salesforce.com
OPENAI_API_KEY=your_openai_key
```

### Testing Functions Individually

Test Lambda functions directly:
```bash
# Test chat function
node -e "require('./src/functions/chat/index').handler({body: JSON.stringify({message: 'test'})}).then(console.log)"

# Test with SAM
sam local invoke ChatFunction --event events/chat-event.json
```

## Development Workflow

1. Make changes to Lambda function code
2. Run `npm run build` to compile TypeScript
3. Test locally using SAM or direct node execution
4. Run unit tests: `npm test`
5. Deploy to AWS: `npx cdk deploy`