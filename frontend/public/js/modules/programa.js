(function () {
  window.IntegrApexModules = window.IntegrApexModules || {};

  const money = value => `$${Number(value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

  window.IntegrApexModules.programa = {
    renderProgramaTab(contract, outlet) {
      const filterConcept = this.state.programaFilterConcept || '';
      const filterPeriod = parseInt(this.state.programaFilterPeriod || 0, 10);
      const conceptOptions = contract.catalogo.map(c => `<option value="${c.clave}" ${filterConcept === c.clave ? 'selected' : ''}>${c.clave} - ${c.descripcion}</option>`).join('');
      const periodOptions = contract.programa.map(m => `<option value="${m.mes}" ${filterPeriod === m.mes ? 'selected' : ''}>Periodo ${m.mes}</option>`).join('');

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

      Promise.all([
        fetch(`/api/contratos/${contract.id}/estimaciones`).then(res => res.json()),
        fetch(`/api/contratos/${contract.id}/trabajos-periodo`).then(res => res.json())
      ]).then(([ests, trabajos]) => {
        this.renderProgramaCharts(contract, ests, trabajos, { filterConcept, filterPeriod });
      }).catch(() => {});
    },

    renderProgramaCharts(contract, ests, trabajos, filters) {
      const filterConcept = filters.filterConcept;
      const filterPeriod = filters.filterPeriod;
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
      const progPoints = [0];
      const realPoints = [0];
      const finPoints = [0];
      let cumProg = 0;
      let cumReal = 0;
      let cumFin = 0;

      contract.programa.forEach(m => {
        let mSum = 0;
        Object.entries(m.avances).forEach(([k, qty]) => {
          if (filterConcept && k !== filterConcept) return;
          mSum += subtotalByQty(k, qty);
        });
        cumProg += (mSum / scopeAmount) * 100;
        progPoints.push(Math.min(100, cumProg));
      });

      for (let m = 1; m <= totalMonths; m++) {
        cumReal += (getWorkSubtotal(m) / scopeAmount) * 100;
        cumFin += (getPaidSubtotal(m) / scopeAmount) * 100;
        realPoints.push(Math.min(100, cumReal));
        finPoints.push(Math.min(100, cumFin));
      }

      this.renderCurveS(progPoints, realPoints, finPoints);
      this.renderGantt(contract, catalogoBase, programaBase, trabajosRegistrados, filterPeriod, totalMonths);
      this.renderConceptProgress(contract, catalogoBase, programaBase, trabajosRegistrados, paidEsts, filterPeriod);
      this.renderTrabajosPeriodo(contract, trabajosRegistrados, subtotalByQty);
      this.renderConceptAlertsPanel(contract, trabajosRegistrados);
    },

    renderCurveS(progPoints, realPoints, finPoints) {
      const width = 800;
      const height = 240;
      const path = (pts, color) => {
        const xStep = (width - 100) / (pts.length - 1);
        let d = `M 50 ${height - 40}`;
        pts.forEach((p, idx) => {
          d += ` L ${50 + idx * xStep} ${height - 40 - (p / 100) * (height - 80)}`;
        });
        return `<path d="${d}" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" />`;
      };
      const area = (pts, gradId) => {
        const xStep = (width - 100) / (pts.length - 1);
        let d = `M 50 ${height - 40}`;
        pts.forEach((p, idx) => {
          d += ` L ${50 + idx * xStep} ${height - 40 - (p / 100) * (height - 80)}`;
        });
        d += ` L ${50 + (pts.length - 1) * xStep} ${height - 40} Z`;
        return `<path d="${d}" fill="url(#${gradId})" stroke="none" />`;
      };
      const dots = (pts, color) => {
        const xStep = (width - 100) / (pts.length - 1);
        return pts.map((p, idx) => `<circle cx="${50 + idx * xStep}" cy="${height - 40 - (p / 100) * (height - 80)}" r="5" fill="${color}" stroke="#fff" stroke-width="2" />`).join('');
      };

      document.getElementById('curve-s-chart-outlet').innerHTML = `
        <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}">
          <defs>
            <linearGradient id="grad-prog" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--ipn-maroon-light)" stop-opacity="0.12"/><stop offset="100%" stop-color="var(--ipn-maroon-light)" stop-opacity="0"/></linearGradient>
            <linearGradient id="grad-real" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--accent-green)" stop-opacity="0.12"/><stop offset="100%" stop-color="var(--accent-green)" stop-opacity="0"/></linearGradient>
            <linearGradient id="grad-fin" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--accent-amber)" stop-opacity="0.12"/><stop offset="100%" stop-color="var(--accent-amber)" stop-opacity="0"/></linearGradient>
          </defs>
          <line x1="50" y1="${height - 40}" x2="${width - 50}" y2="${height - 40}" stroke="var(--border-color)" stroke-width="1.5" />
          <line x1="50" y1="40" x2="${width - 50}" y2="40" stroke="var(--border-color)" stroke-width="1.5" />
          ${[40, 80, 120, 160].map(offset => `<line x1="50" y1="${height - 40 - offset}" x2="${width - 50}" y2="${height - 40 - offset}" stroke="#f1f5f9" stroke-width="1" />`).join('')}
          ${progPoints.map((_, idx) => `<line x1="${50 + idx * ((width - 100) / (progPoints.length - 1))}" y1="40" x2="${50 + idx * ((width - 100) / (progPoints.length - 1))}" y2="${height - 40}" stroke="#e2e8f0" stroke-width="0.8" stroke-dasharray="2 2" />`).join('')}
          ${area(progPoints, 'grad-prog')}${area(realPoints, 'grad-real')}${area(finPoints, 'grad-fin')}
          ${path(progPoints, 'var(--ipn-maroon-light)')}${path(realPoints, 'var(--accent-green)')}${path(finPoints, 'var(--accent-amber)')}
          ${dots(progPoints, 'var(--ipn-maroon-light)')}${dots(realPoints, 'var(--accent-green)')}${dots(finPoints, 'var(--accent-amber)')}
          <text x="15" y="${height - 35}" fill="var(--text-muted)" font-size="11" font-weight="600">0%</text>
          <text x="10" y="${height - 115}" fill="var(--text-muted)" font-size="11" font-weight="600">50%</text>
          <text x="10" y="45" fill="var(--text-muted)" font-size="11" font-weight="600">100%</text>
          ${progPoints.map((_, idx) => `<text x="${50 + idx * ((width - 100) / (progPoints.length - 1))}" y="${height - 12}" fill="var(--text-muted)" font-size="11" font-weight="600" text-anchor="middle">${idx === 0 ? 'Inicio' : idx === progPoints.length - 1 ? 'Fin' : `Mes ${idx}`}</text>`).join('')}
        </svg>
      `;
    },

    renderGantt(contract, catalogoBase, programaBase, trabajosRegistrados, filterPeriod, totalMonths) {
      const months = filterPeriod ? [filterPeriod] : Array.from({ length: totalMonths }, (_, idx) => idx + 1);
      const header = months.map(m => `<div class="gantt-period-cell">Mes ${m}</div>`).join('');
      const rows = catalogoBase.map(item => {
        const blocks = programaBase.map(m => {
          const scheduledQty = (m.avances || {})[item.clave] || 0;
          const execQty = trabajosRegistrados.reduce((sum, t) => t.periodo_numero === m.mes ? sum + parseFloat((t.cantidades || {})[item.clave] || 0) : sum, 0);
          const progress = scheduledQty > 0 ? Math.min(100, (execQty / scheduledQty) * 100) : 0;
          return `<div class="gantt-period-cell" style="padding: 6px; display: flex; align-items:center; justify-content:center;">${scheduledQty > 0 ? `<div class="gantt-bar" title="Programado: ${scheduledQty} / Ejecutado: ${execQty}"><div class="gantt-progress" style="width: ${progress}%;"></div></div>` : ''}</div>`;
        }).join('');
        return `<div class="gantt-row"><div class="gantt-col-name">${item.clave}</div><div class="gantt-col-periods">${blocks}</div></div>`;
      }).join('');

      document.getElementById('gantt-chart-outlet').innerHTML = `
        <div class="gantt-container">
          <div class="gantt-header"><div class="gantt-col-name">Clave Concepto</div><div class="gantt-col-periods">${header}</div></div>
          ${rows}
        </div>
      `;
    },

    renderConceptProgress(contract, catalogoBase, programaBase, trabajosRegistrados, paidEsts, filterPeriod) {
      const rows = catalogoBase.map(item => {
        const scheduledQty = programaBase.reduce((sum, m) => sum + parseFloat((m.avances || {})[item.clave] || 0), 0);
        const executedQty = trabajosRegistrados.filter(t => !filterPeriod || t.periodo_numero === filterPeriod).reduce((sum, t) => sum + parseFloat((t.cantidades || {})[item.clave] || 0), 0);
        const paidQty = paidEsts.filter(e => !filterPeriod || e.periodo_numero === filterPeriod).reduce((sum, e) => sum + parseFloat((e.avances || {})[item.clave] || 0), 0);
        const pct = scheduledQty > 0 ? (executedQty / scheduledQty) * 100 : 0;
        return `<tr><td><strong>${item.clave}</strong></td><td>${scheduledQty.toFixed(2)}</td><td>${executedQty.toFixed(2)}</td><td>${paidQty.toFixed(2)}</td><td>${Math.min(100, pct).toFixed(1)}%</td></tr>`;
      }).join('');

      document.getElementById('program-progress-summary').innerHTML = `
        <div class="table-container">
          <table><thead><tr><th>Concepto</th><th>Programado</th><th>Ejecutado</th><th>Pagado</th><th>Avance fisico</th></tr></thead><tbody>${rows}</tbody></table>
        </div>
      `;
    },

    renderTrabajosPeriodo(contract, trabajosRegistrados, subtotalByQty) {
      const registerBtn = this.state.user.rol === 'contratista' ? `<button class="btn btn-primary btn-sm" onclick="app.registrarTrabajosPeriodoDialog()">Registrar trabajos</button>` : '';
      const rows = trabajosRegistrados.length === 0
        ? `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:16px;">No hay trabajos terminados registrados.</td></tr>`
        : trabajosRegistrados.map(t => {
          const total = Object.entries(t.cantidades || {}).reduce((sum, [clave, qty]) => sum + subtotalByQty(clave, parseFloat(qty || 0)), 0);
          return `<tr><td>Periodo ${t.periodo_numero}</td><td>${t.fecha_inicio} a ${t.fecha_fin}</td><td>${money(total)}</td><td>${t.nota_bitacora_id}</td><td><span class="badge badge-authorized">${t.estado}</span></td></tr>`;
        }).join('');

      document.getElementById('trabajos-periodo-outlet').innerHTML = `
        <div class="glass-panel">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:14px;">
            <h2>Trabajos Terminados por Periodo (HU-06)</h2>${registerBtn}
          </div>
          <div class="table-container"><table><thead><tr><th>Periodo</th><th>Fechas</th><th>Importe fisico</th><th>Nota vinculada</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table></div>
        </div>
      `;
    },

    applyProgramaFilters(kind, value) {
      if (kind === 'concept') this.state.programaFilterConcept = value;
      if (kind === 'period') this.state.programaFilterPeriod = value;
      this.renderActiveTabContent(this.state.currentContractData);
    },

    renderConceptAlertsPanel(contract, trabajos) {
      fetch(`/api/contratos/${contract.id}/alertas`).then(res => res.json()).then(alerts => {
        const rows = alerts.length === 0
          ? `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 16px;">No hay alertas de atraso configuradas</td></tr>`
          : alerts.map(a => this.renderConceptAlertRow(contract, trabajos, a)).join('');
        const configBtn = this.state.user.rol === 'residente'
          ? `<button class="btn btn-primary btn-sm" style="font-size:12px; padding: 6px 12px;" onclick="app.configurarAlertaDialog()">Configurar Alerta</button>`
          : '';

        document.getElementById('concept-alerts-panel').innerHTML = `
          <div class="glass-panel" style="height: 100%;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px;">
              <h2 style="font-size: 15px;">Vigilancia Conceptos (HU-07)</h2>${configBtn}
            </div>
            <div class="table-container">
              <table><thead><tr><th>Clave</th><th>Limite</th><th>Canal</th><th>Estado</th><th>Atraso</th><th style="text-align:center;">Accion</th></tr></thead><tbody>${rows}</tbody></table>
            </div>
          </div>
        `;
      }).catch(() => {});
    },

    renderConceptAlertRow(contract, trabajos, alert) {
      const concept = contract.catalogo.find(c => c.clave === alert.concept_key);
      if (!concept) return '';
      const isPaused = alert.estado === 'pausada';
      // HU-07: "la alerta solo dispara cuando el avance real es menor al umbral" - el estado
      // `disparada`/`ultimo_avance_pct` viene del backend (checkAlertasConcepto), evaluado en
      // tiempo real tras cada evento que cambia el avance (trabajos por periodo, estimaciones).
      const isFired = !isPaused && !!alert.disparada;
      const avanceConocido = typeof alert.ultimo_avance_pct === 'number';
      let statusBadge = `<span class="badge badge-authorized">Vigente (OK)</span>`;
      if (isPaused) statusBadge = `<span class="badge badge-review">Pausada</span>`;
      if (isFired) statusBadge = `<span class="badge badge-rejected" style="animation: pulse-glow 1.5s infinite;">ALERTA DISPARADA</span>`;
      const avanceTexto = avanceConocido ? `${alert.ultimo_avance_pct.toFixed(1)}%` : 'Sin evaluar aun';

      const actions = this.state.user.rol === 'residente' ? `
        <button class="btn btn-secondary" style="padding: 4px 8px;" title="${isPaused ? 'Reactivar alerta' : 'Pausar alerta'}" onclick="app.toggleAlertaEstado('${alert.id}', '${isPaused ? 'activa' : 'pausada'}')">
          <span class="material-icons-round" style="font-size: 16px;">${isPaused ? 'play_arrow' : 'pause'}</span>
        </button>
        <button class="btn btn-secondary" style="padding: 4px 8px; color: var(--ipn-maroon-light);" title="Eliminar alerta" onclick="app.eliminarAlertaConcep('${alert.id}')">
          <span class="material-icons-round" style="font-size: 16px;">delete</span>
        </button>
      ` : ' - ';

      return `<tr><td><strong>${alert.concept_key}</strong></td><td>${alert.limite_desviacion}%</td><td>${alert.canal || 'sistema'}</td><td>${statusBadge}</td><td>${avanceTexto}</td><td style="text-align:center;">${actions}</td></tr>`;
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
      const conceptInputs = contract.catalogo.map(c => `<tr><td><strong>${c.clave}</strong></td><td>${c.descripcion}</td><td>${c.unidad}</td><td>${c.cantidad}</td><td><input class="trabajo-qty" data-clave="${c.clave}" type="number" step="0.0001" min="0" value="0"></td></tr>`).join('');

      this.showModal(`
        <h2>Registrar Trabajos Terminados (HU-06)</h2>
        <form id="trabajos-periodo-form">
          <div class="form-grid">
            <div class="form-group"><label>Periodo</label><input type="number" id="tp-periodo" min="1" required></div>
            <div class="form-group"><label>Fecha inicio</label><input type="date" id="tp-inicio" required></div>
            <div class="form-group"><label>Fecha fin</label><input type="date" id="tp-fin" required></div>
            <div class="form-group"><label>Nota de bitacora vinculada</label><select id="tp-nota" required ${notes.length === 0 ? 'disabled' : ''}>${noteOptions}</select></div>
          </div>
          <div class="table-container" style="margin-top:14px;"><table><thead><tr><th>Clave</th><th>Concepto</th><th>Unidad</th><th>Contratada</th><th>Terminada</th></tr></thead><tbody>${conceptInputs}</tbody></table></div>
          <div class="form-group" style="margin-top:14px;"><label>Observaciones</label><textarea id="tp-observaciones" rows="3"></textarea></div>
          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:24px;">
            <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary" ${notes.length === 0 ? 'disabled' : ''}>Guardar trabajos</button>
          </div>
        </form>
      `);

      document.getElementById('trabajos-periodo-form').addEventListener('submit', async (event) => {
        event.preventDefault();
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
        } catch (e) {}
      });
    },

    configurarAlertaDialog() {
      const contract = this.state.currentContractData;
      const conceptOpts = contract.catalogo.map(c => `<option value="${c.clave}">${c.clave} - ${c.descripcion}</option>`).join('');

      this.showModal(`
        <h2>Configurar Alerta de Atraso (HU-07)</h2>
        <form id="configurar-alerta-form">
          <div class="form-group"><label>Concepto a Monitorear</label><select id="al-concept" required>${conceptOpts}</select></div>
          <div class="form-group"><label>Limite Desviacion Permitido (%)</label><input type="number" id="al-limite" placeholder="Ej. 10" min="1" max="100" required></div>
          <div class="form-group"><label>Canal de Notificacion</label><select id="al-canal"><option value="sistema">Notificacion en Sistema</option><option value="correo">Correo Electronico (Ficticio)</option></select></div>
          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:24px;">
            <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">Configurar Alerta</button>
          </div>
        </form>
      `);

      document.getElementById('configurar-alerta-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
          await this.api(`/api/contratos/${this.state.currentContractId}/alertas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              concept_key: document.getElementById('al-concept').value,
              limite_desviacion: document.getElementById('al-limite').value,
              canal: document.getElementById('al-canal').value
            })
          });
          this.showToast('Alerta de concepto configurada', 'success');
          this.closeModal();
          this.renderContractDetail();
        } catch (e) {}
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
    }
  };
})();
