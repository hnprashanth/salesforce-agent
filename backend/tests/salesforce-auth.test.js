const { handler } = require('../src/functions/salesforce-auth/index');

// Mock jsforce
jest.mock('jsforce', () => ({
    OAuth2: jest.fn().mockImplementation(() => ({
        getAuthorizationUrl: jest.fn().mockReturnValue('https://login.salesforce.com/oauth2/authorize?response_type=code&client_id=test')
    })),
    Connection: jest.fn().mockImplementation(() => ({
        authorize: jest.fn().mockResolvedValue(true),
        identity: jest.fn().mockResolvedValue({
            user_id: 'test-user-id',
            username: 'test@example.com',
            display_name: 'Test User',
            email: 'test@example.com',
            organization_id: 'test-org-id'
        }),
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        instanceUrl: 'https://test.salesforce.com'
    }))
}));

describe('Salesforce Auth Function', () => {
    beforeEach(() => {
        process.env.SALESFORCE_CLIENT_ID = 'test-client-id';
        process.env.SALESFORCE_CLIENT_SECRET = 'test-client-secret';
        process.env.SALESFORCE_REDIRECT_URI = 'https://test.com/callback';
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

    test('should handle login request', async () => {
        const event = {
            httpMethod: 'POST',
            path: '/auth/salesforce/login'
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.authUrl).toContain('https://login.salesforce.com/oauth2/authorize');
        expect(body.state).toBeDefined();
    });

    test('should handle callback with valid code and state', async () => {
        const event = {
            httpMethod: 'GET',
            path: '/auth/salesforce/callback',
            queryStringParameters: {
                code: 'test-auth-code',
                state: 'test-state'
            }
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(302);
        expect(result.headers.Location).toContain('http://localhost:3000/auth/callback');
    });

    test('should return 400 for callback without code', async () => {
        const event = {
            httpMethod: 'GET',
            path: '/auth/salesforce/callback',
            queryStringParameters: {}
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(400);
        const body = JSON.parse(result.body);
        expect(body.error).toBe('Authorization code is required');
    });

    test('should handle refresh token request', async () => {
        const event = {
            httpMethod: 'POST',
            path: '/auth/salesforce/refresh',
            headers: {
                Authorization: 'Bearer test-jwt-token'
            }
        };

        const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
        const mockSend = DynamoDBClient.prototype.send;
        mockSend.mockResolvedValueOnce({
            Item: {
                sessionId: { S: 'test-session' },
                encryptedData: { S: 'encrypted-token-data' },
                userId: { S: 'test-user' },
                organizationId: { S: 'test-org' },
                expiresAt: { N: (Date.now() + 3600000).toString() }
            }
        });

        const result = await handler(event);

        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.success).toBe(true);
        expect(body.token).toBeDefined();
    });

    test('should handle logout request', async () => {
        const event = {
            httpMethod: 'GET',
            path: '/auth/salesforce/logout',
            headers: {
                Authorization: 'Bearer test-jwt-token'
            }
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.success).toBe(true);
        expect(body.message).toBe('Logged out successfully');
    });

    test('should return 404 for unknown paths', async () => {
        const event = {
            httpMethod: 'GET',
            path: '/auth/salesforce/unknown'
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(404);
        const body = JSON.parse(result.body);
        expect(body.error).toBe('Not found');
    });
});