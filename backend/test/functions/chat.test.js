const { handler } = require('../../src/functions/chat/index');

describe('Chat Lambda Function', () => {
  test('should return echo response', async () => {
    const event = {
      body: JSON.stringify({
        message: 'Hello, world!',
        context: {}
      })
    };

    const response = await handler(event);
    
    expect(response.statusCode).toBe(200);
    expect(response.headers['Content-Type']).toBe('application/json');
    expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
    
    const body = JSON.parse(response.body);
    expect(body.response).toBe('Echo: Hello, world!');
    expect(body.timestamp).toBeDefined();
  });

  test('should handle empty message', async () => {
    const event = {
      body: JSON.stringify({})
    };

    const response = await handler(event);
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.response).toBe('Echo: No message provided');
  });

  test('should handle malformed JSON', async () => {
    const event = {
      body: 'invalid json'
    };

    const response = await handler(event);
    
    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Internal server error');
  });
});