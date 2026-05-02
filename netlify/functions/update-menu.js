const fetch = require('node-fetch');
const { requireSession, unauthorized } = require('./_admin-auth');

function normalizeMenu(data) {
  if (Array.isArray(data)) {
    return { items: data };
  }
  if (data && Array.isArray(data.items)) {
    return data;
  }
  return { items: [] };
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    if (!requireSession(event)) {
      return unauthorized();
    }
  } catch (error) {
    console.error('Admin session validation failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Falha ao validar sessao.' })
    };
  }

  const githubToken = process.env.GITHUB_PAT;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const path = 'data/menu.json';
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!githubToken || !owner || !repo) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'GitHub repository not configured.' })
    };
  }

  let payload;
  try {
    payload = normalizeMenu(JSON.parse(event.body || '{}'));
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid menu payload.' })
    };
  }

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  try {
    const getFileResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    if (!getFileResponse.ok && getFileResponse.status !== 404) {
      throw new Error(`Failed to fetch file SHA. Status: ${getFileResponse.status}`);
    }

    const fileData = await getFileResponse.json();
    const currentSha = fileData.sha;
    const encodedContent = Buffer.from(JSON.stringify(payload, null, 2)).toString('base64');

    const updateResponse = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: 'Atualiza cardapio via painel admin',
        content: encodedContent,
        sha: currentSha,
        branch
      })
    });

    if (!updateResponse.ok) {
      const errorBody = await updateResponse.text();
      throw new Error(`Failed to update file. Status: ${updateResponse.status}. Body: ${errorBody}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Cardapio atualizado com sucesso!', items: payload.items })
    };
  } catch (error) {
    console.error('Error updating file in GitHub:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Falha ao atualizar o cardapio.' })
    };
  }
};
