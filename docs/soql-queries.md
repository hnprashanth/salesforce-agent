# Essential SOQL Queries for Salesforce Opportunity Assistant

This document contains the key SOQL queries needed for the AI assistant to access Salesforce data.

## Opportunity Queries

### Get Opportunity with Related Data
```sql
SELECT Id, Name, Amount, StageName, CloseDate, Probability, 
       Type, LeadSource, Description, CreatedDate, LastModifiedDate,
       Account.Id, Account.Name, Account.Industry, Account.AnnualRevenue, 
       Account.NumberOfEmployees, Account.BillingCity, Account.BillingState,
       (SELECT Id, FirstName, LastName, Title, Email, Phone 
        FROM Account.Contacts 
        WHERE Id IN (SELECT ContactId FROM OpportunityContactRoles WHERE OpportunityId = :opportunityId)),
       (SELECT Id, Subject, ActivityDate, Description, Priority, Status 
        FROM Tasks 
        WHERE WhatId = :opportunityId 
        ORDER BY ActivityDate DESC LIMIT 10),
       (SELECT Id, Subject, ActivityDateTime, Description 
        FROM Events 
        WHERE WhatId = :opportunityId 
        ORDER BY ActivityDateTime DESC LIMIT 10)
FROM Opportunity 
WHERE Id = :opportunityId
```

### Find Similar Won Opportunities
```sql
SELECT Id, Name, Amount, CloseDate, StageName, 
       Account.Name, Account.Industry, Description
FROM Opportunity 
WHERE StageName = 'Closed Won' 
  AND Account.Industry = :industry
  AND Amount BETWEEN :minAmount AND :maxAmount
  AND CloseDate >= LAST_N_MONTHS:12
ORDER BY CloseDate DESC, Amount DESC
LIMIT 10
```

### Get Opportunities by Stage
```sql
SELECT Id, Name, Amount, StageName, CloseDate, Probability,
       Account.Name, Account.Industry
FROM Opportunity 
WHERE StageName = :stageName
  AND CloseDate >= TODAY
ORDER BY Amount DESC
LIMIT 20
```

### Recent Opportunity Activities
```sql
SELECT Id, Name, Amount, StageName, 
       (SELECT Subject, ActivityDate, Description 
        FROM Tasks 
        WHERE ActivityDate >= LAST_N_DAYS:30 
        ORDER BY ActivityDate DESC LIMIT 5)
FROM Opportunity 
WHERE Id = :opportunityId
```

## Account Queries

### Get Account with Opportunities
```sql
SELECT Id, Name, Industry, AnnualRevenue, NumberOfEmployees,
       BillingCity, BillingState, BillingCountry, Phone, Website,
       (SELECT Id, Name, Amount, StageName, CloseDate, Probability 
        FROM Opportunities 
        WHERE StageName NOT IN ('Closed Won', 'Closed Lost')
        ORDER BY Amount DESC),
       (SELECT Id, FirstName, LastName, Title, Email, Phone 
        FROM Contacts 
        ORDER BY CreatedDate DESC LIMIT 10)
FROM Account 
WHERE Id = :accountId
```

### Get Account Performance History
```sql
SELECT Id, Name,
       (SELECT COUNT(Id) FROM Opportunities WHERE StageName = 'Closed Won'),
       (SELECT COUNT(Id) FROM Opportunities WHERE StageName = 'Closed Lost'),
       (SELECT SUM(Amount) FROM Opportunities WHERE StageName = 'Closed Won')
FROM Account 
WHERE Id = :accountId
```

## Contact Queries

### Get Key Contacts for Opportunity
```sql
SELECT Contact.Id, Contact.FirstName, Contact.LastName, 
       Contact.Title, Contact.Email, Contact.Phone,
       Role, IsPrimary
FROM OpportunityContactRole 
WHERE OpportunityId = :opportunityId
ORDER BY IsPrimary DESC, Role
```

### Get Contact's Related Opportunities
```sql
SELECT Id, FirstName, LastName, Title, Email, Account.Name,
       (SELECT Opportunity.Id, Opportunity.Name, Opportunity.Amount, 
               Opportunity.StageName, Role 
        FROM OpportunityContactRoles 
        ORDER BY Opportunity.CloseDate DESC)
FROM Contact 
WHERE Id = :contactId
```

## Activity Queries

### Recent Activities for Opportunity
```sql
SELECT Id, Subject, ActivityDate, Description, Priority, Status, Type,
       Who.Name, Who.Email, What.Name
FROM Task 
WHERE WhatId = :opportunityId 
  AND ActivityDate >= LAST_N_DAYS:90
ORDER BY ActivityDate DESC
LIMIT 20
```

### Upcoming Tasks
```sql
SELECT Id, Subject, ActivityDate, Description, Priority, 
       What.Name, What.Type, Account.Name
FROM Task 
WHERE WhatId = :opportunityId 
  AND ActivityDate >= TODAY
  AND Status != 'Completed'
ORDER BY ActivityDate ASC, Priority DESC
```

## Pipeline Analysis Queries

### Opportunities by Stage (Pipeline Overview)
```sql
SELECT StageName, COUNT(Id) OpportunityCount, 
       SUM(Amount) TotalAmount, AVG(Amount) AvgAmount
FROM Opportunity 
WHERE StageName NOT IN ('Closed Won', 'Closed Lost')
  AND CloseDate >= TODAY
GROUP BY StageName
ORDER BY SUM(Amount) DESC
```

### Win Rate Analysis
```sql
SELECT Account.Industry, 
       COUNT(CASE WHEN StageName = 'Closed Won' THEN 1 END) WonCount,
       COUNT(CASE WHEN StageName = 'Closed Lost' THEN 1 END) LostCount,
       COUNT(Id) TotalCount
FROM Opportunity 
WHERE StageName IN ('Closed Won', 'Closed Lost')
  AND CloseDate >= LAST_N_MONTHS:12
GROUP BY Account.Industry
```

### Average Deal Size by Industry
```sql
SELECT Account.Industry, 
       AVG(Amount) AvgDealSize,
       COUNT(Id) DealCount
FROM Opportunity 
WHERE StageName = 'Closed Won'
  AND CloseDate >= LAST_N_MONTHS:12
GROUP BY Account.Industry
HAVING COUNT(Id) >= 2
ORDER BY AVG(Amount) DESC
```

## Competitive Analysis Queries

### Deals with Competitor Mentions
```sql
SELECT Id, Name, Amount, StageName, Account.Name, Description
FROM Opportunity 
WHERE (Description LIKE '%competitor%' 
   OR Description LIKE '%competition%'
   OR Description LIKE '%vs %'
   OR Description LIKE '%against %')
  AND StageName NOT IN ('Closed Won', 'Closed Lost')
ORDER BY Amount DESC
```

### Lost Deals Analysis
```sql
SELECT Id, Name, Amount, Account.Industry, Description, CloseDate
FROM Opportunity 
WHERE StageName = 'Closed Lost'
  AND CloseDate >= LAST_N_MONTHS:6
  AND Description != null
ORDER BY CloseDate DESC
```

## Data Quality Queries

### Opportunities Missing Key Information
```sql
SELECT Id, Name, Amount, StageName, Account.Name
FROM Opportunity 
WHERE (Description = null 
   OR Amount = null 
   OR CloseDate < TODAY)
  AND StageName NOT IN ('Closed Won', 'Closed Lost')
```

### Stalled Opportunities
```sql
SELECT Id, Name, Amount, StageName, LastModifiedDate, Account.Name,
       (SELECT COUNT(Id) FROM Tasks WHERE WhatId = Opportunity.Id AND ActivityDate >= LAST_N_DAYS:30)
FROM Opportunity 
WHERE StageName NOT IN ('Closed Won', 'Closed Lost')
  AND LastModifiedDate <= LAST_N_DAYS:30
ORDER BY Amount DESC
```

## Usage Notes

### Query Optimization
- Always use `LIMIT` clauses to prevent large result sets
- Use selective WHERE clauses with indexed fields
- Consider using `OFFSET` for pagination

### Field Access
- Ensure your Connected App has access to all required fields
- Some fields may require additional permissions
- Test queries in Developer Console first

### Date Handling
- Use SOQL date literals like `TODAY`, `LAST_N_DAYS:30`
- Format dates as `YYYY-MM-DD` for specific dates
- Use `LAST_N_MONTHS:6` for relative date ranges

### Best Practices
- Cache frequently accessed data when possible
- Use bulk queries instead of individual record queries
- Monitor API usage limits (typically 5,000 calls per 24 hours for Developer orgs)