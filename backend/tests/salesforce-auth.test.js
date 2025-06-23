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

    test('should handle authorize request', async () => {
        const event = {
            httpMethod: 'GET',
            path: '/auth/salesforce/authorize'
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(302);
        expect(result.headers.Location).toContain('https://login.salesforce.com/oauth2/authorize');
    });

    test('should handle callback with valid code', async () => {
        const event = {
            httpMethod: 'GET',
            path: '/auth/salesforce/callback',
            queryStringParameters: {
                code: 'test-auth-code'
            }
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.success).toBe(true);
        expect(body.user.id).toBe('test-user-id');
        expect(body.user.email).toBe('test@example.com');
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
});