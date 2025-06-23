#!/usr/bin/env node

/**
 * Test Salesforce OAuth Connection
 * 
 * This script tests your Salesforce OAuth configuration and verifies API access.
 * 
 * Usage:
 * 1. Create .env.salesforce with your credentials
 * 2. Run: node scripts/test-salesforce-connection.js
 */

const https = require('https');
const querystring = require('querystring');
require('dotenv').config({ path: '.env.salesforce' });

// Configuration from environment variables
const config = {
  clientId: process.env.SALESFORCE_CLIENT_ID,
  clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
  instanceUrl: process.env.SALESFORCE_INSTANCE_URL,
  redirectUri: process.env.SALESFORCE_REDIRECT_URI || 'http://localhost:3000/auth/callback',
  apiVersion: process.env.SALESFORCE_API_VERSION || 'v58.0'
};

// Validate configuration
function validateConfig() {
  const missing = [];
  if (!config.clientId) missing.push('SALESFORCE_CLIENT_ID');
  if (!config.clientSecret) missing.push('SALESFORCE_CLIENT_SECRET');
  if (!config.instanceUrl) missing.push('SALESFORCE_INSTANCE_URL');
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\n📝 Please check your .env.salesforce file');
    process.exit(1);
  }
  
  console.log('✅ Configuration loaded successfully');
}

// Generate OAuth authorization URL
function generateAuthUrl() {
  const params = {
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: 'api refresh_token offline_access'
  };
  
  const authUrl = `${config.instanceUrl}/services/oauth2/authorize?${querystring.stringify(params)}`;
  return authUrl;
}

// Exchange authorization code for access token
function exchangeCodeForToken(authCode) {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code: authCode
    });
    
    const url = new URL('/services/oauth2/token', config.instanceUrl);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 200) {
            resolve(response);
          } else {
            reject(new Error(`Token exchange failed: ${response.error_description || response.error}`));
          }
        } catch (e) {
          reject(new Error(`Invalid response: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Test API access with access token
function testApiAccess(accessToken) {
  return new Promise((resolve, reject) => {
    const url = new URL(`/services/data/${config.apiVersion}/sobjects/Account/describe`, config.instanceUrl);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 200) {
            resolve(response);
          } else {
            reject(new Error(`API test failed: ${response[0]?.message || 'Unknown error'}`));
          }
        } catch (e) {
          reject(new Error(`Invalid API response: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

// Query sample data
function querySampleData(accessToken) {
  return new Promise((resolve, reject) => {
    const query = encodeURIComponent('SELECT COUNT() FROM Account');
    const url = new URL(`/services/data/${config.apiVersion}/query?q=${query}`, config.instanceUrl);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 200) {
            resolve(response);
          } else {
            reject(new Error(`Query failed: ${response[0]?.message || 'Unknown error'}`));
          }
        } catch (e) {
          reject(new Error(`Invalid query response: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

// Main test function
async function runTest() {
  console.log('🔍 Testing Salesforce OAuth Configuration\n');
  
  try {
    // Step 1: Validate configuration
    validateConfig();
    
    // Step 2: Display authorization URL
    const authUrl = generateAuthUrl();
    console.log('🔗 Authorization URL generated:');
    console.log(`   ${authUrl}\n`);
    
    console.log('📋 Manual Testing Steps:');
    console.log('1. Open the authorization URL above in your browser');
    console.log('2. Log in to your Salesforce org');
    console.log('3. Click "Allow" to authorize the app');
    console.log('4. Copy the authorization code from the redirect URL');
    console.log('5. Run this script with the code: node test-salesforce-connection.js YOUR_CODE\n');
    
    // If authorization code provided, test the full flow
    const authCode = process.argv[2];
    if (authCode) {
      console.log('🔄 Testing token exchange...');
      const tokenResponse = await exchangeCodeForToken(authCode);
      console.log('✅ Token exchange successful');
      console.log(`   Access token: ${tokenResponse.access_token.substring(0, 20)}...`);
      console.log(`   Instance URL: ${tokenResponse.instance_url}`);
      console.log(`   Token type: ${tokenResponse.token_type}\n`);
      
      console.log('🔄 Testing API access...');
      const apiResponse = await testApiAccess(tokenResponse.access_token);
      console.log('✅ API access successful');
      console.log(`   Account object: ${apiResponse.name}`);
      console.log(`   Fields available: ${apiResponse.fields.length}\n`);
      
      console.log('🔄 Testing sample data query...');
      const queryResponse = await querySampleData(tokenResponse.access_token);
      console.log('✅ Sample data query successful');
      console.log(`   Total accounts: ${queryResponse.records[0].expr0}\n`);
      
      console.log('🎉 All tests passed! Your Salesforce integration is ready.');
    } else {
      console.log('💡 To complete the test, provide an authorization code as an argument.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Command line usage
if (require.main === module) {
  runTest();
}

module.exports = {
  validateConfig,
  generateAuthUrl,
  exchangeCodeForToken,
  testApiAccess,
  querySampleData
};