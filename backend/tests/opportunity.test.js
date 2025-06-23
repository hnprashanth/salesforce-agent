const { handler } = require('../src/functions/opportunity/index');

// Mock jsforce
jest.mock('jsforce', () => ({
    Connection: jest.fn().mockImplementation(() => ({
        query: jest.fn().mockResolvedValue({
            records: [
                {
                    Id: 'opp1',
                    Name: 'Test Opportunity 1',
                    Amount: 10000,
                    StageName: 'Prospecting',
                    CloseDate: '2024-12-31'
                }
            ],
            totalSize: 1,
            done: true
        }),
        sobject: jest.fn().mockReturnValue({
            create: jest.fn().mockResolvedValue({
                success: true,
                id: 'new-opp-id'
            }),
            update: jest.fn().mockResolvedValue({
                success: true,
                id: 'updated-opp-id'
            }),
            retrieve: jest.fn().mockResolvedValue({
                Id: 'opp-id',
                Name: 'Test Opportunity',
                Amount: 10000,
                StageName: 'Prospecting'
            })
        })
    }))
}));

describe('Opportunity Function', () => {
    beforeEach(() => {
        process.env.SALESFORCE_INSTANCE_URL = 'https://test.salesforce.com';
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

    test('should handle GET request for opportunities', async () => {
        const event = {
            httpMethod: 'GET',
            queryStringParameters: {},
            requestContext: {
                authorizer: {
                    claims: {
                        sub: 'test-user-id'
                    }
                }
            }
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.opportunities).toHaveLength(1);
        expect(body.opportunities[0].Name).toBe('Test Opportunity 1');
    });

    test('should handle POST request to create opportunity', async () => {
        const event = {
            httpMethod: 'POST',
            body: JSON.stringify({
                name: 'New Opportunity',
                amount: 50000,
                stageName: 'Prospecting',
                closeDate: '2024-12-31'
            }),
            requestContext: {
                authorizer: {
                    claims: {
                        sub: 'test-user-id'
                    }
                }
            }
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(201);
        const body = JSON.parse(result.body);
        expect(body.success).toBe(true);
        expect(body.opportunity.Id).toBe('new-opp-id');
    });

    test('should return 400 for POST request missing required fields', async () => {
        const event = {
            httpMethod: 'POST',
            body: JSON.stringify({
                amount: 50000
            }),
            requestContext: {
                authorizer: {
                    claims: {
                        sub: 'test-user-id'
                    }
                }
            }
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(400);
        const body = JSON.parse(result.body);
        expect(body.error).toContain('Missing required fields');
    });
});