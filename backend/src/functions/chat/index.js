const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const OpenAI = require('openai');

const secretsManager = new SecretsManagerClient();
let openai;

const initializeOpenAI = async () => {
    if (!openai) {
        const apiKey = process.env.OPENAI_API_KEY;
        openai = new OpenAI({ apiKey });
    }
    return openai;
};

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,POST'
};

exports.handler = async (event) => {
    console.log('Chat function invoked:', JSON.stringify(event));
    
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }
    
    try {
        const body = JSON.parse(event.body);
        const { message, conversationId, context } = body;
        
        if (!message) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Message is required' })
            };
        }
        
        const client = await initializeOpenAI();
        
        const systemPrompt = `You are a helpful Salesforce assistant. You help users manage their opportunities, 
        create new records, and analyze their sales data. You have access to Salesforce data through API calls.
        ${context ? `Current context: ${JSON.stringify(context)}` : ''}`;
        
        const completion = await client.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
            ],
            temperature: 0.7,
            max_tokens: 1000
        });
        
        const response = {
            message: completion.choices[0].message.content,
            conversationId: conversationId || generateConversationId(),
            timestamp: new Date().toISOString()
        };
        
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(response)
        };
        
    } catch (error) {
        console.error('Error in chat function:', error);
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

function generateConversationId() {
    return `conv-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}