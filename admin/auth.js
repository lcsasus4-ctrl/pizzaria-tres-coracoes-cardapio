(() => {
  if (window.location.pathname.endsWith('login.html')) {
    return;
  }

  async function verifySession() {
    try {
      const response = await fetch('/.netlify/functions/admin-session', {
        credentials: 'same-origin',
        cache: 'no-store'
      });

      if (!response.ok) {
        window.location.replace('login.html');
      }
    } catch (error) {
      window.location.replace('login.html');
    }
  }

  verifySession();
})();
