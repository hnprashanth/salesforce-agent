#!/usr/bin/env node

/**
 * Simple Salesforce Connection Test
 * Tests your OAuth setup and generates authorization URL
 */

const fs = require('fs');
const path = require('path');

// Read environment variables from .env.salesforce
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.salesforce');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.salesforce file not found');
    console.log('📝 Please create .env.salesforce with your Salesforce credentials');
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value && !key.startsWith('#')) {
      env[key.trim()] = value.trim();
    }
  });
  
  return env;
}

// Validate configuration
function validateConfig(config) {
  const required = ['SALESFORCE_CLIENT_ID', 'SALESFORCE_CLIENT_SECRET', 'SALESFORCE_INSTANCE_URL'];
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    return false;
  }
  
  console.log('✅ Configuration loaded successfully');
  console.log(`   Instance URL: ${config.SALESFORCE_INSTANCE_URL}`);
  console.log(`   Client ID: ${config.SALESFORCE_CLIENT_ID.substring(0, 20)}...`);
  return true;
}

// Generate OAuth authorization URL
function generateAuthUrl(config) {
  const baseUrl = config.SALESFORCE_INSTANCE_URL;
  const clientId = config.SALESFORCE_CLIENT_ID;
  const redirectUri = config.SALESFORCE_REDIRECT_URI || 'http://localhost:3000/auth/callback';
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'api refresh_token offline_access'
  });
  
  return `${baseUrl}/services/oauth2/authorize?${params.toString()}`;
}

// Main function
function main() {
  console.log('🔍 Testing Salesforce Configuration\n');
  
  try {
    const config = loadEnvFile();
    
    if (!validateConfig(config)) {
      process.exit(1);
    }
    
    const authUrl = generateAuthUrl(config);
    console.log('\n🔗 OAuth Authorization URL:');
    console.log(`${authUrl}\n`);
    
    console.log('📋 Next Steps:');
    console.log('1. Open the URL above in your browser');
    console.log('2. Log in to your Salesforce org');
    console.log('3. Click "Allow" to authorize the app');
    console.log('4. If successful, you\'ll be redirected (might show an error page, that\'s OK)');
    console.log('5. Copy the "code" parameter from the redirect URL');
    console.log('6. Your Salesforce OAuth is working! 🎉\n');
    
    console.log('💡 Ready to add sample data? Run the Apex script in Developer Console:');
    console.log('   Setup → Developer Console → Debug → Open Execute Anonymous Window');
    console.log('   Then paste the contents of scripts/create-sample-data.apex');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}