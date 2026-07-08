(function () {
  window.IntegrApexModules = window.IntegrApexModules || {};

  window.IntegrApexModules.documentos = {
    renderDocumentosTab(contract, outlet) {
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
    }
  };
})();
