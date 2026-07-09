(function () {
  window.IntegrApexModules = window.IntegrApexModules || {};

  window.IntegrApexModules.coreLayout = {
    // MOSTRAR INTERFAZ AUTENTICADA: Hace visibles el header y sidebar de la aplicación, despliega el badge del usuario actual y activa las notificaciones.
    showLoggedInUI() {
    document.getElementById('app-header').style.display = 'flex';
    document.getElementById('app-sidebar').style.display = 'flex';
    const badge = document.getElementById('header-user-badge');
    badge.innerHTML = `<strong>${this.state.user.nombre}</strong> (${this.state.user.rol})`;
    this.renderSidebar();
    if (typeof this.initNotifPolling === 'function') this.initNotifPolling();
  },

    // DIBUJAR MENÚ LATERAL: Genera dinámicamente los enlaces del sidebar en función del rol y permisos del usuario activo.
    renderSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const rol = this.state.user.rol;

    let html = '';

    html += `
      <a class="sidebar-menu-item active" data-screen="inicio" onclick="app.navigate('inicio')">
        <span class="item-left">
          <span class="material-icons-round">home</span>
          <span>Inicio</span>
        </span>
      </a>
      <div class="sidebar-section-title">Ciclos</div>
    `;

    if (rol === 'residente') {
      html += `
        <a class="sidebar-menu-item" data-screen="alta-contrato" onclick="app.navigate('alta-contrato')">
          <span class="item-left"><span class="material-icons-round">post_add</span><span>Alta de contratos</span></span>
          <span class="hu-tag">HU-01</span>
        </a>
        <a class="sidebar-menu-item" onclick="app.showToast('Módulo en solo lectura', 'info')">
          <span class="item-left"><span class="material-icons-round">verified_user</span><span>Fianzas / garantías</span></span>
          <span class="hu-tag">HU-02</span>
        </a>
        <a class="sidebar-menu-item" onclick="app.openEstimacionesModule()">
          <span class="item-left"><span class="material-icons-round">query_stats</span><span>Ciclo de estimación</span></span>
          <span class="hu-tag">HU 12-15</span>
        </a>
        <a class="sidebar-menu-item" onclick="app.openContractModule('bitacora')">
          <span class="item-left"><span class="material-icons-round">menu_book</span><span>Bitácora</span></span>
          <span class="hu-tag">HU 08-11</span>
        </a>
        <a class="sidebar-menu-item" onclick="app.openContractModule('programa')">
          <span class="item-left"><span class="material-icons-round">insights</span><span>Avance y seguimiento</span></span>
          <span class="hu-tag">HU 05-07</span>
        </a>
        <a class="sidebar-menu-item readonly">
          <span class="item-left"><span class="material-icons-round">payment</span><span>Pago y tránsito</span></span>
          <span class="hu-tag">HU 20-21</span>
        </a>
        <a class="sidebar-menu-item readonly">
          <span class="item-left"><span class="material-icons-round">edit_note</span><span>Convenios</span></span>
          <span class="hu-tag">HU-03</span>
        </a>
        <a class="sidebar-menu-item" onclick="app.openContractModule('config')">
          <span class="item-left"><span class="material-icons-round">folder_zip</span><span>Expediente</span></span>
          <span class="hu-tag">HU-04</span>
        </a>
      `;
    }
    else if (rol === 'contratista' || rol === 'supervision') {
      html += `
        <a class="sidebar-menu-item readonly">
          <span class="item-left"><span class="material-icons-round">post_add</span><span>Alta de contratos</span></span>
          <span class="hu-tag">HU-01</span>
        </a>
        <a class="sidebar-menu-item" onclick="app.openEstimacionesModule()">
          <span class="item-left"><span class="material-icons-round">query_stats</span><span>Ciclo de estimación</span></span>
          <span class="hu-tag">HU 12-15</span>
        </a>
        <a class="sidebar-menu-item" onclick="app.openContractModule('bitacora')">
          <span class="item-left"><span class="material-icons-round">menu_book</span><span>Bitácora</span></span>
          <span class="hu-tag">HU 08-11</span>
        </a>
        <a class="sidebar-menu-item" onclick="app.openContractModule('programa')">
          <span class="item-left"><span class="material-icons-round">insights</span><span>Avance y seguimiento</span></span>
          <span class="hu-tag">HU 05-07</span>
        </a>
        <a class="sidebar-menu-item" onclick="app.openEstimacionesModule()">
          <span class="item-left"><span class="material-icons-round">payment</span><span>Pago y tránsito</span></span>
          <span class="hu-tag">HU 20-21</span>
        </a>
        <a class="sidebar-menu-item readonly">
          <span class="item-left"><span class="material-icons-round">edit_note</span><span>Convenios</span></span>
          <span class="hu-tag">HU-03</span>
        </a>
        <a class="sidebar-menu-item" data-screen="catalogo-banco" onclick="app.navigate('catalogo-banco')">
          <span class="item-left"><span class="material-icons-round">category</span><span>Banco de Catálogos</span></span>
        </a>
      `;
    }
    else if (rol === 'dependencia') {
      html += `
        <a class="sidebar-menu-item readonly">
          <span class="item-left"><span class="material-icons-round">post_add</span><span>Alta de contratos</span></span>
          <span class="hu-tag">HU-01</span>
        </a>
        <a class="sidebar-menu-item" onclick="app.openContractModule('fianzas')">
          <span class="item-left"><span class="material-icons-round">verified_user</span><span>Fianzas / garantías</span></span>
          <span class="hu-tag">HU-02</span>
        </a>
        <a class="sidebar-menu-item readonly">
          <span class="item-left"><span class="material-icons-round">payment</span><span>Pago y tránsito</span></span>
          <span class="hu-tag">HU 20-21</span>
        </a>
        <a class="sidebar-menu-item" onclick="app.openContractModule('convenios')">
          <span class="item-left"><span class="material-icons-round">edit_note</span><span>Convenios</span></span>
          <span class="hu-tag">HU-03</span>
        </a>
        <a class="sidebar-menu-item" data-screen="catalogo-banco" onclick="app.navigate('catalogo-banco')">
          <span class="item-left"><span class="material-icons-round">category</span><span>Banco de Catálogos</span></span>
        </a>
      `;
    }
    else if (rol === 'finanzas') {
      html += `
        <a class="sidebar-menu-item" onclick="app.openEstimacionesModule()">
          <span class="item-left"><span class="material-icons-round">payment</span><span>Registro de pagos</span></span>
          <span class="hu-tag">HU-21</span>
        </a>
      `;
    }

    html += `<div class="sidebar-section-title">Vistas Ejecutivas</div>`;
    if (rol === 'dependencia') {
      html += `
        <a class="sidebar-menu-item" onclick="app.openContractsPortafolio()">
          <span class="item-left"><span class="material-icons-round">dashboard</span><span>Portafolio</span></span>
          <span class="hu-tag">HU-18</span>
        </a>
      `;
    }
    if (rol === 'residente' || rol === 'contratista' || rol === 'supervision' || rol === 'finanzas') {
      html += `
        <a class="sidebar-menu-item" onclick="app.navigate('tablero-estimaciones')">
          <span class="item-left"><span class="material-icons-round">assignment_turned_in</span><span>Tablero de estimaciones</span></span>
          <span class="hu-tag">HU-17</span>
        </a>
      `;
    }
    if (rol === 'residente' || rol === 'contratista' || rol === 'supervision') {
      html += `
        <a class="sidebar-menu-item" onclick="app.navigate('por-firmar-bandeja')">
          <span class="item-left"><span class="material-icons-round">border_color</span><span>Por Firmar</span></span>
        </a>
      `;
    }
    html += `
      <a class="sidebar-menu-item" onclick="app.navigate('contracts-dashboard')">
        <span class="item-left"><span class="material-icons-round">list_alt</span><span>Listado de contratos</span></span>
        <span class="hu-tag">HU-04</span>
      </a>
    `;

    if (rol === 'dependencia') {
      html += `
        <div class="sidebar-section-title">Administración</div>
        <a class="sidebar-menu-item" data-screen="admin-approvals" onclick="app.navigate('admin-approvals')">
          <span class="item-left"><span class="material-icons-round">manage_accounts</span><span>Gestión de Usuarios</span></span>
        </a>
      `;
    }

    html += `
      <div style="flex-grow: 1;"></div>
      <a class="sidebar-menu-item" onclick="app.logout()" style="border-top: 1px solid rgba(255,255,255,0.05); color: #fca5a5;">
        <span class="item-left"><span class="material-icons-round">logout</span><span>Cerrar sesión</span></span>
      </a>
    `;

    sidebar.innerHTML = html;
  },

    // ABRIR MÓDULO DEL CONTRATO: Redirige al expediente y activa la pestaña correspondiente si hay un contrato previamente seleccionado.
    openContractModule(tabName) {
    if (this.state.currentContractId) {
      this.state.activeTab = tabName;
      this.navigate('contract-detail', { id: this.state.currentContractId });
    } else {
      this.showToast('Selecciona un contrato primero', 'info');
      this.navigate('contracts-dashboard');
    }
  },

    // ABRIR MÓDULO DE ESTIMACIONES: Navega al detalle del contrato actual y dibuja la sección del historial de estimaciones.
    async openEstimacionesModule() {
    if (this.state.currentContractId) {
      await this.navigate('contract-detail', { id: this.state.currentContractId });
      this.renderEstimacionesScreen();
    } else {
      this.showToast('Selecciona un contrato primero', 'info');
      this.navigate('contracts-dashboard');
    }
  },

    // ABRIR PORTAFOLIO: Navega a la vista unificada del portafolio ejecutivo de contratos.
    openContractsPortafolio() {
    this.navigate('portafolio-ejecutivo');
  },
  };
})();
