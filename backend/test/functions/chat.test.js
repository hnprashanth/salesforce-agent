// Set environment variables first
process.env.SESSION_TABLE_NAME = 'test-sessions';
process.env.OPENAI_API_KEY = 'test-key';

// Mock AWS SDK and OpenAI
jest.mock('aws-sdk', () => ({
  DynamoDB: {
    DocumentClient: jest.fn(() => ({
      get: jest.fn(() => ({
        promise: jest.fn(() => Promise.resolve({ Item: null }))
      }))
    }))
  },
  KMS: jest.fn(() => ({
    decrypt: jest.fn(() => ({
      promise: jest.fn(() => Promise.resolve({
        Plaintext: Buffer.from(JSON.stringify({ type: 'user_session' }))
      }))
    }))
  }))
}));

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(() => Promise.resolve({
          choices: [{
            message: {
              content: 'This is a test AI response providing sales insights.'
            }
          }]
        }))
      }
    }
  }));
});

jest.mock('axios', () => ({
  get: jest.fn()
}));


const { handler } = require('../../src/functions/chat/index');

describe('AI Chat Lambda Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should handle OPTIONS request (CORS)', async () => {
    const event = {
      httpMethod: 'OPTIONS'
    };

    const response = await handler(event);
    
    expect(response.statusCode).toBe(200);
    expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
  });

  test('should return error for missing message', async () => {
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({})
    };

    const response = await handler(event);
    
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Message is required');
  });

  test('should process message without session', async () => {
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({
        message: 'What are some general sales tips?'
      })
    };

    const response = await handler(event);
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.response).toBe('This is a test AI response providing sales insights.');
    expect(body.contextUsed).toBe(false);
    expect(body.suggestedActions).toBeDefined();
    expect(body.timestamp).toBeDefined();
  });

  test('should process message with session but no opportunity', async () => {
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({
        message: 'Help me with this deal',
        sessionId: 'test-session-123'
      })
    };

    const response = await handler(event);
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.response).toBe('This is a test AI response providing sales insights.');
    expect(body.contextUsed).toBe(false);
  });

  test('should return AI response with action detection', async () => {
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({
        message: 'What should I do next with this opportunity?'
      })
    };

    const response = await handler(event);
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.response).toBe('This is a test AI response providing sales insights.');
    expect(body.suggestedActions).toBeDefined();
    expect(Array.isArray(body.suggestedActions)).toBe(true);
  });

  test('should handle malformed JSON', async () => {
    const event = {
      httpMethod: 'POST',
      body: 'invalid json'
    };

    const response = await handler(event);
    
    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Internal server error');
  });
});