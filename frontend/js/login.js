// Presenta las credenciales a la API y cambia a la pantalla privada solo cuando
// la respuesta confirma un rol admitido; el token permanece en cookie HttpOnly.
const form = document.querySelector('#login-form');
const errorMessage = document.querySelector('#login-error');
const submitButton = document.querySelector('#submit-button');

form.addEventListener('submit', async (event) => {
  // Evita una navegación de formulario tradicional para poder informar errores
  // en contexto y bloquear el botón mientras se completa la petición.
  event.preventDefault();
  errorMessage.textContent = '';
  submitButton.disabled = true;

  const formData = new FormData(form);

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        email: formData.get('email'),
        password: formData.get('password')
      })
    });
    const result = await response.json();

    if (!response.ok) {
      errorMessage.textContent = result.error || 'No se pudo iniciar sesión.';
      return;
    }

    if (!['admin', 'empleado', 'almacenista', 'mecanico'].includes(result.rol)) {
      errorMessage.textContent = 'La cuenta no tiene un rol de acceso válido.';
      return;
    }

    // Se usa únicamente para adaptar la interfaz; el servidor valida siempre
    // el token y el rol antes de servir datos u operaciones protegidas.
    localStorage.setItem('userRole', result.rol);
    localStorage.setItem('userEmail', result.email);
    window.location.href = '/inventario';
  } catch {
    errorMessage.textContent = 'No se pudo conectar con el servidor. Inténtalo de nuevo.';
  } finally {
    submitButton.disabled = false;
  }
});
