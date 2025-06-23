const { handler } = require('../src/functions/chat/index');

// Mock OpenAI
jest.mock('openai', () => {
    return jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: jest.fn().mockResolvedValue({
                    choices: [{
                        message: {
                            content: 'Test response from AI'
                        }
                    }]
                })
            }
        }
    }));
});

describe('Chat Function', () => {
    beforeEach(() => {
        process.env.OPENAI_API_KEY = 'test-api-key';
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should handle OPTIONS request', async () => {
        const event = {
            httpMethod: 'OPTIONS'
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(200);
        expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
    });

    test('should handle POST request with valid message', async () => {
        const event = {
            httpMethod: 'POST',
            body: JSON.stringify({
                message: 'Hello, how can you help me with Salesforce?'
            })
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.message).toBe('Test response from AI');
        expect(body.conversationId).toBeDefined();
        expect(body.timestamp).toBeDefined();
    });

    test('should return 400 for request without message', async () => {
        const event = {
            httpMethod: 'POST',
            body: JSON.stringify({})
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(400);
        const body = JSON.parse(result.body);
        expect(body.error).toBe('Message is required');
    });

    test('should handle malformed JSON in request body', async () => {
        const event = {
            httpMethod: 'POST',
            body: 'invalid json'
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(500);
        const body = JSON.parse(result.body);
        expect(body.error).toBe('Internal server error');
    });
});