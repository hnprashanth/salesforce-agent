const {
  getSession,
  createResponse,
  generateCacheKey,
  cachedSalesforceApiCall,
  buildSOQLQuery,
  handleSalesforceError,
} = require('../shared/salesforceUtils');

// Get account with opportunities and contacts
const getAccountWithHistory = async (accountId, session) => {
  const selectFields = `
    Id, Name, Industry, AnnualRevenue, NumberOfEmployees,
    BillingCity, BillingState, BillingCountry, Phone, Website,
    (SELECT Id, Name, Amount, StageName, CloseDate, Probability 
     FROM Opportunities 
     ORDER BY CreatedDate DESC),
    (SELECT Id, FirstName, LastName, Title, Email, Phone 
     FROM Contacts 
     ORDER BY CreatedDate DESC LIMIT 10)
  `;
  
  const query = buildSOQLQuery(selectFields, 'Account', `Id = '${accountId}'`);
  const url = `${session.instanceUrl}/services/data/v58.0/query?q=${encodeURIComponent(query)}`;
  
  const cacheKey = generateCacheKey('account_history', { accountId });
  
  const result = await cachedSalesforceApiCall(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.accessToken}`,
    },
  }, cacheKey);

  return result.records[0] || null;
};

// Get account performance history
const getAccountPerformance = async (accountId, session) => {
  const selectFields = `
    Id, Name,
    (SELECT COUNT(Id) FROM Opportunities WHERE StageName = 'Closed Won') WonCount,
    (SELECT COUNT(Id) FROM Opportunities WHERE StageName = 'Closed Lost') LostCount,
    (SELECT SUM(Amount) FROM Opportunities WHERE StageName = 'Closed Won') WonAmount,
    (SELECT COUNT(Id) FROM Opportunities WHERE StageName NOT IN ('Closed Won', 'Closed Lost')) ActiveCount
  `;
  
  const query = buildSOQLQuery(selectFields, 'Account', `Id = '${accountId}'`);
  const url = `${session.instanceUrl}/services/data/v58.0/query?q=${encodeURIComponent(query)}`;
  
  const cacheKey = generateCacheKey('account_performance', { accountId });
  
  const result = await cachedSalesforceApiCall(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.accessToken}`,
    },
  }, cacheKey);

  return result.records[0] || null;
};

// Get recent account activities
const getAccountActivities = async (accountId, session) => {
  const selectFields = 'Id, Subject, ActivityDate, Description, Priority, Status, Type, Who.Name, Who.Email, What.Name';
  const whereClause = `AccountId = '${accountId}' AND ActivityDate >= LAST_N_DAYS:90`;
  const orderBy = 'ActivityDate DESC';
  
  const query = buildSOQLQuery(selectFields, 'Task', whereClause, orderBy, '20');
  const url = `${session.instanceUrl}/services/data/v58.0/query?q=${encodeURIComponent(query)}`;
  
  const cacheKey = generateCacheKey('account_activities', { accountId });
  
  const result = await cachedSalesforceApiCall(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.accessToken}`,
    },
  }, cacheKey);

  return result.records;
};

exports.handler = async (event) => {
  console.log('Account Lambda invoked', JSON.stringify(event, null, 2));
  
  try {
    const { httpMethod, pathParameters } = event;
    const sessionId = event.headers?.['x-session-id'] || event.headers?.['X-Session-Id'];
    
    if (!sessionId) {
      return createResponse(401, { error: 'Session ID required in X-Session-Id header' });
    }

    // Get session data
    const session = await getSession(sessionId);
    if (!session || session.type !== 'user_session') {
      return createResponse(401, { error: 'Invalid or expired session' });
    }

    if (httpMethod !== 'GET') {
      return createResponse(405, { error: 'Method not allowed' });
    }

    if (!pathParameters?.id) {
      return createResponse(400, { error: 'Account ID is required' });
    }

    const accountId = pathParameters.id;

    // Get comprehensive account data
    const [accountData, performance, activities] = await Promise.all([
      getAccountWithHistory(accountId, session),
      getAccountPerformance(accountId, session),
      getAccountActivities(accountId, session),
    ]);

    if (!accountData) {
      return createResponse(404, { error: 'Account not found' });
    }

    // Combine all data
    const accountHistory = {
      account: accountData,
      performance: performance,
      recentActivities: activities,
      summary: {
        totalOpportunities: (accountData.Opportunities || []).length,
        activeOpportunities: performance?.ActiveCount || 0,
        wonDeals: performance?.WonCount || 0,
        lostDeals: performance?.LostCount || 0,
        totalWonAmount: performance?.WonAmount || 0,
        recentActivityCount: activities.length,
      },
    };

    return createResponse(200, { accountHistory });
    
  } catch (error) {
    return handleSalesforceError(error);
  }
};