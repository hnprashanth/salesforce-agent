const jsforce = require('jsforce');
const { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');
const { KMSClient, EncryptCommand, DecryptCommand } = require('@aws-sdk/client-kms');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const dynamoDb = new DynamoDBClient();
const kms = new KMSClient();

const TOKENS_TABLE = process.env.TOKENS_TABLE;
const KMS_KEY_ID = process.env.KMS_KEY_ID;
const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,GET'
};

exports.handler = async (event) => {
    console.log('Salesforce Auth function invoked:', JSON.stringify(event));
    
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }
    
    const path = event.path;
    
    try {
        if (path.includes('/login') || path.includes('/authorize')) {
            return handleLogin(event);
        } else if (path.includes('/callback')) {
            return handleCallback(event);
        } else if (path.includes('/refresh')) {
            return handleRefresh(event);
        } else if (path.includes('/logout')) {
            return handleLogout(event);
        } else {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Not found' })
            };
        }
    } catch (error) {
        console.error('Error in auth function:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
};

async function handleLogin(event) {
    try {
        const oauth2 = new jsforce.OAuth2({
            clientId: process.env.SALESFORCE_CLIENT_ID,
            clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
            redirectUri: process.env.SALESFORCE_REDIRECT_URI
        });
        
        const state = generateState();
        
        const authUrl = oauth2.getAuthorizationUrl({
            scope: 'api refresh_token offline_access',
            state: state
        });
        
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                authUrl: authUrl,
                state: state
            })
        };
    } catch (error) {
        console.error('Error generating auth URL:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Failed to generate authorization URL',
                message: error.message 
            })
        };
    }
}

async function handleCallback(event) {
    const { code, state } = event.queryStringParameters || {};
    
    if (!code) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Authorization code is required' })
        };
    }
    
    if (!state) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'State parameter is required' })
        };
    }
    
    const oauth2 = new jsforce.OAuth2({
        clientId: process.env.SALESFORCE_CLIENT_ID,
        clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
        redirectUri: process.env.SALESFORCE_REDIRECT_URI
    });
    
    const conn = new jsforce.Connection({ oauth2 });
    
    try {
        await conn.authorize(code);
        
        const userInfo = await conn.identity();
        
        const sessionId = generateSessionId();
        
        const tokenData = {
            accessToken: conn.accessToken,
            refreshToken: conn.refreshToken,
            instanceUrl: conn.instanceUrl,
            userId: userInfo.user_id,
            organizationId: userInfo.organization_id,
            expiresAt: Date.now() + (2 * 60 * 60 * 1000), // 2 hours
            createdAt: Date.now()
        };
        
        await storeTokens(sessionId, tokenData);
        
        const sessionToken = jwt.sign(
            { 
                sessionId: sessionId,
                userId: userInfo.user_id,
                organizationId: userInfo.organization_id
            }, 
            JWT_SECRET, 
            { expiresIn: '2h' }
        );
        
        const redirectUrl = `${FRONTEND_URL}/auth/callback?token=${sessionToken}&state=${state}`;
        
        return {
            statusCode: 302,
            headers: {
                ...corsHeaders,
                Location: redirectUrl
            },
            body: ''
        };
        
    } catch (error) {
        console.error('OAuth callback error:', error);
        const errorRedirectUrl = `${FRONTEND_URL}/auth/error?error=${encodeURIComponent(error.message)}`;
        return {
            statusCode: 302,
            headers: {
                ...corsHeaders,
                Location: errorRedirectUrl
            },
            body: ''
        };
    }
}

async function handleRefresh(event) {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
    
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
            statusCode: 401,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Invalid authorization header' })
        };
    }
    
    const token = authHeader.substring(7);
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const sessionId = decoded.sessionId;
        
        const tokenData = await getTokens(sessionId);
        if (!tokenData) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Session not found' })
            };
        }
        
        const oauth2 = new jsforce.OAuth2({
            clientId: process.env.SALESFORCE_CLIENT_ID,
            clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
            redirectUri: process.env.SALESFORCE_REDIRECT_URI
        });
        
        const conn = new jsforce.Connection({ 
            oauth2: oauth2,
            instanceUrl: tokenData.instanceUrl,
            refreshToken: tokenData.refreshToken
        });
        
        await conn.refresh();
        
        const updatedTokenData = {
            ...tokenData,
            accessToken: conn.accessToken,
            expiresAt: Date.now() + (2 * 60 * 60 * 1000), // 2 hours
            updatedAt: Date.now()
        };
        
        await storeTokens(sessionId, updatedTokenData);
        
        const newSessionToken = jwt.sign(
            { 
                sessionId: sessionId,
                userId: tokenData.userId,
                organizationId: tokenData.organizationId
            }, 
            JWT_SECRET, 
            { expiresIn: '2h' }
        );
        
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                token: newSessionToken
            })
        };
        
    } catch (error) {
        console.error('Token refresh error:', error);
        return {
            statusCode: 401,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Failed to refresh token',
                message: error.message 
            })
        };
    }
}

async function handleLogout(event) {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ success: true, message: 'Logged out' })
        };
    }
    
    const token = authHeader.substring(7);
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const sessionId = decoded.sessionId;
        
        await deleteTokens(sessionId);
        
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ success: true, message: 'Logged out successfully' })
        };
        
    } catch (error) {
        console.error('Logout error:', error);
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ success: true, message: 'Logged out' })
        };
    }
}

async function storeTokens(sessionId, tokenData) {
    const encryptedTokens = await encryptTokens(tokenData);
    
    const params = {
        TableName: TOKENS_TABLE,
        Item: {
            sessionId: { S: sessionId },
            encryptedData: { S: encryptedTokens },
            userId: { S: tokenData.userId },
            organizationId: { S: tokenData.organizationId },
            expiresAt: { N: tokenData.expiresAt.toString() },
            createdAt: { N: tokenData.createdAt.toString() },
            ttl: { N: Math.floor(tokenData.expiresAt / 1000).toString() }
        }
    };
    
    await dynamoDb.send(new PutItemCommand(params));
}

async function getTokens(sessionId) {
    const params = {
        TableName: TOKENS_TABLE,
        Key: {
            sessionId: { S: sessionId }
        }
    };
    
    const result = await dynamoDb.send(new GetItemCommand(params));
    
    if (!result.Item) {
        return null;
    }
    
    const encryptedData = result.Item.encryptedData.S;
    const tokenData = await decryptTokens(encryptedData);
    
    if (tokenData.expiresAt < Date.now()) {
        await deleteTokens(sessionId);
        return null;
    }
    
    return tokenData;
}

async function deleteTokens(sessionId) {
    const params = {
        TableName: TOKENS_TABLE,
        Key: {
            sessionId: { S: sessionId }
        }
    };
    
    await dynamoDb.send(new DeleteItemCommand(params));
}

async function encryptTokens(tokenData) {
    const plaintext = JSON.stringify(tokenData);
    
    const params = {
        KeyId: KMS_KEY_ID,
        Plaintext: Buffer.from(plaintext)
    };
    
    const result = await kms.send(new EncryptCommand(params));
    return Buffer.from(result.CiphertextBlob).toString('base64');
}

async function decryptTokens(encryptedData) {
    const params = {
        CiphertextBlob: Buffer.from(encryptedData, 'base64')
    };
    
    const result = await kms.send(new DecryptCommand(params));
    const plaintext = Buffer.from(result.Plaintext).toString();
    return JSON.parse(plaintext);
}

function generateState() {
    return crypto.randomBytes(32).toString('hex');
}

function generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
}