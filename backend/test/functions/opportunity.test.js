const { handler } = require('../../src/functions/opportunity/index');

// Mock the shared utilities
jest.mock('../../src/functions/shared/salesforceUtils', () => ({
  getSession: jest.fn(),
  createResponse: jest.fn((statusCode, body, headers = {}) => ({
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Session-Id',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
      ...headers,
    },
    body: JSON.stringify(body),
  })),
  generateCacheKey: jest.fn(),
  cachedSalesforceApiCall: jest.fn(),
  buildSOQLQuery: jest.fn(),
  handleSalesforceError: jest.fn(),
}));

const mockUtils = require('../../src/functions/shared/salesforceUtils');

describe('Opportunity Lambda Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return 401 when no session ID provided', async () => {
    const event = {
      httpMethod: 'GET',
      headers: {},
      pathParameters: { id: 'opp123' }
    };

    const response = await handler(event);
    
    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Session ID required in X-Session-Id header');
  });

  test('should return 401 when session is invalid', async () => {
    mockUtils.getSession.mockResolvedValue(null);
    mockUtils.createResponse.mockReturnValue({
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid or expired session' })
    });

    const event = {
      httpMethod: 'GET',
      headers: { 'x-session-id': 'invalid-session' },
      pathParameters: { id: 'opp123' }
    };

    const response = await handler(event);
    
    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Invalid or expired session');
  });

  test('should handle GET opportunity details request', async () => {
    const mockSession = {
      type: 'user_session',
      accessToken: 'mock-token',
      instanceUrl: 'https://test.salesforce.com'
    };

    const mockOpportunity = {
      Id: 'opp123',
      Name: 'Test Opportunity',
      Amount: 50000,
      StageName: 'Prospecting'
    };

    mockUtils.getSession.mockResolvedValue(mockSession);
    mockUtils.generateCacheKey.mockReturnValue('cache-key');
    mockUtils.buildSOQLQuery.mockReturnValue('SELECT * FROM Opportunity WHERE Id = \'opp123\'');
    mockUtils.cachedSalesforceApiCall.mockResolvedValue({ records: [mockOpportunity] });

    const event = {
      httpMethod: 'GET',
      headers: { 'x-session-id': 'valid-session' },
      pathParameters: { id: 'opp123' }
    };

    const response = await handler(event);
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.opportunity).toEqual(mockOpportunity);
    expect(mockUtils.cachedSalesforceApiCall).toHaveBeenCalled();
  });

  test('should handle GET similar opportunities request', async () => {
    const mockSession = {
      type: 'user_session',
      accessToken: 'mock-token',
      instanceUrl: 'https://test.salesforce.com'
    };

    const mockSimilarDeals = [
      { Id: 'opp456', Name: 'Similar Deal 1', Amount: 45000 },
      { Id: 'opp789', Name: 'Similar Deal 2', Amount: 55000 }
    ];

    mockUtils.getSession.mockResolvedValue(mockSession);
    mockUtils.generateCacheKey.mockReturnValue('cache-key');
    mockUtils.buildSOQLQuery.mockReturnValue('SELECT * FROM Opportunity WHERE StageName = \'Closed Won\'');
    mockUtils.cachedSalesforceApiCall.mockResolvedValue({ records: mockSimilarDeals });

    const event = {
      httpMethod: 'GET',
      headers: { 'x-session-id': 'valid-session' },
      queryStringParameters: { 
        type: 'similar',
        industry: 'Technology',
        amount: '50000'
      }
    };

    const response = await handler(event);
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.similarDeals).toEqual(mockSimilarDeals);
  });

  test('should handle PUT opportunity update request', async () => {
    const mockSession = {
      type: 'user_session',
      accessToken: 'mock-token',
      instanceUrl: 'https://test.salesforce.com'
    };

    mockUtils.getSession.mockResolvedValue(mockSession);

    // Mock axios for the update call
    const axios = require('axios');
    jest.mock('axios');
    const mockedAxios = axios;
    mockedAxios.mockResolvedValue({ data: {} });

    const updateData = {
      StageName: 'Proposal/Price Quote',
      Amount: 75000
    };

    const event = {
      httpMethod: 'PUT',
      headers: { 'x-session-id': 'valid-session' },
      pathParameters: { id: 'opp123' },
      body: JSON.stringify(updateData)
    };

    const response = await handler(event);
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Opportunity updated successfully');
    expect(body.opportunityId).toBe('opp123');
  });

  test('should handle errors with handleSalesforceError', async () => {
    const mockError = new Error('Salesforce API error');
    mockUtils.getSession.mockRejectedValue(mockError);
    mockUtils.handleSalesforceError.mockReturnValue({
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    });

    const event = {
      httpMethod: 'GET',
      headers: { 'x-session-id': 'valid-session' },
      pathParameters: { id: 'opp123' }
    };

    const response = await handler(event);
    
    expect(mockUtils.handleSalesforceError).toHaveBeenCalledWith(mockError);
    expect(response.statusCode).toBe(500);
  });

  test('should handle unsupported method', async () => {
    const mockSession = {
      type: 'user_session',
      accessToken: 'mock-token',
      instanceUrl: 'https://test.salesforce.com'
    };

    mockUtils.getSession.mockResolvedValue(mockSession);

    const event = {
      httpMethod: 'DELETE',
      headers: { 'x-session-id': 'valid-session' }
    };

    const response = await handler(event);
    
    expect(response.statusCode).toBe(405);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Method not allowed');
  });
});