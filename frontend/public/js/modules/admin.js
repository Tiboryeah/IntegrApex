(function () {
  window.IntegrApexModules = window.IntegrApexModules || {};

  window.IntegrApexModules.admin = {
  async renderAdminApprovals() {
    this.showLoggedInUI();
    const outlet = document.getElementById('app-router-outlet');

    try {
      const requests = await this.api('/api/admin/requests');

      let rows = '';
      if (requests.length === 0) {
        rows = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 30px;">No hay solicitudes pendientes de aprobación</td></tr>`;
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
                  <option value="supervision" ${req.rol === 'supervision' ? 'selected' : ''}>Supervisión</option>
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
            <h1>Solicitudes de registro</h1>
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
                    <th>Rol solicitado</th>
                    <th>Rol efectivo</th>
                    <th>Acción</th>
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
  };
})();
