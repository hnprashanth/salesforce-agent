const {
  getSession,
  createResponse,
  generateCacheKey,
  cachedSalesforceApiCall,
  buildSOQLQuery,
  handleSalesforceError,
} = require('../shared/salesforceUtils');

// Get opportunity details
const getOpportunityDetails = async (opportunityId, session) => {
  const selectFields = `
    Id, Name, Amount, StageName, CloseDate, Probability, 
    Type, LeadSource, Description, CreatedDate, LastModifiedDate,
    Account.Id, Account.Name, Account.Industry, Account.AnnualRevenue, 
    Account.NumberOfEmployees, Account.BillingCity, Account.BillingState,
    (SELECT Id, FirstName, LastName, Title, Email, Phone 
     FROM Account.Contacts 
     WHERE Id IN (SELECT ContactId FROM OpportunityContactRoles WHERE OpportunityId = '${opportunityId}')),
    (SELECT Id, Subject, ActivityDate, Description, Priority, Status 
     FROM Tasks 
     WHERE WhatId = '${opportunityId}' 
     ORDER BY ActivityDate DESC LIMIT 10),
    (SELECT Id, Subject, ActivityDateTime, Description 
     FROM Events 
     WHERE WhatId = '${opportunityId}' 
     ORDER BY ActivityDateTime DESC LIMIT 10)
  `;
  
  const query = buildSOQLQuery(selectFields, 'Opportunity', `Id = '${opportunityId}'`);
  const url = `${session.instanceUrl}/services/data/v58.0/query?q=${encodeURIComponent(query)}`;
  
  const cacheKey = generateCacheKey('opportunity_details', { opportunityId });
  
  const result = await cachedSalesforceApiCall(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.accessToken}`,
    },
  }, cacheKey);

  return result.records[0] || null;
};

// Find similar won opportunities
const findSimilarWonDeals = async (industry, amount, session) => {
  const minAmount = Math.max(0, amount * 0.5);
  const maxAmount = amount * 2;
  
  const selectFields = 'Id, Name, Amount, CloseDate, StageName, Account.Name, Account.Industry, Description';
  const whereClause = `StageName = 'Closed Won' AND Account.Industry = '${industry}' AND Amount >= ${minAmount} AND Amount <= ${maxAmount} AND CloseDate >= LAST_N_MONTHS:12`;
  const orderBy = 'CloseDate DESC, Amount DESC';
  
  const query = buildSOQLQuery(selectFields, 'Opportunity', whereClause, orderBy, '10');
  const url = `${session.instanceUrl}/services/data/v58.0/query?q=${encodeURIComponent(query)}`;
  
  const cacheKey = generateCacheKey('similar_won_deals', { industry, minAmount, maxAmount });
  
  const result = await cachedSalesforceApiCall(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.accessToken}`,
    },
  }, cacheKey);

  return result.records;
};

// Get won opportunities for reference
const getWonOpportunities = async (session, limit = 10) => {
  const selectFields = 'Id, Name, Amount, CloseDate, Account.Name, Account.Industry';
  const whereClause = "StageName = 'Closed Won'";
  const orderBy = 'CloseDate DESC';
  
  const query = buildSOQLQuery(selectFields, 'Opportunity', whereClause, orderBy, limit.toString());
  const url = `${session.instanceUrl}/services/data/v58.0/query?q=${encodeURIComponent(query)}`;
  
  const cacheKey = generateCacheKey('won_opportunities', { limit });
  
  const result = await cachedSalesforceApiCall(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.accessToken}`,
    },
  }, cacheKey);

  return result.records;
};

// Update opportunity fields
const updateOpportunityFields = async (opportunityId, updateData, session) => {
  const axios = require('axios');
  const url = `${session.instanceUrl}/services/data/v58.0/sobjects/Opportunity/${opportunityId}`;
  
  const result = await axios({
    method: 'PATCH',
    url: url,
    headers: {
      'Authorization': `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
    },
    data: updateData,
  });

  return result.data;
};

exports.handler = async (event) => {
  console.log('Opportunity Lambda invoked', JSON.stringify(event, null, 2));
  
  try {
    const { httpMethod, pathParameters, queryStringParameters } = event;
    const sessionId = event.headers?.['x-session-id'] || event.headers?.['X-Session-Id'];
    
    if (!sessionId) {
      return createResponse(401, { error: 'Session ID required in X-Session-Id header' });
    }

    // Get session data
    const session = await getSession(sessionId);
    if (!session || session.type !== 'user_session') {
      return createResponse(401, { error: 'Invalid or expired session' });
    }
    
    switch (httpMethod) {
      case 'GET':
        // Handle different GET endpoints
        if (pathParameters?.id) {
          // GET /api/opportunity/{id}
          const opportunity = await getOpportunityDetails(pathParameters.id, session);
          if (!opportunity) {
            return createResponse(404, { error: 'Opportunity not found' });
          }
          return createResponse(200, { opportunity });
        } else if (queryStringParameters?.type === 'similar') {
          // GET /api/opportunities/similar?industry={industry}&amount={amount}
          const { industry, amount } = queryStringParameters;
          if (!industry || !amount) {
            return createResponse(400, { error: 'Industry and amount parameters are required' });
          }
          const similarDeals = await findSimilarWonDeals(industry, parseFloat(amount), session);
          return createResponse(200, { similarDeals });
        } else if (queryStringParameters?.type === 'won') {
          // GET /api/opportunities/won?limit=10
          const limit = parseInt(queryStringParameters.limit) || 10;
          const wonDeals = await getWonOpportunities(session, limit);
          return createResponse(200, { wonDeals });
        } else {
          return createResponse(400, { error: 'Invalid GET request. Use /opportunity/{id}, /opportunities/similar, or /opportunities/won' });
        }
        
      case 'PUT':
        // PUT /api/opportunity/{id}
        if (!pathParameters?.id) {
          return createResponse(400, { error: 'Opportunity ID is required' });
        }
        
        const updateBody = JSON.parse(event.body || '{}');
        if (Object.keys(updateBody).length === 0) {
          return createResponse(400, { error: 'Update data is required' });
        }
        
        await updateOpportunityFields(pathParameters.id, updateBody, session);
        return createResponse(200, { message: 'Opportunity updated successfully', opportunityId: pathParameters.id });
        
      default:
        return createResponse(405, { error: 'Method not allowed' });
    }
  } catch (error) {
    return handleSalesforceError(error);
  }
};