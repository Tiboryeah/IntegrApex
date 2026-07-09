(function () {
  window.IntegrApexModules = window.IntegrApexModules || {};

  window.IntegrApexModules.fianzas = {
    // PESTAÑA DE FIANZAS (HU-02): Despliega el listado de fianzas del contrato actual (con semáforo de vigencia y alertas).
    renderFianzasTab(contract, outlet) {
      let rows = '';
      if (contract.fianzas.length === 0) {
        rows = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding:24px;">No hay pólizas registradas</td></tr>`;
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
              <td>${escapeHtml(f.afianzadora)}</td>
              <td>$${f.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
              <td>${f.vigencia}</td>
              <td>${alertLabel}</td>
              <td>${thresholds.join(' / ')} días</td>
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
            <h2>Fianzas y garantías (HU-02)</h2>
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
                  <th>Acción</th>
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

    // REGISTRAR FIANZA (HU-02): Abre el modal para capturar los datos de una nueva fianza (anticipo, cumplimiento o vicios ocultos).
    registrarFianzaDialog() {
      this.showModal(`
        <h2>Registrar fianza / garantía (HU-02)</h2>
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
            <label>Umbrales de alerta (días antes del vencimiento)</label>
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

          this.showToast('Fianza registrada con éxito', 'success');
          this.closeModal();
          this.renderContractDetail();
        } catch (err) {
          this.showToast(err.message, 'error');
        }
      });
    },

    // REGISTRAR ENDOSO (HU-02): Abre el modal para registrar un endoso de fianza por prórrogas o ajustes de montos.
    registrarEndosoDialog(fianzaId) {
      this.showModal(`
        <h2>Registrar Endoso de Fianza</h2>
        <p style="margin-bottom: 20px; font-size:13px; color:var(--text-muted);">
          Use este registro cuando un convenio o ajuste formal modifique monto, vigencia o alcance de la póliza.
        </p>
        <form id="reg-endoso-form">
          <div class="form-group">
            <label>Descripción / Motivo</label>
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
          this.showToast('Endoso registrado con éxito', 'success');
          this.closeModal();
          this.renderContractDetail();
        } catch (err) {
          this.showToast(err.message, 'error');
        }
      });
    }
  };
})();
