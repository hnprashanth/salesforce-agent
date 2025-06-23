const jsforce = require('jsforce');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const secretsManager = new SecretsManagerClient();

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
        if (path.includes('/authorize')) {
            return handleAuthorize(event);
        } else if (path.includes('/callback')) {
            return handleCallback(event);
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

async function handleAuthorize(event) {
    const oauth2 = new jsforce.OAuth2({
        clientId: process.env.SALESFORCE_CLIENT_ID,
        clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
        redirectUri: process.env.SALESFORCE_REDIRECT_URI
    });
    
    const authUrl = oauth2.getAuthorizationUrl({
        scope: 'api refresh_token offline_access'
    });
    
    return {
        statusCode: 302,
        headers: {
            ...corsHeaders,
            Location: authUrl
        },
        body: ''
    };
}

async function handleCallback(event) {
    const { code } = event.queryStringParameters || {};
    
    if (!code) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Authorization code is required' })
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
        
        // Store tokens securely (in a real app, use DynamoDB or similar)
        const tokenData = {
            accessToken: conn.accessToken,
            refreshToken: conn.refreshToken,
            instanceUrl: conn.instanceUrl,
            userId: userInfo.user_id,
            organizationId: userInfo.organization_id
        };
        
        // Return success page or redirect to frontend
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                message: 'Successfully connected to Salesforce',
                user: {
                    id: userInfo.user_id,
                    username: userInfo.username,
                    displayName: userInfo.display_name,
                    email: userInfo.email
                }
            })
        };
        
    } catch (error) {
        console.error('OAuth callback error:', error);
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Failed to authorize',
                message: error.message 
            })
        };
    }
}