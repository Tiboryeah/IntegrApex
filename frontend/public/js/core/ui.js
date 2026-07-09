(function () {
  window.IntegrApexModules = window.IntegrApexModules || {};

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
