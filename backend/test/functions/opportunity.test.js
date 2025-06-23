const { handler } = require('../../src/functions/opportunity/index');

describe('Opportunity Lambda Function', () => {
  test('should handle GET request', async () => {
    const event = {
      httpMethod: 'GET',
      body: null
    };

    const response = await handler(event);
    
    expect(response.statusCode).toBe(200);
    expect(response.headers['Content-Type']).toBe('application/json');
    expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
    
    const body = JSON.parse(response.body);
    expect(body.opportunities).toEqual([]);
    expect(body.message).toBe('Get opportunities endpoint');
  });

  test('should handle POST request', async () => {
    const opportunityData = {
      name: 'Test Opportunity',
      amount: 50000
    };

    const event = {
      httpMethod: 'POST',
      body: JSON.stringify(opportunityData)
    };

    const response = await handler(event);
    
    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Create opportunity endpoint');
    expect(body.data).toEqual(opportunityData);
  });

  test('should handle PUT request', async () => {
    const updateData = {
      id: '123',
      amount: 75000
    };

    const event = {
      httpMethod: 'PUT',
      body: JSON.stringify(updateData)
    };

    const response = await handler(event);
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Update opportunity endpoint');
    expect(body.data).toEqual(updateData);
  });

  test('should handle unsupported method', async () => {
    const event = {
      httpMethod: 'DELETE',
      body: null
    };

    const response = await handler(event);
    
    expect(response.statusCode).toBe(405);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Method not allowed');
  });
});