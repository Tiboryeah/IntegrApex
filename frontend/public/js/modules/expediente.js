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
      const form = document.getElementById('expediente-search-form');
      if (form) form.reset();
      const outlet = document.getElementById('expediente-search-results');
      if (outlet) outlet.style.display = 'none';
    },

    async descargarReporteExcel() {
      const reportType = document.getElementById('export-report-select').value;
      try {
        const data = await this.api(`/api/contratos/${this.state.currentContractId}/reporte-data`);

        let csvContent = "data:text/csv;charset=utf-8,﻿";
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
    }
  };
})();
