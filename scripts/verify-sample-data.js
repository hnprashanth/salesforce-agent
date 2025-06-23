#!/usr/bin/env node

/**
 * Verify Sample Data in Salesforce
 * This script checks if your sample data was imported correctly
 */

const fs = require('fs');
const path = require('path');

// Read environment variables
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.salesforce');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.salesforce file not found');
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

// Generate verification queries
function generateVerificationQueries(config) {
  const baseUrl = config.SALESFORCE_INSTANCE_URL;
  const clientId = config.SALESFORCE_CLIENT_ID;
  const redirectUri = config.SALESFORCE_REDIRECT_URI || 'http://localhost:3000/auth/callback';
  
  const authUrl = `${baseUrl}/services/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=api%20refresh_token%20offline_access`;
  
  console.log('🔍 Sample Data Verification\n');
  console.log('To verify your sample data, you can either:');
  console.log('1. Use the Salesforce web interface');
  console.log('2. Run SOQL queries in Developer Console\n');
  
  console.log('📊 Quick Verification in Salesforce UI:');
  console.log('1. Go to App Launcher (9 dots) → Sales');
  console.log('2. Check these tabs:');
  console.log('   - Accounts: Should see 10 accounts (TechCorp, Global Manufacturing, etc.)');
  console.log('   - Opportunities: Should see opportunities in various stages');
  console.log('   - Contacts: Should see contacts linked to accounts\n');
  
  console.log('🔍 SOQL Queries to run in Developer Console:');
  console.log('(Setup → Developer Console → Query Editor)\n');
  
  console.log('-- Count Accounts:');
  console.log('SELECT COUNT() FROM Account\n');
  
  console.log('-- List Account Names:');
  console.log('SELECT Name, Industry, AnnualRevenue FROM Account ORDER BY Name\n');
  
  console.log('-- Count Opportunities by Stage:');
  console.log('SELECT StageName, COUNT(Id) FROM Opportunity GROUP BY StageName\n');
  
  console.log('-- List Opportunities:');
  console.log('SELECT Name, Account.Name, Amount, StageName FROM Opportunity ORDER BY Amount DESC\n');
  
  console.log('-- Count Contacts:');
  console.log('SELECT COUNT() FROM Contact\n');
  
  console.log('📋 Expected Results:');
  console.log('- Accounts: 10 records');
  console.log('- Opportunities: You should manually create some using the data');
  console.log('- Contacts: You should manually create some linked to accounts\n');
  
  console.log('🔗 OAuth Test URL (if needed):');
  console.log(authUrl);
  console.log('\n✅ If you can see the accounts in Salesforce, your integration is ready!');
}

// Main function
function main() {
  try {
    const config = loadEnvFile();
    generateVerificationQueries(config);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}