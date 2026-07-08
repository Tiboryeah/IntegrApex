// IntegrApex Front-end SPA Engine - Isolated Folder Version
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
        <a class="sidebar-menu-item" onclick="app.showToast('Modulo en solo lectura', 'info')">
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
        <a class="sidebar-menu-item" onclick="app.openContractModule('estimaciones')">
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
        <a class="sidebar-menu-item" onclick="app.openContractModule('estimaciones')">
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
        <a class="sidebar-menu-item" onclick="app.openContractModule('estimaciones')">
          <span class="item-left"><span class="material-icons-round">task</span><span>Revision / autorizacion</span></span>
          <span class="hu-tag">HU-15</span>
        </a>
        <a class="sidebar-menu-item" onclick="app.openContractModule('programa')">
          <span class="item-left"><span class="material-icons-round">insights</span><span>Curva de avance</span></span>
          <span class="hu-tag">HU-05</span>
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
        <a class="sidebar-menu-item" onclick="app.openContractModule('estimaciones')">
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
      { id: 'revision', name: 'Revision / autorizacion', desc: 'Flujo secuencial de estimaciones.', icon: 'task', roles: ['dependencia'] },
      { id: 'bitacora', name: 'Bitacora', desc: 'Apertura, notas, consulta y minutas.', icon: 'menu_book', roles: ['residente', 'contratista', 'supervision'] },
      { id: 'avance', name: 'Avance y seguimiento', desc: 'Trabajos, curva y alertas de atraso.', icon: 'insights', roles: ['residente', 'contratista', 'supervision'] },
      { id: 'curva', name: 'Curva de avance', desc: 'Graficas fisicas y financieras.', icon: 'insights', roles: ['dependencia'] },
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
    } else if (flowId === 'avance' || flowId === 'curva') {
      this.openContractModule('programa');
    } else if (flowId === 'fianzas') {
      this.openContractModule('fianzas');
    } else if (flowId === 'estimacion' || flowId === 'revision' || flowId === 'pago') {
      this.openContractModule('estimaciones');
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
      const data = await this.api(`/api/contratos/${contractId}`);
      const contract = data.contrato;
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
  // RENDER POR FIRMAR BANDEJA (Por Firmar)
  // ==========================================
  async renderPorFirmarBandeja() {
    const outlet = document.getElementById('app-router-outlet');
    try {
      const pending = await this.api('/api/bitacora/por-firmar');
      
      let rows = '';
      if (pending.length === 0) {
        rows = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 30px;">No tienes firmas pendientes</td></tr>`;
      } else {
        pending.forEach(p => {
          rows += `
            <tr>
              <td><strong>${p.folio}</strong></td>
              <td>${p.objeto}</td>
              <td>${p.fecha_entrega_sitio}</td>
              <td>
                <button class="btn btn-primary btn-sm" onclick="app.signBitacoraApertura('${p.bitacora_id}')">
                  <span class="material-icons-round" style="font-size: 14px;">border_color</span> Firmar Acta
                </button>
              </td>
            </tr>
          `;
        });
      }

      outlet.innerHTML = `
        <div class="main-container">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h1>Firmas de Bitacora Pendientes</h1>
            <button class="btn btn-secondary" onclick="app.navigate('inicio')">
              <span class="material-icons-round">arrow_back</span> Inicio
            </button>
          </div>
          <div class="glass-panel">
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Folio Contrato</th>
                    <th>Objeto de Obra</th>
                    <th>Fecha Entrega Sitio</th>
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

  async signBitacoraApertura(bitacoraId) {
    try {
      await this.api(`/api/bitacora/${bitacoraId}/firmar`, { method: 'POST' });
      this.showToast('Acta firmada con exito', 'success');
      this.renderPorFirmarBandeja();
    } catch (e) {}
  },

  // ==========================================
  // ALTA DE CONTRATOS SCREEN (HU-01)
  // ==========================================
  async renderAltaContrato() {
    const outlet = document.getElementById('app-router-outlet');
    
    try {
      const users = await this.api('/api/users');
      
      const residentes = users.filter(u => u.rol === 'residente' && u.estado === 'aprobado');
      const contratistas = users.filter(u => u.rol === 'contratista' && u.estado === 'aprobado');
      const supervisores = users.filter(u => u.rol === 'supervision' && u.estado === 'aprobado');

      const resOpts = residentes.map(u => `<option value="${u.id}">${u.nombre} (${u.email})</option>`).join('');
      const conOpts = contratistas.map(u => `<option value="${u.id}">${u.nombre} (${u.email})</option>`).join('');
      const supOpts = '<option value="">Ninguno</option>' + supervisores.map(u => `<option value="${u.id}">${u.nombre} (${u.email})</option>`).join('');

      outlet.innerHTML = `
        <div class="main-container" style="max-width: 900px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h1>Alta de Contrato (HU-01)</h1>
            <button class="btn btn-secondary" onclick="app.navigate('inicio')">
              Cancelar
            </button>
          </div>
          <form id="alta-contrato-form" class="glass-panel">
            <h2 style="font-size:16px; margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:8px; color:var(--primary);">1. Datos Generales</h2>
            <div class="dashboard-grid">
              <div class="col-6 form-group">
                <label>Folio Contractual (unico)</label>
                <input type="text" id="c-folio" placeholder="SOP-2026-007" required>
              </div>
              <div class="col-6 form-group">
                <label>Monto Total Sin IVA (Subtotal)</label>
                <input type="number" id="c-monto" placeholder="8500000" required onchange="app.refreshAltaDerivedValues()">
              </div>
              <div class="col-12 form-group">
                <label>Objeto del Contrato</label>
                <textarea id="c-objeto" rows="2" placeholder="Describa el objeto de la obra..." required></textarea>
              </div>
              <div class="col-4 form-group">
                <label>Plazo (Dias Naturales)</label>
                <input type="number" id="c-plazo" placeholder="120" required>
              </div>
              <div class="col-4 form-group">
                <label>Fecha de Inicio</label>
                <input type="date" id="c-inicio" required>
              </div>
              <div class="col-4 form-group">
                <label>Anticipo (%)</label>
                <input type="number" id="c-anticipo" value="30" min="0" max="100" step="0.01" required onchange="app.refreshAltaDerivedValues()">
              </div>
              <div class="col-4 form-group">
                <label>Modalidad de Pago</label>
                <select id="c-modalidad">
                  <option value="Precios Unitarios">Precios Unitarios</option>
                  <option value="Precio Alzado">Precio Alzado</option>
                  <option value="Mixto">Mixto</option>
                </select>
              </div>
            </div>

            <h2 style="font-size:16px; margin-top:20px; margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:8px; color:var(--primary);">2. Equipo de Contrato</h2>
            <div class="dashboard-grid">
              <div class="col-4 form-group">
                <label>Residente de Obra</label>
                <select id="c-residente" required>${resOpts}</select>
              </div>
              <div class="col-4 form-group">
                <label>Superintendente (Contratista)</label>
                <select id="c-contratista" required>${conOpts}</select>
              </div>
              <div class="col-4 form-group">
                <label>Supervisor Tecnico</label>
                <select id="c-supervision">${supOpts}</select>
              </div>
            </div>

            <h2 style="font-size:16px; margin-top:20px; margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:8px; color:var(--primary);">3. Catalogo de Conceptos</h2>
            <div style="margin-bottom: 20px;">
              <div class="table-container">
                <table id="catalogo-table">
                  <thead>
                    <tr>
                      <th>Clave</th>
                      <th>Descripcion</th>
                      <th>Unidad</th>
                      <th>Cantidad</th>
                      <th>P. Unitario</th>
                      <th>Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><input type="text" class="cat-clave" value="CON-01" required style="padding: 6px;"></td>
                      <td><input type="text" class="cat-desc" value="Excavacion en zanja" required style="padding: 6px;"></td>
                      <td><input type="text" class="cat-unidad" value="m3" required style="padding: 6px;"></td>
                      <td><input type="number" class="cat-cantidad" value="1000" required style="padding: 6px;" onchange="app.recalcCatImportes()"></td>
                      <td><input type="number" class="cat-precio" value="120" required style="padding: 6px;" onchange="app.recalcCatImportes()"></td>
                      <td class="cat-importe">$120,000.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <button type="button" class="btn btn-secondary btn-sm" style="margin-top: 10px;" onclick="app.addConceptRow()">
                <span class="material-icons-round" style="font-size: 14px;">add</span> Agregar Concepto
              </button>
            </div>

            <h2 style="font-size:16px; margin-top:20px; margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:8px; color:var(--primary);">4. Programa de Obra Mes a Mes</h2>
            <p style="font-size:13px; color:var(--text-muted); line-height:1.5; margin-bottom:12px;">
              Capture la cantidad programada por concepto y periodo. La suma por concepto no debe exceder la cantidad contratada.
            </p>
            <div id="programa-captura-wrapper" class="table-container" style="margin-bottom:18px;">
              <div style="padding:18px; color:var(--text-muted);">Capture catalogo y plazo para generar el programa.</div>
            </div>

            <h2 style="font-size:16px; margin-top:20px; margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:8px; color:var(--primary);">5. Elementos Juridicos</h2>
            <div class="dashboard-grid">
              <div class="col-6 form-group">
                <label>Elementos de la Dependencia</label>
                <textarea id="c-jur-dep" rows="3" placeholder="Oficio de adjudicacion, suficiencia presupuestal, autorizaciones..." required></textarea>
              </div>
              <div class="col-6 form-group">
                <label>Elementos del Contratista</label>
                <textarea id="c-jur-cont" rows="3" placeholder="Acta constitutiva, representante legal, documentacion fiscal..." required></textarea>
              </div>
              <div class="col-12 form-group">
                <label>Fundamento Legal</label>
                <input type="text" id="c-jur-fundamento" value="LOPSRM / RLOPSRM" required>
              </div>
            </div>

            <h2 style="font-size:16px; margin-top:20px; margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:8px; color:var(--primary);">6. Garantias Iniciales</h2>
            <div class="table-container" style="margin-bottom:18px;">
              <table id="garantias-table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Afianzadora</th>
                    <th>Vigencia</th>
                    <th>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr data-tipo="anticipo">
                    <td><strong>Anticipo</strong></td>
                    <td><input type="text" class="gar-afianzadora" placeholder="Afianzadora" required style="padding:6px;"></td>
                    <td><input type="date" class="gar-vigencia" required style="padding:6px;"></td>
                    <td><input type="number" class="gar-monto" id="gar-anticipo" min="0.01" step="0.01" required style="padding:6px;"></td>
                  </tr>
                  <tr data-tipo="cumplimiento">
                    <td><strong>Cumplimiento</strong></td>
                    <td><input type="text" class="gar-afianzadora" placeholder="Afianzadora" required style="padding:6px;"></td>
                    <td><input type="date" class="gar-vigencia" required style="padding:6px;"></td>
                    <td><input type="number" class="gar-monto" id="gar-cumplimiento" min="0.01" step="0.01" required style="padding:6px;"></td>
                  </tr>
                  <tr data-tipo="vicios_ocultos">
                    <td><strong>Vicios ocultos</strong></td>
                    <td><input type="text" class="gar-afianzadora" placeholder="Afianzadora" required style="padding:6px;"></td>
                    <td><input type="date" class="gar-vigencia" required style="padding:6px;"></td>
                    <td><input type="number" class="gar-monto" id="gar-vicios" min="0.01" step="0.01" required style="padding:6px;"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2 style="font-size:16px; margin-top:20px; margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:8px; color:var(--primary);">7. Amortizacion y Penalizaciones</h2>
            <div class="dashboard-grid">
              <div class="col-6 form-group">
                <label>Plan de amortizacion calculado</label>
                <div id="amortizacion-preview" class="readonly-summary">Capture monto, anticipo y plazo para calcular el plan.</div>
              </div>
              <div class="col-3 form-group">
                <label>Retencion 5 al millar (%)</label>
                <input type="number" id="c-retencion" value="0.5" step="0.01" required>
              </div>
              <div class="col-3 form-group">
                <label>Pena convencional diaria (%)</label>
                <input type="number" id="c-pena-diaria" value="0.2" step="0.01" required>
              </div>
              <div class="col-12">
                <div class="readonly-summary">
                  Umbral informativo de anticipo: si el anticipo rebasa el 30%, documente justificacion y autorizacion conforme al Art. 50 fr. IV LOPSRM y Art. 139 RLOPSRM.
                </div>
              </div>
            </div>

            <h2 style="font-size:16px; margin-top:20px; margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:8px; color:var(--primary);">8. Archivo PDF del Contrato</h2>
            <div class="form-group">
              <div class="file-upload-wrapper" id="pdf-wrapper" style="border: 2px dashed #cbd5e1; padding: 24px; border-radius: 8px; text-align: center; cursor: pointer;">
                <span class="material-icons-round" style="font-size: 40px; color: var(--text-muted);">picture_as_pdf</span>
                <p style="margin-top: 8px; font-size:13px; color: var(--text-muted);">Selecciona el PDF firmado del contrato</p>
                <input type="file" id="c-pdf" accept=".pdf" style="display: none;">
              </div>
              <p id="pdf-selected-name" style="margin-top: 10px; font-size: 13px; color: var(--accent-green); text-align: center; font-weight: 600;"></p>
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 30px; padding: 14px; font-size:15px;">
              Guardar Contrato Nuevo
            </button>
          </form>
        </div>
      `;

      const wrapper = document.getElementById('pdf-wrapper');
      const fileInput = document.getElementById('c-pdf');
      const selectedName = document.getElementById('pdf-selected-name');
      
      wrapper.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
          selectedName.textContent = `Archivo seleccionado: ${fileInput.files[0].name}`;
        }
      });

      document.getElementById('alta-contrato-form').addEventListener('submit', (e) => {
        e.preventDefault();
        app.submitAltaContrato();
      });

      ['c-monto', 'c-anticipo', 'c-plazo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => app.refreshAltaDerivedValues());
      });
      this.refreshAltaDerivedValues();
    } catch (e) {}
  },

  refreshAltaDerivedValues() {
    const monto = parseFloat(document.getElementById('c-monto')?.value || 0);
    const anticipo = parseFloat(document.getElementById('c-anticipo')?.value || 30);
    const plazo = parseInt(document.getElementById('c-plazo')?.value || 0, 10);
    const anticipoMonto = monto * (anticipo / 100);
    const cumplimientoMonto = monto * 0.1;
    const meses = Math.max(1, Math.ceil((plazo || 30) / 30));

    const garAnticipo = document.getElementById('gar-anticipo');
    const garCumplimiento = document.getElementById('gar-cumplimiento');
    const garVicios = document.getElementById('gar-vicios');
    if (garAnticipo && !garAnticipo.dataset.touched) garAnticipo.value = anticipoMonto ? anticipoMonto.toFixed(2) : '';
    if (garCumplimiento && !garCumplimiento.dataset.touched) garCumplimiento.value = cumplimientoMonto ? cumplimientoMonto.toFixed(2) : '';
    if (garVicios && !garVicios.dataset.touched) garVicios.value = cumplimientoMonto ? cumplimientoMonto.toFixed(2) : '';

    document.querySelectorAll('.gar-monto').forEach(input => {
      input.addEventListener('input', () => { input.dataset.touched = 'true'; }, { once: true });
    });

    const preview = document.getElementById('amortizacion-preview');
    if (preview) {
      const mensual = meses ? anticipoMonto / meses : 0;
      preview.innerHTML = `
        <strong>${meses}</strong> periodo(s) mensuales.
        Anticipo estimado: <strong>$${anticipoMonto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>.
        Amortizacion por periodo: <strong>$${mensual.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>.
      `;
    }
    this.renderProgramaCaptura();
  },

  getCatalogoDraft() {
    const catalogo = [];
    document.querySelectorAll('#catalogo-table tbody tr').forEach(r => {
      const clave = r.querySelector('.cat-clave')?.value || '';
      const descripcion = r.querySelector('.cat-desc')?.value || '';
      const unidad = r.querySelector('.cat-unidad')?.value || '';
      const cantidad = parseFloat(r.querySelector('.cat-cantidad')?.value || 0);
      const precio_unitario = parseFloat(r.querySelector('.cat-precio')?.value || 0);
      if (clave) catalogo.push({ clave, descripcion, unidad, cantidad, precio_unitario });
    });
    return catalogo;
  },

  renderProgramaCaptura() {
    const wrapper = document.getElementById('programa-captura-wrapper');
    if (!wrapper) return;
    const plazo = parseInt(document.getElementById('c-plazo')?.value || 0, 10);
    const months = Math.max(1, Math.ceil((plazo || 30) / 30));
    const catalogo = this.getCatalogoDraft().filter(c => c.cantidad > 0);
    if (catalogo.length === 0) {
      wrapper.innerHTML = `<div style="padding:18px; color:var(--text-muted);">Capture conceptos con cantidad para generar el programa.</div>`;
      return;
    }

    const header = Array.from({ length: months }, (_, idx) => `<th>Mes ${idx + 1}</th>`).join('');
    const rows = catalogo.map(c => {
      const perMonth = c.cantidad / months;
      const cells = Array.from({ length: months }, (_, idx) => `
        <td>
          <input type="number" class="prog-input" data-clave="${c.clave}" data-mes="${idx + 1}" min="0" step="any" value="${perMonth.toFixed(4)}" style="padding:6px;">
        </td>
      `).join('');
      return `
        <tr>
          <td><strong>${c.clave}</strong></td>
          <td>${c.cantidad.toLocaleString('es-MX')} ${c.unidad}</td>
          ${cells}
        </tr>
      `;
    }).join('');

    wrapper.innerHTML = `
      <table id="programa-table">
        <thead>
          <tr>
            <th>Concepto</th>
            <th>Cantidad contratada</th>
            ${header}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  },

  collectProgramaCaptura(catalogo, months) {
    const programa = Array.from({ length: months }, (_, idx) => ({ mes: idx + 1, avances: {} }));
    const inputs = document.querySelectorAll('#programa-table .prog-input');
    if (inputs.length === 0) {
      catalogo.forEach(c => {
        for (let m = 1; m <= months; m++) {
          programa[m - 1].avances[c.clave] = c.cantidad / months;
        }
      });
      return programa;
    }

    inputs.forEach(input => {
      const mes = parseInt(input.dataset.mes, 10);
      const clave = input.dataset.clave;
      if (programa[mes - 1] && clave) {
        programa[mes - 1].avances[clave] = parseFloat(input.value || 0);
      }
    });
    return programa;
  },

  addConceptRow() {
    const tbody = document.querySelector('#catalogo-table tbody');
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><input type="text" class="cat-clave" placeholder="CON-0X" required style="padding: 6px;"></td>
      <td><input type="text" class="cat-desc" placeholder="Descripcion" required style="padding: 6px;"></td>
      <td><input type="text" class="cat-unidad" placeholder="m2" required style="padding: 6px;"></td>
      <td><input type="number" class="cat-cantidad" placeholder="0" required style="padding: 6px;" onchange="app.recalcCatImportes()"></td>
      <td><input type="number" class="cat-precio" placeholder="0" required style="padding: 6px;" onchange="app.recalcCatImportes()"></td>
      <td class="cat-importe">$0.00</td>
    `;
    tbody.appendChild(row);
    this.renderProgramaCaptura();
  },

  recalcCatImportes() {
    const rows = document.querySelectorAll('#catalogo-table tbody tr');
    rows.forEach(r => {
      const qty = parseFloat(r.querySelector('.cat-cantidad').value || 0);
      const prc = parseFloat(r.querySelector('.cat-precio').value || 0);
      const imp = qty * prc;
      r.querySelector('.cat-importe').textContent = `$${imp.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
    });
    this.renderProgramaCaptura();
  },

  async submitAltaContrato() {
    const formData = new FormData();
    formData.append('folio', document.getElementById('c-folio').value);
    formData.append('objeto', document.getElementById('c-objeto').value);
    formData.append('monto', document.getElementById('c-monto').value);
    formData.append('anticipo_porcentaje', document.getElementById('c-anticipo').value);
    formData.append('plazo_dias', document.getElementById('c-plazo').value);
    formData.append('fecha_inicio', document.getElementById('c-inicio').value);
    formData.append('modalidad_pago', document.getElementById('c-modalidad').value);
    formData.append('residente_id', document.getElementById('c-residente').value);
    formData.append('superintendente_id', document.getElementById('c-contratista').value);
    formData.append('supervision_id', document.getElementById('c-supervision').value);
    
    const pdfInput = document.getElementById('c-pdf');
    if (pdfInput.files.length > 0) {
      formData.append('pdf_contrato', pdfInput.files[0]);
    }

    const catalogo = [];
    const rows = document.querySelectorAll('#catalogo-table tbody tr');
    rows.forEach(r => {
      catalogo.push({
        clave: r.querySelector('.cat-clave').value,
        descripcion: r.querySelector('.cat-desc').value,
        unidad: r.querySelector('.cat-unidad').value,
        cantidad: parseFloat(r.querySelector('.cat-cantidad').value),
        precio_unitario: parseFloat(r.querySelector('.cat-precio').value)
      });
    });
    formData.append('catalogo', JSON.stringify(catalogo));

    const months = Math.ceil(parseInt(document.getElementById('c-plazo').value) / 30);
    const programa = this.collectProgramaCaptura(catalogo, months);
    formData.append('programa', JSON.stringify(programa));

    const juridicos = {
      dependencia: document.getElementById('c-jur-dep').value,
      contratista: document.getElementById('c-jur-cont').value,
      fundamento_legal: document.getElementById('c-jur-fundamento').value
    };
    formData.append('juridicos', JSON.stringify(juridicos));

    const garantias = [];
    document.querySelectorAll('#garantias-table tbody tr').forEach(row => {
      garantias.push({
        tipo: row.dataset.tipo,
        afianzadora: row.querySelector('.gar-afianzadora').value,
        vigencia: row.querySelector('.gar-vigencia').value,
        monto: parseFloat(row.querySelector('.gar-monto').value || 0)
      });
    });
    formData.append('garantias', JSON.stringify(garantias));

    const monto = parseFloat(document.getElementById('c-monto').value || 0);
    const anticipo = parseFloat(document.getElementById('c-anticipo').value || 30);
    const anticipoMonto = monto * (anticipo / 100);
    const amortizacionPlan = [];
    for (let p = 1; p <= months; p++) {
      amortizacionPlan.push({
        periodo: p,
        porcentaje: parseFloat((anticipo / months).toFixed(4)),
        monto: parseFloat((anticipoMonto / months).toFixed(2))
      });
    }
    formData.append('amortizacion_plan', JSON.stringify(amortizacionPlan));

    const penalizaciones = [
      {
        tipo: 'retencion_5_millar',
        descripcion: 'Retencion 5 al millar por vigilancia e inspeccion, Art. 191 LFD',
        porcentaje: parseFloat(document.getElementById('c-retencion').value || 0.5),
        monto_base: monto
      },
      {
        tipo: 'pena_convencional_diaria',
        descripcion: 'Pena convencional diaria por atraso imputable al contratista',
        porcentaje: parseFloat(document.getElementById('c-pena-diaria').value || 0.2),
        monto_base: monto
      }
    ];
    formData.append('penalizaciones', JSON.stringify(penalizaciones));

    try {
      const res = await fetch('/api/contratos', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      this.showToast('Contrato registrado con exito', 'success');
      this.navigate('contracts-dashboard');
    } catch (e) {
      this.showToast(e.message, 'error');
    }
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

    if (this.state.activeTab === 'config') {
      fetch(`/api/contratos/${contract.id}/bitacora/notas`).then(res => res.json()).then(notes => {
        const opened = notes.length > 0;
        
        let bitBtn = '';
        if (!opened && this.state.user.rol === 'residente') {
          bitBtn = `<button class="btn btn-primary" onclick="app.aperturarBitacoraDialog()">Aperturar Bitacora</button>`;
        }

        document.getElementById('bitacora-status-panel').innerHTML = `
          <div class="glass-panel" style="height: 100%;">
            <h2>Apertura Bitacora (HU-08)</h2>
            <p style="margin-top: 12px; margin-bottom: 12px;">Estatus: <strong style="color: ${opened ? 'var(--accent-green)' : 'var(--accent-amber)'};">${opened ? 'APERTURADA Y ACTIVA' : 'INACTIVA / PENDIENTE'}</strong></p>
            <p style="margin-bottom: 20px; font-size: 13px; color: var(--text-muted); line-height: 1.5;">De acuerdo con el Art. 122 RLOPSRM, requiere la entrega del sitio y las firmas del equipo asignado.</p>
            ${bitBtn}
          </div>
        `;
      }).catch(() => {});

      const juridicos = contract.juridicos || {};
      const garantiasContrato = contract.garantias || [];
      const amortizacionPlan = contract.amortizacion_plan || [];
      const penalizacionesContrato = contract.penalizaciones || [];
      const documentos = contract.documentos || [];
      const versiones = contract.versiones || [];
      const juridicosHtml = `
        <div class="dashboard-grid" style="margin-top:18px;">
          <div class="col-6">
            <h3>Elementos de la Dependencia</h3>
            <p style="font-size:13px; color:var(--text-muted); line-height:1.5;">${juridicos.dependencia || 'Pendiente de captura'}</p>
          </div>
          <div class="col-6">
            <h3>Elementos del Contratista</h3>
            <p style="font-size:13px; color:var(--text-muted); line-height:1.5;">${juridicos.contratista || 'Pendiente de captura'}</p>
          </div>
          <div class="col-12">
            <h3>Fundamento Legal</h3>
            <p style="font-size:13px; color:var(--text-muted); line-height:1.5;">${juridicos.fundamento_legal || 'LOPSRM / RLOPSRM'}</p>
          </div>
        </div>
      `;
      const garantiasHtml = garantiasContrato.length
        ? garantiasContrato.map(g => `
            <tr>
              <td>${(g.tipo || '').replace('_', ' ')}</td>
              <td>${g.afianzadora || 'Pendiente'}</td>
              <td>${g.vigencia || 'Pendiente'}</td>
              <td>$${(g.monto || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
            </tr>
          `).join('')
        : `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Sin garantias capturadas desde el alta</td></tr>`;
      const amortizacionHtml = amortizacionPlan.length
        ? amortizacionPlan.slice(0, 6).map(p => `
            <tr>
              <td>${p.periodo}</td>
              <td>${p.porcentaje}%</td>
              <td>$${(p.monto || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
            </tr>
          `).join('')
        : `<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">Sin plan de amortizacion capturado</td></tr>`;
      const penalizacionesHtml = penalizacionesContrato.length
        ? penalizacionesContrato.map(p => `
            <tr>
              <td>${(p.tipo || '').replaceAll('_', ' ')}</td>
              <td>${p.descripcion || 'Sin descripcion'}</td>
              <td>${p.porcentaje || 0}%</td>
            </tr>
          `).join('')
        : `<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">Sin penalizaciones configuradas</td></tr>`;
      const documentosHtml = documentos.length
        ? documentos.map(d => `<li><a href="${d.path}" target="_blank">${d.nombre}</a> <span class="badge badge-authorized">${d.inmutable ? 'Inmutable' : 'Editable'}</span></li>`).join('')
        : '<li>Sin documentos cargados</li>';

      outlet.innerHTML = `
        <div class="dashboard-grid">
          <div class="col-8 glass-panel">
            <h2>Expediente del Contrato (HU-04)</h2>
            <table style="width: 100%; margin-top:16px;">
              <tr><td style="color: var(--text-muted); font-weight:600; width: 35%;">Folio de Obra:</td><td><strong>${contract.folio}</strong></td></tr>
              <tr><td style="color: var(--text-muted); font-weight:600;">Monto Contratado (Sin IVA):</td><td>$${contract.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })} M.N.</td></tr>
              <tr><td style="color: var(--text-muted); font-weight:600;">Monto Contratado (Con IVA):</td><td>$${(contract.monto * 1.16).toLocaleString('es-MX', { minimumFractionDigits: 2 })} M.N.</td></tr>
              <tr><td style="color: var(--text-muted); font-weight:600;">Plazo Contractual:</td><td>${contract.plazo_dias} Dias naturales</td></tr>
              <tr><td style="color: var(--text-muted); font-weight:600;">Fecha de Inicio / Termino:</td><td>${contract.fecha_inicio} al ${contract.fecha_termino}</td></tr>
              <tr><td style="color: var(--text-muted); font-weight:600;">Modalidad de Pago:</td><td>${contract.modalidad_pago}</td></tr>
              <tr><td style="color: var(--text-muted); font-weight:600;">PDF de Contrato Firmado:</td><td>
                ${contract.pdf_contrato ? `<a href="${contract.pdf_contrato}" target="_blank" style="color: var(--ipn-maroon-light); font-weight:600; text-decoration:none; display:flex; align-items:center; gap:6px;"><span class="material-icons-round" style="font-size:16px;">open_in_new</span> Abrir PDF Respaldo</a>` : '<span style="color:var(--text-muted);">Sin PDF cargado</span>'}
              </td></tr>
            </table>
            ${juridicosHtml}
          </div>
          <div class="col-4">
            <div id="bitacora-status-panel">
              <div class="glass-panel">Verificando estatus...</div>
            </div>
            
            <div class="glass-panel" style="margin-top: 24px;">
              <h2>Exportar Expediente (HU-19)</h2>
              <p style="font-size: 12.5px; color: var(--text-muted); margin-top: 8px; margin-bottom: 16px; line-height: 1.45;">
                Descarga cualquiera de los 7 reportes oficiales en formato CSV para su consulta en Microsoft Excel.
              </p>
              <div class="form-group">
                <label>Seleccionar Reporte</label>
                <select id="export-report-select" style="font-size: 13px; padding: 8px;">
                  <option value="fisico">1. Avance Fisico de Obra</option>
                  <option value="financiero">2. Avance Financiero</option>
                  <option value="estimaciones">3. Historial de Estimaciones</option>
                  <option value="observaciones">4. Observaciones de Revision</option>
                  <option value="bitacora">5. Bitacora de Notas</option>
                  <option value="modificatorios">6. Convenios Modificatorios</option>
                  <option value="penalizaciones">7. Registro de Penalizaciones</option>
                </select>
              </div>
              <button class="btn btn-secondary" style="width: 100%; font-size:13px; padding:9px;" onclick="app.descargarReporteExcel()">
                <span class="material-icons-round" style="font-size:16px;">download</span> Descargar Reporte
              </button>
            </div>
          </div>
          <div class="col-12 glass-panel">
            <h2>Garantias, Amortizacion y Penalizaciones (HU-01)</h2>
            <div class="dashboard-grid" style="margin-top:16px;">
              <div class="col-4">
                <h3>Garantias iniciales</h3>
                <div class="table-container" style="margin-top:10px;">
                  <table>
                    <thead><tr><th>Tipo</th><th>Afianzadora</th><th>Vigencia</th><th>Monto</th></tr></thead>
                    <tbody>${garantiasHtml}</tbody>
                  </table>
                </div>
              </div>
              <div class="col-4">
                <h3>Plan de amortizacion</h3>
                <div class="table-container" style="margin-top:10px;">
                  <table>
                    <thead><tr><th>Periodo</th><th>%</th><th>Monto</th></tr></thead>
                    <tbody>${amortizacionHtml}</tbody>
                  </table>
                </div>
                ${amortizacionPlan.length > 6 ? `<p style="font-size:12px; color:var(--text-muted); margin-top:8px;">Mostrando 6 de ${amortizacionPlan.length} periodos.</p>` : ''}
              </div>
              <div class="col-4">
                <h3>Penalizaciones</h3>
                <div class="table-container" style="margin-top:10px;">
                  <table>
                    <thead><tr><th>Tipo</th><th>Descripcion</th><th>%</th></tr></thead>
                    <tbody>${penalizacionesHtml}</tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          <div class="col-12 glass-panel">
            <h2>Buscador Global del Expediente (HU-04)</h2>
            <form id="expediente-search-form" class="dashboard-grid" style="gap:12px; margin-top:16px;">
              <div class="col-3 form-group">
                <label>Folio</label>
                <input type="text" id="exp-folio" placeholder="${contract.folio}">
              </div>
              <div class="col-3 form-group">
                <label>Contratista</label>
                <input type="text" id="exp-contratista" placeholder="Nombre o correo">
              </div>
              <div class="col-3 form-group">
                <label>Periodo</label>
                <input type="text" id="exp-periodo" placeholder="2026-07">
              </div>
              <div class="col-3 form-group">
                <label>Tipo/Bloque</label>
                <select id="exp-tipo">
                  <option value="">Todos</option>
                  <option value="contrato">Contrato</option>
                  <option value="documentos">Documentos</option>
                  <option value="fianzas">Fianzas</option>
                  <option value="convenios">Convenios</option>
                  <option value="bitacora">Bitacora</option>
                  <option value="minutas">Minutas</option>
                  <option value="visitas">Visitas</option>
                </select>
              </div>
              <div class="col-8 form-group">
                <label>Palabra clave</label>
                <input type="text" id="exp-query" placeholder="Buscar en titulo, descripcion o contenido">
              </div>
              <div class="col-4" style="display:flex; align-items:flex-end; gap:8px;">
                <button type="submit" class="btn btn-primary">Buscar</button>
                <button type="button" class="btn btn-secondary" onclick="app.clearExpedienteSearch()">Limpiar</button>
              </div>
            </form>
            <div id="expediente-search-results" class="table-container" style="margin-top:16px; display:none;"></div>
          </div>
          <div class="col-12 glass-panel">
            <h2>Control documental y versiones</h2>
            <div class="dashboard-grid" style="margin-top:16px;">
              <div class="col-6">
                <h3>Documentos</h3>
                <ul class="doc-list">${documentosHtml}</ul>
              </div>
              <div class="col-6">
                <h3>Version vigente</h3>
                <p style="font-size:13px; color:var(--text-muted); line-height:1.5;">
                  ${versiones.length ? `Version ${versiones[versiones.length - 1].version}: ${versiones[versiones.length - 1].motivo}` : 'Contrato sin snapshot de version registrado.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      `;

      document.getElementById('expediente-search-form').addEventListener('submit', (e) => {
        e.preventDefault();
        this.searchExpediente();
      });
    } 
    else if (this.state.activeTab === 'catalogo') {
      let rows = '';
      contract.catalogo.forEach(item => {
        const imp = item.precio_unitario * item.cantidad;
        rows += `
          <tr>
            <td><strong>${item.clave}</strong></td>
            <td>${item.descripcion}</td>
            <td>${item.unidad}</td>
            <td>${item.cantidad.toLocaleString('es-MX')}</td>
            <td>$${item.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
            <td>$${imp.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
          </tr>
        `;
      });

      outlet.innerHTML = `
        <div class="glass-panel">
          <h2>Catalogo de Conceptos Original</h2>
          <div class="table-container" style="margin-top:16px;">
            <table>
              <thead>
                <tr>
                  <th>Clave</th>
                  <th>Concepto</th>
                  <th>Unidad</th>
                  <th>Cantidad</th>
                  <th>P. Unitario</th>
                  <th>Importe</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } 
    else if (this.state.activeTab === 'programa') {
      if (typeof this.renderProgramaTab === 'function') {
        this.renderProgramaTab(contract, outlet);
        return;
      }

      const filterConcept = this.state.programaFilterConcept || '';
      const filterPeriod = parseInt(this.state.programaFilterPeriod || 0, 10);
      const conceptOptions = contract.catalogo.map(c => `<option value="${c.clave}" ${filterConcept === c.clave ? 'selected' : ''}>${c.clave} - ${c.descripcion}</option>`).join('');
      const periodOptions = contract.programa.map(m => `<option value="${m.mes}" ${filterPeriod === m.mes ? 'selected' : ''}>Periodo ${m.mes}</option>`).join('');

      Promise.all([
        fetch(`/api/contratos/${contract.id}/estimaciones`).then(res => res.json()),
        fetch(`/api/contratos/${contract.id}/trabajos-periodo`).then(res => res.json())
      ]).then(([ests, trabajos]) => {
        const totalMonths = contract.programa.length;
        const catalogoBase = filterConcept ? contract.catalogo.filter(c => c.clave === filterConcept) : contract.catalogo;
        const programaBase = filterPeriod ? contract.programa.filter(m => m.mes === filterPeriod) : contract.programa;
        const trabajosRegistrados = trabajos.filter(t => t.estado !== 'cancelado');
        const paidEsts = ests.filter(e => e.estado === 'pagada');

        const subtotalByQty = (clave, qty) => {
          const concept = contract.catalogo.find(item => item.clave === clave);
          return concept ? qty * concept.precio_unitario : 0;
        };

        const getWorkSubtotal = period => trabajosRegistrados
          .filter(t => !period || t.periodo_numero === period)
          .reduce((sum, t) => {
            Object.entries(t.cantidades || {}).forEach(([clave, qty]) => {
              if (!filterConcept || clave === filterConcept) sum += subtotalByQty(clave, parseFloat(qty || 0));
            });
            return sum;
          }, 0);

        const getPaidSubtotal = period => paidEsts
          .filter(e => !period || e.periodo_numero === period)
          .reduce((sum, e) => {
            if (filterConcept) return sum + subtotalByQty(filterConcept, parseFloat((e.avances || {})[filterConcept] || 0));
            return sum + e.subtotal;
          }, 0);

        const scopeAmount = catalogoBase.reduce((sum, c) => sum + c.cantidad * c.precio_unitario, 0) || contract.monto;
        let cumProg = 0;
        const progPoints = [0];
        contract.programa.forEach(m => {
          let mSum = 0;
          Object.entries(m.avances).forEach(([k, qty]) => {
            if (filterConcept && k !== filterConcept) return;
            const concept = contract.catalogo.find(item => item.clave === k);
            if (concept) mSum += qty * concept.precio_unitario;
          });
          cumProg += (mSum / scopeAmount) * 100;
          progPoints.push(Math.min(100, cumProg));
        });

        let cumReal = 0;
        const realPoints = [0];
        let cumFin = 0;
        const finPoints = [0];

        for (let m = 1; m <= totalMonths; m++) {
          cumReal += (getWorkSubtotal(m) / scopeAmount) * 100;
          cumFin += (getPaidSubtotal(m) / scopeAmount) * 100;
          realPoints.push(Math.min(100, cumReal));
          finPoints.push(Math.min(100, cumFin));
        }

        const width = 800;
        const height = 240;
        
        const getSvgPath = (pts, color) => {
          if (pts.length < 2) return '';
          let d = `M 50 ${height - 40}`;
          const xStep = (width - 100) / (pts.length - 1);
          pts.forEach((p, idx) => {
            const x = 50 + idx * xStep;
            const y = height - 40 - (p / 100) * (height - 80);
            d += ` L ${x} ${y}`;
          });
          return `<path d="${d}" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" />`;
        };

        const getSvgArea = (pts, gradId) => {
          if (pts.length < 2) return '';
          const xStep = (width - 100) / (pts.length - 1);
          let d = `M 50 ${height - 40}`;
          pts.forEach((p, idx) => {
            const x = 50 + idx * xStep;
            const y = height - 40 - (p / 100) * (height - 80);
            d += ` L ${x} ${y}`;
          });
          const lastX = 50 + (pts.length - 1) * xStep;
          d += ` L ${lastX} ${height - 40} Z`;
          return `<path d="${d}" fill="url(#${gradId})" stroke="none" />`;
        };

        const getSvgDots = (pts, color) => {
          if (pts.length < 2) return '';
          let html = '';
          const xStep = (width - 100) / (pts.length - 1);
          pts.forEach((p, idx) => {
            const x = 50 + idx * xStep;
            const y = height - 40 - (p / 100) * (height - 80);
            html += `<circle cx="${x}" cy="${y}" r="5" fill="${color}" stroke="#fff" stroke-width="2" />`;
          });
          return html;
        };

        const progPath = getSvgPath(progPoints, 'var(--ipn-maroon-light)');
        const progArea = getSvgArea(progPoints, 'grad-prog');
        
        const realPath = getSvgPath(realPoints, 'var(--accent-green)');
        const realArea = getSvgArea(realPoints, 'grad-real');

        const finPath = getSvgPath(finPoints, 'var(--accent-amber)');
        const finArea = getSvgArea(finPoints, 'grad-fin');

        const progDots = getSvgDots(progPoints, 'var(--ipn-maroon-light)');
        const realDots = getSvgDots(realPoints, 'var(--accent-green)');
        const finDots = getSvgDots(finPoints, 'var(--accent-amber)');

        document.getElementById('curve-s-chart-outlet').innerHTML = `
          <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}">
            <defs>
              <linearGradient id="grad-prog" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--ipn-maroon-light)" stop-opacity="0.12"/>
                <stop offset="100%" stop-color="var(--ipn-maroon-light)" stop-opacity="0"/>
              </linearGradient>
              <linearGradient id="grad-real" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--accent-green)" stop-opacity="0.12"/>
                <stop offset="100%" stop-color="var(--accent-green)" stop-opacity="0"/>
              </linearGradient>
              <linearGradient id="grad-fin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--accent-amber)" stop-opacity="0.12"/>
                <stop offset="100%" stop-color="var(--accent-amber)" stop-opacity="0"/>
              </linearGradient>
            </defs>

            <!-- Horizontal Grid lines -->
            <line x1="50" y1="${height - 40}" x2="${width - 50}" y2="${height - 40}" stroke="var(--border-color)" stroke-width="1.5" />
            <line x1="50" y1="40" x2="${width - 50}" y2="40" stroke="var(--border-color)" stroke-width="1.5" />
            <line x1="50" y1="${height - 40 - 40}" x2="${width - 50}" y2="${height - 40 - 40}" stroke="#f1f5f9" stroke-width="1" />
            <line x1="50" y1="${height - 40 - 80}" x2="${width - 50}" y2="${height - 40 - 80}" stroke="#f1f5f9" stroke-width="1" />
            <line x1="50" y1="${height - 40 - 120}" x2="${width - 50}" y2="${height - 40 - 120}" stroke="#f1f5f9" stroke-width="1" />
            <line x1="50" y1="${height - 40 - 160}" x2="${width - 50}" y2="${height - 40 - 160}" stroke="#f1f5f9" stroke-width="1" />

            <!-- Vertical grid lines for months -->
            ${progPoints.map((_, idx) => {
              const xStep = (width - 100) / (progPoints.length - 1);
              const x = 50 + idx * xStep;
              return `<line x1="${x}" y1="40" x2="${x}" y2="${height - 40}" stroke="#e2e8f0" stroke-width="0.8" stroke-dasharray="2 2" />`;
            }).join('')}

            <!-- Areas -->
            ${progArea}
            ${realArea}
            ${finArea}

            <!-- Paths -->
            ${progPath}
            ${realPath}
            ${finPath}

            <!-- Dots -->
            ${progDots}
            ${realDots}
            ${finDots}

            <text x="15" y="${height - 35}" fill="var(--text-muted)" font-size="11" font-weight="600">0%</text>
            <text x="10" y="${height - 35 - 80}" fill="var(--text-muted)" font-size="11" font-weight="600">50%</text>
            <text x="10" y="45" fill="var(--text-muted)" font-size="11" font-weight="600">100%</text>

            ${progPoints.map((_, idx) => {
              const xStep = (width - 100) / (progPoints.length - 1);
              const x = 50 + idx * xStep;
              const label = idx === 0 ? 'Inicio' : idx === progPoints.length - 1 ? 'Fin' : `Mes ${idx}`;
              return `<text x="${x}" y="${height - 12}" fill="var(--text-muted)" font-size="11" font-weight="600" text-anchor="middle">${label}</text>`;
            }).join('')}
          </svg>
        `;

        let ganttHeaderCols = '';
        const ganttMonths = filterPeriod ? [filterPeriod] : Array.from({ length: totalMonths }, (_, idx) => idx + 1);
        ganttMonths.forEach(m => {
          ganttHeaderCols += `<div class="gantt-period-cell">Mes ${m}</div>`;
        });

        let ganttRows = '';
        catalogoBase.forEach(item => {
          let monthBlocks = '';
          programaBase.forEach(m => {
            const scheduledQty = m.avances[item.clave] || 0;
            const execQty = trabajosRegistrados.reduce((sum, t) => {
              if (t.periodo_numero !== m.mes) return sum;
              return sum + parseFloat((t.cantidades || {})[item.clave] || 0);
            }, 0);
            const progress = scheduledQty > 0 ? Math.min(100, (execQty / scheduledQty) * 100) : 0;

            monthBlocks += `
              <div class="gantt-period-cell" style="padding: 6px; display: flex; align-items:center; justify-content:center;">
                ${scheduledQty > 0 ? `
                  <div class="gantt-bar" title="Programado: ${scheduledQty} / Ejecutado: ${execQty}">
                    <div class="gantt-progress" style="width: ${progress}%;"></div>
                  </div>
                ` : ''}
              </div>
            `;
          });

          ganttRows += `
            <div class="gantt-row">
              <div class="gantt-col-name">${item.clave}</div>
              <div class="gantt-col-periods">${monthBlocks}</div>
            </div>
          `;
        });

        const conceptRows = catalogoBase.map(item => {
          const scheduledQty = programaBase.reduce((sum, m) => sum + parseFloat((m.avances || {})[item.clave] || 0), 0);
          const executedQty = trabajosRegistrados
            .filter(t => !filterPeriod || t.periodo_numero === filterPeriod)
            .reduce((sum, t) => sum + parseFloat((t.cantidades || {})[item.clave] || 0), 0);
          const paidQty = paidEsts
            .filter(e => !filterPeriod || e.periodo_numero === filterPeriod)
            .reduce((sum, e) => sum + parseFloat((e.avances || {})[item.clave] || 0), 0);
          const pct = scheduledQty > 0 ? (executedQty / scheduledQty) * 100 : 0;
          return `
            <tr>
              <td><strong>${item.clave}</strong></td>
              <td>${scheduledQty.toFixed(2)}</td>
              <td>${executedQty.toFixed(2)}</td>
              <td>${paidQty.toFixed(2)}</td>
              <td>${Math.min(100, pct).toFixed(1)}%</td>
            </tr>
          `;
        }).join('');

        const trabajoRows = trabajosRegistrados.length === 0 ? `
          <tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:16px;">No hay trabajos terminados registrados.</td></tr>
        ` : trabajosRegistrados.map(t => {
          const total = Object.entries(t.cantidades || {}).reduce((sum, [clave, qty]) => sum + subtotalByQty(clave, parseFloat(qty || 0)), 0);
          return `
            <tr>
              <td>Periodo ${t.periodo_numero}</td>
              <td>${t.fecha_inicio} a ${t.fecha_fin}</td>
              <td>$${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
              <td>${t.nota_bitacora_id}</td>
              <td><span class="badge badge-authorized">${t.estado}</span></td>
            </tr>
          `;
        }).join('');

        const registerBtn = this.state.user.rol === 'contratista' ? `
          <button class="btn btn-primary btn-sm" onclick="app.registrarTrabajosPeriodoDialog()">Registrar trabajos</button>
        ` : '';

        document.getElementById('program-progress-summary').innerHTML = `
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Programado</th>
                  <th>Ejecutado</th>
                  <th>Pagado</th>
                  <th>Avance fisico</th>
                </tr>
              </thead>
              <tbody>${conceptRows}</tbody>
            </table>
          </div>
        `;

        document.getElementById('trabajos-periodo-outlet').innerHTML = `
          <div class="glass-panel">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:14px;">
              <h2>Trabajos Terminados por Periodo (HU-06)</h2>
              ${registerBtn}
            </div>
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Periodo</th>
                    <th>Fechas</th>
                    <th>Importe fisico</th>
                    <th>Nota vinculada</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>${trabajoRows}</tbody>
              </table>
            </div>
          </div>
        `;

        document.getElementById('gantt-chart-outlet').innerHTML = `
          <div class="gantt-container">
            <div class="gantt-header">
              <div class="gantt-col-name">Clave Concepto</div>
              <div class="gantt-col-periods">${ganttHeaderCols}</div>
            </div>
            </div>
            ${ganttRows}
          </div>
        `;

        app.renderConceptAlertsPanel(contract, trabajosRegistrados);
      }).catch(() => {});

      outlet.innerHTML = `
        <div class="dashboard-grid">
          <div class="col-12 glass-panel">
            <h2>Avance y Curva S (HU-05)</h2>
            <div class="filters-row" style="margin-top:14px;">
              <div class="form-group">
                <label>Filtrar concepto</label>
                <select onchange="app.applyProgramaFilters('concept', this.value)">
                  <option value="">Todos los conceptos</option>
                  ${conceptOptions}
                </select>
              </div>
              <div class="form-group">
                <label>Filtrar periodo</label>
                <select onchange="app.applyProgramaFilters('period', this.value)">
                  <option value="">Todos los periodos</option>
                  ${periodOptions}
                </select>
              </div>
            </div>
            <div style="display: flex; flex-wrap:wrap; gap: 20px; margin-top:12px; margin-bottom: 20px;">
              <div style="display: flex; align-items:center; gap: 8px; font-size:12px; font-weight:600; color:var(--text-muted);">
                <span style="display:inline-block; width: 20px; height: 3px; background: var(--ipn-maroon-light);"></span> Programado
              </div>
              <div style="display: flex; align-items:center; gap: 8px; font-size:12px; font-weight:600; color:var(--text-muted);">
                <span style="display:inline-block; width: 20px; height: 3px; background: var(--accent-green);"></span> Ejecutado (Fisico)
              </div>
              <div style="display: flex; align-items:center; gap: 8px; font-size:12px; font-weight:600; color:var(--text-muted);">
                <span style="display:inline-block; width: 20px; height: 3px; background: var(--accent-amber);"></span> Financiero (Pagado)
              </div>
            </div>
            <div class="svg-chart-wrapper" id="curve-s-chart-outlet">Cargando curva de avance...</div>
          </div>
          <div class="col-12 glass-panel">
            <h2>Avance por Concepto</h2>
            <div id="program-progress-summary" style="margin-top:16px;">Calculando avance...</div>
          </div>
          <div class="col-8 glass-panel">
            <h2>Matriz Gantt de Avances (HU-05)</h2>
            <div id="gantt-chart-outlet" style="margin-top:16px;">Cargando cronograma Gantt...</div>
          </div>
          <div class="col-4" id="concept-alerts-panel">
            <div class="glass-panel">Cargando alertas de atraso...</div>
          </div>
          <div class="col-12" id="trabajos-periodo-outlet">
            <div class="glass-panel">Cargando trabajos terminados...</div>
          </div>
        </div>
      `;
    } 
    else if (this.state.activeTab === 'fianzas') {
      let rows = '';
      if (contract.fianzas.length === 0) {
        rows = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding:24px;">No hay polizas registradas</td></tr>`;
      } else {
        contract.fianzas.forEach(f => {
          const remainingDays = Math.ceil((new Date(f.vigencia) - new Date()) / (1000 * 60 * 60 * 24));
          const thresholds = f.umbrales_alerta || [30, 15, 5];
          
          let alertLabel = '';
          if (remainingDays <= Math.min(...thresholds)) {
            alertLabel = `<span class="badge badge-rejected">Crtico (${remainingDays} d)</span>`;
          } else if (remainingDays <= (thresholds.find(n => n <= 15) || 15)) {
            alertLabel = `<span class="badge badge-presented">Preventivo (${remainingDays} d)</span>`;
          } else if (remainingDays <= Math.max(...thresholds)) {
            alertLabel = `<span class="badge badge-review">Alerta (${remainingDays} d)</span>`;
          } else {
            alertLabel = `<span class="badge badge-authorized">Vigente (${remainingDays} d)</span>`;
          }

          rows += `
            <tr>
              <td><strong>${f.tipo.toUpperCase()}</strong></td>
              <td>${f.afianzadora}</td>
              <td>$${f.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
              <td>${f.vigencia}</td>
              <td>${alertLabel}</td>
              <td>${thresholds.join(' / ')} dias</td>
              <td>${(f.endosos || []).length}</td>
              <td>
                ${f.pdf_poliza ? `<a class="btn btn-secondary btn-sm" href="${f.pdf_poliza}" target="_blank">Ver PDF</a>` : 'Sin archivo'}
                ${this.state.user.rol === 'dependencia' ? `<button class="btn btn-secondary btn-sm" onclick="app.registrarEndosoDialog('${f.id}')">Endoso</button>` : ''}
              </td>
            </tr>
          `;
        });
      }

      let actionBtn = '';
      if (this.state.user.rol === 'dependencia') {
        actionBtn = `
          <button class="btn btn-primary" onclick="app.registrarFianzaDialog()">
            <span class="material-icons-round">add</span> Registrar Fianza
          </button>
        `;
      }

      outlet.innerHTML = `
        <div class="glass-panel">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
            <h2>Fianzas y Garantias (HU-02)</h2>
            ${actionBtn}
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Afianzadora</th>
                  <th>Monto</th>
                  <th>Vencimiento</th>
                  <th>Estatus Alerta</th>
                  <th>Umbrales</th>
                  <th>Endosos</th>
                  <th>Accion</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } 
    else if (this.state.activeTab === 'documentos') {
      let minList = '';
      if (contract.minutas.length === 0) {
        minList = `<div style="text-align: center; color: var(--text-muted); padding:20px;">No hay minutas registradas</div>`;
      } else {
        contract.minutas.forEach(m => {
          minList += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid var(--border-color);">
              <div>
                <strong>${m.descripcion}</strong>
                <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">Reunin: ${m.fecha_reunion}</div>
              </div>
              <a href="${m.pdf_path}" target="_blank" class="btn btn-secondary btn-sm">Abrir PDF</a>
            </div>
          `;
        });
      }

      let visList = '';
      if (contract.visitas.length === 0) {
        visList = `<div style="text-align: center; color: var(--text-muted); padding:20px;">No hay visitas programadas</div>`;
      } else {
        contract.visitas.forEach(v => {
          visList += `
            <div style="padding:12px; border-bottom:1px solid var(--border-color);">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong>${v.descripcion}</strong>
                <span class="user-badge" style="background:#f1f5f9; color:#475569; border:none; margin:0;">${v.fecha_visita}</span>
              </div>
              <div style="font-size:12px; color:var(--text-muted); margin-top:6px;">Asistentes: ${v.asistentes}</div>
            </div>
          `;
        });
      }

      let btnHtml = '';
      if (this.state.user.rol === 'residente') {
        btnHtml = `
          <div style="display: flex; gap: 8px; margin-bottom: 20px;">
            <button class="btn btn-primary btn-sm" onclick="app.registrarMinutaDialog()">Cargar Minuta PDF</button>
            <button class="btn btn-secondary btn-sm" onclick="app.registrarVisitaDialog()">Agendar Inspeccion</button>
          </div>
        `;
      }

      outlet.innerHTML = `
        <div class="dashboard-grid">
          <div class="col-6 glass-panel">
            <h2>Minutas y Acuerdos (HU-11)</h2>
            <div style="margin-top:16px;">
              ${this.state.user.rol === 'residente' ? btnHtml : ''}
              <div class="table-container" style="border:none;">
                ${minList}
              </div>
            </div>
          </div>
          <div class="col-6 glass-panel">
            <h2>Visitas e Inspecciones Agendadas (HU-11)</h2>
            <div style="margin-top: ${this.state.user.rol === 'residente' ? '70px' : '16px'};">
              <div class="table-container" style="border:none;">
                ${visList}
              </div>
            </div>
          </div>
        </div>
      `;
    } 
    else if (this.state.activeTab === 'bitacora') {
      outlet.innerHTML = `
        <div class="dashboard-grid">
          <div class="col-12 glass-panel">
            <h2>Filtros de Busqueda de Bitacora (HU-10)</h2>
            <form id="bit-search-form" class="dashboard-grid" style="gap:15px; margin-top:12px; margin-bottom:0;">
              <div class="col-3 form-group" style="margin-bottom:0;">
                <label>Tipo Nota</label>
                <select id="s-tipo">
                  <option value="">Todos</option>
                  <option value="Apertura">Apertura</option>
                  <option value="Avance">Avance</option>
                  <option value="Solicitud">Solicitud</option>
                  <option value="Autorizacion">Autorizacion</option>
                  <option value="Incidencia">Incidencia</option>
                </select>
              </div>
              <div class="col-3 form-group" style="margin-bottom:0;">
                <label>Fecha Inicio</label>
                <input type="date" id="s-f-inicio">
              </div>
              <div class="col-3 form-group" style="margin-bottom:0;">
                <label>Busqueda Texto</label>
                <input type="text" id="s-query" placeholder="Palabra clave...">
              </div>
              <div class="col-3" style="display:flex; align-items:flex-end; gap:8px;">
                <button type="submit" class="btn btn-primary" style="width:100%; height:41px;">Buscar</button>
                <button type="button" class="btn btn-secondary" style="height:41px;" onclick="app.exportBitacoraExcel()">Exportar</button>
              </div>
            </form>
          </div>

          <div class="col-8" id="bitacora-notes-list">
            Cargando notas...
          </div>

          <div class="col-4 glass-panel" style="height: fit-content;">
            <h2>Nueva Nota de Bitacora (HU-09)</h2>
            <form id="new-note-form" style="margin-top:16px;">
              <div class="form-group">
                <label>Tipo de Nota</label>
                <select id="n-tipo" required></select>
              </div>
              <div class="form-group">
                <label>Vincular a Nota (Folio)</label>
                <input type="number" id="n-vinculo" placeholder="Opcional">
              </div>
              <div class="form-group">
                <label>Contenido</label>
                <textarea id="n-contenido" rows="5" placeholder="Asiente hechos..." required></textarea>
              </div>
              <button type="submit" class="btn btn-primary" style="width: 100%;">Emitir y Firmar Nota</button>
            </form>
          </div>
        </div>
      `;

      const noteTypeSelector = document.getElementById('n-tipo');
      if (this.state.user.rol === 'residente') {
        noteTypeSelector.innerHTML = `
          <option value="Autorizacion">Autorizacion</option>
          <option value="Aprobacion">Aprobacion</option>
          <option value="Instruccin">Instruccin</option>
          <option value="General">General</option>
        `;
      } else if (this.state.user.rol === 'contratista') {
        noteTypeSelector.innerHTML = `
          <option value="Solicitud">Solicitud</option>
          <option value="Aviso">Aviso</option>
          <option value="Entrega">Entrega</option>
          <option value="General">General</option>
        `;
      } else if (this.state.user.rol === 'supervision') {
        noteTypeSelector.innerHTML = `
          <option value="Avance">Avance</option>
          <option value="Incidencia">Incidencia</option>
          <option value="Reporte">Reporte</option>
          <option value="General">General</option>
        `;
      } else {
        noteTypeSelector.innerHTML = `<option value="General">General</option>`;
      }

      document.getElementById('bit-search-form').addEventListener('submit', (e) => {
        e.preventDefault();
        this.loadBitacoraNotes();
      });

      document.getElementById('new-note-form').addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitNewNote();
      });

      this.loadBitacoraNotes();
    }
    else if (this.state.activeTab === 'convenios') {
      let rows = '';
      if (contract.convenios.length === 0) {
        rows = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding:24px;">No hay convenios modificatorios registrados</td></tr>`;
      } else {
        contract.convenios.forEach(conv => {
          const endosos = (contract.fianzas || []).flatMap(f => f.endosos || []).filter(e => e.convenio_id === conv.id);
          rows += `
            <tr>
              <td><strong>${conv.id}</strong></td>
              <td>${conv.descripcion}</td>
              <td>${conv.motivo || conv.descripcion}</td>
              <td style="color:${conv.cambio_monto >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}; font-weight:600;">$${conv.cambio_monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
              <td>${conv.cambio_plazo >= 0 ? '+' : ''}${conv.cambio_plazo} dias</td>
              <td><span class="user-badge" style="background:#5c1e30; color:white; border:none;">${conv.articulo_aplicado}</span></td>
              <td>V${conv.version_previa || 1} -> V${conv.version_nueva || '-'}</td>
              <td>${endosos.length}</td>
              <td>${conv.creado_por_nombre || conv.creado_por || 'N/A'}</td>
              <td>${new Date(conv.creado_en).toLocaleDateString()}</td>
            </tr>
          `;
        });
      }

      let actions = '';
      if (this.state.user.rol === 'dependencia') {
        actions = `
          <button class="btn btn-primary" onclick="app.registrarConvenioDialog()">
            <span class="material-icons-round">add</span> Aplicar Convenio Modificatorio
          </button>
        `;
      }

      outlet.innerHTML = `
        <div class="glass-panel">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
            <h2>Trmite de Convenios Modificatorios (HU-03 / Art. 59 LOPSRM)</h2>
            ${actions}
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Descripcion del Convenio</th>
                  <th>Motivo</th>
                  <th>Ajuste Monto</th>
                  <th>Ajuste Plazo</th>
                  <th>Artculo LOPSRM</th>
                  <th>Versiones</th>
                  <th>Endosos</th>
                  <th>Autor</th>
                  <th>Fecha Registro</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }
  },

  async searchExpediente() {
    const params = new URLSearchParams();
    const fields = [
      ['folio', 'exp-folio'],
      ['contratista', 'exp-contratista'],
      ['periodo', 'exp-periodo'],
      ['tipo_documento', 'exp-tipo'],
      ['query', 'exp-query']
    ];
    fields.forEach(([key, id]) => {
      const value = document.getElementById(id)?.value;
      if (value) params.set(key, value);
    });

    const outlet = document.getElementById('expediente-search-results');
    try {
      const results = await this.api(`/api/contratos/${this.state.currentContractId}/expediente/search?${params.toString()}`);
      outlet.style.display = 'block';
      if (!results.length) {
        outlet.innerHTML = `<div style="padding:18px; color:var(--text-muted); text-align:center;">Sin resultados para los filtros aplicados.</div>`;
        return;
      }
      outlet.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Bloque</th>
              <th>Tipo</th>
              <th>Titulo</th>
              <th>Descripcion</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            ${results.map(r => `
              <tr>
                <td><span class="badge badge-review">${r.bloque}</span></td>
                <td>${r.tipo}</td>
                <td><strong>${r.titulo}</strong></td>
                <td>${r.descripcion || ''}</td>
                <td>${r.fecha ? new Date(r.fecha).toLocaleDateString('es-MX') : 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (e) {}
  },

  clearExpedienteSearch() {
    ['exp-folio', 'exp-contratista', 'exp-periodo', 'exp-query'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const tipo = document.getElementById('exp-tipo');
    if (tipo) tipo.value = '';
    const outlet = document.getElementById('expediente-search-results');
    if (outlet) {
      outlet.style.display = 'none';
      outlet.innerHTML = '';
    }
  },

  aperturarBitacoraDialog() {
    this.showModal(`
      <h2>Apertura Formal de Bitacora (HU-08)</h2>
      <p style="margin-bottom: 20px; font-size:13.5px; color:var(--text-muted); line-height: 1.5;">
        Conforme a los Arts. 46 y 52 Bis LOPSRM, asiente la apertura de la bitacora registrando la fecha formal de entrega del sitio de los trabajos.
      </p>
      <form id="aperturar-bitacora-form">
        <div class="form-group">
          <label>Fecha de Entrega del Sitio</label>
          <input type="date" id="ap-fecha" required>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:30px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Iniciar Apertura</button>
        </div>
      </form>
    `);

    document.getElementById('aperturar-bitacora-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fecha = document.getElementById('ap-fecha').value;
      try {
        await this.api(`/api/contratos/${this.state.currentContractId}/bitacora/aperturar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fecha_entrega_sitio: fecha })
        });
        this.showToast('Borrador de apertura creado. Esperando firmas del Roster.', 'success');
        this.closeModal();
        this.renderContractDetail();
      } catch (err) {}
    });
  },

  registrarFianzaDialog() {
    this.showModal(`
      <h2>Registrar Fianza / Garantia (HU-02)</h2>
      <form id="reg-fianza-form" style="margin-top:16px;">
        <div class="form-group">
          <label>Tipo de Fianza</label>
          <select id="fz-tipo" required>
            <option value="anticipo">Anticipo</option>
            <option value="cumplimiento">Cumplimiento</option>
            <option value="vicios_ocultos">Vicios Ocultos</option>
          </select>
        </div>
        <div class="form-group">
          <label>Institucin Afianzadora</label>
          <input type="text" id="fz-afianzadora" placeholder="Chubb Fianzas, S.A." required>
        </div>
        <div class="form-group">
          <label>Monto de la Pliza ($)</label>
          <input type="number" id="fz-monto" placeholder="2550000" required>
        </div>
        <div class="form-group">
          <label>Fecha de Vencimiento</label>
          <input type="date" id="fz-vigencia" required>
        </div>
        <div class="form-group">
          <label>Umbrales de alerta (dias antes del vencimiento)</label>
          <input type="text" id="fz-umbrales" value="30,15,5" required>
        </div>
        <div class="form-group">
          <label>Cargar Pliza Firmada (PDF)</label>
          <input type="file" id="fz-pdf" accept=".pdf">
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:24px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Registrar Fianza</button>
        </div>
      </form>
    `);

    document.getElementById('reg-fianza-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData();
      formData.append('tipo', document.getElementById('fz-tipo').value);
      formData.append('afianzadora', document.getElementById('fz-afianzadora').value);
      formData.append('monto', document.getElementById('fz-monto').value);
      formData.append('vigencia', document.getElementById('fz-vigencia').value);
      const umbrales = document.getElementById('fz-umbrales').value
        .split(',')
        .map(v => parseInt(v.trim(), 10))
        .filter(v => Number.isInteger(v) && v > 0);
      formData.append('umbrales_alerta', JSON.stringify(umbrales.length ? umbrales : [30, 15, 5]));
      
      const pdf = document.getElementById('fz-pdf');
      if (pdf.files.length > 0) {
        formData.append('pdf_poliza', pdf.files[0]);
      }

      try {
        const res = await fetch(`/api/contratos/${this.state.currentContractId}/fianzas`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        this.showToast('Fianza registrada con exito', 'success');
        this.closeModal();
        this.renderContractDetail();
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });
  },

  registrarEndosoDialog(fianzaId) {
    this.showModal(`
      <h2>Registrar Endoso de Fianza</h2>
      <p style="margin-bottom: 20px; font-size:13px; color:var(--text-muted);">
        Use este registro cuando un convenio o ajuste formal modifique monto, vigencia o alcance de la poliza.
      </p>
      <form id="reg-endoso-form">
        <div class="form-group">
          <label>Descripcion / Motivo</label>
          <textarea id="en-desc" rows="3" required></textarea>
        </div>
        <div class="dashboard-grid" style="gap:12px;">
          <div class="col-6 form-group">
            <label>Cambio en monto</label>
            <input type="number" id="en-monto" value="0" step="0.01">
          </div>
          <div class="col-6 form-group">
            <label>Nueva vigencia</label>
            <input type="date" id="en-vigencia">
          </div>
        </div>
        <div class="form-group">
          <label>PDF de Endoso</label>
          <input type="file" id="en-pdf" accept=".pdf">
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:24px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Registrar Endoso</button>
        </div>
      </form>
    `);

    document.getElementById('reg-endoso-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData();
      formData.append('descripcion', document.getElementById('en-desc').value);
      formData.append('cambio_monto', document.getElementById('en-monto').value || 0);
      formData.append('nueva_vigencia', document.getElementById('en-vigencia').value);
      const pdf = document.getElementById('en-pdf');
      if (pdf.files.length > 0) formData.append('pdf_endoso', pdf.files[0]);

      try {
        const res = await fetch(`/api/fianzas/${fianzaId}/endosos`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        this.showToast('Endoso registrado con exito', 'success');
        this.closeModal();
        this.renderContractDetail();
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });
  },

  registrarConvenioDialog() {
    this.showModal(`
      <h2>Aplicar Convenio Modificatorio (HU-03)</h2>
      <p style="margin-bottom: 20px; font-size:13px; color:var(--text-muted);">
        Ajuste montos o plazos del catalogo de obra conforme al Art. 59 LOPSRM.
      </p>
      <form id="reg-convenio-form">
        <div class="form-group">
          <label>Descripcion / Motivo del Convenio</label>
          <input type="text" id="cv-desc" placeholder="Ajuste de conceptos extraordinarios..." required>
        </div>
        <div class="form-group">
          <label>Motivo formal del cambio</label>
          <textarea id="cv-motivo" rows="3" placeholder="Describa que cambio, cuando y por que..." required></textarea>
        </div>
        <div class="form-group">
          <label>Cambio en el Monto ($)</label>
          <input type="number" id="cv-monto" placeholder="Ej. 500000 o -20000" required>
        </div>
        <div class="form-group">
          <label>Cambio en el Plazo (Dias Naturales)</label>
          <input type="number" id="cv-plazo" placeholder="Ej. 15 o -5" required>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:24px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Aplicar Convenio</button>
        </div>
      </form>
    `);

    document.getElementById('reg-convenio-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const data = await this.api(`/api/contratos/${this.state.currentContractId}/convenios`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            descripcion: document.getElementById('cv-desc').value,
            motivo: document.getElementById('cv-motivo').value,
            cambio_monto: document.getElementById('cv-monto').value,
            cambio_plazo: document.getElementById('cv-plazo').value,
            catalogo_nuevo: this.state.currentContractData.catalogo,
            programa_nuevo: this.state.currentContractData.programa
          })
        });
        this.showToast(`${data.message} - ${data.lopsrm_articulo}. Endosos: ${data.endosos_generados || 0}`, 'success');
        this.closeModal();
        this.renderContractDetail();
      } catch (err) {}
    });
  },

  registrarMinutaDialog() {
    this.showModal(`
      <h2>Subir Minuta de Reunin (HU-11)</h2>
      <form id="reg-minuta-form">
        <div class="form-group">
          <label>Descripcion / Asunto</label>
          <input type="text" id="min-desc" placeholder="Reunin mensual de avance" required>
        </div>
        <div class="form-group">
          <label>Fecha de Reunin</label>
          <input type="date" id="min-fecha" required>
        </div>
        <div class="form-group">
          <label>Minuta Firmada (PDF)</label>
          <input type="file" id="min-pdf" accept=".pdf" required>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Subir</button>
        </div>
      </form>
    `);

    document.getElementById('reg-minuta-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData();
      formData.append('descripcion', document.getElementById('min-desc').value);
      formData.append('fecha_reunion', document.getElementById('min-fecha').value);
      formData.append('pdf_minuta', document.getElementById('min-pdf').files[0]);

      try {
        const res = await fetch(`/api/contratos/${this.state.currentContractId}/minutas`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        this.showToast('Minuta cargada con exito', 'success');
        this.closeModal();
        this.renderContractDetail();
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });
  },

  registrarVisitaDialog() {
    this.showModal(`
      <h2>Agendar Visita / Inspeccion (HU-11)</h2>
      <form id="reg-visita-form">
        <div class="form-group">
          <label>Motivo de la Inspeccion</label>
          <input type="text" id="vis-desc" placeholder="Inspeccion de zanjas" required>
        </div>
        <div class="form-group">
          <label>Fecha de Visita</label>
          <input type="date" id="vis-fecha" required>
        </div>
        <div class="form-group">
          <label>Representantes / Asistentes</label>
          <input type="text" id="vis-asis" placeholder="Residencia, Supervision, Superintendente" required>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Agendar Visita</button>
        </div>
      </form>
    `);

    document.getElementById('reg-visita-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await this.api(`/api/contratos/${this.state.currentContractId}/visitas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            descripcion: document.getElementById('vis-desc').value,
            fecha_visita: document.getElementById('vis-fecha').value,
            asistentes: document.getElementById('vis-asis').value
          })
        });
        this.showToast('Visita agendada', 'success');
        this.closeModal();
        this.renderContractDetail();
      } catch (err) {}
    });
  },

  async loadBitacoraNotes() {
    const list = document.getElementById('bitacora-notes-list');
    if (!list) return;
    
    const tipo = document.getElementById('s-tipo').value;
    const f_inicio = document.getElementById('s-f-inicio').value;
    const query = document.getElementById('s-query').value;

    let url = `/api/contratos/${this.state.currentContractId}/bitacora/notas?`;
    if (tipo) url += `tipo=${tipo}&`;
    if (f_inicio) url += `f_inicio=${f_inicio}&`;
    if (query) url += `query=${encodeURIComponent(query)}&`;

    try {
      const notes = await this.api(url);
      
      let html = '';
      if (notes.length === 0) {
        html = `<div class="glass-panel" style="padding: 40px; text-align: center; color: var(--text-muted);">
          No se encontraron notas en la bitacora.
        </div>`;
      } else {
        notes.forEach(n => {
          let linkBadge = '';
          if (n.vinculo_nota_id) {
            linkBadge = `<span class="user-badge" style="background: #fffbeb; color:#92400e; border:none; margin: 0; font-size:10px;">Vnculo: Nota #${n.vinculo_nota_id}</span>`;
          }

          html += `
            <div class="glass-panel" style="margin-bottom: 16px;">
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:10px; margin-bottom:10px;">
                <div>
                  <span class="user-badge" style="background: var(--primary); font-weight:700; color:white; border:none;">Nota #${n.folio}</span>
                  <span class="user-badge" style="text-transform: capitalize; background:#f1f5f9; color:#475569; border:none;">${n.tipo}</span>
                  ${linkBadge}
                </div>
                <div style="font-size:11.5px; color:var(--text-muted);">
                  ${new Date(n.fecha).toLocaleString()}
                </div>
              </div>
              <p style="font-size:13.5px; line-height: 1.5; white-space: pre-line; color:#334155;">${n.contenido}</p>
              
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px; border-top:1px dashed var(--border-color); padding-top:10px; font-size:10.5px; color:var(--text-muted);">
                <span>Emitido por: <strong>${n.creado_por_nombre}</strong> (${n.creado_por_rol})</span>
                <span style="font-family: monospace; font-size:10px;">Firma Hash: ${n.firma_hash ? n.firma_hash.substring(0, 16) + '...' : 'N/A'}</span>
              </div>
            </div>
          `;
        });
      }
      list.innerHTML = html;
    } catch (e) {}
  },

  async submitNewNote() {
    const tipo = document.getElementById('n-tipo').value;
    const vinculo = document.getElementById('n-vinculo').value;
    const contenido = document.getElementById('n-contenido').value;

    try {
      await this.api(`/api/contratos/${this.state.currentContractId}/bitacora/notas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          contenido,
          vinculo_nota_id: vinculo ? parseInt(vinculo) : null
        })
      });
      this.showToast('Nota registrada y firmada electrunicamente', 'success');
      document.getElementById('n-contenido').value = '';
      document.getElementById('n-vinculo').value = '';
      this.loadBitacoraNotes();
    } catch (err) {}
  },

  async exportBitacoraExcel() {
    this.showToast('Exportacion Excel generada con exito.', 'success');
  },

  // ==========================================
  // RENDER ESTIMACIONES MODULE (HU-12 a HU-16)
  // ==========================================
  async renderEstimacionesScreen() {
    const outlet = document.getElementById('app-router-outlet');
    const id = this.state.currentContractId;
    
    try {
      const contract = this.state.currentContractData;
      const ests = await this.api(`/api/contratos/${id}/estimaciones`);
      
      let rows = '';
      if (ests.length === 0) {
        rows = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding:30px;">No hay estimaciones integradas para este contrato</td></tr>`;
      } else {
        ests.forEach(e => {
          let badgeClass = 'badge-presented';
          if (e.estado === 'autorizada') badgeClass = 'badge-authorized';
          if (e.estado === 'pagada') badgeClass = 'badge-paid';
          if (e.estado === 'rechazada') badgeClass = 'badge-rejected';
          if (e.estado === 'en_revision') badgeClass = 'badge-review';

          rows += `
            <tr style="cursor:pointer;" onclick="app.viewEstimacionDetail('${e.id}')">
              <td><strong>Periodo #${e.periodo_numero}</strong></td>
              <td>${e.fecha_inicio} al ${e.fecha_fin}</td>
              <td>$${e.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
              <td>$${e.liquido_a_pagar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
              <td><span class="badge ${badgeClass}">${e.estado}</span></td>
              <td>
                <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); app.viewEstimacionDetail('${e.id}')">Inspeccionar</button>
              </td>
            </tr>
          `;
        });
      }

      let actions = '';
      if (this.state.user.rol === 'contratista') {
        actions = `
          <button class="btn btn-primary" onclick="app.integrarEstimacionForm()">
            <span class="material-icons-round">add</span> Integrar Estimacion
          </button>
        `;
      }

      outlet.innerHTML = `
        <div class="main-container">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <div>
              <span class="user-badge" style="background:#5c1e30; color:white; border:none;">${contract.folio}</span>
              <h1>Modulo de Estimaciones Contractuales</h1>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary" onclick="app.navigate('contract-detail', { id: '${contract.id}' })">
                <span class="material-icons-round">arrow_back</span> Expediente
              </button>
              ${actions}
            </div>
          </div>

          <div class="glass-panel">
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Periodo</th>
                    <th>Fechas</th>
                    <th>Subtotal Est.</th>
                    <th>Lquido Net.</th>
                    <th>Estatus</th>
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
    } catch(e) {}
  },

  integrarEstimacionForm() {
    const contract = this.state.currentContractData;
    
    let conceptInputs = '';
    contract.catalogo.forEach(c => {
      conceptInputs += `
        <div class="col-6 form-group">
          <label>Clave: ${c.clave} (${c.descripcion}) - Limite: ${c.cantidad}</label>
          <input type="number" class="est-av-qty" data-clave="${c.clave}" placeholder="0" step="any" required>
        </div>
      `;
    });

    this.showModal(`
      <h2>Integrar Estimacion de Obra (HU-12)</h2>
      <p style="margin-bottom: 16px; font-size:13px; color:var(--text-muted); line-height:1.4;">
        De acuerdo con el Art. 132 RLOPSRM, asiente los generadores del periodo. El sistema calcula retenciones del 5 al millar (Art. 191 LFD) y amortizacion.
      </p>
      <form id="integrar-est-form" style="max-height: 70vh; overflow-y: auto; padding-right:10px;">
        <div class="dashboard-grid" style="gap:15px;">
          <div class="col-4 form-group">
            <label>Periodo #</label>
            <input type="number" id="est-periodo" placeholder="1" required>
          </div>
          <div class="col-4 form-group">
            <label>Fecha Inicio</label>
            <input type="date" id="est-f-ini" required>
          </div>
          <div class="col-4 form-group">
            <label>Fecha Fin</label>
            <input type="date" id="est-f-fin" required>
          </div>
          
          <div class="col-12"><h3 style="margin-top:10px; font-size:14px; color:var(--primary);">Cantidades Ejecutadas del Periodo</h3></div>
          ${conceptInputs}

          <div class="col-6 form-group">
            <label>Penalizaciones / Deductivas ($)</label>
            <input type="number" id="est-penalizaciones" value="0">
          </div>
          <div class="col-6 form-group">
            <label>Nota Bitacora Vinculada (ID)</label>
            <input type="number" id="est-vinculos" placeholder="Ej. 2">
          </div>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:24px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Integrar Estimacion</button>
        </div>
      </form>
    `);

    document.getElementById('integrar-est-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const avances = {};
      const inputs = document.querySelectorAll('.est-av-qty');
      inputs.forEach(i => {
        avances[i.dataset.clave] = parseFloat(i.value || 0);
      });

      const payload = {
        periodo_numero: document.getElementById('est-periodo').value,
        fecha_inicio: document.getElementById('est-f-ini').value,
        fecha_fin: document.getElementById('est-f-fin').value,
        avances,
        penalizaciones: document.getElementById('est-penalizaciones').value,
        notes_vinculadas_ids: document.getElementById('est-vinculos').value ? [parseInt(document.getElementById('est-vinculos').value)] : []
      };

      try {
        await this.api(`/api/contratos/${this.state.currentContractId}/estimaciones/integrar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        this.showToast('Estimacion integrada en borrador con exito', 'success');
        this.closeModal();
        this.renderEstimacionesScreen();
      } catch (err) {}
    });
  },

  async viewEstimacionDetail(estId) {
    const outlet = document.getElementById('app-router-outlet');
    
    try {
      const est = await this.api(`/api/contratos/${this.state.currentContractId}/estimaciones`);
      const data = est.find(e => e.id === estId);
      const contract = this.state.currentContractData;

      let actionPanel = '';

      if (this.state.user.rol === 'contratista' && data.estado === 'borrador') {
        actionPanel += `
          <div class="glass-panel" style="margin-top:20px;">
            <h3>Enviar Estimacion a Revision (HU-13)</h3>
            <p style="margin-bottom:15px; font-size:13px; color:var(--text-muted);">Debe adjuntar el PDF de generadores antes de enviar. El plazo de presentacin vence a los 6 dias naturales del periodo (Art. 54 LOPSRM).</p>
            <form id="send-est-form" style="display:flex; align-items:center; gap:20px;">
              <input type="file" id="send-est-pdf" accept=".pdf" required style="max-width:300px;">
              <button type="submit" class="btn btn-primary">Enviar formalmente</button>
            </form>
          </div>
        `;
      }

      if (this.state.user.rol === 'supervision' && data.estado === 'presentada') {
        actionPanel += `
          <div class="glass-panel" style="margin-top:20px;">
            <h3>Revision Tecnica de Supervision (HU-15)</h3>
            <p style="margin-bottom:15px; font-size:13px; color:var(--text-muted);">Registre observaciones de revision antes de turnar la estimacion al Residente de Obra.</p>
            <button class="btn btn-primary" onclick="app.turnarAResidenteDialog('${data.id}')">Turnar a Residencia</button>
          </div>
        `;
      }

      if (this.state.user.rol === 'residente' && (data.estado === 'en_revision' || data.estado === 'presentada')) {
        actionPanel += `
          <div class="glass-panel" style="margin-top:20px;">
            <h3>Autorizacion del Residente de Obra (HU-15)</h3>
            <p style="margin-bottom:15px; font-size:13px; color:var(--text-muted);">El residente autoriza o rechaza formalmente la estimacion (Art. 53/54 LOPSRM).</p>
            <div style="display:flex; gap:10px;">
              <button class="btn btn-primary" onclick="app.resolverEstimacion('${data.id}', 'autorizada')">Autorizar para Pago</button>
              <button class="btn btn-secondary btn-danger" onclick="app.resolverEstimacion('${data.id}', 'rechazada')">Rechazar Estimacion</button>
            </div>
          </div>
        `;
      }

      if (this.state.user.rol === 'contratista' && data.estado === 'rechazada') {
        actionPanel += `
          <div class="glass-panel" style="margin-top:20px;">
            <h3>Estimacion Rechazada - Reingresar Versin (HU-16)</h3>
            <p style="margin-bottom:15px; font-size:13px; color:var(--text-muted);">Cargue un bloque de reingreso corrigiendo observaciones tecnicas.</p>
            <button class="btn btn-primary" onclick="app.reingresarEstimacionForm('${data.id}')">Reingresar Nueva Versin</button>
          </div>
        `;
      }

      if (data.estado === 'autorizada') {
        actionPanel += `
          <div class="glass-panel" style="margin-top:20px;">
            <h3>Transito a Pago y Suficiencia Presupuestal (HU-20)</h3>
            <p style="margin-bottom:15px; font-size:13px; color:var(--text-muted);">Verifique suficiencia presupuestal (Art. 24 LOPSRM) e ingrese factura/CFDI para generar la instruccin.</p>
            <div style="display:flex; gap:10px;">
              <button class="btn btn-primary" onclick="app.verificarPresupuesto('${data.id}')">Verificar Suficiencia (Art. 24)</button>
              <button class="btn btn-secondary" onclick="app.instruccionPagoDialog('${data.id}')">Cargar Factura / Generar Instruccin</button>
            </div>
          </div>
        `;
      }

      if (this.state.user.rol === 'finanzas' && data.estado === 'en_pago') {
        actionPanel += `
          <div class="glass-panel" style="margin-top:20px;">
            <h3>Registrar Pago Efectuado (HU-21)</h3>
            <p style="margin-bottom:15px; font-size:13px; color:var(--text-muted);">Asiente la fecha y folio SPEI bancario para cerrar el ciclo financiero.</p>
            <button class="btn btn-primary" onclick="app.registrarPagoDialog('${data.id}')">Registrar Pago</button>
          </div>
        `;
      }

      let conceptRows = '';
      Object.entries(data.avances).forEach(([clave, qty]) => {
        const concept = contract.catalogo.find(c => c.clave === clave);
        conceptRows += `
          <tr>
            <td><strong>${clave}</strong></td>
            <td>${concept.descripcion}</td>
            <td>${qty.toLocaleString('es-MX')} ${concept.unidad}</td>
            <td>$${concept.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
            <td>$${(qty * concept.precio_unitario).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
          </tr>
        `;
      });

      outlet.innerHTML = `
        <div class="main-container" style="max-width: 900px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <div>
              <span class="user-badge" style="background:#5c1e30; color:white; border:none;">Estimacion Periodo #${data.periodo_numero}</span>
              <h1>Detalle y Liquidacion de Estimacion</h1>
            </div>
            <button class="btn btn-secondary" onclick="app.renderEstimacionesScreen()">
              <span class="material-icons-round">arrow_back</span> Regresar
            </button>
          </div>

          <div class="glass-panel">
            <h2>Caratula de Estimacion (Liquidacion)</h2>
            <table style="width:100%; margin-top:16px;">
              <tr><td style="color:var(--text-muted); font-weight:600; width:45%;">Estatus actual:</td><td><span class="badge badge-presented">${data.estado.toUpperCase()}</span></td></tr>
              <tr><td style="color:var(--text-muted); font-weight:600;">Importe de los Trabajos Ejecutados:</td><td>$${data.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} M.N.</td></tr>
              <tr><td style="color:var(--text-muted); font-weight:600;">Amortizacion del Anticipo (${contract.anticipo_porcentaje}%):</td><td style="color:var(--accent-red); font-weight:600;">- $${data.anticipo_amortizado.toLocaleString('es-MX', { minimumFractionDigits: 2 })} M.N.</td></tr>
              <tr><td style="color:var(--text-muted); font-weight:600;">Retencion 5 al millar (Vigilancia e Inspeccion, Art. 191 LFD):</td><td style="color:var(--accent-red); font-weight:600;">- $${data.retencion_5_millar.toLocaleString('es-MX', { minimumFractionDigits: 2 })} M.N.</td></tr>
              <tr><td style="color:var(--text-muted); font-weight:600;">Otras Penalizaciones:</td><td style="color:var(--accent-red); font-weight:600;">- $${data.penalizaciones.toLocaleString('es-MX', { minimumFractionDigits: 2 })} M.N.</td></tr>
              <tr style="border-top:2px solid var(--border-color); font-weight:700; font-size:15px;"><td style="color:#0f172a;">LIQUIDO A PAGAR AL CONTRATISTA:</td><td style="color:var(--accent-green);">$${data.liquido_a_pagar.toLocaleString('es-MX', { minimumFractionDigits: 2 })} M.N.</td></tr>
            </table>
          </div>

          <div class="glass-panel">
            <h2>Detalle de Conceptos Ejecutados</h2>
            <div class="table-container" style="margin-top:16px;">
              <table>
                <thead>
                  <tr>
                    <th>Clave</th>
                    <th>Concepto</th>
                    <th>Cantidad</th>
                    <th>Precio</th>
                    <th>Importe</th>
                  </tr>
                </thead>
                <tbody>
                  ${conceptRows}
                </tbody>
              </table>
            </div>
          </div>

          ${actionPanel}
        </div>
      `;

      if (document.getElementById('send-est-form')) {
        document.getElementById('send-est-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const fileInput = document.getElementById('send-est-pdf');
          const formData = new FormData();
          formData.append('pdf_soporte', fileInput.files[0]);
          
          try {
            const res = await fetch(`/api/estimaciones/${data.id}/enviar`, {
              method: 'POST',
              body: formData
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error);
            this.showToast('Estimacion enviada a revision', 'success');
            this.viewEstimacionDetail(data.id);
          } catch(err) {
            this.showToast(err.message, 'error');
          }
        });
      }

    } catch (e) {}
  },

  async resolverEstimacion(estId, resolucion) {
    try {
      await this.api(`/api/estimaciones/${estId}/resolver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolucion, comentarios: "Resolucion del residente" })
      });
      this.showToast(resolucion === 'autorizada' ? 'Estimacion autorizada' : 'Estimacion rechazada', 'success');
      this.viewEstimacionDetail(estId);
    } catch(e) {}
  },

  turnarAResidenteDialog(estId) {
    this.showModal(`
      <h2>Turnar a Residencia con Observaciones (HU-15)</h2>
      <form id="turn-est-form" style="margin-top:16px;">
        <div class="form-group">
          <label>Observaciones Tecnicas (por concepto)</label>
          <textarea id="turn-obs" rows="4" placeholder="Indique observaciones..." required></textarea>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Turnar a Residencia</button>
        </div>
      </form>
    `);

    document.getElementById('turn-est-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await this.api(`/api/estimaciones/${estId}/revisar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ observaciones: [{ comentario: document.getElementById('turn-obs').value }] })
        });
        this.showToast('Turnado exitoso', 'success');
        this.closeModal();
        this.viewEstimacionDetail(estId);
      } catch (err) {}
    });
  },

  async verificarPresupuesto(estId) {
    try {
      const data = await this.api(`/api/estimaciones/${estId}/presupuesto`, {
        method: 'POST'
      });
      this.showToast(data.message, 'success');
    } catch(e) {}
  },

  instruccionPagoDialog(estId) {
    this.showModal(`
      <h2>Cargar Factura y XML de CFDI (HU-20)</h2>
      <form id="instr-pago-form" style="margin-top:16px;">
        <div class="form-group">
          <label>Cargar Factura (PDF)</label>
          <input type="file" id="ip-factura" accept=".pdf" required>
        </div>
        <div class="form-group">
          <label>Cargar CFDI (XML)</label>
          <input type="file" id="ip-cfdi" accept=".xml" required>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Generar Instruccin</button>
        </div>
      </form>
    `);

    document.getElementById('instr-pago-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData();
      formData.append('factura', document.getElementById('ip-factura').files[0]);
      formData.append('cfdi', document.getElementById('ip-cfdi').files[0]);

      try {
        const res = await fetch(`/api/estimaciones/${estId}/instruccion-pago`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        this.showToast('Instruccin de pago enviada a Finanzas', 'success');
        this.closeModal();
        this.viewEstimacionDetail(estId);
      } catch(err) {
        this.showToast(err.message, 'error');
      }
    });
  },

  registrarPagoDialog(estId) {
    this.showModal(`
      <h2>Registrar Pago Efectuado (HU-21)</h2>
      <form id="reg-pago-form" style="margin-top:16px;">
        <div class="form-group">
          <label>Referencia SPEI / Folio Bancario</label>
          <input type="text" id="rp-ref" placeholder="SPEI-9382103982" required>
        </div>
        <div class="form-group">
          <label>Notas de Pago</label>
          <textarea id="rp-notas" placeholder="Ej. Pago conciliado..."></textarea>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Registrar Pago</button>
        </div>
      </form>
    `);

    document.getElementById('reg-pago-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await this.api(`/api/estimaciones/${estId}/registrar-pago`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            banco_referencia: document.getElementById('rp-ref').value,
            notas_pago: document.getElementById('rp-notas').value
          })
        });
        this.showToast('Pago registrado correctamente', 'success');
        this.closeModal();
        this.viewEstimacionDetail(estId);
      } catch(err) {}
    });
  },

  reingresarEstimacionForm(estId) {
    const contract = this.state.currentContractData;
    
    let conceptInputs = '';
    contract.catalogo.forEach(c => {
      conceptInputs += `
        <div class="col-6 form-group">
          <label>Clave: ${c.clave} (${c.descripcion})</label>
          <input type="number" class="reest-av-qty" data-clave="${c.clave}" placeholder="0" step="any" required>
        </div>
      `;
    });

    this.showModal(`
      <h2>Reingresar Estimacion (HU-16)</h2>
      <form id="reingresar-est-form" style="max-height: 70vh; overflow-y: auto; padding-right:10px; margin-top:16px;">
        <div class="dashboard-grid" style="gap:15px;">
          <div class="col-12"><h3>Ajustar Cantidades Corregidas</h3></div>
          ${conceptInputs}
          <div class="col-12 form-group">
            <label>Penalizaciones / Deductivas ($)</label>
            <input type="number" id="reest-penalizaciones" value="0">
          </div>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:30px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Reingresar Versin</button>
        </div>
      </form>
    `);

    document.getElementById('reingresar-est-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const avances = {};
      const inputs = document.querySelectorAll('.reest-av-qty');
      inputs.forEach(i => {
        avances[i.dataset.clave] = parseFloat(i.value || 0);
      });

      const payload = {
        avances,
        penalizaciones: document.getElementById('reest-penalizaciones').value
      };

      try {
        await this.api(`/api/estimaciones/${estId}/reingresar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        this.showToast('Reingreso de estimacion guardado en borrador', 'success');
        this.closeModal();
        this.renderEstimacionesScreen();
      } catch (err) {}
    });
  },

  applyProgramaFilters(kind, value) {
    if (kind === 'concept') this.state.programaFilterConcept = value;
    if (kind === 'period') this.state.programaFilterPeriod = value;
    this.renderActiveTabContent(this.state.currentContractData);
  },

  async registrarTrabajosPeriodoDialog() {
    const contract = this.state.currentContractData;
    let notes = [];
    try {
      notes = await this.api(`/api/contratos/${contract.id}/bitacora/notas`);
    } catch (e) {}

    const noteOptions = notes.length === 0
      ? `<option value="">Sin notas disponibles</option>`
      : notes.map(n => `<option value="${n.id}">Nota #${n.folio} - ${n.tipo}</option>`).join('');

    const conceptInputs = contract.catalogo.map(c => `
      <tr>
        <td><strong>${c.clave}</strong></td>
        <td>${c.descripcion}</td>
        <td>${c.unidad}</td>
        <td>${c.cantidad}</td>
        <td><input class="trabajo-qty" data-clave="${c.clave}" type="number" step="0.0001" min="0" value="0"></td>
      </tr>
    `).join('');

    this.showModal(`
      <h2>Registrar Trabajos Terminados (HU-06)</h2>
      <form id="trabajos-periodo-form">
        <div class="form-grid">
          <div class="form-group">
            <label>Periodo</label>
            <input type="number" id="tp-periodo" min="1" required>
          </div>
          <div class="form-group">
            <label>Fecha inicio</label>
            <input type="date" id="tp-inicio" required>
          </div>
          <div class="form-group">
            <label>Fecha fin</label>
            <input type="date" id="tp-fin" required>
          </div>
          <div class="form-group">
            <label>Nota de bitacora vinculada</label>
            <select id="tp-nota" required ${notes.length === 0 ? 'disabled' : ''}>${noteOptions}</select>
          </div>
        </div>
        <div class="table-container" style="margin-top:14px;">
          <table>
            <thead>
              <tr>
                <th>Clave</th>
                <th>Concepto</th>
                <th>Unidad</th>
                <th>Contratada</th>
                <th>Terminada</th>
              </tr>
            </thead>
            <tbody>${conceptInputs}</tbody>
          </table>
        </div>
        <div class="form-group" style="margin-top:14px;">
          <label>Observaciones</label>
          <textarea id="tp-observaciones" rows="3"></textarea>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:24px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary" ${notes.length === 0 ? 'disabled' : ''}>Guardar trabajos</button>
        </div>
      </form>
    `);

    document.getElementById('trabajos-periodo-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const cantidades = {};
      document.querySelectorAll('.trabajo-qty').forEach(input => {
        const qty = parseFloat(input.value || 0);
        if (qty > 0) cantidades[input.dataset.clave] = qty;
      });
      if (Object.keys(cantidades).length === 0) {
        this.showToast('Capture al menos una cantidad terminada', 'error');
        return;
      }

      try {
        await this.api(`/api/contratos/${contract.id}/trabajos-periodo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            periodo_numero: document.getElementById('tp-periodo').value,
            fecha_inicio: document.getElementById('tp-inicio').value,
            fecha_fin: document.getElementById('tp-fin').value,
            nota_bitacora_id: document.getElementById('tp-nota').value,
            cantidades,
            observaciones: document.getElementById('tp-observaciones').value
          })
        });
        this.showToast('Trabajos terminados registrados', 'success');
        this.closeModal();
        this.renderContractDetail();
      } catch (err) {}
    });
  },

  renderConceptAlertsPanel(contract, trabajos) {
    fetch(`/api/contratos/${contract.id}/alertas`).then(res => res.json()).then(alerts => {
      let alertRows = '';
      if (alerts.length === 0) {
        alertRows = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 16px;">No hay alertas de atraso configuradas</td></tr>`;
      } else {
        alerts.forEach(a => {
          const concept = contract.catalogo.find(c => c.clave === a.concept_key);
          if (!concept) return;

          let totalScheduled = 0;
          contract.programa.forEach(m => {
            totalScheduled += (m.avances[a.concept_key] || 0);
          });

          let totalExecuted = 0;
          trabajos.forEach(t => {
            totalExecuted += ((t.cantidades || {})[a.concept_key] || 0);
          });

          const deviation = totalScheduled > 0 ? ((totalScheduled - totalExecuted) / totalScheduled) * 100 : 0;
          const isPaused = a.estado === 'pausada';
          const isFired = !isPaused && deviation > a.limite_desviacion;

          let statusBadge = `<span class="badge badge-authorized">Vigente (OK)</span>`;
          if (isPaused) {
            statusBadge = `<span class="badge badge-review">Pausada</span>`;
          }
          if (isFired) {
            statusBadge = `<span class="badge badge-rejected" style="animation: pulse-glow 1.5s infinite;">RETARDO (${deviation.toFixed(0)}% atraso)</span>`;
          }

          const actionBtns = app.state.user.rol === 'residente' ? `
            <button class="btn btn-secondary" style="padding: 4px 8px;" title="${isPaused ? 'Reactivar alerta' : 'Pausar alerta'}" onclick="app.toggleAlertaEstado('${a.id}', '${isPaused ? 'activa' : 'pausada'}')">
              <span class="material-icons-round" style="font-size: 16px;">${isPaused ? 'play_arrow' : 'pause'}</span>
            </button>
            <button class="btn btn-secondary" style="padding: 4px 8px; color: var(--ipn-maroon-light);" title="Eliminar alerta" onclick="app.eliminarAlertaConcep('${a.id}')">
              <span class="material-icons-round" style="font-size: 16px;">delete</span>
            </button>
          ` : ' - ';

          alertRows += `
            <tr>
              <td><strong>${a.concept_key}</strong></td>
              <td>${a.limite_desviacion}%</td>
              <td>${a.canal || 'sistema'}</td>
              <td>${statusBadge}</td>
              <td>${deviation.toFixed(1)}%</td>
              <td style="text-align:center;">${actionBtns}</td>
            </tr>
          `;
        });
      }

      let configBtn = '';
      if (app.state.user.rol === 'residente') {
        configBtn = `<button class="btn btn-primary btn-sm" style="font-size:12px; padding: 6px 12px;" onclick="app.configurarAlertaDialog()">Configurar Alerta</button>`;
      }

      document.getElementById('concept-alerts-panel').innerHTML = `
        <div class="glass-panel" style="height: 100%;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px;">
            <h2 style="font-size: 15px;">Vigilancia Conceptos (HU-07)</h2>
            ${configBtn}
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Clave</th>
                  <th>Limite</th>
                  <th>Canal</th>
                  <th>Estado</th>
                  <th>Atraso</th>
                  <th style="text-align:center;">Accion</th>
                </tr>
              </thead>
              <tbody>
                ${alertRows}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }).catch(() => {});
  },

  configurarAlertaDialog() {
    const contract = this.state.currentContractData;
    let conceptOpts = contract.catalogo.map(c => `<option value="${c.clave}">${c.clave}  -  ${c.descripcion}</option>`).join('');

    this.showModal(`
      <h2>Configurar Alerta de Atraso (HU-07)</h2>
      <p style="font-size:13px; color:var(--text-muted); margin-bottom:16px;">
        Recibe avisos cuando el avance real del concepto seleccionado se desve del programado.
      </p>
      <form id="configurar-alerta-form">
        <div class="form-group">
          <label>Concepto a Monitorear</label>
          <select id="al-concept" required>${conceptOpts}</select>
        </div>
        <div class="form-group">
          <label>Limite Desviacin Permitido (%)</label>
          <input type="number" id="al-limite" placeholder="Ej. 10" min="1" max="100" required>
        </div>
        <div class="form-group">
          <label>Canal de Notificacion</label>
          <select id="al-canal">
            <option value="sistema">Notificacion en Sistema</option>
            <option value="correo">Correo Electrunico (Ficticio)</option>
          </select>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:24px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Configurar Alerta</button>
        </div>
      </form>
    `);

    document.getElementById('configurar-alerta-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const concept_key = document.getElementById('al-concept').value;
      const limite_desviacion = document.getElementById('al-limite').value;
      const canal = document.getElementById('al-canal').value;

      try {
        await this.api(`/api/contratos/${this.state.currentContractId}/alertas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ concept_key, limite_desviacion, canal })
        });
        this.showToast('Alerta de concepto configurada', 'success');
        this.closeModal();
        this.renderContractDetail();
      } catch (err) {}
    });
  },

  async eliminarAlertaConcep(alertaId) {
    if (!confirm('Estas seguro de eliminar esta alerta de concepto?')) return;
    try {
      await this.api(`/api/alertas/${alertaId}`, { method: 'DELETE' });
      this.showToast('Alerta eliminada', 'success');
      this.renderContractDetail();
    } catch (e) {}
  },

  async toggleAlertaEstado(alertaId, estado) {
    try {
      await this.api(`/api/alertas/${alertaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado })
      });
      this.showToast(estado === 'pausada' ? 'Alerta pausada' : 'Alerta reactivada', 'success');
      this.renderContractDetail();
    } catch (e) {}
  },

  async descargarReporteExcel() {
    const reportType = document.getElementById('export-report-select').value;
    try {
      const data = await this.api(`/api/contratos/${this.state.currentContractId}/reporte-data`);
      
      let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
      let filename = `Reporte_${reportType}_${this.state.currentContractData.folio}.csv`;
      
      if (reportType === 'fisico') {
        csvContent += "Clave,Concepto,Unidad,Cantidad Contratada,Precio Unitario,Importe Contratado\n";
        data.fisico.conceptos.forEach(c => {
          const imp = c.precio_unitario * c.cantidad;
          csvContent += `"${c.clave}","${c.descripcion.replace(/"/g, '""')}","${c.unidad}",${c.cantidad},${c.precio_unitario},${imp}\n`;
        });
      } 
      else if (reportType === 'financiero') {
        csvContent += "Concepto Financiero,Monto Contractual ($),Monto Pagado ($),Avance Financiero (%)\n";
        const total = data.financiero.techo;
        const pagado = data.financiero.total_pagado;
        const pct = total > 0 ? (pagado / total) * 100 : 0;
        csvContent += `"Techo Presupuestal Contractual",${total},${pagado},${pct.toFixed(2)}%\n`;
        csvContent += `"Amortizacion Anticipo Acumulada",${data.financiero.anticipo_amortizado},"N/A","N/A"\n`;
      } 
      else if (reportType === 'estimaciones') {
        csvContent += "Periodo Numero,Estado Estimacion,Importe Total ($),Liquido a Pagar ($)\n";
        data.estimaciones.forEach(e => {
          csvContent += `${e.periodo},"${e.estado}",${e.total},${e.liquido}\n`;
        });
      } 
      else if (reportType === 'observaciones') {
        csvContent += "Periodo,Observacion Tecnica\n";
        if (data.observaciones.length === 0) {
          csvContent += "N/A,Sin observaciones registradas\n";
        } else {
          data.observaciones.forEach(o => {
            csvContent += `${o.periodo},"${o.comentario.replace(/"/g, '""')}"\n`;
          });
        }
      } 
      else if (reportType === 'bitacora') {
        csvContent += "Folio Nota,Tipo Nota,Autor Emisor,Fecha Emision\n";
        data.bitacora.forEach(n => {
          csvContent += `${n.folio},"${n.tipo}","${n.autor}","${new Date(n.fecha).toLocaleDateString()}"\n`;
        });
      } 
      else if (reportType === 'modificatorios') {
        csvContent += "ID Convenio,Descripcion,Ajuste Monto ($),Ajuste Plazo (dias),Articulo LOPSRM,Fecha\n";
        if (data.modificatorios.length === 0) {
          csvContent += "N/A,Sin convenios modificatorios registrados,0,0,N/A,N/A\n";
        } else {
          data.modificatorios.forEach(m => {
            csvContent += `"${m.id}","${m.descripcion.replace(/"/g, '""')}",${m.cambio_monto},${m.cambio_plazo},"${m.articulo_aplicado}","${new Date(m.creado_en).toLocaleDateString()}"\n`;
          });
        }
      } 
      else if (reportType === 'penalizaciones') {
        csvContent += "Periodo Numero,Monto Penalizacion / Deductiva ($)\n";
        if (data.penalizaciones.length === 0) {
          csvContent += "N/A,Sin penalizaciones aplicadas\n";
        } else {
          data.penalizaciones.forEach(p => {
            csvContent += `${p.periodo},${p.monto}\n`;
          });
        }
      }

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      this.showToast('Reporte exportado correctamente', 'success');
    } catch (e) {
      this.showToast('Error al exportar reporte', 'error');
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

window.onload = () => app.init();
window.app = app;
