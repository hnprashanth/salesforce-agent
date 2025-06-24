const {
  generateCacheKey,
  buildSOQLQuery,
  handleSalesforceError,
  createResponse,
} = require('../../src/functions/shared/salesforceUtils');

describe('Salesforce Utils', () => {
  describe('generateCacheKey', () => {
    test('should generate consistent cache key for same parameters', () => {
      const key1 = generateCacheKey('test', { id: '123', name: 'test' });
      const key2 = generateCacheKey('test', { name: 'test', id: '123' });
      
      expect(key1).toBe(key2);
      expect(key1).toMatch(/^test:/);
    });

    test('should generate different cache keys for different parameters', () => {
      const key1 = generateCacheKey('test', { id: '123' });
      const key2 = generateCacheKey('test', { id: '456' });
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('buildSOQLQuery', () => {
    test('should build basic SOQL query', () => {
      const query = buildSOQLQuery('Id, Name', 'Account');
      expect(query).toBe('SELECT Id, Name FROM Account');
    });

    test('should build SOQL query with WHERE clause', () => {
      const query = buildSOQLQuery('Id, Name', 'Account', "Id = '123'");
      expect(query).toBe("SELECT Id, Name FROM Account WHERE Id = '123'");
    });

    test('should build SOQL query with ORDER BY clause', () => {
      const query = buildSOQLQuery('Id, Name', 'Account', '', 'Name ASC');
      expect(query).toBe('SELECT Id, Name FROM Account ORDER BY Name ASC');
    });

    test('should build SOQL query with LIMIT clause', () => {
      const query = buildSOQLQuery('Id, Name', 'Account', '', '', '10');
      expect(query).toBe('SELECT Id, Name FROM Account LIMIT 10');
    });

    test('should build complete SOQL query with all clauses', () => {
      const query = buildSOQLQuery(
        'Id, Name', 
        'Account', 
        "Industry = 'Technology'", 
        'Name ASC',
        '5'
      );
      expect(query).toBe("SELECT Id, Name FROM Account WHERE Industry = 'Technology' ORDER BY Name ASC LIMIT 5");
    });
  });

  describe('createResponse', () => {
    test('should create basic response', () => {
      const response = createResponse(200, { message: 'success' });
      
      expect(response.statusCode).toBe(200);
      expect(response.headers['Content-Type']).toBe('application/json');
      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(JSON.parse(response.body)).toEqual({ message: 'success' });
    });

    test('should merge additional headers', () => {
      const response = createResponse(200, { message: 'success' }, { 'Custom-Header': 'value' });
      
      expect(response.headers['Custom-Header']).toBe('value');
      expect(response.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('handleSalesforceError', () => {
    test('should handle 401 authentication error', () => {
      const error = {
        response: {
          status: 401,
          data: { message: 'Invalid token' }
        }
      };
      
      const response = handleSalesforceError(error);
      
      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Salesforce authentication failed');
      expect(body.code).toBe('AUTH_FAILED');
    });

    test('should handle 404 not found error', () => {
      const error = {
        response: {
          status: 404,
          data: { message: 'Record not found' }
        }
      };
      
      const response = handleSalesforceError(error);
      
      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Resource not found');
      expect(body.code).toBe('NOT_FOUND');
    });

    test('should handle 429 rate limit error', () => {
      const error = {
        response: {
          status: 429
        }
      };
      
      const response = handleSalesforceError(error);
      
      expect(response.statusCode).toBe(429);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Rate limit exceeded');
      expect(body.code).toBe('RATE_LIMITED');
    });

    test('should handle 400 bad request error', () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'Invalid query' }
        }
      };
      
      const response = handleSalesforceError(error);
      
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Bad request');
      expect(body.code).toBe('BAD_REQUEST');
    });

    test('should handle generic error', () => {
      const error = new Error('Network error');
      
      const response = handleSalesforceError(error);
      
      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Internal server error');
      expect(body.code).toBe('INTERNAL_ERROR');
      expect(body.message).toBe('Network error');
    });

    test('should handle error without response', () => {
      const error = {
        response: {
          status: 503
        }
      };
      
      const response = handleSalesforceError(error);
      
      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('INTERNAL_ERROR');
    });
  });
});