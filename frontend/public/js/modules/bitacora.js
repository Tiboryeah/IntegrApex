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
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                  <input type="checkbox" id="n-es-correccion"> Es una correccion formal de la nota vinculada (formato Dice / Debe decir, HU-09)
                </label>
              </div>
              <div id="n-correccion-fields" style="display:none;">
                <div class="form-group">
                  <label>Dice (texto original de la nota vinculada)</label>
                  <textarea id="n-dice" rows="2" placeholder="Se autocompleta con el contenido de la nota vinculada, editable si es necesario"></textarea>
                </div>
                <div class="form-group">
                  <label>Debe decir (correccion)</label>
                  <textarea id="n-debe-decir" rows="2" placeholder="Texto correcto..."></textarea>
                </div>
              </div>
              <div class="form-group">
                <label>Referencia (Minuta / Visita, HU-11)</label>
                <select id="n-referencia">
                  <option value="">Ninguna</option>
                  <optgroup label="Minutas">
                    ${(contract.minutas || []).map(m => `<option value="minuta:${m.id}">${m.descripcion} (${m.fecha_reunion})</option>`).join('')}
                  </optgroup>
                  <optgroup label="Visitas">
                    ${(contract.visitas || []).map(v => `<option value="visita:${v.id}">${v.descripcion} (${v.fecha_visita})</option>`).join('')}
                  </optgroup>
                </select>
              </div>
              <div class="form-group" id="n-contenido-wrapper">
                <label>Contenido</label>
                <textarea id="n-contenido" rows="5" placeholder="Asiente hechos..."></textarea>
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

      const esCorreccionCheckbox = document.getElementById('n-es-correccion');
      const correccionFields = document.getElementById('n-correccion-fields');
      const contenidoWrapper = document.getElementById('n-contenido-wrapper');
      const vinculoInput = document.getElementById('n-vinculo');
      const diceField = document.getElementById('n-dice');

      const toggleCorreccionMode = () => {
        const activo = esCorreccionCheckbox.checked;
        correccionFields.style.display = activo ? 'block' : 'none';
        contenidoWrapper.style.display = activo ? 'none' : 'block';
        if (activo) this.autocompletarNotaDice();
      };
      esCorreccionCheckbox.addEventListener('change', toggleCorreccionMode);
      vinculoInput.addEventListener('change', () => {
        if (esCorreccionCheckbox.checked) this.autocompletarNotaDice();
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
        this.state.bitacoraNotesCache = notes;

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
            let correccionBadge = '';
            if (n.correccion) {
              correccionBadge = `<span class="user-badge" style="background: #fef2f2; color:#b91c1c; border:none; margin: 0; font-size:10px;">Correccion (Dice/Debe decir)</span>`;
            }
            let referenciaBadge = '';
            if (n.referencia_tipo && n.referencia_id) {
              referenciaBadge = `<span class="user-badge" style="background: #eff6ff; color:#1d4ed8; border:none; margin: 0; font-size:10px; text-transform:capitalize;">${n.referencia_tipo} adjunta</span>`;
            }

            const contenidoHtml = n.correccion
              ? `
                <div style="font-size:13px; line-height:1.6; color:#334155;">
                  <div style="margin-bottom:6px;"><strong style="color:#b91c1c;">Dice:</strong> <span style="text-decoration:line-through; color:#94a3b8;">${n.correccion.dice}</span></div>
                  <div><strong style="color:#15803d;">Debe decir:</strong> ${n.correccion.debe_decir}</div>
                </div>
              `
              : `<p style="font-size:13.5px; line-height: 1.5; white-space: pre-line; color:#334155;">${n.contenido}</p>`;

            html += `
              <div class="glass-panel" style="margin-bottom: 16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:10px; margin-bottom:10px;">
                  <div style="display:flex; align-items:center; gap:10px;">
                    <input type="checkbox" class="bit-note-checkbox" value="${n.id}">
                    <span class="user-badge" style="background: var(--primary); font-weight:700; color:white; border:none;">Nota #${n.folio}</span>
                    <span class="user-badge" style="text-transform: capitalize; background:#f1f5f9; color:#475569; border:none;">${n.tipo}</span>
                    ${linkBadge}
                    ${correccionBadge}
                    ${referenciaBadge}
                  </div>
                  <div style="font-size:11.5px; color:var(--text-muted);">
                    ${new Date(n.fecha).toLocaleString()}
                  </div>
                </div>
                ${contenidoHtml}

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

    // HU-09: autocompleta el campo "Dice" con el contenido real de la nota vinculada
    async autocompletarNotaDice() {
      const folio = parseInt(document.getElementById('n-vinculo').value, 10);
      const diceField = document.getElementById('n-dice');
      if (!diceField) return;
      if (!folio) { diceField.value = ''; return; }

      let nota = (this.state.bitacoraNotesCache || []).find(n => n.folio === folio);
      if (!nota) {
        try {
          const all = await this.api(`/api/contratos/${this.state.currentContractId}/bitacora/notas`, {}, true);
          nota = all.find(n => n.folio === folio);
        } catch (e) {}
      }
      diceField.value = nota ? nota.contenido : '';
      if (!nota) this.showToast(`No se encontro la nota #${folio} para autocompletar "Dice"`, 'info');
    },

    async submitNewNote() {
      const tipo = document.getElementById('n-tipo').value;
      const vinculo = document.getElementById('n-vinculo').value;
      const esCorreccion = document.getElementById('n-es-correccion').checked;
      const contenido = document.getElementById('n-contenido').value;
      const dice = document.getElementById('n-dice').value;
      const debeDecir = document.getElementById('n-debe-decir').value;
      const referencia = document.getElementById('n-referencia').value;
      const [referencia_tipo, referencia_id] = referencia ? referencia.split(':') : [null, null];

      if (esCorreccion) {
        if (!vinculo) {
          this.showToast('Indica el folio de la nota que estas corrigiendo', 'error');
          return;
        }
        if (!dice.trim() || !debeDecir.trim()) {
          this.showToast('Completa "Dice" y "Debe decir" para registrar la correccion', 'error');
          return;
        }
      } else if (!contenido.trim()) {
        this.showToast('El contenido de la nota es obligatorio', 'error');
        return;
      }

      try {
        await this.api(`/api/contratos/${this.state.currentContractId}/bitacora/notas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo,
            contenido: esCorreccion ? undefined : contenido,
            vinculo_nota_id: vinculo ? parseInt(vinculo) : null,
            dice: esCorreccion ? dice : undefined,
            debe_decir: esCorreccion ? debeDecir : undefined,
            referencia_tipo,
            referencia_id
          })
        });
        this.showToast(esCorreccion ? 'Correccion (Dice/Debe decir) registrada y firmada' : 'Nota registrada y firmada electrunicamente', 'success');
        document.getElementById('n-contenido').value = '';
        document.getElementById('n-vinculo').value = '';
        document.getElementById('n-dice').value = '';
        document.getElementById('n-debe-decir').value = '';
        document.getElementById('n-es-correccion').checked = false;
        document.getElementById('n-correccion-fields').style.display = 'none';
        document.getElementById('n-contenido-wrapper').style.display = 'block';
        document.getElementById('n-referencia').value = '';
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
