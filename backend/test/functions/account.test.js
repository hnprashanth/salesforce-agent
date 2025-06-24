const { handler } = require('../../src/functions/account/index');

// Mock the shared utilities
jest.mock('../../src/functions/shared/salesforceUtils', () => ({
  getSession: jest.fn(),
  createResponse: jest.fn((statusCode, body, headers = {}) => ({
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Session-Id',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
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

describe('Account Lambda Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return 401 when no session ID provided', async () => {
    const event = {
      httpMethod: 'GET',
      headers: {},
      pathParameters: { id: 'acc123' }
    };

    const response = await handler(event);
    
    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Session ID required in X-Session-Id header');
  });

  test('should return 401 when session is invalid', async () => {
    mockUtils.getSession.mockResolvedValue(null);

    const event = {
      httpMethod: 'GET',
      headers: { 'x-session-id': 'invalid-session' },
      pathParameters: { id: 'acc123' }
    };

    const response = await handler(event);
    
    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Invalid or expired session');
  });

  test('should return 405 for non-GET methods', async () => {
    const mockSession = {
      type: 'user_session',
      accessToken: 'mock-token',
      instanceUrl: 'https://test.salesforce.com'
    };

    mockUtils.getSession.mockResolvedValue(mockSession);

    const event = {
      httpMethod: 'POST',
      headers: { 'x-session-id': 'valid-session' },
      pathParameters: { id: 'acc123' }
    };

    const response = await handler(event);
    
    expect(response.statusCode).toBe(405);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Method not allowed');
  });

  test('should return 400 when account ID is missing', async () => {
    const mockSession = {
      type: 'user_session',
      accessToken: 'mock-token',
      instanceUrl: 'https://test.salesforce.com'
    };

    mockUtils.getSession.mockResolvedValue(mockSession);

    const event = {
      httpMethod: 'GET',
      headers: { 'x-session-id': 'valid-session' },
      pathParameters: {}
    };

    const response = await handler(event);
    
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Account ID is required');
  });

  test('should handle successful account history request', async () => {
    const mockSession = {
      type: 'user_session',
      accessToken: 'mock-token',
      instanceUrl: 'https://test.salesforce.com'
    };

    const mockAccountData = {
      Id: 'acc123',
      Name: 'Test Account',
      Industry: 'Technology',
      AnnualRevenue: 1000000,
      Opportunities: [
        { Id: 'opp1', Name: 'Deal 1', Amount: 50000, StageName: 'Prospecting' },
        { Id: 'opp2', Name: 'Deal 2', Amount: 75000, StageName: 'Closed Won' }
      ],
      Contacts: [
        { Id: 'con1', FirstName: 'John', LastName: 'Doe', Title: 'CEO' }
      ]
    };

    const mockPerformance = {
      Id: 'acc123',
      Name: 'Test Account',
      WonCount: 5,
      LostCount: 2,
      WonAmount: 500000,
      ActiveCount: 3
    };

    const mockActivities = [
      { Id: 'task1', Subject: 'Follow up call', ActivityDate: '2023-12-01', Priority: 'High' },
      { Id: 'task2', Subject: 'Send proposal', ActivityDate: '2023-11-28', Priority: 'Normal' }
    ];

    mockUtils.getSession.mockResolvedValue(mockSession);
    mockUtils.generateCacheKey.mockReturnValue('cache-key');
    mockUtils.buildSOQLQuery.mockReturnValue('SELECT * FROM Account WHERE Id = \'acc123\'');
    
    // Mock the three API calls
    mockUtils.cachedSalesforceApiCall
      .mockResolvedValueOnce({ records: [mockAccountData] })    // getAccountWithHistory
      .mockResolvedValueOnce({ records: [mockPerformance] })    // getAccountPerformance
      .mockResolvedValueOnce({ records: mockActivities });      // getAccountActivities

    const event = {
      httpMethod: 'GET',
      headers: { 'x-session-id': 'valid-session' },
      pathParameters: { id: 'acc123' }
    };

    const response = await handler(event);
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    
    expect(body.accountHistory).toBeDefined();
    expect(body.accountHistory.account).toEqual(mockAccountData);
    expect(body.accountHistory.performance).toEqual(mockPerformance);
    expect(body.accountHistory.recentActivities).toEqual(mockActivities);
    expect(body.accountHistory.summary).toEqual({
      totalOpportunities: 2,
      activeOpportunities: 3,
      wonDeals: 5,
      lostDeals: 2,
      totalWonAmount: 500000,
      recentActivityCount: 2,
    });

    // Verify all three API calls were made
    expect(mockUtils.cachedSalesforceApiCall).toHaveBeenCalledTimes(3);
  });

  test('should return 404 when account not found', async () => {
    const mockSession = {
      type: 'user_session',
      accessToken: 'mock-token',
      instanceUrl: 'https://test.salesforce.com'
    };

    mockUtils.getSession.mockResolvedValue(mockSession);
    mockUtils.generateCacheKey.mockReturnValue('cache-key');
    mockUtils.buildSOQLQuery.mockReturnValue('SELECT * FROM Account WHERE Id = \'acc123\'');
    
    // Mock empty results for account data
    mockUtils.cachedSalesforceApiCall
      .mockResolvedValueOnce({ records: [] })               // getAccountWithHistory returns empty
      .mockResolvedValueOnce({ records: [{}] })             // getAccountPerformance
      .mockResolvedValueOnce({ records: [] });              // getAccountActivities

    const event = {
      httpMethod: 'GET',
      headers: { 'x-session-id': 'valid-session' },
      pathParameters: { id: 'nonexistent123' }
    };

    const response = await handler(event);
    
    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Account not found');
  });

  test('should handle API errors with handleSalesforceError', async () => {
    const mockSession = {
      type: 'user_session',
      accessToken: 'mock-token',
      instanceUrl: 'https://test.salesforce.com'
    };

    const mockError = new Error('Salesforce API error');
    
    mockUtils.getSession.mockResolvedValue(mockSession);
    mockUtils.cachedSalesforceApiCall.mockRejectedValue(mockError);
    mockUtils.handleSalesforceError.mockReturnValue({
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    });

    const event = {
      httpMethod: 'GET',
      headers: { 'x-session-id': 'valid-session' },
      pathParameters: { id: 'acc123' }
    };

    const response = await handler(event);
    
    expect(mockUtils.handleSalesforceError).toHaveBeenCalledWith(mockError);
    expect(response.statusCode).toBe(500);
  });

  test('should handle missing performance data gracefully', async () => {
    const mockSession = {
      type: 'user_session',
      accessToken: 'mock-token',
      instanceUrl: 'https://test.salesforce.com'
    };

    const mockAccountData = {
      Id: 'acc123',
      Name: 'Test Account',
      Opportunities: []
    };

    mockUtils.getSession.mockResolvedValue(mockSession);
    mockUtils.generateCacheKey.mockReturnValue('cache-key');
    mockUtils.buildSOQLQuery.mockReturnValue('SELECT * FROM Account WHERE Id = \'acc123\'');
    
    // Mock API calls with missing performance data
    mockUtils.cachedSalesforceApiCall
      .mockResolvedValueOnce({ records: [mockAccountData] })    // getAccountWithHistory
      .mockResolvedValueOnce({ records: [null] })               // getAccountPerformance returns null
      .mockResolvedValueOnce({ records: [] });                  // getAccountActivities

    const event = {
      httpMethod: 'GET',
      headers: { 'x-session-id': 'valid-session' },
      pathParameters: { id: 'acc123' }
    };

    const response = await handler(event);
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    
    expect(body.accountHistory.summary).toEqual({
      totalOpportunities: 0,
      activeOpportunities: 0,
      wonDeals: 0,
      lostDeals: 0,
      totalWonAmount: 0,
      recentActivityCount: 0,
    });
  });
});