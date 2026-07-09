(function () {
  window.IntegrApexModules = window.IntegrApexModules || {};

  // Escapa texto de usuario antes de insertarlo en innerHTML. Usar en todo
  // campo de captura libre (nombres, RFC, notas, comentarios, etc.) que
  // provenga de la API — evita XSS almacenado cuando ese texto lo escribió
  // un rol de menor confianza y lo termina viendo un rol con más privilegios.
  window.escapeHtml = function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  window.IntegrApexModules.coreUi = {
    // DESPLEGAR TOAST: Muestra notificaciones flotantes emergentes temporales (éxito, error, info) con autoocultado tras 4 segundos.
    showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const text = document.getElementById('toast-text');
    const icon = document.getElementById('toast-icon');

    text.textContent = message;

    if (type === 'success') {
      toast.className = 'toast success show';
      icon.textContent = 'check_circle_outline';
    } else if (type === 'error') {
      toast.className = 'toast error show';
      icon.textContent = 'error_outline';
    } else {
      toast.className = 'toast show';
      icon.textContent = 'info';
    }

    clearTimeout(this.state.toastTimeout);
    this.state.toastTimeout = setTimeout(() => {
      toast.className = 'toast';
    }, 4000);
  },

    // MOSTRAR VENTANA MODAL: Abre la ventana modal e inyecta dinámicamente el HTML recibido en el contenedor.
    showModal(htmlContent) {
    const backdrop = document.getElementById('modal-container');
    const content = document.getElementById('modal-content-outlet');
    content.innerHTML = htmlContent;
    backdrop.style.display = 'flex';
  },

    // CERRAR VENTANA MODAL: Oculta la ventana modal del viewport del usuario.
    closeModal() {
    const backdrop = document.getElementById('modal-container');
    backdrop.style.display = 'none';
  }
  };
})();
