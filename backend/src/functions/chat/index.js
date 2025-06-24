const AWS = require('aws-sdk');
const OpenAI = require('openai');
const axios = require('axios');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const { SESSION_TABLE_NAME } = process.env;

// Helper function to get session
const getSession = async (sessionId) => {
  if (!sessionId) return null;
  
  const params = {
    TableName: SESSION_TABLE_NAME,
    Key: { sessionId },
  };
  
  const result = await dynamodb.get(params).promise();
  return result.Item ? result.Item : null;
};

// Helper function to decrypt session data
const decryptSessionData = async (encryptedData) => {
  const kms = new AWS.KMS();
  const params = {
    CiphertextBlob: Buffer.from(encryptedData, 'base64'),
  };
  
  const result = await kms.decrypt(params).promise();
  return JSON.parse(result.Plaintext.toString());
};

// Helper function to get Salesforce data
const getSalesforceData = async (accessToken, instanceUrl, opportunityId) => {
  if (!opportunityId) return null;
  
  try {
    // Get opportunity details
    const oppResponse = await axios.get(
      `${instanceUrl}/services/data/v58.0/sobjects/Opportunity/${opportunityId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    const opportunity = oppResponse.data;
    
    // Get account details
    let account = null;
    if (opportunity.AccountId) {
      const accountResponse = await axios.get(
        `${instanceUrl}/services/data/v58.0/sobjects/Account/${opportunity.AccountId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      account = accountResponse.data;
    }
    
    // Get recent activities
    const activitiesResponse = await axios.get(
      `${instanceUrl}/services/data/v58.0/query?q=SELECT Id,Subject,ActivityDate,Description FROM Task WHERE WhatId='${opportunityId}' ORDER BY ActivityDate DESC LIMIT 10`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    return {
      opportunity,
      account,
      activities: activitiesResponse.data.records,
    };
  } catch (error) {
    console.error('Error fetching Salesforce data:', error);
    return null;
  }
};

// Prompt templates
const SYSTEM_PROMPT = `You are a Salesforce sales assistant AI. You help sales representatives manage opportunities, analyze deals, and provide actionable insights.

Your capabilities include:
- Analyzing opportunity data and providing insights
- Suggesting next steps and actions
- Identifying risks and opportunities
- Helping with deal strategy
- Providing historical context

When analyzing opportunities, consider:
- Deal size and stage
- Account relationship strength  
- Competition and risks
- Timeline and urgency
- Historical patterns

Respond in a conversational, helpful tone. Be specific and actionable in your recommendations.

If the user asks you to perform actions like updating records or sending emails, acknowledge the request but explain that you can provide guidance on what should be done rather than executing the actions directly.`;

const buildContextPrompt = (salesforceData, userMessage) => {
  if (!salesforceData) {
    return `User message: ${userMessage}

No specific opportunity context provided. Please provide general sales assistance.`;
  }

  const { opportunity, account, activities } = salesforceData;
  
  let contextPrompt = `Current Opportunity Context:
- Name: ${opportunity.Name}
- Stage: ${opportunity.StageName}
- Amount: $${opportunity.Amount || 'Not specified'}
- Close Date: ${opportunity.CloseDate}
- Probability: ${opportunity.Probability}%`;

  if (account) {
    contextPrompt += `
- Account: ${account.Name}
- Industry: ${account.Industry || 'Not specified'}
- Annual Revenue: $${account.AnnualRevenue || 'Not specified'}`;
  }

  if (activities && activities.length > 0) {
    contextPrompt += `

Recent Activities:`;
    activities.forEach(activity => {
      contextPrompt += `
- ${activity.Subject} (${activity.ActivityDate})`;
    });
  }

  contextPrompt += `

User message: ${userMessage}

Please provide insights and recommendations based on this opportunity context.`;

  return contextPrompt;
};

// Action detection patterns
const detectActions = (aiResponse) => {
  const actions = [];
  const text = aiResponse.toLowerCase();
  
  // Update opportunity stage
  if (text.includes('update stage') || text.includes('move to') || text.includes('advance to')) {
    actions.push({
      type: 'update_opportunity_stage',
      confidence: 0.8,
      suggestion: 'Consider updating the opportunity stage based on recent progress'
    });
  }
  
  // Create task
  if (text.includes('follow up') || text.includes('schedule') || text.includes('call') || text.includes('meeting')) {
    actions.push({
      type: 'create_task',
      confidence: 0.7,
      suggestion: 'Create a follow-up task to track next steps'
    });
  }
  
  // Send email
  if (text.includes('send email') || text.includes('email') || text.includes('reach out')) {
    actions.push({
      type: 'send_email',
      confidence: 0.6,
      suggestion: 'Consider sending an email to maintain communication'
    });
  }
  
  return actions;
};

// Helper function to create response
const createResponse = (statusCode, body) => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    },
    body: JSON.stringify(body),
  };
};

exports.handler = async (event) => {
  console.log('AI Chat Lambda invoked', JSON.stringify(event, null, 2));
  
  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, {});
    }
    
    const body = JSON.parse(event.body || '{}');
    const { message, opportunityId, sessionId } = body;
    
    if (!message) {
      return createResponse(400, { error: 'Message is required' });
    }
    
    // Get session if provided
    let salesforceData = null;
    if (sessionId) {
      const session = await getSession(sessionId);
      if (session && session.data) {
        try {
          const decryptedSession = await decryptSessionData(session.data);
          if (decryptedSession.type === 'user_session' && opportunityId) {
            salesforceData = await getSalesforceData(
              decryptedSession.accessToken,
              decryptedSession.instanceUrl,
              opportunityId
            );
          }
        } catch (error) {
          console.error('Error processing session:', error);
        }
      }
    }
    
    // Build context prompt
    const contextPrompt = buildContextPrompt(salesforceData, message);
    
    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: contextPrompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });
    
    const aiResponse = completion.choices[0].message.content;
    
    // Detect potential actions
    const suggestedActions = detectActions(aiResponse);
    
    return createResponse(200, {
      response: aiResponse,
      suggestedActions,
      contextUsed: !!salesforceData,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Error in AI chat function:', error);
    return createResponse(500, {
      error: 'Internal server error',
      message: error.message,
    });
  }
};