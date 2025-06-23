exports.handler = async (event) => {
  console.log('Opportunity Lambda invoked', JSON.stringify(event, null, 2));
  
  try {
    const { httpMethod } = event;
    
    switch (httpMethod) {
      case 'GET':
        // TODO: Implement fetching opportunities from Salesforce
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            opportunities: [],
            message: 'Get opportunities endpoint',
          }),
        };
        
      case 'POST':
        // TODO: Implement creating opportunity in Salesforce
        const body = JSON.parse(event.body || '{}');
        return {
          statusCode: 201,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            message: 'Create opportunity endpoint',
            data: body,
          }),
        };
        
      case 'PUT':
        // TODO: Implement updating opportunity in Salesforce
        const updateBody = JSON.parse(event.body || '{}');
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            message: 'Update opportunity endpoint',
            data: updateBody,
          }),
        };
        
      default:
        return {
          statusCode: 405,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            error: 'Method not allowed',
          }),
        };
    }
  } catch (error) {
    console.error('Error in opportunity function:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};