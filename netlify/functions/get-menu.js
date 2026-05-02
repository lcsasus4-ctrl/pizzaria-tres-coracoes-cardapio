const fs = require('fs/promises');
const path = require('path');

const MENU_CACHE_TTL_MS = 60 * 1000;
let memoryCache = {
  ts: 0,
  body: null
};

function normalizeMenu(data) {
  if (Array.isArray(data)) {
    return { items: data };
  }
  if (data && Array.isArray(data.items)) {
    return data;
  }
  return { items: [] };
}

function responseHeaders() {
  return {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
  };
}

async function loadLocalMenu() {
  const menuPath = path.join(__dirname, '..', '..', 'data', 'menu.json');
  const raw = await fs.readFile(menuPath, 'utf8');
  return normalizeMenu(JSON.parse(raw));
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const now = Date.now();
  if (memoryCache.body && now - memoryCache.ts < MENU_CACHE_TTL_MS) {
    return {
      statusCode: 200,
      headers: responseHeaders(),
      body: memoryCache.body
    };
  }

  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const path = 'data/menu.json';
  const branch = process.env.GITHUB_BRANCH || 'main';
  const githubToken = process.env.GITHUB_PAT;

  if (!owner || !repo || !githubToken) {
    try {
      const localMenu = loadLocalMenu();
      const body = JSON.stringify(await localMenu);
      memoryCache = { ts: now, body };
      return {
        statusCode: 200,
        headers: responseHeaders(),
        body
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers: responseHeaders(),
        body: JSON.stringify({ error: 'GitHub repository not configured' })
      };
    }
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        const localMenu = await loadLocalMenu();
        const body = JSON.stringify(localMenu);
        memoryCache = { ts: now, body };
        return {
          statusCode: 200,
          headers: responseHeaders(),
          body
        };
      }
      throw new Error(`GitHub API responded with ${response.status}`);
    }

    const data = await response.json();
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    const body = JSON.stringify(normalizeMenu(JSON.parse(content)));
    memoryCache = { ts: now, body };

    return {
      statusCode: 200,
      headers: responseHeaders(),
      body
    };
  } catch (error) {
    console.error('Error fetching from GitHub:', error);
    if (memoryCache.body) {
      return {
        statusCode: 200,
        headers: responseHeaders(),
        body: memoryCache.body
      };
    }
    return {
      statusCode: 500,
      headers: responseHeaders(),
      body: JSON.stringify({ error: 'Failed to fetch menu data' })
    };
  }
};
