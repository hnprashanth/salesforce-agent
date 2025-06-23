const jsforce = require('jsforce');
const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');

const dynamodb = new DynamoDBClient();

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE'
};

exports.handler = async (event) => {
    console.log('Opportunity function invoked:', JSON.stringify(event));
    
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }
    
    try {
        // Get user's Salesforce connection from auth context
        const userId = event.requestContext.authorizer.claims.sub;
        const conn = await getSalesforceConnection(userId);
        
        switch (event.httpMethod) {
            case 'GET':
                return await handleGetOpportunities(conn, event);
            case 'POST':
                return await handleCreateOpportunity(conn, event);
            case 'PUT':
                return await handleUpdateOpportunity(conn, event);
            default:
                return {
                    statusCode: 405,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Method not allowed' })
                };
        }
    } catch (error) {
        console.error('Error in opportunity function:', error);
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

async function getSalesforceConnection(userId) {
    // In a real app, retrieve stored tokens from DynamoDB
    // This is a simplified example
    const conn = new jsforce.Connection({
        instanceUrl: process.env.SALESFORCE_INSTANCE_URL,
        accessToken: 'stored_access_token' // Retrieved from secure storage
    });
    
    return conn;
}

async function handleGetOpportunities(conn, event) {
    const { limit = 20, offset = 0, status } = event.queryStringParameters || {};
    
    let query = 'SELECT Id, Name, Amount, StageName, CloseDate, AccountId, Account.Name FROM Opportunity';
    if (status) {
        query += ` WHERE StageName = '${status}'`;
    }
    query += ` ORDER BY CreatedDate DESC LIMIT ${limit} OFFSET ${offset}`;
    
    const result = await conn.query(query);
    
    return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
            opportunities: result.records,
            totalSize: result.totalSize,
            done: result.done
        })
    };
}

async function handleCreateOpportunity(conn, event) {
    const body = JSON.parse(event.body);
    const { name, amount, stageName, closeDate, accountId } = body;
    
    if (!name || !stageName || !closeDate) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Missing required fields: name, stageName, closeDate' 
            })
        };
    }
    
    const result = await conn.sobject('Opportunity').create({
        Name: name,
        Amount: amount,
        StageName: stageName,
        CloseDate: closeDate,
        AccountId: accountId
    });
    
    if (result.success) {
        const opportunity = await conn.sobject('Opportunity').retrieve(result.id);
        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({ 
                success: true,
                opportunity 
            })
        };
    } else {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Failed to create opportunity',
                errors: result.errors 
            })
        };
    }
}

async function handleUpdateOpportunity(conn, event) {
    const opportunityId = event.pathParameters.id;
    const body = JSON.parse(event.body);
    
    const updateData = {};
    const allowedFields = ['Name', 'Amount', 'StageName', 'CloseDate', 'Description'];
    
    allowedFields.forEach(field => {
        if (body[field.toLowerCase()] !== undefined) {
            updateData[field] = body[field.toLowerCase()];
        }
    });
    
    if (Object.keys(updateData).length === 0) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'No valid fields to update' })
        };
    }
    
    updateData.Id = opportunityId;
    
    const result = await conn.sobject('Opportunity').update(updateData);
    
    if (result.success) {
        const opportunity = await conn.sobject('Opportunity').retrieve(result.id);
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ 
                success: true,
                opportunity 
            })
        };
    } else {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Failed to update opportunity',
                errors: result.errors 
            })
        };
    }
}