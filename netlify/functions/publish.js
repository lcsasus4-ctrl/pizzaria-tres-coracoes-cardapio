// Esta função roda no servidor do Netlify, protegendo a URL do webhook
exports.handler = async function(event, context) {
  // Apenas aceita POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Pega a URL da variável de ambiente (Segurança)
  const buildHookUrl = process.env.NETLIFY_BUILD_HOOK_URL;

  if (!buildHookUrl) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Build Hook URL não configurada no Netlify." })
    };
  }

  try {
    // Dispara o deploy
    const response = await fetch(buildHookUrl, { method: 'POST' });

    if (response.ok) {
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, message: "Deploy iniciado com sucesso!" })
      };
    } else {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: "Erro ao disparar o hook do Netlify." })
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};