# Salesforce Developer Org Setup Guide

This guide walks you through setting up a Salesforce Developer org and configuring OAuth for the Salesforce Opportunity Assistant.

## Step 1: Create Salesforce Developer Org

1. Go to [developer.salesforce.com](https://developer.salesforce.com/)
2. Click "Sign up" (top right)
3. Fill out the form:
   - First Name: Your first name
   - Last Name: Your last name
   - Email: Use your work email
   - Job Role: Developer
   - Company: AntStack (or your company)
   - Country: Your country
   - Postal Code: Your postal code
   - Username: Choose a unique username (must be email format)
   - **Important**: This username will be your login, it doesn't need to be a real email
4. Accept terms and click "Sign me up"
5. Check your email for verification
6. Set your password when prompted

## Step 2: Create Connected App

1. Login to your new Salesforce org
2. Click the gear icon (⚙️) in top right → Setup
3. In Quick Find, search "App Manager"
4. Click "New Connected App"
5. Fill out the form:

### Basic Information
- **Connected App Name**: `Salesforce Opportunity Assistant`
- **API Name**: `Salesforce_Opportunity_Assistant`
- **Contact Email**: Your email
- **Description**: `AI-powered opportunity assistant with chat interface`

### API (Enable OAuth Settings)
- ✅ Check "Enable OAuth Settings"
- **Callback URL**: `http://localhost:3000/auth/callback`
- **Selected OAuth Scopes**:
  - ✅ Access and manage your data (api)
  - ✅ Perform requests on your behalf at any time (refresh_token, offline_access)
  - ✅ Access your basic information (id, profile, email, address, phone)
  - ✅ Access custom permissions (custom_permissions)

### Additional Settings
- ✅ Check "Require Secret for Web Server Flow"
- ✅ Check "Require Secret for Refresh Token Flow"
- **IP Relaxation**: "Relax IP restrictions"

6. Click "Save"
7. Click "Continue"

## Step 3: Get OAuth Credentials

After creating the Connected App:

1. Go to Setup → App Manager
2. Find your "Salesforce Opportunity Assistant" app
3. Click the dropdown arrow → "View"
4. In the API section, you'll see:
   - **Consumer Key** (Client ID)
   - **Consumer Secret** (Client Secret)
5. **IMPORTANT**: Copy these credentials securely

## Step 4: Security Configuration

1. Go to Setup → App Manager
2. Find your app → dropdown → "Manage"
3. Click "Edit Policies"
4. Set **Permitted Users**: "All users may self-authorize"
5. Set **IP Relaxation**: "Relax IP restrictions"
6. Click "Save"

## Step 5: Create Sample Data

Follow the sample data creation script in `/docs/sample-data.md`

## OAuth URLs

### Authorization URL
```
https://YOUR_DOMAIN.salesforce.com/services/oauth2/authorize?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:3000/auth/callback&scope=api%20refresh_token%20offline_access
```

### Token URL
```
https://YOUR_DOMAIN.salesforce.com/services/oauth2/token
```

### User Info URL
```
https://YOUR_DOMAIN.salesforce.com/services/oauth2/userinfo
```

## Environment Variables

Add these to your application's environment:

```env
SALESFORCE_CLIENT_ID=your_consumer_key_here
SALESFORCE_CLIENT_SECRET=your_consumer_secret_here
SALESFORCE_REDIRECT_URI=http://localhost:3000/auth/callback
SALESFORCE_INSTANCE_URL=https://your_domain.salesforce.com
SALESFORCE_API_VERSION=v58.0
```

## Testing the Connection

Use the test script in `/scripts/test-salesforce-connection.js` to verify your setup.

## Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch"**
   - Ensure the redirect URI in your app matches exactly
   - Check for trailing slashes

2. **"invalid_client_id"**
   - Verify the Consumer Key is correct
   - Check that the Connected App is activated

3. **"insufficient_access"**
   - Verify OAuth scopes are properly configured
   - Check user permissions

### Getting Help

- Salesforce Developer Console: Setup → Developer Console
- Debug logs: Debug → Debug Logs
- API limits: Setup → System Overview