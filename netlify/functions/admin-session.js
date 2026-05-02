const { requireSession } = require('./_admin-auth');

exports.handler = async function(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const session = requireSession(event);
    if (!session) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        },
        body: JSON.stringify({ authenticated: false })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      },
      body: JSON.stringify({ authenticated: true, username: session.sub })
    };
  } catch (error) {
    console.error('Admin session error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      },
      body: JSON.stringify({ error: 'Falha ao validar sessao.' })
    };
  }
};
