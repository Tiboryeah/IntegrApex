// IntegrApex Front-end SPA Engine - Isolated Folder Version
//
// This file is the core: state, API wrapper, SPA router/navigation, login/register,
// dashboards, the contract-detail shell (tabs + outlet dispatcher) and modal/toast
// utilities. Feature-specific rendering and dialogs live in frontend/public/js/modules/
// and are merged onto this object via window.IntegrApexModules at the bottom of this
// file (see README.md "Convencion de Frontend").
const app = {
  state: {
    user: null, // Logged in user: { id, email, nombre, rol }
    currentScreen: 'login',
    currentContractId: null,
    currentContractData: null,
    activeTab: 'config',
    sidebarCollapsed: false,
    toastTimeout: null
  },

  // API Call Wrapper with silent option for auth checks
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

  // Toast notifications
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

  // Initialize
  async init() {
    // Setup Sidebar Toggle
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
      // Pass silent = true to avoid showing a toast error if not logged in initially
      const data = await this.api('/api/auth/me', {}, true);
      if (data.user) {
        this.state.user = data.user;
        this.showLoggedInUI();
        this.navigate('inicio');
      } else {
        this.navigate('login');
      }
    } catch (e) {
      this.navigate('login');
    }
  },

  // Show logged in elements
  showLoggedInUI() {
    document.getElementById('app-header').style.display = 'flex';
    document.getElementById('app-sidebar').style.display = 'flex';
    const badge = document.getElementById('header-user-badge');
    badge.innerHTML = `<strong>${this.state.user.nombre}</strong> (${this.state.user.rol})`;
    this.renderSidebar();
  },

  // SPA Router Navigation
  async navigate(screen, params = {}) {
    this.state.currentScreen = screen;
    const outlet = document.getElementById('app-router-outlet');
    outlet.innerHTML = `<div style="display: flex; justify-content: center; align-items: center; min-height: 50vh;">
      <div style="font-size: 16px; color: var(--text-muted);">Cargando modulo...</div>
    </div>`;

    // Highlight active sidebar item
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
    }
  },

  logout() {
    fetch('/api/auth/logout', { method: 'POST' }).then(() => {
      this.state.user = null;
      document.getElementById('app-header').style.display = 'none';
      document.getElementById('app-sidebar').style.display = 'none';
      this.navigate('login');
      this.showToast('Sesion cerrada con exito', 'success');
    });
  },

  // ==========================================
  // SIDEBAR NAVIGATION RENDERER BY ROLE
  // ==========================================
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
        <a class="sidebar-menu-item" onclick="app.showToast('Modulo en solo lectura', 'info')">
          <span class="item-left"><span class="material-icons-round">verified_user</span><span>Fianzas / garantias</span></span>
          <span class="hu-tag">HU-02</span>
        </a>
        <a class="sidebar-menu-item" onclick="app.openEstimacionesModule()">
          <span class="item-left"><span class="material-icons-round">query_stats</span><span>Ciclo de estimacion</span></span>
          <span class="hu-tag">HU 12-15</span>
        </a>
        <a class="sidebar-menu-item" onclick="app.openContractModule('bitacora')">
          <span class="item-left"><span class="material-icons-round">menu_book</span><span>Bitacora</span></span>
          <span class="hu-tag">HU 08-11</span>
        </a>
        <a class="sidebar-menu-item" onclick="app.openContractModule('programa')">
          <span class="item-left"><span class="material-icons-round">insights</span><span>Avance y seguimiento</span></span>
          <span class="hu-tag">HU 05-07</span>
        </a>
        <a class="sidebar-menu-item readonly">
          <span class="item-left"><span class="material-icons-round">payment</span><span>Pago y transito</span></span>
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
          <span class="item-left"><span class="material-icons-round">query_stats</span><span>Ciclo de estimacion</span></span>
          <span class="hu-tag">HU 12-15</span>
        </a>
        <a class="sidebar-menu-item" onclick="app.openContractModule('bitacora')">
          <span class="item-left"><span class="material-icons-round">menu_book</span><span>Bitacora</span></span>
          <span class="hu-tag">HU 08-11</span>
        </a>
        <a class="sidebar-menu-item" onclick="app.openContractModule('programa')">
          <span class="item-left"><span class="material-icons-round">insights</span><span>Avance y seguimiento</span></span>
          <span class="hu-tag">HU 05-07</span>
        </a>
        <a class="sidebar-menu-item" onclick="app.openEstimacionesModule()">
          <span class="item-left"><span class="material-icons-round">payment</span><span>Pago y transito</span></span>
          <span class="hu-tag">HU 20-21</span>
        </a>
        <a class="sidebar-menu-item readonly">
          <span class="item-left"><span class="material-icons-round">edit_note</span><span>Convenios</span></span>
          <span class="hu-tag">HU-03</span>
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
          <span class="item-left"><span class="material-icons-round">verified_user</span><span>Fianzas / garantias</span></span>
          <span class="hu-tag">HU-02</span>
        </a>
        <a class="sidebar-menu-item readonly">
          <span class="item-left"><span class="material-icons-round">payment</span><span>Pago y transito</span></span>
          <span class="hu-tag">HU 20-21</span>
        </a>
        <a class="sidebar-menu-item" onclick="app.openContractModule('convenios')">
          <span class="item-left"><span class="material-icons-round">edit_note</span><span>Convenios</span></span>
          <span class="hu-tag">HU-03</span>
        </a>
      `;
    }
    else if (rol === 'finanzas') {
      html += `
        <a class="sidebar-menu-item" onclick="app.openEstimacionesModule()">
          <span class="item-left"><span class="material-icons-round">payment</span><span>Registro de Pagos</span></span>
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
    html += `
      <a class="sidebar-menu-item" onclick="app.navigate('contracts-dashboard')">
        <span class="item-left"><span class="material-icons-round">list_alt</span><span>Listado Contratos</span></span>
        <span class="hu-tag">HU-04</span>
      </a>
    `;

    if (rol === 'dependencia') {
      html += `
        <div class="sidebar-section-title">Administracin</div>
        <a class="sidebar-menu-item" data-screen="admin-approvals" onclick="app.navigate('admin-approvals')">
          <span class="item-left"><span class="material-icons-round">how_to_reg</span><span>Solicitudes de registro</span></span>
          <span class="hu-tag">Registro</span>
        </a>
      `;
    }

    html += `
      <div style="flex-grow: 1;"></div>
      <a class="sidebar-menu-item" onclick="app.logout()" style="border-top: 1px solid rgba(255,255,255,0.05); color: #fca5a5;">
        <span class="item-left"><span class="material-icons-round">logout</span><span>Cambiar de rol</span></span>
      </a>
    `;

    sidebar.innerHTML = html;
  },

  openContractModule(tabName) {
    if (this.state.currentContractId) {
      this.state.activeTab = tabName;
      this.navigate('contract-detail', { id: this.state.currentContractId });
    } else {
      this.showToast('Seleccione un contrato primero', 'info');
      this.navigate('contracts-dashboard');
    }
  },

  // "Estimaciones" is a full-screen view (renderEstimacionesScreen), not a contract-detail
  // tab, so it needs its own entry point instead of openContractModule('estimaciones').
  async openEstimacionesModule() {
    if (this.state.currentContractId) {
      await this.navigate('contract-detail', { id: this.state.currentContractId });
      this.renderEstimacionesScreen();
    } else {
      this.showToast('Seleccione un contrato primero', 'info');
      this.navigate('contracts-dashboard');
    }
  },

  openContractsPortafolio() {
    this.navigate('contracts-dashboard');
  },

  // ==========================================
  // LOGIN SCREEN (HU-00)
  // ==========================================
  renderLogin() {
    document.getElementById('app-header').style.display = 'none';
    document.getElementById('app-sidebar').style.display = 'none';
    const outlet = document.getElementById('app-router-outlet');
    outlet.innerHTML = `
      <div class="auth-wrapper">
        <div class="auth-card" style="position: relative; overflow: hidden;">
          <div class="auth-card-escom-accent"></div>
          <div class="brand" style="justify-content: center; margin-bottom: 24px; pointer-events: none;">
            <div class="brand-icon">I</div>
            <div>
              <div class="brand-title" style="font-size: 22px;">IntegrApex</div>
              <div class="brand-subtitle" style="font-size: 11px;">IPN  -  ESCOM</div>
            </div>
          </div>
          <h2 style="margin-bottom: 24px; font-weight: 700; color: #0f172a;">Iniciar sesion</h2>
          <form id="login-form">
            <div class="form-group">
              <label>Correo</label>
              <input type="email" id="login-email" placeholder="usuario@dependencia.gob.mx" required>
            </div>
            <div class="form-group" style="margin-bottom: 24px;">
              <label>Contrasena</label>
              <input type="password" id="login-password" placeholder="""""""""" required>
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; margin-bottom: 16px;">
              Iniciar sesion
            </button>
          </form>
          <div style="font-size: 13px; color: var(--text-muted);">
            Eres nuevo? <a href="#" onclick="app.navigate('register')" style="color: var(--ipn-maroon-light); font-weight: 600; text-decoration: none;">Regstrate</a>
          </div>
        </div>
      </div>
    `;

    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;

      try {
        const data = await this.api('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        this.state.user = data.user;
        this.showLoggedInUI();
        this.showToast(`Bienvenido, ${data.user.nombre}`, 'success');
        this.navigate('inicio');
      } catch (err) {}
    });
  },

  // ==========================================
  // REGISTER SCREEN (Registro)
  // ==========================================
  renderRegister() {
    document.getElementById('app-header').style.display = 'none';
    document.getElementById('app-sidebar').style.display = 'none';
    const outlet = document.getElementById('app-router-outlet');
    outlet.innerHTML = `
      <div class="auth-wrapper">
        <div class="auth-card" style="max-width: 440px; position: relative; overflow: hidden;">
          <div class="auth-card-escom-accent"></div>
          <div class="brand" style="justify-content: center; margin-bottom: 20px; pointer-events: none;">
            <div class="brand-icon">I</div>
            <div>
              <div class="brand-title" style="font-size: 22px;">IntegrApex</div>
              <div class="brand-subtitle" style="font-size: 11px;">IPN  -  ESCOM</div>
            </div>
          </div>
          <h2 style="margin-bottom: 20px; font-weight: 700; color: #0f172a;">Solicitud de Registro</h2>
          <form id="register-form">
            <div class="form-group">
              <label>Nombre Completo</label>
              <input type="text" id="reg-name" placeholder="Ing. Juan Perez" required>
            </div>
            <div class="form-group">
              <label>Correo Electrunico</label>
              <input type="email" id="reg-email" placeholder="jperez@integrapex.test" required>
            </div>
            <div class="form-group">
              <label>Contrasena</label>
              <input type="password" id="reg-password" placeholder="""""""""" required>
            </div>
            <div class="form-group" style="margin-bottom: 20px;">
              <label>Rol Solicitado</label>
              <select id="reg-role" required>
                <option value="residente">Residente de Obra</option>
                <option value="contratista">Contratista / Superintendente</option>
                <option value="supervision">Supervisor Tecnico</option>
                <option value="dependencia">Administrador Dependencia</option>
                <option value="finanzas">Responsable de Finanzas</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; margin-bottom: 16px;">
              Enviar Solicitud
            </button>
          </form>
          <div style="font-size: 13px; color: var(--text-muted);">
            Ya tienes cuenta? <a href="#" onclick="app.navigate('login')" style="color: var(--ipn-maroon-light); font-weight: 600; text-decoration: none;">Inicia sesion</a>
          </div>
        </div>
      </div>
    `;

    document.getElementById('register-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombre = document.getElementById('reg-name').value;
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;
      const rol = document.getElementById('reg-role').value;

      try {
        await this.api('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre, email, password, rol })
        });
        this.showToast('Solicitud registrada. Pendiente de activacion.', 'success');
        this.navigate('login');
      } catch (err) {}
    });
  },

  // ==========================================
  // INICIO DASHBOARD
  // ==========================================
  async renderInicioDashboard() {
    this.showLoggedInUI();
    const outlet = document.getElementById('app-router-outlet');
    const rol = this.state.user.rol;

    let roleName = "Usuario";
    if (rol === 'residente') roleName = "RESIDENTE DE OBRA";
    if (rol === 'contratista') roleName = "CONTRATISTA / SUPERINTENDENTE";
    if (rol === 'supervision') roleName = "SUPERVISIN TCNICA";
    if (rol === 'dependencia') roleName = "DEPENDENCIA / CONTRATANTE";
    if (rol === 'finanzas') roleName = "RESPONSABLE DE FINANZAS";

    let grid = '';
    const flujos = [
      { id: 'alta', name: 'Alta de contrato', desc: 'Captura un contrato nuevo (7 pasos).', icon: 'post_add', roles: ['residente'] },
      { id: 'fianzas', name: 'Fianzas / garantias', desc: 'Registro de polizas y vigencias.', icon: 'verified_user', roles: ['dependencia'] },
      { id: 'estimacion', name: 'Ciclo de estimacion', desc: 'Integra, presenta, revisa y autoriza.', icon: 'query_stats', roles: ['contratista', 'supervision', 'residente'] },
      { id: 'bitacora', name: 'Bitacora', desc: 'Apertura, notas, consulta y minutas.', icon: 'menu_book', roles: ['residente', 'contratista', 'supervision'] },
      { id: 'avance', name: 'Avance y seguimiento', desc: 'Trabajos, curva y alertas de atraso.', icon: 'insights', roles: ['residente', 'contratista', 'supervision'] },
      { id: 'pago', name: 'Pago y transito', desc: 'Transito a pago y registro.', icon: 'payment', roles: ['finanzas', 'contratista'] },
      { id: 'convenios', name: 'Convenios', desc: 'Convenios modificatorios.', icon: 'edit_note', roles: ['dependencia'] },
      { id: 'expediente', name: 'Expediente', desc: 'El contrato consolidado en bloques.', icon: 'folder_zip', roles: ['residente', 'contratista', 'supervision', 'dependencia'] }
    ];

    flujos.forEach(f => {
      const isActive = f.roles.includes(rol);
      const readonlyBadge = isActive ? '' : '<span class="badge-readonly">Solo Lectura</span>';

      grid += `
        <div class="col-4 mini-card" onclick="app.clickFlowCard('${f.id}', ${isActive})">
          ${readonlyBadge}
          <div class="mini-card-icon">
            <span class="material-icons-round">${f.icon}</span>
          </div>
          <div class="mini-card-title">${f.name}</div>
          <div class="mini-card-desc">${f.desc}</div>
          <div style="font-size: 11.5px; color: var(--primary); font-weight:600; display:flex; align-items:center; gap:4px; margin-top:8px;">
            Abrir <span class="material-icons-round" style="font-size:12px;">arrow_forward</span>
          </div>
        </div>
      `;
    });

    outlet.innerHTML = `
      <div class="main-container">
        <h1 style="font-size: 28px; font-weight:700; color:#0f172a; margin-bottom: 6px;">Inicio</h1>
        <p style="color:var(--text-muted); font-size:14px; margin-bottom: 24px;">Gestion tecnico-administrativa de contratos de obra publica (LOPSRM / RLOPSRM).</p>

        <div style="display:inline-block; padding: 4px 12px; background:#f1f5f9; border-radius: 20px; font-size:11px; font-weight:700; color:var(--primary); margin-bottom:24px; border:1px solid #e2e8f0; letter-spacing:0.5px;">
          ACCESO: ${roleName}
        </div>

        <div class="alert-banner">
          <div style="display:flex; align-items:center; gap:12px;">
            <span class="material-icons-round" style="color:var(--accent-amber);">warning</span>
            <span><strong>Recordatorio:</strong> Inicie sesion real para registrar avances o bitacoras y validar firmas inmutables.</span>
          </div>
        </div>

        <h2 style="font-size: 18px; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-muted); margin-bottom: 16px;">Tus Flujos</h2>
        <div class="dashboard-grid">
          ${grid}
        </div>
      </div>
    `;
  },

  clickFlowCard(flowId, isActive) {
    if (!isActive) {
      this.showToast('Acceso en modo de Solo Lectura', 'info');
    }

    if (flowId === 'alta') {
      this.navigate('alta-contrato');
    } else if (flowId === 'expediente') {
      this.navigate('contracts-dashboard');
    } else if (flowId === 'bitacora') {
      this.openContractModule('bitacora');
    } else if (flowId === 'avance') {
      this.openContractModule('programa');
    } else if (flowId === 'fianzas') {
      this.openContractModule('fianzas');
    } else if (flowId === 'estimacion' || flowId === 'pago') {
      this.openEstimacionesModule();
    } else if (flowId === 'convenios') {
      this.openContractModule('convenios');
    }
  },

  // ==========================================
  // RENDER ADMIN APPROVALS (Registro)
  // ==========================================
  async renderAdminApprovals() {
    this.showLoggedInUI();
    const outlet = document.getElementById('app-router-outlet');

    try {
      const requests = await this.api('/api/admin/requests');

      let rows = '';
      if (requests.length === 0) {
        rows = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 30px;">No hay solicitudes pendientes de aprobacion</td></tr>`;
      } else {
        requests.forEach(req => {
          rows += `
            <tr>
              <td><strong>${req.nombre}</strong></td>
              <td>${req.email}</td>
              <td><span class="user-badge" style="background: var(--ipn-maroon); color: white;">${req.rol}</span></td>
              <td>
                <select id="role-override-${req.id}" style="padding: 6px; font-size: 13px;">
                  <option value="residente" ${req.rol === 'residente' ? 'selected' : ''}>Residente</option>
                  <option value="contratista" ${req.rol === 'contratista' ? 'selected' : ''}>Contratista</option>
                  <option value="supervision" ${req.rol === 'supervision' ? 'selected' : ''}>Supervision</option>
                  <option value="dependencia" ${req.rol === 'dependencia' ? 'selected' : ''}>Dependencia</option>
                  <option value="finanzas" ${req.rol === 'finanzas' ? 'selected' : ''}>Finanzas</option>
                </select>
              </td>
              <td>
                <div style="display: flex; gap: 8px;">
                  <button class="btn btn-primary btn-sm" onclick="app.resolveUserApproval('${req.id}', true)">Aprobar</button>
                  <button class="btn btn-secondary btn-sm btn-danger" onclick="app.resolveUserApproval('${req.id}', false)">Rechazar</button>
                </div>
              </td>
            </tr>
          `;
        });
      }

      outlet.innerHTML = `
        <div class="main-container">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h1>Solicitudes de Registro</h1>
            <button class="btn btn-secondary" onclick="app.navigate('inicio')">
              <span class="material-icons-round">arrow_back</span> Inicio
            </button>
          </div>
          <div class="glass-panel">
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol Solicitado</th>
                    <th>Rol Efectivo</th>
                    <th>Accion</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    } catch (e) {}
  },

  async resolveUserApproval(userId, approve) {
    const roleOverride = document.getElementById(`role-override-${userId}`).value;
    try {
      await this.api('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, approve, role: roleOverride })
      });
      this.showToast(approve ? 'Usuario aprobado' : 'Usuario rechazado', 'success');
      this.renderAdminApprovals();
    } catch (e) {}
  },

  // ==========================================
  // RENDER CONTRACTS DASHBOARD (List / Portafolio)
  // ==========================================
  async renderContractsDashboard() {
    this.showLoggedInUI();
    const outlet = document.getElementById('app-router-outlet');

    try {
      const contracts = await this.api('/api/contratos');

      let gridHtml = '';
      if (contracts.length === 0) {
        gridHtml = `<div class="col-12 glass-panel" style="padding: 40px; text-align: center; color: var(--text-muted);">
          No tienes contratos asociados asignados
        </div>`;
      } else {
        let portafolioData = [];
        if (this.state.user.rol === 'dependencia') {
          portafolioData = await this.api('/api/tableros/portafolio');
        }

        contracts.forEach(c => {
          let semaforoHtml = '';
          let progressHtml = '';

          if (this.state.user.rol === 'dependencia') {
            const extra = portafolioData.find(pd => pd.id === c.id);
            if (extra) {
              semaforoHtml = `
                <div style="display: flex; align-items: center; gap: 8px; margin-top: 12px;">
                  <span class="semaforo-dot ${extra.semaforo}"></span>
                  <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">Estatus Salud: ${extra.semaforo}</span>
                </div>
              `;
              progressHtml = `
                <div style="margin-top: 16px;">
                  <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-bottom: 6px;">
                    <span>Avance Fisico</span>
                    <span>${extra.avance_fisico.toFixed(1)}%</span>
                  <div style="height: 6px; background: #e2e8f0; border-radius: 3px; overflow:hidden;">
                    <div style="width: ${extra.avance_fisico}%; height: 100%; background: var(--ipn-maroon);"></div>
                  </div>
                </div>
              `;
            }
          }

          gridHtml += `
            <div class="col-4 mini-card" style="display:flex; flex-direction:column; justify-content:space-between;" onclick="app.selectContract('${c.id}')">
              <div>
                <span class="user-badge" style="background: var(--ipn-maroon); color:white; font-size:10px; font-weight:700;">${c.folio}</span>
                <h3 style="margin-top: 12px; font-size:15px; line-height: 1.4; color:#0f172a;">
                  ${c.objeto}
                </h3>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 10px;">
                  Monto: <strong>$${c.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                </div>
                ${semaforoHtml}
              </div>
              <div style="margin-top:20px;">
                ${progressHtml}
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-muted); border-top: 1px solid var(--border-color); padding-top: 12px; margin-top:16px;">
                  <span>Inicio: ${c.fecha_inicio}</span>
                  <span>Termino: ${c.fecha_termino}</span>
                </div>
              </div>
            </div>
          `;
        });
      }

      outlet.innerHTML = `
        <div class="main-container">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h1>Listado de Contratos Asignados</h1>
          </div>
          <div class="dashboard-grid">
            ${gridHtml}
          </div>
        </div>
      `;
    } catch (e) {}
  },

  async selectContract(contractId) {
    this.state.currentContractId = contractId;
    try {
      const contract = await this.api(`/api/contratos/${contractId}`);
      if (contract) {
        this.state.currentContractData = contract;
        document.getElementById('current-contract-selector').style.display = 'flex';
        document.getElementById('header-contract-folio').textContent = contract.folio;
        this.showToast(`Contrato ${contract.folio} seleccionado`, 'success');
        this.navigate('contract-detail', { id: contractId });
      }
    } catch (e) {}
  },

  // ==========================================
  // EXPEDIENTE DETALLADO (HU-04, Gantt, Curve S, Bitacora, Fianzas)
  // ==========================================
  async renderContractDetail() {
    const outlet = document.getElementById('app-router-outlet');
    const id = this.state.currentContractId;

    try {
      const contract = await this.api(`/api/contratos/${id}`);
      this.state.currentContractData = contract;

      document.getElementById('current-contract-selector').style.display = 'flex';
      document.getElementById('header-contract-folio').textContent = contract.folio;

      outlet.innerHTML = `
        <div class="main-container">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div>
              <span class="user-badge" style="background:var(--ipn-maroon); font-size:11px; font-weight:700; color:white;">${contract.folio}</span>
              <h1 style="margin-top: 8px; font-size: 24px; color:#0f172a;">${contract.objeto}</h1>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary" onclick="app.navigate('inicio')">
                <span class="material-icons-round">arrow_back</span> Inicio
              </button>
              <button class="btn btn-primary" onclick="app.renderEstimacionesScreen()">
                <span class="material-icons-round">receipt_long</span> Estimaciones
              </button>
            </div>
          </div>

          <div class="tabs">
            <div class="tab" onclick="app.switchTab('config')">Configuracin</div>
            <div class="tab" onclick="app.switchTab('catalogo')">Catalogo</div>
            <div class="tab" onclick="app.switchTab('programa')">Programa y Avance</div>
            <div class="tab" onclick="app.switchTab('fianzas')">Garantias</div>
            <div class="tab" onclick="app.switchTab('documentos')">Minutas / Visitas</div>
            <div class="tab" onclick="app.switchTab('bitacora')">Bitacora Notas</div>
            <div class="tab" onclick="app.switchTab('convenios')">Convenios</div>
          </div>

          <div id="tab-content-outlet"></div>
        </div>
      `;

      this.renderActiveTabContent();
    } catch(e) {}
  },

  switchTab(tabName) {
    this.state.activeTab = tabName;
    this.renderActiveTabContent();
  },

  // Dispatches to the render*Tab(contract, outlet) method contributed by the
  // matching feature module (js/modules/*.js) for the active tab.
  renderActiveTabContent() {
    const contract = this.state.currentContractData;
    const outlet = document.getElementById('tab-content-outlet');
    if (!outlet) return;

    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(t => {
      if (t.textContent.toLowerCase().includes(this.state.activeTab.substring(0,4))) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    const tabRenderers = {
      config: 'renderConfigTab',
      catalogo: 'renderCatalogoTab',
      programa: 'renderProgramaTab',
      fianzas: 'renderFianzasTab',
      documentos: 'renderDocumentosTab',
      bitacora: 'renderBitacoraTab',
      convenios: 'renderConveniosTab'
    };

    const rendererName = tabRenderers[this.state.activeTab];
    if (rendererName && typeof this[rendererName] === 'function') {
      this[rendererName](contract, outlet);
    }
  },

  // ==========================================
  // MODAL UTILS
  // ==========================================
  showModal(htmlContent) {
    const backdrop = document.getElementById('modal-container');
    const content = document.getElementById('modal-content-outlet');
    content.innerHTML = htmlContent;
    backdrop.style.display = 'flex';
  },

  closeModal() {
    const backdrop = document.getElementById('modal-container');
    backdrop.style.display = 'none';
  }
};

if (window.IntegrApexModules) {
  Object.values(window.IntegrApexModules).forEach(module => Object.assign(app, module));
}

window.app = app;
window.onload = () => app.init();
