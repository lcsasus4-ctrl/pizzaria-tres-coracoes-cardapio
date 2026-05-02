const { clearSessionCookie } = require('./_admin-auth');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  return {
    statusCode: 200,
    headers: {
      'Set-Cookie': clearSessionCookie(),
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify({ ok: true })
  };
};
