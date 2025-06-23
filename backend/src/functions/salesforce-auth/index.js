const AWS = require('aws-sdk');
const axios = require('axios');
const crypto = require('crypto');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const kms = new AWS.KMS();

const {
  SESSION_TABLE_NAME,
  KMS_KEY_ID,
  SALESFORCE_CLIENT_ID,
  SALESFORCE_CLIENT_SECRET,
  SALESFORCE_REDIRECT_URI,
} = process.env;

const SALESFORCE_LOGIN_URL = 'https://login.salesforce.com';

// Helper function to encrypt data
const encryptData = async (data) => {
  const params = {
    KeyId: KMS_KEY_ID,
    Plaintext: JSON.stringify(data),
  };
  
  const result = await kms.encrypt(params).promise();
  return result.CiphertextBlob.toString('base64');
};

// Helper function to decrypt data
const decryptData = async (encryptedData) => {
  const params = {
    CiphertextBlob: Buffer.from(encryptedData, 'base64'),
  };
  
  const result = await kms.decrypt(params).promise();
  return JSON.parse(result.Plaintext.toString());
};

// Helper function to generate session ID
const generateSessionId = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Helper function to save session
const saveSession = async (sessionId, data, expiresInSeconds = 3600) => {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  
  const params = {
    TableName: SESSION_TABLE_NAME,
    Item: {
      sessionId,
      data: await encryptData(data),
      expiresAt,
      createdAt: new Date().toISOString(),
    },
  };
  
  await dynamodb.put(params).promise();
};

// Helper function to get session
const getSession = async (sessionId) => {
  const params = {
    TableName: SESSION_TABLE_NAME,
    Key: { sessionId },
  };
  
  const result = await dynamodb.get(params).promise();
  if (!result.Item) {
    return null;
  }
  
  const decryptedData = await decryptData(result.Item.data);
  return {
    ...decryptedData,
    createdAt: result.Item.createdAt,
  };
};

// Helper function to delete session
const deleteSession = async (sessionId) => {
  const params = {
    TableName: SESSION_TABLE_NAME,
    Key: { sessionId },
  };
  
  await dynamodb.delete(params).promise();
};

// Helper function to create response
const createResponse = (statusCode, body, headers = {}) => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      ...headers,
    },
    body: JSON.stringify(body),
  };
};

// OAuth Login - Redirect to Salesforce
const handleLogin = async (event) => {
  const state = generateSessionId();
  const scope = 'api refresh_token';
  
  // Save state for CSRF protection
  await saveSession(state, { type: 'oauth_state' }, 600); // 10 minutes
  
  const authUrl = `${SALESFORCE_LOGIN_URL}/services/oauth2/authorize?` +
    `response_type=code&` +
    `client_id=${encodeURIComponent(SALESFORCE_CLIENT_ID)}&` +
    `redirect_uri=${encodeURIComponent(SALESFORCE_REDIRECT_URI)}&` +
    `scope=${encodeURIComponent(scope)}&` +
    `state=${encodeURIComponent(state)}`;
  
  return createResponse(302, { message: 'Redirecting to Salesforce' }, {
    Location: authUrl,
  });
};

// OAuth Callback - Handle authorization code
const handleCallback = async (event) => {
  const { code, state, error } = event.queryStringParameters || {};
  
  if (error) {
    return createResponse(400, { error: 'OAuth error', details: error });
  }
  
  if (!code || !state) {
    return createResponse(400, { error: 'Missing code or state parameter' });
  }
  
  // Verify state for CSRF protection
  const stateSession = await getSession(state);
  if (!stateSession || stateSession.type !== 'oauth_state') {
    return createResponse(400, { error: 'Invalid state parameter' });
  }
  
  // Clean up state session
  await deleteSession(state);
  
  try {
    // Exchange code for tokens
    const tokenResponse = await axios.post(`${SALESFORCE_LOGIN_URL}/services/oauth2/token`, {
      grant_type: 'authorization_code',
      client_id: SALESFORCE_CLIENT_ID,
      client_secret: SALESFORCE_CLIENT_SECRET,
      redirect_uri: SALESFORCE_REDIRECT_URI,
      code,
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    const { access_token, refresh_token, instance_url, id } = tokenResponse.data;
    
    // Get user info
    const userResponse = await axios.get(id, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });
    
    const userInfo = userResponse.data;
    
    // Create session
    const sessionId = generateSessionId();
    await saveSession(sessionId, {
      type: 'user_session',
      accessToken: access_token,
      refreshToken: refresh_token,
      instanceUrl: instance_url,
      userInfo,
    }, 3600); // 1 hour
    
    return createResponse(200, {
      success: true,
      sessionId,
      user: {
        id: userInfo.user_id,
        username: userInfo.username,
        email: userInfo.email,
        displayName: userInfo.display_name,
        organizationId: userInfo.organization_id,
      },
    });
    
  } catch (error) {
    console.error('Token exchange error:', error.response?.data || error.message);
    return createResponse(500, { 
      error: 'Failed to exchange authorization code',
      details: error.response?.data?.error_description || error.message,
    });
  }
};

// Token Refresh
const handleRefresh = async (event) => {
  const body = JSON.parse(event.body || '{}');
  const { sessionId } = body;
  
  if (!sessionId) {
    return createResponse(400, { error: 'Session ID is required' });
  }
  
  const session = await getSession(sessionId);
  if (!session || session.type !== 'user_session') {
    return createResponse(401, { error: 'Invalid session' });
  }
  
  try {
    const tokenResponse = await axios.post(`${SALESFORCE_LOGIN_URL}/services/oauth2/token`, {
      grant_type: 'refresh_token',
      client_id: SALESFORCE_CLIENT_ID,
      client_secret: SALESFORCE_CLIENT_SECRET,
      refresh_token: session.refreshToken,
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    const { access_token, instance_url } = tokenResponse.data;
    
    // Update session with new access token
    await saveSession(sessionId, {
      ...session,
      accessToken: access_token,
      instanceUrl: instance_url,
    }, 3600);
    
    return createResponse(200, {
      success: true,
      sessionId,
    });
    
  } catch (error) {
    console.error('Token refresh error:', error.response?.data || error.message);
    
    // If refresh token is invalid, delete the session
    await deleteSession(sessionId);
    
    return createResponse(401, { 
      error: 'Failed to refresh token',
      details: error.response?.data?.error_description || error.message,
    });
  }
};

// Logout
const handleLogout = async (event) => {
  const body = JSON.parse(event.body || '{}');
  const { sessionId } = body;
  
  if (!sessionId) {
    return createResponse(400, { error: 'Session ID is required' });
  }
  
  const session = await getSession(sessionId);
  if (session && session.type === 'user_session') {
    try {
      // Revoke token from Salesforce
      await axios.post(`${SALESFORCE_LOGIN_URL}/services/oauth2/revoke`, {
        token: session.accessToken,
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
    } catch (error) {
      console.error('Token revocation error:', error.response?.data || error.message);
      // Continue with logout even if revocation fails
    }
  }
  
  // Delete session
  await deleteSession(sessionId);
  
  return createResponse(200, { success: true, message: 'Logged out successfully' });
};

exports.handler = async (event) => {
  console.log('Salesforce Auth Lambda invoked', JSON.stringify(event, null, 2));
  
  try {
    const path = event.path || event.rawPath || '';
    const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
    
    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return createResponse(200, {});
    }
    
    // Route based on path
    if (path.includes('/login')) {
      return await handleLogin(event);
    } else if (path.includes('/callback')) {
      return await handleCallback(event);
    } else if (path.includes('/refresh')) {
      return await handleRefresh(event);
    } else if (path.includes('/logout')) {
      return await handleLogout(event);
    } else {
      return createResponse(404, { error: 'Not found' });
    }
    
  } catch (error) {
    console.error('Error in Salesforce auth:', error);
    return createResponse(500, {
      error: 'Internal server error',
      message: error.message,
    });
  }
};