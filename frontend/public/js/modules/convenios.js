(function () {
  window.IntegrApexModules = window.IntegrApexModules || {};

  window.IntegrApexModules.convenios = {
    // PESTAÑA DE CONVENIOS (HU-03): Renderiza el listado de convenios modificatorios del contrato, mostrando ajustes de monto/plazo, artículos y endosos asociados.
    renderConveniosTab(contract, outlet) {
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
              <td>${conv.cambio_plazo >= 0 ? '+' : ''}${conv.cambio_plazo} días</td>
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
                  <th>Descripción del convenio</th>
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
    },

    // APLICAR CONVENIO MODIFICATORIO (HU-03): Abre el modal para capturar los datos de modificación de montos/plazos y enviarlos al servidor.
    registrarConvenioDialog() {
      this.showModal(`
        <h2>Aplicar Convenio Modificatorio (HU-03)</h2>
        <p style="margin-bottom: 20px; font-size:13px; color:var(--text-muted);">
          Ajuste montos o plazos del catalogo de obra conforme al Art. 59 LOPSRM.
        </p>
        <form id="reg-convenio-form">
          <div class="form-group">
            <label>Descripción / Motivo del convenio</label>
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
    }
  };
})();
