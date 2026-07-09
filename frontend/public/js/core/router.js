(function () {
  window.IntegrApexModules = window.IntegrApexModules || {};

  window.IntegrApexModules.coreRouter = {
    // INICIALIZACIÓN DEL ENRUTADOR: Vincula el botón del menú lateral, verifica la sesión actual e inicia la navegación en base al path del navegador.
    async init() {
    // Configura el botón que contrae o expande el menú lateral.
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', () => {
        const sidebar = document.getElementById('app-sidebar');
        this.state.sidebarCollapsed = !this.state.sidebarCollapsed;
        if (this.state.sidebarCollapsed) {
          sidebar.classList.add('collapsed');
        } else {
          sidebar.classList.remove('collapsed');
        }
      });
    }

    try {
      // La revisión inicial de sesión es silenciosa para no mostrar errores al visitante anónimo.
      const data = await this.api('/api/auth/me', {}, true);
      if (data.user) {
        this.state.user = data.user;
        this.showLoggedInUI();
        const route = this.getRouteFromLocation();
        this.navigate(route.screen === 'login' || route.screen === 'register' ? 'inicio' : route.screen, route.params, { replace: true });
      } else {
        const route = this.getRouteFromLocation();
        this.navigate(route.screen === 'register' ? 'register' : 'login', route.params, { replace: true });
      }
    } catch (e) {
      const route = this.getRouteFromLocation();
      this.navigate(route.screen === 'register' ? 'register' : 'login', route.params, { replace: true });
    }

    window.addEventListener('popstate', () => {
      const route = this.getRouteFromLocation();
      this.navigate(route.screen, route.params, { skipUrlUpdate: true });
    });
  },

    // NAVEGAR A PANTALLA: Cambia de pantalla activa en la SPA, actualiza la URL y renderiza el módulo correspondiente en el outlet.
    async navigate(screen, params = {}, options = {}) {
    if (!this.state.user && !['login', 'register'].includes(screen)) {
      screen = 'login';
      params = {};
      options = { ...options, replace: true };
    }

    this.state.currentScreen = screen;
    if (!options.skipUrlUpdate) {
      this.syncBrowserUrl(screen, params, options);
    }
    const outlet = document.getElementById('app-router-outlet');
    outlet.innerHTML = `<div style="display: flex; justify-content: center; align-items: center; min-height: 50vh;">
      <div style="font-size: 16px; color: var(--text-muted);">Cargando modulo...</div>
    </div>`;

    // Marca la opción activa del menú lateral.
    const items = document.querySelectorAll('.sidebar-menu-item');
    items.forEach(item => {
      if (item.dataset.screen === screen) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    if (screen === 'login') {
      this.renderLogin();
    } else if (screen === 'register') {
      this.renderRegister();
    } else if (screen === 'inicio') {
      await this.renderInicioDashboard();
    } else if (screen === 'alta-contrato') {
      await this.renderAltaContrato();
    } else if (screen === 'contracts-dashboard') {
      await this.renderContractsDashboard();
    } else if (screen === 'contract-detail') {
      this.state.currentContractId = params.id;
      await this.renderContractDetail();
    } else if (screen === 'admin-approvals') {
      await this.renderAdminApprovals();
    } else if (screen === 'por-firmar-bandeja') {
      await this.renderPorFirmarBandeja();
    } else if (screen === 'tablero-estimaciones') {
      await this.renderTableroEstimaciones();
    } else if (screen === 'portafolio-ejecutivo') {
      await this.renderPortafolioEjecutivo();
    }
  },

    // PARSEAR URL ACTUAL: Analiza la URL del navegador y retorna el par { screen, params } correspondiente para cargar la pantalla correcta.
    getRouteFromLocation() {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    const routes = {
      '/': { screen: 'login', params: {} },
      '/login': { screen: 'login', params: {} },
      '/registro': { screen: 'register', params: {} },
      '/inicio': { screen: 'inicio', params: {} },
      '/contratos': { screen: 'contracts-dashboard', params: {} },
      '/contratos/alta': { screen: 'alta-contrato', params: {} },
      '/admin/solicitudes': { screen: 'admin-approvals', params: {} },
      '/bitacora/por-firmar': { screen: 'por-firmar-bandeja', params: {} },
      '/estimaciones/tablero': { screen: 'tablero-estimaciones', params: {} },
      '/portafolio': { screen: 'portafolio-ejecutivo', params: {} }
    };

    if (routes[path]) return routes[path];
    const contractMatch = path.match(/^\/contratos\/([^/]+)$/);
    if (contractMatch) return { screen: 'contract-detail', params: { id: decodeURIComponent(contractMatch[1]) } };
    return { screen: this.state.user ? 'inicio' : 'login', params: {} };
  },

    // CONSTRUIR PATH DE RUTA: Retorna la URL relativa en base a la pantalla y los parámetros provistos.
    buildPathForRoute(screen, params = {}) {
    const paths = {
      login: '/login',
      register: '/registro',
      inicio: '/inicio',
      'alta-contrato': '/contratos/alta',
      'contracts-dashboard': '/contratos',
      'admin-approvals': '/admin/solicitudes',
      'por-firmar-bandeja': '/bitacora/por-firmar',
      'tablero-estimaciones': '/estimaciones/tablero',
      'portafolio-ejecutivo': '/portafolio'
    };

    if (screen === 'contract-detail' && params.id) {
      return `/contratos/${encodeURIComponent(params.id)}`;
    }
    return paths[screen] || '/inicio';
  },

    // SINCRONIZAR URL DEL NAVEGADOR: Empuja o reemplaza el historial del navegador con la nueva ruta sin recargar la página.
    syncBrowserUrl(screen, params = {}, options = {}) {
    const path = this.buildPathForRoute(screen, params);
    if (window.location.pathname === path && !window.location.hash) return;

    const state = { screen, params };
    if (options.replace) {
      window.history.replaceState(state, '', path);
    } else {
      window.history.pushState(state, '', path);
    }
  },

    // CERRAR SESIÓN: Envía la petición de logout al servidor, limpia las variables de estado e interrumpe el polling de notificaciones.
    logout() {
    fetch('/api/auth/logout', { method: 'POST' }).then(() => {
      this.state.user = null;
      if (this.state.notifPollHandle) {
        clearInterval(this.state.notifPollHandle);
        this.state.notifPollHandle = null;
      }
      document.getElementById('app-header').style.display = 'none';
      document.getElementById('app-sidebar').style.display = 'none';
      this.navigate('login');
      this.showToast('Sesión cerrada con éxito', 'success');
    });
  },
  };
})();
