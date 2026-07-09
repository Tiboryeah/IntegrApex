// Arranque principal de la SPA IntegrApex.
// El núcleo vive en js/core y las pantallas funcionales en js/modules.
const app = {
  state: {
    user: null, // Usuario autenticado: { id, email, nombre, rol }
    currentScreen: 'login',
    currentContractId: null,
    currentContractData: null,
    activeTab: 'config',
    sidebarCollapsed: false,
    toastTimeout: null
  }
};

if (window.IntegrApexModules) {
  Object.values(window.IntegrApexModules).forEach(module => Object.assign(app, module));
}

window.app = app;
window.onload = () => app.init();
