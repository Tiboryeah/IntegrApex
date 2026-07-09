(function () {
  window.IntegrApexModules = window.IntegrApexModules || {};

  window.IntegrApexModules.coreApi = {
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
