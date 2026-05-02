document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const errorMessage = document.getElementById('error-message');
  const submitButton = loginForm.querySelector('button[type="submit"]');

  checkExistingSession();
  loginForm.addEventListener('submit', onSubmit);

  async function checkExistingSession() {
    try {
      const response = await fetch('/.netlify/functions/admin-session', {
        credentials: 'same-origin',
        cache: 'no-store'
      });

      if (response.ok) {
        window.location.replace('panel.html');
      }
    } catch (error) {
      console.error('Session check failed:', error);
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    errorMessage.style.display = 'none';
    submitButton.disabled = true;
    submitButton.textContent = 'Entrando...';

    const username = event.target.username.value;
    const password = event.target.password.value;

    try {
      const response = await fetch('/.netlify/functions/admin-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        errorMessage.style.display = 'block';
        return;
      }

      window.location.replace('panel.html');
    } catch (error) {
      console.error('Login request failed:', error);
      errorMessage.textContent = 'Nao foi possivel entrar. Tente novamente.';
      errorMessage.style.display = 'block';
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Entrar';
    }
  }
});
