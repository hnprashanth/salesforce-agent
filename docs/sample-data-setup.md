# Sample Data Setup for Salesforce Opportunity Assistant

This guide helps you create realistic sample data in your Salesforce Developer org for testing the AI assistant.

## Step 1: Store Your Credentials

1. Copy the `.env.salesforce.example` file to `.env.salesforce`
2. Fill in your actual Salesforce credentials:
   - Replace `your_consumer_key_here` with your Consumer Key
   - Replace `your_consumer_secret_here` with your Consumer Secret  
   - Replace `https://your-domain.salesforce.com` with your instance URL

## Step 2: Create Sample Accounts

In your Salesforce org, create these sample accounts:

### Method 1: Manual Creation (Recommended for Demo)

Go to **App Launcher** (9 dots) → **Sales** → **Accounts** → **New**

Create these 10 accounts:

| Account Name | Industry | Annual Revenue | Employees |
|--------------|----------|----------------|-----------|
| TechCorp Industries | Technology | $50,000,000 | 500 |
| Global Manufacturing Ltd | Manufacturing | $120,000,000 | 1,200 |
| FinanceFirst Solutions | Financial Services | $80,000,000 | 800 |
| HealthCare Innovations | Healthcare | $45,000,000 | 350 |
| EduTech Systems | Education | $25,000,000 | 200 |
| RetailMax Corporation | Retail | $90,000,000 | 1,500 |
| EnergyFlow Partners | Energy | $200,000,000 | 2,000 |
| MediaStream Solutions | Media | $35,000,000 | 400 |
| ConsultPro Services | Consulting | $15,000,000 | 150 |
| StartupVenture Inc | Technology | $5,000,000 | 50 |

### Method 2: Data Import (Faster)

1. Download the sample data CSV from `/scripts/sample-accounts.csv`
2. In Salesforce: Setup → Data Import Wizard
3. Import Accounts using the CSV file

## Step 3: Create Sample Contacts

For each account, create 2-3 contacts with these roles:
- CEO/President
- CTO/VP Technology  
- CFO/VP Finance
- Procurement Manager
- Director of Operations

**Sample Contact Names:**
- John Smith (CEO)
- Sarah Johnson (CTO)
- Michael Brown (CFO)
- Lisa Davis (Procurement Manager)
- Robert Wilson (Director)

## Step 4: Create Sample Opportunities

Create 15+ opportunities with these characteristics:

### Active Opportunities (Sales Pipeline)
| Opportunity Name | Account | Amount | Stage | Close Date | Probability |
|------------------|---------|--------|-------|------------|-------------|
| Enterprise Software Deal | TechCorp Industries | $250,000 | Negotiation/Review | Next Month | 75% |
| Manufacturing System Upgrade | Global Manufacturing | $500,000 | Proposal/Price Quote | 2 months | 60% |
| Financial Platform Implementation | FinanceFirst Solutions | $180,000 | Needs Analysis | 3 months | 30% |
| Healthcare Management Suite | HealthCare Innovations | $320,000 | Value Proposition | 2 months | 40% |
| Education Platform License | EduTech Systems | $150,000 | Id. Decision Makers | 4 months | 25% |

### Historical Opportunities (For AI Learning)
Create 5-10 **Closed Won** and **Closed Lost** opportunities with:
- Various deal sizes ($50K - $1M)
- Different close dates (last 6 months)
- Notes about why deals were won/lost
- Competitor information in descriptions

## Step 5: Add Activities and Notes

For each active opportunity, add:
- **Tasks**: "Follow up with CEO", "Send proposal", "Schedule demo"
- **Events**: "Product demo", "Contract negotiation meeting"
- **Notes**: Include competitor mentions, pricing discussions, key requirements

**Example Notes:**
- "Customer is also evaluating CompetitorX. Price is a key factor."
- "CEO very interested in ROI projections. Need CFO buy-in."
- "Technical requirements met, waiting on budget approval."
- "Strong relationship with procurement team. Deal likely to close."

## Step 6: Create Sample Cases

Create 5-10 support cases linked to your accounts:
- Subject: "Integration Support Request"
- Priority: High/Medium/Low
- Status: New/In Progress/Closed
- Description: Realistic support scenarios

## Step 7: Verify Your Data

Run these SOQL queries in Developer Console to verify:

```sql
-- Count accounts
SELECT COUNT() FROM Account

-- Count opportunities by stage
SELECT StageName, COUNT(Id) 
FROM Opportunity 
GROUP BY StageName

-- Count contacts
SELECT COUNT() FROM Contact

-- Recent activities
SELECT Id, Subject, ActivityDate, WhoId, WhatId 
FROM Task 
WHERE ActivityDate >= LAST_N_DAYS:30
```

## Step 8: Test Data Quality

Your sample data should include:
- ✅ 10+ Accounts with different industries
- ✅ 20+ Contacts with various roles
- ✅ 15+ Opportunities in different stages
- ✅ 5+ Closed Won opportunities (for AI learning)
- ✅ 5+ Closed Lost opportunities (for AI learning)
- ✅ Tasks and events on opportunities
- ✅ Notes with competitor and requirement information
- ✅ Sample cases for support scenarios

## Quick Data Creation Script

If you prefer automation, use the Apex script in `/scripts/create-sample-data.apex` to generate all sample data at once.

## Next Steps

Once your sample data is ready:
1. Test the OAuth connection with `/scripts/test-salesforce-connection.js`
2. Verify API access to your data
3. Proceed with AI integration development