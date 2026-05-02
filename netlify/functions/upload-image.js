const fetch = require('node-fetch');
const { requireSession, unauthorized } = require('./_admin-auth');

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
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!githubToken || !owner || !repo) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'GitHub repository not configured.' })
    };
  }

  let filename;
  let imageBody;

  try {
    const payload = JSON.parse(event.body || '{}');
    filename = payload.filename;
    imageBody = payload.body.split(';base64,').pop();

    if (!filename || !imageBody) {
      throw new Error('Filename or image body not provided');
    }
  } catch (error) {
    return { statusCode: 400, body: 'Bad Request: Invalid JSON payload' };
  }

  const path = `assets/img/${filename}`;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: `Upload de imagem: ${filename}`,
        content: imageBody,
        branch
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to upload image. Status: ${response.status}. Body: ${errorBody}`);
    }

    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Imagem enviada com sucesso!', url: data.content.download_url })
    };
  } catch (error) {
    console.error('Error uploading image to GitHub:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Falha ao enviar a imagem.' })
    };
  }
};
