(function () {
  window.IntegrApexModules = window.IntegrApexModules || {};

  window.IntegrApexModules.bitacora = {
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

    renderBitacoraTab(contract, outlet) {
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
                <label>Fecha Fin</label>
                <input type="date" id="s-f-fin">
              </div>
              <div class="col-3 form-group" style="margin-bottom:0;">
                <label>Firmante</label>
                <select id="s-firmante">
                  <option value="">Todos</option>
                </select>
              </div>
              <div class="col-3 form-group" style="margin-bottom:0;">
                <label>Vinculo (Folio)</label>
                <input type="number" id="s-vinculo" placeholder="Ej. 2">
              </div>
              <div class="col-5 form-group" style="margin-bottom:0;">
                <label>Busqueda Texto</label>
                <input type="text" id="s-query" placeholder="Palabra clave...">
              </div>
              <div class="col-4" style="display:flex; align-items:flex-end; gap:8px;">
                <button type="submit" class="btn btn-primary" style="width:100%; height:41px;">Buscar</button>
                <button type="button" class="btn btn-secondary" style="height:41px;" onclick="app.exportBitacoraExcel()">Exportar seleccion</button>
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

      this.loadBitacoraNotes({ populateFirmantes: true });
    },

    populateFirmanteOptions(notes) {
      const select = document.getElementById('s-firmante');
      if (!select) return;
      const firmantes = new Map();
      notes.forEach(n => {
        if (n.creado_por_id && !firmantes.has(n.creado_por_id)) {
          firmantes.set(n.creado_por_id, n.creado_por_nombre);
        }
      });
      const current = select.value;
      select.innerHTML = '<option value="">Todos</option>' +
        [...firmantes.entries()].map(([id, nombre]) => `<option value="${id}">${nombre}</option>`).join('');
      select.value = current;
    },

    async loadBitacoraNotes(opts = {}) {
      const list = document.getElementById('bitacora-notes-list');
      if (!list) return;

      const tipo = document.getElementById('s-tipo').value;
      const f_inicio = document.getElementById('s-f-inicio').value;
      const f_fin = document.getElementById('s-f-fin').value;
      const firmante = document.getElementById('s-firmante').value;
      const vinculo = document.getElementById('s-vinculo').value;
      const query = document.getElementById('s-query').value;

      const params = new URLSearchParams();
      if (tipo) params.set('tipo', tipo);
      if (f_inicio) params.set('f_inicio', f_inicio);
      if (f_fin) params.set('f_fin', f_fin);
      if (firmante) params.set('creador_id', firmante);
      if (vinculo) params.set('vinculo', vinculo);
      if (query) params.set('query', query);

      try {
        const notes = await this.api(`/api/contratos/${this.state.currentContractId}/bitacora/notas?${params.toString()}`);

        if (opts.populateFirmantes) {
          this.populateFirmanteOptions(notes);
        }

        let html = '';
        if (notes.length === 0) {
          html = `<div class="glass-panel" style="padding: 40px; text-align: center; color: var(--text-muted);">
            No se encontraron notas en la bitacora.
          </div>`;
        } else {
          html += `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <label style="font-size:12.5px; display:flex; align-items:center; gap:6px; color:var(--text-muted); cursor:pointer;">
                <input type="checkbox" id="bit-select-all"> Seleccionar todas
              </label>
              <span style="font-size:12px; color:var(--text-muted);">${notes.length} nota(s) encontradas</span>
            </div>
          `;
          notes.forEach(n => {
            let linkBadge = '';
            if (n.vinculo_nota_id) {
              linkBadge = `<span class="user-badge" style="background: #fffbeb; color:#92400e; border:none; margin: 0; font-size:10px;">Vnculo: Nota #${n.vinculo_nota_id}</span>`;
            }

            html += `
              <div class="glass-panel" style="margin-bottom: 16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:10px; margin-bottom:10px;">
                  <div style="display:flex; align-items:center; gap:10px;">
                    <input type="checkbox" class="bit-note-checkbox" value="${n.id}">
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

        const selectAll = document.getElementById('bit-select-all');
        if (selectAll) {
          selectAll.addEventListener('change', () => {
            document.querySelectorAll('.bit-note-checkbox').forEach(cb => { cb.checked = selectAll.checked; });
          });
        }
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

    exportBitacoraExcel() {
      const checked = [...document.querySelectorAll('.bit-note-checkbox:checked')].map(cb => cb.value);
      if (checked.length === 0) {
        this.showToast('Selecciona al menos una nota para exportar', 'info');
        return;
      }

      const url = `/api/contratos/${this.state.currentContractId}/bitacora/notas/export?ids=${encodeURIComponent(checked.join(','))}`;
      const link = document.createElement('a');
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      this.showToast(`Exportando ${checked.length} nota(s) a Excel`, 'success');
    }
  };
})();
