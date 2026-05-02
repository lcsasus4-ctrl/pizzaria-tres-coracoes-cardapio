const { createSessionCookie, verifyLogin } = require('./_admin-auth');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { username, password } = JSON.parse(event.body || '{}');
    if (!verifyLogin(username, password)) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        },
        body: JSON.stringify({ error: 'Credenciais invalidas.' })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Set-Cookie': createSessionCookie(username, process.env.ADMIN_SESSION_SECRET),
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      },
      body: JSON.stringify({ ok: true })
    };
  } catch (error) {
    console.error('Admin login error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      },
      body: JSON.stringify({ error: 'Falha ao processar login.' })
    };
  }
};
