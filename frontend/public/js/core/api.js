(function () {
  window.IntegrApexModules = window.IntegrApexModules || {};

  window.IntegrApexModules.coreApi = {
    // FUNCIÓN DE CLIENTE API: Realiza peticiones HTTP genéricas al backend usando fetch, resolviendo respuestas JSON y mostrando notificaciones Toast de error automáticamente.
    async api(url, options = {}, silent = false) {
    try {
      const res = await fetch(url, options);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error en la solicitud');
      }
      return data;
    } catch (e) {
      if (!silent) this.showToast(e.message, 'error');
      throw e;
    }
  },
  };
})();
