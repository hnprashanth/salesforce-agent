// Apex script to create comprehensive sample data for Salesforce Opportunity Assistant
// Run this in Developer Console: Debug > Open Execute Anonymous Window

// Create Sample Accounts
List<Account> accounts = new List<Account>();
accounts.add(new Account(Name='TechCorp Industries', Industry='Technology', AnnualRevenue=50000000, NumberOfEmployees=500, BillingCity='San Francisco', BillingState='CA'));
accounts.add(new Account(Name='Global Manufacturing Ltd', Industry='Manufacturing', AnnualRevenue=120000000, NumberOfEmployees=1200, BillingCity='Detroit', BillingState='MI'));
accounts.add(new Account(Name='FinanceFirst Solutions', Industry='Financial Services', AnnualRevenue=80000000, NumberOfEmployees=800, BillingCity='New York', BillingState='NY'));
accounts.add(new Account(Name='HealthCare Innovations', Industry='Healthcare', AnnualRevenue=45000000, NumberOfEmployees=350, BillingCity='Boston', BillingState='MA'));
accounts.add(new Account(Name='EduTech Systems', Industry='Education', AnnualRevenue=25000000, NumberOfEmployees=200, BillingCity='Austin', BillingState='TX'));
accounts.add(new Account(Name='RetailMax Corporation', Industry='Retail', AnnualRevenue=90000000, NumberOfEmployees=1500, BillingCity='Chicago', BillingState='IL'));
accounts.add(new Account(Name='EnergyFlow Partners', Industry='Energy', AnnualRevenue=200000000, NumberOfEmployees=2000, BillingCity='Houston', BillingState='TX'));
accounts.add(new Account(Name='MediaStream Solutions', Industry='Media', AnnualRevenue=35000000, NumberOfEmployees=400, BillingCity='Los Angeles', BillingState='CA'));
accounts.add(new Account(Name='ConsultPro Services', Industry='Consulting', AnnualRevenue=15000000, NumberOfEmployees=150, BillingCity='Seattle', BillingState='WA'));
accounts.add(new Account(Name='StartupVenture Inc', Industry='Technology', AnnualRevenue=5000000, NumberOfEmployees=50, BillingCity='Palo Alto', BillingState='CA'));

insert accounts;
System.debug('Created ' + accounts.size() + ' accounts');

// Create Sample Contacts
List<Contact> contacts = new List<Contact>();
String[] firstNames = new String[]{'John', 'Sarah', 'Michael', 'Lisa', 'Robert', 'Jessica', 'David', 'Emily', 'James', 'Maria'};
String[] lastNames = new String[]{'Smith', 'Johnson', 'Brown', 'Davis', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson'};
String[] titles = new String[]{'CEO', 'CTO', 'CFO', 'VP Sales', 'Director of Operations', 'Procurement Manager'};

Integer contactIndex = 0;
for (Account acc : accounts) {
    for (Integer i = 0; i < 3; i++) {
        Contact con = new Contact();
        con.FirstName = firstNames[Math.mod(contactIndex, firstNames.size())];
        con.LastName = lastNames[Math.mod(contactIndex, lastNames.size())];
        con.Title = titles[Math.mod(i, titles.size())];
        con.AccountId = acc.Id;
        con.Email = con.FirstName.toLowerCase() + '.' + con.LastName.toLowerCase() + '@' + acc.Name.replace(' ', '').toLowerCase() + '.com';
        con.Phone = '(' + String.valueOf(Math.mod(contactIndex, 999)).leftPad(3, '0') + ') 555-' + String.valueOf(Math.mod(contactIndex * 7, 9999)).leftPad(4, '0');
        contacts.add(con);
        contactIndex++;
    }
}

insert contacts;
System.debug('Created ' + contacts.size() + ' contacts');

// Create Sample Opportunities
List<Opportunity> opportunities = new List<Opportunity>();
String[] oppNames = new String[]{
    'Enterprise Software Implementation',
    'Cloud Infrastructure Upgrade',
    'Digital Transformation Project',
    'System Integration Services',
    'Platform Licensing Deal',
    'Consulting Services Agreement',
    'Technology Modernization',
    'Data Analytics Solution',
    'Security Enhancement Project',
    'Mobile App Development',
    'E-commerce Platform',
    'CRM Implementation',
    'Business Intelligence Suite',
    'Workflow Automation',
    'API Integration Project'
};

String[] stages = new String[]{'Prospecting', 'Qualification', 'Needs Analysis', 'Value Proposition', 'Id. Decision Makers', 'Proposal/Price Quote', 'Negotiation/Review'};
String[] closedStages = new String[]{'Closed Won', 'Closed Lost'};

// Active opportunities
for (Integer i = 0; i < 10; i++) {
    Opportunity opp = new Opportunity();
    opp.Name = oppNames[i];
    opp.AccountId = accounts[Math.mod(i, accounts.size())].Id;
    opp.Amount = 50000 + (Math.random() * 450000);
    opp.StageName = stages[Math.mod(i, stages.size())];
    opp.Probability = (opp.StageName == 'Prospecting') ? 10 : 
                     (opp.StageName == 'Qualification') ? 25 :
                     (opp.StageName == 'Needs Analysis') ? 30 :
                     (opp.StageName == 'Value Proposition') ? 40 :
                     (opp.StageName == 'Id. Decision Makers') ? 50 :
                     (opp.StageName == 'Proposal/Price Quote') ? 60 : 75;
    opp.CloseDate = Date.today().addDays(30 + Math.mod(i * 15, 90));
    opp.LeadSource = 'Web';
    opp.Description = 'Strategic opportunity for ' + accounts[Math.mod(i, accounts.size())].Name + '. Key requirements include scalability and integration capabilities.';
    opportunities.add(opp);
}

// Historical opportunities (for AI learning)
for (Integer i = 10; i < 15; i++) {
    Opportunity opp = new Opportunity();
    opp.Name = oppNames[i];
    opp.AccountId = accounts[Math.mod(i, accounts.size())].Id;
    opp.Amount = 75000 + (Math.random() * 300000);
    opp.StageName = closedStages[Math.mod(i, 2)];
    opp.Probability = (opp.StageName == 'Closed Won') ? 100 : 0;
    opp.CloseDate = Date.today().addDays(-30 - Math.mod(i * 10, 150));
    opp.LeadSource = 'Referral';
    
    if (opp.StageName == 'Closed Won') {
        opp.Description = 'Successfully closed deal. Key factors: strong ROI presentation, executive sponsorship, competitive pricing. Beat CompetitorX by 15%.';
    } else {
        opp.Description = 'Lost to CompetitorY. Reasons: budget constraints, longer implementation timeline, lack of specific industry features.';
    }
    opportunities.add(opp);
}

insert opportunities;
System.debug('Created ' + opportunities.size() + ' opportunities');

// Create Sample Tasks (Activities)
List<Task> tasks = new List<Task>();
String[] taskSubjects = new String[]{
    'Follow up with decision maker',
    'Send product demo recording',
    'Prepare contract proposal',
    'Schedule executive briefing',
    'Conduct technical requirements review',
    'Provide ROI analysis',
    'Address security concerns',
    'Present implementation timeline',
    'Negotiate pricing terms',
    'Finalize contract details'
};

for (Opportunity opp : opportunities) {
    if (opp.StageName != 'Closed Won' && opp.StageName != 'Closed Lost') {
        // Create 2-3 tasks per active opportunity
        for (Integer i = 0; i < 2; i++) {
            Task t = new Task();
            t.Subject = taskSubjects[Math.mod((Integer)(Math.random() * taskSubjects.size()), taskSubjects.size())];
            t.WhatId = opp.Id;
            t.ActivityDate = Date.today().addDays(1 + Math.mod(i * 3, 14));
            t.Priority = (Math.random() > 0.7) ? 'High' : (Math.random() > 0.4) ? 'Normal' : 'Low';
            t.Status = 'Not Started';
            t.Description = 'Important follow-up activity for ' + opp.Name + ' opportunity.';
            tasks.add(t);
        }
    }
}

insert tasks;
System.debug('Created ' + tasks.size() + ' tasks');

// Create Sample Cases
List<Case> cases = new List<Case>();
String[] caseSubjects = new String[]{
    'Integration Support Request',
    'Performance Optimization',
    'User Training Question',
    'API Documentation Request',
    'Feature Enhancement Request',
    'Technical Configuration Issue',
    'Data Migration Support',
    'Security Policy Question'
};

for (Integer i = 0; i < 8; i++) {
    Case c = new Case();
    c.Subject = caseSubjects[i];
    c.AccountId = accounts[Math.mod(i, accounts.size())].Id;
    c.ContactId = contacts[Math.mod(i * 3, contacts.size())].Id;
    c.Priority = (i < 2) ? 'High' : (i < 5) ? 'Medium' : 'Low';
    c.Status = (i < 3) ? 'New' : (i < 6) ? 'In Progress' : 'Closed';
    c.Origin = 'Email';
    c.Description = 'Customer support request related to ' + caseSubjects[i] + '. Requires technical assistance and follow-up.';
    cases.add(c);
}

insert cases;
System.debug('Created ' + cases.size() + ' cases');

System.debug('Sample data creation completed successfully!');
System.debug('Summary:');
System.debug('- Accounts: ' + accounts.size());
System.debug('- Contacts: ' + contacts.size());
System.debug('- Opportunities: ' + opportunities.size());
System.debug('- Tasks: ' + tasks.size());
System.debug('- Cases: ' + cases.size());