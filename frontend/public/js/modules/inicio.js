(function () {
  window.IntegrApexModules = window.IntegrApexModules || {};

  window.IntegrApexModules.inicio = {
  async renderInicioDashboard() {
    this.showLoggedInUI();
    const outlet = document.getElementById('app-router-outlet');
    const rol = this.state.user.rol;

    let roleName = "Usuario";
    if (rol === 'residente') roleName = "RESIDENTE DE OBRA";
    if (rol === 'contratista') roleName = "CONTRATISTA / SUPERINTENDENTE";
    if (rol === 'supervision') roleName = "SUPERVISIÓN TÉCNICA";
    if (rol === 'dependencia') roleName = "DEPENDENCIA / CONTRATANTE";
    if (rol === 'finanzas') roleName = "RESPONSABLE DE FINANZAS";

    let grid = '';
    const flujos = [
      { id: 'alta', name: 'Alta de contrato', desc: 'Captura un contrato nuevo (7 pasos).', icon: 'post_add', roles: ['residente'] },
      { id: 'fianzas', name: 'Fianzas / garantías', desc: 'Registro de pólizas y vigencias.', icon: 'verified_user', roles: ['dependencia'] },
      { id: 'estimacion', name: 'Ciclo de estimación', desc: 'Integra, presenta, revisa y autoriza.', icon: 'query_stats', roles: ['contratista', 'supervision', 'residente'] },
      { id: 'bitacora', name: 'Bitácora', desc: 'Apertura, notas, consulta y minutas.', icon: 'menu_book', roles: ['residente', 'contratista', 'supervision'] },
      { id: 'avance', name: 'Avance y seguimiento', desc: 'Trabajos, curva y alertas de atraso.', icon: 'insights', roles: ['residente', 'contratista', 'supervision'] },
      { id: 'pago', name: 'Pago y tránsito', desc: 'Tránsito a pago y registro.', icon: 'payment', roles: ['finanzas', 'contratista'] },
      { id: 'convenios', name: 'Convenios', desc: 'Convenios modificatorios.', icon: 'edit_note', roles: ['dependencia'] },
      { id: 'expediente', name: 'Expediente', desc: 'El contrato consolidado en bloques.', icon: 'folder_zip', roles: ['residente', 'contratista', 'supervision', 'dependencia'] }
    ];

    flujos.forEach(f => {
      const isActive = f.roles.includes(rol);
      const readonlyBadge = isActive ? '' : '<span class="badge-readonly">Solo lectura</span>';

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
        <p style="color:var(--text-muted); font-size:14px; margin-bottom: 24px;">Gestión técnico-administrativa de contratos de obra pública (LOPSRM / RLOPSRM).</p>

        <div style="display:inline-block; padding: 4px 12px; background:#f1f5f9; border-radius: 20px; font-size:11px; font-weight:700; color:var(--primary); margin-bottom:24px; border:1px solid #e2e8f0; letter-spacing:0.5px;">
          ACCESO: ${roleName}
        </div>

        <div class="alert-banner">
          <div style="display:flex; align-items:center; gap:12px;">
            <span class="material-icons-round" style="color:var(--accent-green);">verified_user</span>
            <span><strong>Sesión activa:</strong> Las acciones que realices quedarán registradas con tu usuario, rol y fecha/hora.</span>
          </div>
        </div>

        <h2 style="font-size: 18px; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-muted); margin-bottom: 16px;">Tus flujos</h2>
        <div class="dashboard-grid">
          ${grid}
        </div>
      </div>
    `;
  },

  clickFlowCard(flowId, isActive) {
    if (!isActive) {
      this.showToast('Acceso en modo de solo lectura', 'info');
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
  };
})();
