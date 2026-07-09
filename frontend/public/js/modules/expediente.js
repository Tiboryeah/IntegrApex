(function () {
  window.IntegrApexModules = window.IntegrApexModules || {};

  window.IntegrApexModules.expediente = {
    renderConfigTab(contract, outlet) {
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
              <h2>Exportar Reportes (HU-19)</h2>
              <p style="font-size: 12.5px; color: var(--text-muted); margin-top: 8px; margin-bottom: 16px; line-height: 1.45;">
                Descarga cualquiera de los 7 reportes oficiales en Excel o PDF, acumulado o acotado a un periodo.
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
              <div class="form-group">
                <label>Formato</label>
                <select id="export-report-formato" style="font-size: 13px; padding: 8px;">
                  <option value="xlsx">Excel (.xlsx)</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
              <div class="form-group">
                <label>Periodo</label>
                <select id="export-report-periodo-tipo" style="font-size: 13px; padding: 8px;" onchange="app.togglePeriodoReporteInput()">
                  <option value="acumulado">Acumulado (todo el historico)</option>
                  <option value="mensual">Mensual</option>
                  <option value="trimestral">Trimestral</option>
                </select>
              </div>
              <div class="form-group" id="export-report-periodo-valor-wrapper" style="display:none;">
                <label>Valor del periodo</label>
                <input type="month" id="export-report-periodo-mensual" style="display:none; font-size: 13px; padding: 8px;">
                <div id="export-report-periodo-trimestral" style="display:none; gap:8px;">
                  <select id="export-report-trimestre" style="font-size: 13px; padding: 8px;">
                    <option value="1">Trimestre 1 (Ene-Mar)</option>
                    <option value="2">Trimestre 2 (Abr-Jun)</option>
                    <option value="3">Trimestre 3 (Jul-Sep)</option>
                    <option value="4">Trimestre 4 (Oct-Dic)</option>
                  </select>
                  <input type="number" id="export-report-anio" value="${new Date().getFullYear()}" style="max-width:90px; font-size: 13px; padding: 8px;">
                </div>
              </div>
              <button class="btn btn-secondary" style="width: 100%; font-size:13px; padding:9px;" onclick="app.descargarReporte()">
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
    },

    renderCatalogoTab(contract, outlet) {
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
                <th>Archivo</th>
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
                  <td>${r.archivo ? `<a href="${r.archivo}" target="_blank" style="color: var(--ipn-maroon-light); font-weight:600; text-decoration:none; display:flex; align-items:center; gap:4px;"><span class="material-icons-round" style="font-size:15px;">download</span> Descargar</a>` : '<span style="color:var(--text-muted); font-size:12px;">Sin archivo</span>'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } catch (e) {}
    },

    clearExpedienteSearch() {
      const form = document.getElementById('expediente-search-form');
      if (form) form.reset();
      const outlet = document.getElementById('expediente-search-results');
      if (outlet) outlet.style.display = 'none';
    },

    togglePeriodoReporteInput() {
      const tipo = document.getElementById('export-report-periodo-tipo').value;
      const wrapper = document.getElementById('export-report-periodo-valor-wrapper');
      const mensual = document.getElementById('export-report-periodo-mensual');
      const trimestral = document.getElementById('export-report-periodo-trimestral');

      if (tipo === 'acumulado') {
        wrapper.style.display = 'none';
        return;
      }
      wrapper.style.display = 'block';
      mensual.style.display = tipo === 'mensual' ? 'block' : 'none';
      trimestral.style.display = tipo === 'trimestral' ? 'flex' : 'none';
    },

    descargarReporte() {
      const reportType = document.getElementById('export-report-select').value;
      const formato = document.getElementById('export-report-formato').value;
      const periodoTipo = document.getElementById('export-report-periodo-tipo').value;

      let periodoValor = '';
      if (periodoTipo === 'mensual') {
        periodoValor = document.getElementById('export-report-periodo-mensual').value;
        if (!periodoValor) {
          this.showToast('Selecciona el mes a exportar', 'info');
          return;
        }
      } else if (periodoTipo === 'trimestral') {
        const trimestre = document.getElementById('export-report-trimestre').value;
        const anio = document.getElementById('export-report-anio').value;
        if (!anio) {
          this.showToast('Captura el ano del trimestre a exportar', 'info');
          return;
        }
        periodoValor = `${anio}-${trimestre}`;
      }

      const params = new URLSearchParams({ formato, periodo_tipo: periodoTipo });
      if (periodoValor) params.set('periodo_valor', periodoValor);

      const url = `/api/contratos/${this.state.currentContractId}/reportes/${reportType}/export?${params.toString()}`;
      const link = document.createElement('a');
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      this.showToast(`Generando reporte en ${formato === 'pdf' ? 'PDF' : 'Excel'}...`, 'success');
    }
  };
})();
