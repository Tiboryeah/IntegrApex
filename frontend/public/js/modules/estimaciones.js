(function () {
  window.IntegrApexModules = window.IntegrApexModules || {};

  window.IntegrApexModules.estimaciones = {
    // ==========================================
    // TABLERO DE ESTIMACIONES ACTIVAS (HU-17)
    // ==========================================
    async renderTableroEstimaciones() {
      this.showLoggedInUI();
      const outlet = document.getElementById('app-router-outlet');

      try {
        const data = await this.api('/api/tableros/estimaciones-activas');
        const { resumen, estimaciones } = data;

        const estadoLabel = {
          presentada: 'Presentada',
          en_revision: 'En revision',
          autorizada: 'Autorizada',
          en_pago: 'En pago',
          pagada: 'Pagada'
        };
        const estadoBadge = {
          presentada: 'badge-presented',
          en_revision: 'badge-review',
          autorizada: 'badge-authorized',
          en_pago: 'badge-review',
          pagada: 'badge-paid'
        };
        const money = v => `$${(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

        const resumenCards = ['presentada', 'en_revision', 'autorizada', 'en_pago', 'pagada'].map(estado => {
          const info = resumen.por_estado[estado] || { count: 0, monto: 0 };
          return `
            <div class="col-2" style="min-width:140px;">
              <div class="glass-panel" style="padding:14px; text-align:center;">
                <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">${estadoLabel[estado]}</div>
                <div style="font-size:22px; font-weight:700; color:#0f172a; margin-top:4px;">${info.count}</div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${money(info.monto)}</div>
              </div>
            </div>
          `;
        }).join('');

        const pendientes = estimaciones.filter(e => e.requiere_mi_accion);
        const pendientesHtml = pendientes.length === 0
          ? `<div style="padding:20px; text-align:center; color:var(--text-muted); font-size:13px;">No tienes pendientes por resolver en este momento.</div>`
          : pendientes.map(e => `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid var(--border-color);">
                <div>
                  <span class="user-badge" style="background:var(--ipn-maroon); color:white; border:none;">${e.folio_contrato}</span>
                  <strong style="margin-left:8px;">Periodo #${e.periodo}</strong>
                  <span class="badge ${estadoBadge[e.estado]}" style="margin-left:8px;">${estadoLabel[e.estado]}</span>
                </div>
                <div style="display:flex; align-items:center; gap:12px;">
                  <span style="font-size:12px; color:var(--text-muted);">${e.dias_transcurridos} dia(s)</span>
                  <button class="btn btn-primary btn-sm" onclick="app.verEstimacionDesdeTablero('${e.contrato_id}', '${e.id}')">Atender</button>
                </div>
              </div>
            `).join('');

        const filaLineaTiempo = linea => linea.map(h => `<span class="badge ${estadoBadge[h.estado] || 'badge-review'}" style="font-size:9.5px; margin-right:4px;" title="${new Date(h.fecha).toLocaleString('es-MX')}">${estadoLabel[h.estado] || h.estado}</span>`).join('');

        const filas = estimaciones.length === 0
          ? `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:24px;">No hay estimaciones activas para mostrar</td></tr>`
          : estimaciones.map(e => `
              <tr style="cursor:pointer;" onclick="app.verEstimacionDesdeTablero('${e.contrato_id}', '${e.id}')">
                <td><strong>${e.folio_contrato}</strong></td>
                <td>Periodo #${e.periodo}</td>
                <td><span class="badge ${estadoBadge[e.estado]}">${estadoLabel[e.estado]}</span></td>
                <td>${money(e.monto)}</td>
                <td>${e.dias_transcurridos} dia(s)</td>
                <td>${filaLineaTiempo(e.linea_tiempo)}</td>
                <td>${e.requiere_mi_accion ? '<span class="badge badge-rejected">Requiere mi accion</span>' : '-'}</td>
              </tr>
            `).join('');

        outlet.innerHTML = `
          <div class="main-container">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
              <h1>Tablero de Estimaciones (HU-17)</h1>
              <button class="btn btn-secondary" onclick="app.navigate('inicio')">
                <span class="material-icons-round">arrow_back</span> Inicio
              </button>
            </div>

            <div class="dashboard-grid" style="margin-bottom:20px;">
              ${resumenCards}
            </div>

            <div class="glass-panel" style="margin-bottom:20px;">
              <h2>Mis Pendientes</h2>
              <p style="font-size:12.5px; color:var(--text-muted); margin-top:4px; margin-bottom:8px;">Estimaciones que requieren accion de tu rol (${this.state.user.rol}) ahora mismo.</p>
              <div>${pendientesHtml}</div>
            </div>

            <div class="glass-panel">
              <h2>Estimaciones Activas y en Proceso</h2>
              <div class="table-container" style="margin-top:16px;">
                <table>
                  <thead>
                    <tr>
                      <th>Contrato</th>
                      <th>Periodo</th>
                      <th>Estado</th>
                      <th>Monto</th>
                      <th>Dias transcurridos</th>
                      <th>Linea de tiempo</th>
                      <th>Accion requerida</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${filas}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        `;
      } catch (e) {}
    },

    async verEstimacionDesdeTablero(contratoId, estId) {
      this.state.currentContractId = contratoId;
      await this.navigate('contract-detail', { id: contratoId });
      this.viewEstimacionDetail(estId);
    },

    // ==========================================
    // RENDER ESTIMACIONES MODULE (HU-12 a HU-16)
    // ==========================================
    async renderEstimacionesScreen() {
      const outlet = document.getElementById('app-router-outlet');
      const id = this.state.currentContractId;

      try {
        const contract = this.state.currentContractData;
        const filterPeriodo = this.state.estimacionesFilterPeriodo || '';
        const filterEstado = this.state.estimacionesFilterEstado || '';
        const params = new URLSearchParams();
        if (filterPeriodo) params.set('periodo', filterPeriodo);
        if (filterEstado) params.set('estado', filterEstado);
        const ests = await this.api(`/api/contratos/${id}/estimaciones?${params.toString()}`);

        let rows = '';
        if (ests.length === 0) {
          rows = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding:30px;">No hay estimaciones integradas para este contrato</td></tr>`;
        } else {
          ests.forEach(e => {
            let badgeClass = 'badge-presented';
            if (e.estado === 'autorizada') badgeClass = 'badge-authorized';
            if (e.estado === 'pagada') badgeClass = 'badge-paid';
            if (e.estado === 'rechazada') badgeClass = 'badge-rejected';
            if (e.estado === 'en_revision') badgeClass = 'badge-review';

            const plazoBadge = this.renderPlazoBadge(e.plazo_revision || e.plazo_pago) || '-';

            rows += `
              <tr style="cursor:pointer;" onclick="app.viewEstimacionDetail('${e.id}')">
                <td><strong>Periodo #${e.periodo_numero}</strong></td>
                <td>${e.fecha_inicio} al ${e.fecha_fin}</td>
                <td>$${e.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                <td>$${e.liquido_a_pagar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                <td><span class="badge ${badgeClass}">${e.estado}</span></td>
                <td>${plazoBadge}</td>
                <td>
                  <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); app.viewEstimacionDetail('${e.id}')">Inspeccionar</button>
                </td>
              </tr>
            `;
          });
        }

        let actions = '';
        if (this.state.user.rol === 'contratista') {
          actions = `
            <button class="btn btn-primary" onclick="app.integrarEstimacionForm()">
              <span class="material-icons-round">add</span> Integrar Estimacion
            </button>
          `;
        }

        outlet.innerHTML = `
          <div class="main-container">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
              <div>
                <span class="user-badge" style="background:#5c1e30; color:white; border:none;">${contract.folio}</span>
                <h1>Modulo de Estimaciones Contractuales</h1>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-secondary" onclick="app.navigate('contract-detail', { id: '${contract.id}' })">
                  <span class="material-icons-round">arrow_back</span> Expediente
                </button>
                ${actions}
              </div>
            </div>

            <div class="glass-panel">
              <h2>Historial de Estimaciones (HU-14)</h2>
              <form id="est-historial-filtros" class="dashboard-grid" style="gap:12px; margin-top:12px; margin-bottom:16px;">
                <div class="col-3 form-group" style="margin-bottom:0;">
                  <label>Periodo</label>
                  <input type="number" id="est-filtro-periodo" placeholder="Ej. 3" value="${filterPeriodo}">
                </div>
                <div class="col-4 form-group" style="margin-bottom:0;">
                  <label>Estado</label>
                  <select id="est-filtro-estado">
                    <option value="">Todos</option>
                    <option value="borrador" ${filterEstado === 'borrador' ? 'selected' : ''}>Borrador</option>
                    <option value="presentada" ${filterEstado === 'presentada' ? 'selected' : ''}>Presentada</option>
                    <option value="en_revision" ${filterEstado === 'en_revision' ? 'selected' : ''}>En revision</option>
                    <option value="autorizada" ${filterEstado === 'autorizada' ? 'selected' : ''}>Autorizada</option>
                    <option value="rechazada" ${filterEstado === 'rechazada' ? 'selected' : ''}>Rechazada</option>
                    <option value="en_pago" ${filterEstado === 'en_pago' ? 'selected' : ''}>En pago</option>
                    <option value="pagada" ${filterEstado === 'pagada' ? 'selected' : ''}>Pagada</option>
                  </select>
                </div>
                <div class="col-5" style="display:flex; align-items:flex-end; gap:8px;">
                  <button type="submit" class="btn btn-primary">Filtrar</button>
                  <button type="button" class="btn btn-secondary" onclick="app.limpiarFiltrosEstimaciones()">Limpiar</button>
                </div>
              </form>
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Periodo</th>
                      <th>Fechas</th>
                      <th>Subtotal Est.</th>
                      <th>Lquido Net.</th>
                      <th>Estatus</th>
                      <th>Plazo Legal</th>
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

        document.getElementById('est-historial-filtros').addEventListener('submit', (e) => {
          e.preventDefault();
          this.state.estimacionesFilterPeriodo = document.getElementById('est-filtro-periodo').value;
          this.state.estimacionesFilterEstado = document.getElementById('est-filtro-estado').value;
          this.renderEstimacionesScreen();
        });
      } catch(e) {}
    },

    limpiarFiltrosEstimaciones() {
      this.state.estimacionesFilterPeriodo = '';
      this.state.estimacionesFilterEstado = '';
      this.renderEstimacionesScreen();
    },

    integrarEstimacionForm() {
      const contract = this.state.currentContractData;

      let conceptInputs = '';
      contract.catalogo.forEach(c => {
        conceptInputs += `
          <div class="col-6 form-group">
            <label>Clave: ${c.clave} (${c.descripcion}) - Limite: ${c.cantidad}</label>
            <input type="number" class="est-av-qty" data-clave="${c.clave}" placeholder="0" step="any" required>
          </div>
        `;
      });

      this.showModal(`
        <h2>Integrar Estimacion de Obra (HU-12)</h2>
        <p style="margin-bottom: 16px; font-size:13px; color:var(--text-muted); line-height:1.4;">
          De acuerdo con el Art. 132 RLOPSRM, asiente los generadores del periodo. El sistema calcula retenciones del 5 al millar (Art. 191 LFD) y amortizacion.
        </p>
        <form id="integrar-est-form" style="max-height: 70vh; overflow-y: auto; padding-right:10px;">
          <div class="dashboard-grid" style="gap:15px;">
            <div class="col-4 form-group">
              <label>Periodo #</label>
              <input type="number" id="est-periodo" placeholder="1" required>
            </div>
            <div class="col-4 form-group">
              <label>Fecha Inicio</label>
              <input type="date" id="est-f-ini" required>
            </div>
            <div class="col-4 form-group">
              <label>Fecha Fin</label>
              <input type="date" id="est-f-fin" required>
            </div>

            <div class="col-12"><h3 style="margin-top:10px; font-size:14px; color:var(--primary);">Cantidades Ejecutadas del Periodo</h3></div>
            ${conceptInputs}

            <div class="col-6 form-group">
              <label>Penalizaciones / Deductivas ($)</label>
              <input type="number" id="est-penalizaciones" value="0">
            </div>
            <div class="col-6 form-group">
              <label>Nota Bitacora Vinculada (ID)</label>
              <input type="number" id="est-vinculos" placeholder="Ej. 2">
            </div>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:24px;">
            <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">Integrar Estimacion</button>
          </div>
        </form>
      `);

      document.getElementById('integrar-est-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const avances = {};
        const inputs = document.querySelectorAll('.est-av-qty');
        inputs.forEach(i => {
          avances[i.dataset.clave] = parseFloat(i.value || 0);
        });

        const payload = {
          periodo_numero: document.getElementById('est-periodo').value,
          fecha_inicio: document.getElementById('est-f-ini').value,
          fecha_fin: document.getElementById('est-f-fin').value,
          avances,
          penalizaciones: document.getElementById('est-penalizaciones').value,
          notes_vinculadas_ids: document.getElementById('est-vinculos').value ? [parseInt(document.getElementById('est-vinculos').value)] : []
        };

        try {
          await this.api(`/api/contratos/${this.state.currentContractId}/estimaciones/integrar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          this.showToast('Estimacion integrada en borrador con exito', 'success');
          this.closeModal();
          this.renderEstimacionesScreen();
        } catch (err) {}
      });
    },

    renderPlazoBadge(plazo) {
      if (!plazo) return '';
      const badgeClass = plazo.semaforo === 'rojo' ? 'badge-rejected' : plazo.semaforo === 'ambar' ? 'badge-presented' : 'badge-authorized';
      const texto = plazo.vencido
        ? `Vencido hace ${Math.abs(plazo.dias_restantes)} dia(s)`
        : `${plazo.dias_restantes} de ${plazo.dias_limite} dia(s) restantes`;
      return `<span class="badge ${badgeClass}">${texto}</span>`;
    },

    async viewEstimacionDetail(estId) {
      const outlet = document.getElementById('app-router-outlet');

      try {
        const est = await this.api(`/api/contratos/${this.state.currentContractId}/estimaciones`);
        const data = est.find(e => e.id === estId);
        const contract = this.state.currentContractData;

        let actionPanel = '';

        if (this.state.user.rol === 'contratista' && data.estado === 'borrador') {
          const fechaLimiteEnvio = new Date(new Date(data.fecha_fin).getTime() + 6 * 24 * 60 * 60 * 1000);
          const plazoVencido = new Date() > fechaLimiteEnvio;

          actionPanel += `
            <div class="glass-panel" style="margin-top:20px;">
              <h3>Enviar Estimacion a Revision (HU-13)</h3>
              <p style="margin-bottom:15px; font-size:13px; color:var(--text-muted);">Debe adjuntar el PDF de generadores antes de enviar. El plazo de presentacin vence a los 6 dias naturales del periodo (Art. 54 LOPSRM): ${fechaLimiteEnvio.toLocaleDateString('es-MX')}.</p>
              ${plazoVencido ? `<p style="font-size:13px; color:var(--accent-red); font-weight:600; margin-bottom:15px;">El plazo de 6 dias naturales para presentar esta estimacion ya vencio. No se puede enviar.</p>` : ''}
              <form id="send-est-form" style="display:flex; align-items:center; gap:20px;">
                <input type="file" id="send-est-pdf" accept=".pdf" ${plazoVencido ? 'disabled' : 'required'} style="max-width:300px;">
                <button type="submit" class="btn btn-primary" ${plazoVencido ? 'disabled' : ''}>Enviar formalmente</button>
              </form>
            </div>
          `;
        }

        if (this.state.user.rol === 'supervision' && data.estado === 'presentada') {
          actionPanel += `
            <div class="glass-panel" style="margin-top:20px;">
              <h3>Revision Tecnica de Supervision (HU-15)</h3>
              <p style="margin-bottom:15px; font-size:13px; color:var(--text-muted);">Registre observaciones de revision antes de turnar la estimacion al Residente de Obra.</p>
              <button class="btn btn-primary" onclick="app.turnarAResidenteDialog('${data.id}')">Turnar a Residencia</button>
            </div>
          `;
        }

        if (this.state.user.rol === 'residente' && data.estado === 'presentada') {
          actionPanel += `
            <div class="glass-panel" style="margin-top:20px;">
              <h3>Autorizacion del Residente de Obra (HU-15)</h3>
              <p style="font-size:13px; color:var(--text-muted);">Esta estimacion todavia no ha sido turnada por Supervision. La residencia no puede autorizar ni rechazar hasta que Supervision la revise y la turne.</p>
            </div>
          `;
        }

        if (this.state.user.rol === 'residente' && data.estado === 'en_revision') {
          actionPanel += `
            <div class="glass-panel" style="margin-top:20px;">
              <h3>Autorizacion del Residente de Obra (HU-15)</h3>
              <p style="margin-bottom:15px; font-size:13px; color:var(--text-muted);">El residente autoriza o rechaza formalmente la estimacion (Art. 53/54 LOPSRM).</p>
              <div style="display:flex; gap:10px;">
                <button class="btn btn-primary" onclick="app.resolverEstimacion('${data.id}', 'autorizada')">Autorizar para Pago</button>
                <button class="btn btn-secondary btn-danger" onclick="app.resolverEstimacion('${data.id}', 'rechazada')">Rechazar Estimacion</button>
              </div>
            </div>
          `;
        }

        if (data.estado === 'rechazada') {
          const observacionesList = (data.observaciones || []).length
            ? `<ul style="margin:12px 0; padding-left:18px; font-size:13px; color:#334155; line-height:1.6;">${(data.observaciones || []).map(o => `<li>${o.comentario || ''}</li>`).join('')}</ul>`
            : `<p style="font-size:13px; color:var(--text-muted); margin-top:12px;">No se registraron observaciones detalladas.</p>`;
          const reingresarBtn = this.state.user.rol === 'contratista'
            ? `<button class="btn btn-primary" onclick="app.reingresarEstimacionForm('${data.id}')">Reingresar Nueva Version</button>`
            : '';

          actionPanel += `
            <div class="glass-panel" style="margin-top:20px;">
              <h3>Estimacion Rechazada - Observaciones (HU-16)</h3>
              <p style="margin-bottom:0; font-size:13px; color:var(--text-muted);">${data.comentario_residencia ? `Resolucion de residencia: ${data.comentario_residencia}` : 'Atienda las observaciones tecnicas antes de reingresar.'}</p>
              ${observacionesList}
              <div style="display:flex; gap:10px; flex-wrap:wrap;">
                ${reingresarBtn}
                <button class="btn btn-secondary" onclick="app.descargarObservaciones('${data.id}', 'xlsx')">
                  <span class="material-icons-round" style="font-size:16px;">download</span> Excel
                </button>
                <button class="btn btn-secondary" onclick="app.descargarObservaciones('${data.id}', 'pdf')">
                  <span class="material-icons-round" style="font-size:16px;">download</span> PDF
                </button>
              </div>
            </div>
          `;
        }

        if ((this.state.user.rol === 'contratista' || this.state.user.rol === 'finanzas') && data.estado === 'autorizada') {
          actionPanel += `
            <div class="glass-panel" style="margin-top:20px;">
              <h3>Transito a Pago y Suficiencia Presupuestal (HU-20)</h3>
              <p style="margin-bottom:15px; font-size:13px; color:var(--text-muted);">Verifique suficiencia presupuestal (Art. 24 LOPSRM) e ingrese factura/CFDI para generar la instruccin.</p>
              <div style="display:flex; gap:10px;">
                <button class="btn btn-primary" onclick="app.verificarPresupuesto('${data.id}')">Verificar Suficiencia (Art. 24)</button>
                <button class="btn btn-secondary" onclick="app.instruccionPagoDialog('${data.id}')">Cargar Factura / Generar Instruccin</button>
              </div>
            </div>
          `;
        }

        if (this.state.user.rol === 'finanzas' && data.estado === 'en_pago') {
          actionPanel += `
            <div class="glass-panel" style="margin-top:20px;">
              <h3>Registrar Pago Efectuado (HU-21)</h3>
              <p style="margin-bottom:15px; font-size:13px; color:var(--text-muted);">Asiente la fecha y folio SPEI bancario para cerrar el ciclo financiero.</p>
              <button class="btn btn-primary" onclick="app.registrarPagoDialog('${data.id}')">Registrar Pago</button>
            </div>
          `;
        }

        let conceptRows = '';
        Object.entries(data.avances).forEach(([clave, qty]) => {
          const concept = contract.catalogo.find(c => c.clave === clave);
          conceptRows += `
            <tr>
              <td><strong>${clave}</strong></td>
              <td>${concept.descripcion}</td>
              <td>${qty.toLocaleString('es-MX')} ${concept.unidad}</td>
              <td>$${concept.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
              <td>$${(qty * concept.precio_unitario).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
            </tr>
          `;
        });

        outlet.innerHTML = `
          <div class="main-container" style="max-width: 900px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
              <div>
                <span class="user-badge" style="background:#5c1e30; color:white; border:none;">Estimacion Periodo #${data.periodo_numero}</span>
                <h1>Detalle y Liquidacion de Estimacion</h1>
              </div>
              <button class="btn btn-secondary" onclick="app.renderEstimacionesScreen()">
                <span class="material-icons-round">arrow_back</span> Regresar
              </button>
            </div>

            <div class="glass-panel">
              <h2>Caratula de Estimacion (Liquidacion)</h2>
              <table style="width:100%; margin-top:16px;">
                <tr><td style="color:var(--text-muted); font-weight:600; width:45%;">Estatus actual:</td><td><span class="badge badge-presented">${data.estado.toUpperCase()}</span></td></tr>
                ${data.plazo_revision ? `<tr><td style="color:var(--text-muted); font-weight:600;">Plazo de revision (Art. 54 LOPSRM, 15 dias):</td><td>${this.renderPlazoBadge(data.plazo_revision)}</td></tr>` : ''}
                ${data.plazo_pago ? `<tr><td style="color:var(--text-muted); font-weight:600;">Plazo de pago (Art. 54 LOPSRM, 20 dias):</td><td>${this.renderPlazoBadge(data.plazo_pago)}</td></tr>` : ''}
                <tr><td style="color:var(--text-muted); font-weight:600;">Importe de los Trabajos Ejecutados:</td><td>$${data.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} M.N.</td></tr>
                <tr><td style="color:var(--text-muted); font-weight:600;">Amortizacion del Anticipo (${contract.anticipo_porcentaje}%):</td><td style="color:var(--accent-red); font-weight:600;">- $${data.anticipo_amortizado.toLocaleString('es-MX', { minimumFractionDigits: 2 })} M.N.</td></tr>
                <tr><td style="color:var(--text-muted); font-weight:600;">Retencion 5 al millar (Vigilancia e Inspeccion, Art. 191 LFD):</td><td style="color:var(--accent-red); font-weight:600;">- $${data.retencion_5_millar.toLocaleString('es-MX', { minimumFractionDigits: 2 })} M.N.</td></tr>
                <tr><td style="color:var(--text-muted); font-weight:600;">Otras Penalizaciones:</td><td style="color:var(--accent-red); font-weight:600;">- $${data.penalizaciones.toLocaleString('es-MX', { minimumFractionDigits: 2 })} M.N.</td></tr>
                <tr style="border-top:2px solid var(--border-color); font-weight:700; font-size:15px;"><td style="color:#0f172a;">LIQUIDO A PAGAR AL CONTRATISTA:</td><td style="color:var(--accent-green);">$${data.liquido_a_pagar.toLocaleString('es-MX', { minimumFractionDigits: 2 })} M.N.</td></tr>
              </table>
            </div>

            <div class="glass-panel">
              <h2>Detalle de Conceptos Ejecutados</h2>
              <div class="table-container" style="margin-top:16px;">
                <table>
                  <thead>
                    <tr>
                      <th>Clave</th>
                      <th>Concepto</th>
                      <th>Cantidad</th>
                      <th>Precio</th>
                      <th>Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${conceptRows}
                  </tbody>
                </table>
              </div>
            </div>

            ${actionPanel}
          </div>
        `;

        if (document.getElementById('send-est-form')) {
          document.getElementById('send-est-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('send-est-pdf');
            const formData = new FormData();
            formData.append('pdf_soporte', fileInput.files[0]);

            try {
              const res = await fetch(`/api/estimaciones/${data.id}/enviar`, {
                method: 'POST',
                body: formData
              });
              const d = await res.json();
              if (!res.ok) throw new Error(d.error);
              this.showToast('Estimacion enviada a revision', 'success');
              this.viewEstimacionDetail(data.id);
            } catch(err) {
              this.showToast(err.message, 'error');
            }
          });
        }

      } catch (e) {}
    },

    async resolverEstimacion(estId, resolucion) {
      try {
        await this.api(`/api/estimaciones/${estId}/resolver`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resolucion, comentarios: "Resolucion del residente" })
        });
        this.showToast(resolucion === 'autorizada' ? 'Estimacion autorizada' : 'Estimacion rechazada', 'success');
        this.viewEstimacionDetail(estId);
      } catch(e) {}
    },

    turnarAResidenteDialog(estId) {
      this.showModal(`
        <h2>Turnar a Residencia con Observaciones (HU-15)</h2>
        <form id="turn-est-form" style="margin-top:16px;">
          <div class="form-group">
            <label>Observaciones Tecnicas (por concepto)</label>
            <textarea id="turn-obs" rows="4" placeholder="Indique observaciones..." required></textarea>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
            <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">Turnar a Residencia</button>
          </div>
        </form>
      `);

      document.getElementById('turn-est-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await this.api(`/api/estimaciones/${estId}/revisar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ observaciones: [{ comentario: document.getElementById('turn-obs').value }] })
          });
          this.showToast('Turnado exitoso', 'success');
          this.closeModal();
          this.viewEstimacionDetail(estId);
        } catch (err) {}
      });
    },

    async verificarPresupuesto(estId) {
      try {
        const data = await this.api(`/api/estimaciones/${estId}/presupuesto`, {
          method: 'POST'
        });
        this.showToast(data.message, 'success');
      } catch(e) {}
    },

    instruccionPagoDialog(estId) {
      this.showModal(`
        <h2>Cargar Factura y XML de CFDI (HU-20)</h2>
        <form id="instr-pago-form" style="margin-top:16px;">
          <div class="form-group">
            <label>Cargar Factura (PDF)</label>
            <input type="file" id="ip-factura" accept=".pdf" required>
          </div>
          <div class="form-group">
            <label>Cargar CFDI (XML)</label>
            <input type="file" id="ip-cfdi" accept=".xml" required>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
            <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">Generar Instruccin</button>
          </div>
        </form>
      `);

      document.getElementById('instr-pago-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('factura', document.getElementById('ip-factura').files[0]);
        formData.append('cfdi', document.getElementById('ip-cfdi').files[0]);

        try {
          const res = await fetch(`/api/estimaciones/${estId}/instruccion-pago`, {
            method: 'POST',
            body: formData
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          this.showToast('Instruccin de pago enviada a Finanzas', 'success');
          this.closeModal();
          this.viewEstimacionDetail(estId);
        } catch(err) {
          this.showToast(err.message, 'error');
        }
      });
    },

    registrarPagoDialog(estId) {
      this.showModal(`
        <h2>Registrar Pago Efectuado (HU-21)</h2>
        <form id="reg-pago-form" style="margin-top:16px;">
          <div class="form-group">
            <label>Referencia SPEI / Folio Bancario</label>
            <input type="text" id="rp-ref" placeholder="SPEI-9382103982" required>
          </div>
          <div class="form-group">
            <label>Notas de Pago</label>
            <textarea id="rp-notas" placeholder="Ej. Pago conciliado..."></textarea>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
            <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">Registrar Pago</button>
          </div>
        </form>
      `);

      document.getElementById('reg-pago-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await this.api(`/api/estimaciones/${estId}/registrar-pago`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              banco_referencia: document.getElementById('rp-ref').value,
              notas_pago: document.getElementById('rp-notas').value
            })
          });
          this.showToast('Pago registrado correctamente', 'success');
          this.closeModal();
          this.viewEstimacionDetail(estId);
        } catch(err) {}
      });
    },

    descargarObservaciones(estId, formato) {
      const url = `/api/estimaciones/${estId}/observaciones/export?formato=${formato}`;
      const link = document.createElement('a');
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      this.showToast(`Generando observaciones en ${formato === 'pdf' ? 'PDF' : 'Excel'}...`, 'success');
    },

    reingresarEstimacionForm(estId) {
      const contract = this.state.currentContractData;

      let conceptInputs = '';
      contract.catalogo.forEach(c => {
        conceptInputs += `
          <div class="col-6 form-group">
            <label>Clave: ${c.clave} (${c.descripcion})</label>
            <input type="number" class="reest-av-qty" data-clave="${c.clave}" placeholder="0" step="any" required>
          </div>
        `;
      });

      this.showModal(`
        <h2>Reingresar Estimacion (HU-16)</h2>
        <form id="reingresar-est-form" style="max-height: 70vh; overflow-y: auto; padding-right:10px; margin-top:16px;">
          <div class="dashboard-grid" style="gap:15px;">
            <div class="col-12"><h3>Ajustar Cantidades Corregidas</h3></div>
            ${conceptInputs}
            <div class="col-12 form-group">
              <label>Penalizaciones / Deductivas ($)</label>
              <input type="number" id="reest-penalizaciones" value="0">
            </div>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:30px;">
            <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">Reingresar Versin</button>
          </div>
        </form>
      `);

      document.getElementById('reingresar-est-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const avances = {};
        const inputs = document.querySelectorAll('.reest-av-qty');
        inputs.forEach(i => {
          avances[i.dataset.clave] = parseFloat(i.value || 0);
        });

        const payload = {
          avances,
          penalizaciones: document.getElementById('reest-penalizaciones').value
        };

        try {
          await this.api(`/api/estimaciones/${estId}/reingresar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          this.showToast('Reingreso de estimacion guardado en borrador', 'success');
          this.closeModal();
          this.renderEstimacionesScreen();
        } catch (err) {}
      });
    }
  };
})();
