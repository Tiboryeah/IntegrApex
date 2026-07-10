(function () {
  window.IntegrApexModules = window.IntegrApexModules || {};

  // Convierte un entero 0-999 a letras (mayúsculas), usado por numeroALetras.
  function convertirGrupo(n) {
    const UNIDADES = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const DIECI = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
    const VEINTI = ['VEINTE', 'VEINTIUNO', 'VEINTIDOS', 'VEINTITRES', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISEIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
    const DECENAS = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

    if (n === 0) return '';
    if (n === 100) return 'CIEN';

    const c = Math.floor(n / 100);
    const resto = n % 100;
    let out = c > 0 ? CENTENAS[c] : '';

    if (resto > 0) {
      let restoTxt;
      if (resto < 10) restoTxt = UNIDADES[resto];
      else if (resto < 20) restoTxt = DIECI[resto - 10];
      else if (resto < 30) restoTxt = VEINTI[resto - 20];
      else {
        const d = Math.floor(resto / 10);
        const u = resto % 10;
        restoTxt = DECENAS[d] + (u > 0 ? ' Y ' + UNIDADES[u] : '');
      }
      out = out ? out + ' ' + restoTxt : restoTxt;
    }
    return out.trim();
  }

  // Convierte un monto a su representación en letras estilo documento oficial mexicano (Ej. "DOS MIL PESOS 00/100 M.N.").
  function numeroALetras(monto) {
    monto = Math.abs(parseFloat(monto) || 0);
    const entero = Math.floor(monto);
    const centavos = Math.round((monto - entero) * 100);

    if (entero === 0) {
      return `CERO PESOS ${String(centavos).padStart(2, '0')}/100 M.N.`;
    }

    const millones = Math.floor(entero / 1000000);
    const miles = Math.floor((entero % 1000000) / 1000);
    const cientos = entero % 1000;

    const partes = [];
    if (millones > 0) {
      partes.push(millones === 1 ? 'UN MILLON' : convertirGrupo(millones) + ' MILLONES');
    }
    if (miles > 0) {
      partes.push(miles === 1 ? 'MIL' : convertirGrupo(miles) + ' MIL');
    }
    if (cientos > 0) {
      partes.push(convertirGrupo(cientos));
    }

    return `${partes.join(' ').trim()} PESOS ${String(centavos).padStart(2, '0')}/100 M.N.`;
  }

  window.IntegrApexModules.estimaciones = {
    // ==========================================
    // Tablero de estimaciones activas (HU-17).
    // ==========================================
    // TABLERO DE ESTIMACIONES ACTIVAS (HU-17): Renderiza el panel de estimaciones en curso para todos los roles
    // con tarjetas de resumen financiero, bandeja de "Mis Pendientes" y línea de tiempo por estimación.
    async renderTableroEstimaciones() {
      this.showLoggedInUI();
      const outlet = document.getElementById('app-router-outlet');

      try {
        const data = await this.api('/api/tableros/estimaciones-activas');
        const { resumen, estimaciones } = data;

        const estadoLabel = {
          presentada: 'Presentada',
          en_revision: 'En revisión',
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
        const money = v => `$${(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
                  <span class="user-badge" style="background:var(--ipn-maroon); color:white; border:none;">${escapeHtml(e.folio_contrato)}</span>
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
                <td><strong>${escapeHtml(e.folio_contrato)}</strong></td>
                <td>Periodo #${e.periodo}</td>
                <td><span class="badge ${estadoBadge[e.estado]}">${estadoLabel[e.estado]}</span></td>
                <td>${money(e.monto)}</td>
                <td>${e.dias_transcurridos} dia(s)</td>
                <td>${filaLineaTiempo(e.linea_tiempo)}</td>
                <td>${e.requiere_mi_accion ? '<span class="badge badge-rejected">Requiere mi acción</span>' : '-'}</td>
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
              <p style="font-size:12.5px; color:var(--text-muted); margin-top:4px; margin-bottom:8px;">Estimaciones que requieren acción de tu rol (${this.state.user.rol}) ahora mismo.</p>
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
                      <th>Acción requerida</th>
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

    // Navega al detalle de un contrato específico y despliega el detalle de una estimación desde el tablero.
    async verEstimacionDesdeTablero(contratoId, estId) {
      this.state.currentContractId = contratoId;
      await this.navigate('contract-detail', { id: contratoId });
      this.viewEstimacionDetail(estId);
    },

    // ==========================================
    // Módulo de estimaciones (HU-12 a HU-16).
    // ==========================================
    // HISTORIAL DE ESTIMACIONES (HU-14): Muestra el listado de estimaciones del contrato actual con filtros por periodo y estado.
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
                <td>$${e.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>$${e.liquido_a_pagar.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
              <span class="material-icons-round">add</span> Integrar estimación
            </button>
          `;
        }

        outlet.innerHTML = `
          <div class="main-container">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
              <div>
                <span class="user-badge" style="background:#5c1e30; color:white; border:none;">${escapeHtml(contract.folio)}</span>
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
                    <option value="en_revision" ${filterEstado === 'en_revision' ? 'selected' : ''}>En revisión</option>
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

    // INTEGRACIÓN DE ESTIMACIÓN (HU-12): Abre el modal para capturar avances del periodo, anexos (fotos/soportes) y notas de bitácora.
    async integrarEstimacionForm() {
      const contract = this.state.currentContractData;
      const notasSeleccionadas = new Set();

      let conceptInputs = '';
      contract.catalogo.forEach(c => {
        conceptInputs += `
          <div class="col-6 form-group">
            <label>Clave: ${escapeHtml(c.clave)} (${escapeHtml(c.descripcion)}) - Limite: ${c.cantidad}</label>
            <input type="number" class="est-av-qty" data-clave="${escapeHtml(c.clave)}" placeholder="0" step="any" required>
          </div>
        `;
      });

      this.showModal(`
        <h2>Integrar estimación de obra (HU-12)</h2>
        <p style="margin-bottom: 16px; font-size:13px; color:var(--text-muted); line-height:1.4;">
          De acuerdo con el Art. 132 RLOPSRM, asiente los generadores, el registro fotográfico, los soportes y las notas de bitácora del periodo como un solo bloque. El sistema calcula retenciones del 5 al millar (Art. 191 LFD) y amortización.
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

            <div class="col-12"><h3 style="margin-top:10px; font-size:14px; color:var(--primary);">Cantidades Ejecutadas del Periodo (Generadores)</h3></div>
            ${conceptInputs}

            <div class="col-6 form-group">
              <label>Penalizaciones / Deductivas ($)</label>
              <input type="number" id="est-penalizaciones" value="0">
            </div>

            <div class="col-12"><h3 style="margin-top:10px; font-size:14px; color:var(--primary);">Registro Fotografico y Soportes</h3></div>
            <div class="col-6 form-group">
              <label>Fotos del avance (opcional, varias)</label>
              <input type="file" id="est-fotos" accept="image/*" multiple>
            </div>
            <div class="col-6 form-group">
              <label>Soportes / documentos (PDF, opcional, varios)</label>
              <input type="file" id="est-soportes" accept=".pdf" multiple>
            </div>

            <div class="col-12"><h3 style="margin-top:10px; font-size:14px; color:var(--primary);">Notas de bitácora vinculadas (buscador HU-10)</h3></div>
            <div class="col-4 form-group" style="margin-bottom:0;">
              <label>Tipo</label>
              <select id="est-notas-tipo">
                <option value="">Todos</option>
                <option value="Apertura">Apertura</option>
                <option value="Avance">Avance</option>
                <option value="Solicitud">Solicitud</option>
                <option value="Entrega">Entrega</option>
                <option value="Autorización">Autorización</option>
                <option value="Incidencia">Incidencia</option>
              </select>
            </div>
            <div class="col-8 form-group" style="margin-bottom:0;">
              <label>Buscar</label>
              <input type="text" id="est-notas-query" placeholder="Palabra clave...">
            </div>
            <div class="col-12">
              <div id="est-notas-lista" style="max-height:180px; overflow-y:auto; border:1px solid var(--border-color); border-radius:6px; padding:10px;">
                Cargando notas...
              </div>
              <p style="font-size:11.5px; color:var(--text-muted); margin-top:6px;"><span id="est-notas-contador">0</span> nota(s) seleccionada(s).</p>
            </div>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:24px;">
            <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">Integrar estimación</button>
          </div>
        </form>
      `);

      const cargarNotasPicker = async () => {
        const lista = document.getElementById('est-notas-lista');
        const tipo = document.getElementById('est-notas-tipo').value;
        const query = document.getElementById('est-notas-query').value;
        const params = new URLSearchParams();
        if (tipo) params.set('tipo', tipo);
        if (query) params.set('query', query);

        try {
          const notas = await this.api(`/api/contratos/${contract.id}/bitacora/notas?${params.toString()}`);
          lista.innerHTML = notas.length === 0
            ? '<div style="color:var(--text-muted); font-size:12.5px;">Sin notas que coincidan con el filtro.</div>'
            : notas.map(n => `
                <label style="display:flex; align-items:flex-start; gap:8px; padding:6px 0; border-bottom:1px solid var(--border-color); font-size:12.5px; cursor:pointer;">
                  <input type="checkbox" class="est-nota-checkbox" value="${n.id}" ${notasSeleccionadas.has(n.id) ? 'checked' : ''} style="margin-top:2px;">
                  <span><strong>Nota #${n.folio}</strong> (${escapeHtml(n.tipo)}) - ${escapeHtml((n.contenido || '').slice(0, 80))}${(n.contenido || '').length > 80 ? '...' : ''}</span>
                </label>
              `).join('');

          document.querySelectorAll('.est-nota-checkbox').forEach(cb => {
            cb.addEventListener('change', () => {
              if (cb.checked) notasSeleccionadas.add(cb.value);
              else notasSeleccionadas.delete(cb.value);
              document.getElementById('est-notas-contador').textContent = notasSeleccionadas.size;
            });
          });
        } catch (e) {
          lista.innerHTML = '<div style="color:var(--accent-red); font-size:12.5px;">No se pudieron cargar las notas.</div>';
        }
      };

      document.getElementById('est-notas-tipo').addEventListener('change', cargarNotasPicker);
      document.getElementById('est-notas-query').addEventListener('input', () => {
        clearTimeout(this.state.estNotasFiltroTimer);
        this.state.estNotasFiltroTimer = setTimeout(cargarNotasPicker, 300);
      });
      await cargarNotasPicker();

      document.getElementById('integrar-est-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const avances = {};
        const inputs = document.querySelectorAll('.est-av-qty');
        inputs.forEach(i => {
          avances[i.dataset.clave] = parseFloat(i.value || 0);
        });

        const formData = new FormData();
        formData.append('periodo_numero', document.getElementById('est-periodo').value);
        formData.append('fecha_inicio', document.getElementById('est-f-ini').value);
        formData.append('fecha_fin', document.getElementById('est-f-fin').value);
        formData.append('penalizaciones', document.getElementById('est-penalizaciones').value);
        formData.append('avances', JSON.stringify(avances));
        formData.append('notas_vinculadas_ids', JSON.stringify([...notasSeleccionadas]));

        Array.from(document.getElementById('est-fotos').files).forEach(f => formData.append('fotos', f));
        Array.from(document.getElementById('est-soportes').files).forEach(f => formData.append('soportes', f));

        try {
          const res = await fetch(`/api/contratos/${this.state.currentContractId}/estimaciones/integrar`, {
            method: 'POST',
            body: formData
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          this.showToast('Estimación integrada en borrador con éxito', 'success');
          this.closeModal();
          this.renderEstimacionesScreen();
        } catch (err) {
          this.showToast(err.message, 'error');
        }
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

    // HOJA DE RUTA: renderiza un paso de la línea de tiempo de custodia (equivalente digital de la hoja de ruta física).
    renderHojaRutaPaso(paso) {
      const completado = !!paso.fecha;
      return `
        <div class="hoja-ruta-paso ${completado ? 'completado' : 'pendiente'}">
          <div class="hoja-ruta-marcador">
            <span class="material-icons-round">${completado ? 'check_circle' : 'schedule'}</span>
          </div>
          <div class="hoja-ruta-contenido">
            <strong>${escapeHtml(paso.titulo)}</strong>
            <div class="hoja-ruta-responsable">${escapeHtml(paso.responsable)} <span>· ${escapeHtml(paso.rol)}</span></div>
            <div class="hoja-ruta-fecha">${completado ? new Date(paso.fecha).toLocaleString('es-MX') : 'Pendiente'}</div>
          </div>
        </div>
      `;
    },

    // DETALLE DE ESTIMACIÓN (HU-12 a HU-21): Renderiza el desglose financiero, conceptos, anexos y controles por rol.
    async viewEstimacionDetail(estId) {
      const outlet = document.getElementById('app-router-outlet');

      try {
        const est = await this.api(`/api/contratos/${this.state.currentContractId}/estimaciones`);
        const data = est.find(e => e.id === estId);
        const contract = this.state.currentContractData;

        const [usuarios, empresas, dependencias] = await Promise.all([
          this.api('/api/users'),
          this.loadEmpresasOpts(),
          this.loadDependenciasOpts()
        ]);
        const empresaContrato = empresas.find(e => e.id === contract.empresa_id);
        const dependenciaContrato = dependencias.find(d => d.id === contract.dependencia_id);
        const nombreUsuario = id => usuarios.find(u => u.id === id)?.nombre || 'Sin asignar';

        const anteriores = est.filter(e => e.id !== data.id && e.estado !== 'rechazada' && e.periodo_numero < data.periodo_numero);
        const subtotalAcumuladoAnterior = anteriores.reduce((sum, e) => sum + (e.subtotal || 0), 0);
        const anticipoAcumuladoAnterior = anteriores.reduce((sum, e) => sum + (e.anticipo_amortizado || 0), 0);
        const subtotalAcumuladoActual = subtotalAcumuladoAnterior + data.subtotal;
        const anticipoAcumuladoActual = anticipoAcumuladoAnterior + data.anticipo_amortizado;
        const anticipoContrato = contract.anticipo_monto || (contract.monto * (contract.anticipo_porcentaje || 0) / 100);

        // Cantidades acumuladas hasta la estimación anterior, por concepto, para la tabla de Servicios Ejecutados.
        const cantidadesAnteriores = {};
        contract.catalogo.forEach(c => { cantidadesAnteriores[c.clave] = 0; });
        anteriores.forEach(e => {
          Object.entries(e.avances || {}).forEach(([clave, qty]) => {
            cantidadesAnteriores[clave] = (cantidadesAnteriores[clave] || 0) + parseFloat(qty || 0);
          });
        });

        // HOJA DE RUTA: equivalente digital de la hoja de ruta física — trazabilidad de custodia y responsables por etapa.
        const pasosHojaRuta = [
          { titulo: 'Integración de la estimación', responsable: nombreUsuario(contract.superintendente_id), rol: 'Contratista', fecha: data.fecha_creacion },
          { titulo: 'Presentación formal a revisión', responsable: nombreUsuario(contract.superintendente_id), rol: 'Contratista', fecha: data.fecha_presentacion }
        ];
        if (data.estado === 'rechazada') {
          pasosHojaRuta.push({ titulo: 'Rechazo de la estimación (residencia)', responsable: nombreUsuario(contract.residente_id), rol: 'Residente de Obra', fecha: data.fecha_autorizacion_residencia });
        } else {
          pasosHojaRuta.push(
            { titulo: 'Revisión técnica y turno a Residencia', responsable: nombreUsuario(contract.supervision_id), rol: 'Supervisión', fecha: data.fecha_revision_supervision },
            { titulo: 'Autorización de la estimación', responsable: nombreUsuario(contract.residente_id), rol: 'Residente de Obra', fecha: data.fecha_autorizacion_residencia },
            { titulo: 'Instrucción de pago (factura y CFDI)', responsable: 'Contratista / Finanzas', rol: 'Finanzas', fecha: data.fecha_instruccion_pago },
            { titulo: 'Registro de pago efectuado', responsable: data.pago_usuario_id ? nombreUsuario(data.pago_usuario_id) : 'Finanzas', rol: 'Finanzas', fecha: data.fecha_pago_efectuado }
          );
        }

        let notasVinculadas = [];
        if ((data.notas_vinculadas_ids || []).length) {
          try {
            const todasLasNotas = await this.api(`/api/contratos/${this.state.currentContractId}/bitacora/notas`);
            notasVinculadas = todasLasNotas.filter(n => data.notas_vinculadas_ids.includes(n.id));
          } catch (e) {}
        }

        let actionPanel = '';

        if (this.state.user.rol === 'contratista' && data.estado === 'borrador') {
          const fechaLimiteEnvio = new Date(new Date(data.fecha_fin).getTime() + 6 * 24 * 60 * 60 * 1000);
          const plazoVencido = new Date() > fechaLimiteEnvio;

          actionPanel += `
            <div class="glass-panel" style="margin-top:20px;">
              <h3>Enviar estimación a revisión (HU-13)</h3>
              <p style="margin-bottom:15px; font-size:13px; color:var(--text-muted);">Debe adjuntar el PDF de generadores antes de enviar. El plazo de presentación vence a los 6 días naturales del periodo (Art. 54 LOPSRM): ${fechaLimiteEnvio.toLocaleDateString('es-MX')}.</p>
              ${plazoVencido ? `<p style="font-size:13px; color:var(--accent-red); font-weight:600; margin-bottom:15px;">El plazo de 6 días naturales para presentar esta estimación ya venció. No se puede enviar.</p>` : ''}
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
              <p style="margin-bottom:15px; font-size:13px; color:var(--text-muted);">Registre observaciones de revisión antes de turnar la estimación al residente de obra.</p>
              <button class="btn btn-primary" onclick="app.turnarAResidenteDialog('${data.id}')">Turnar a Residencia</button>
            </div>
          `;
        }

        if (this.state.user.rol === 'residente' && data.estado === 'presentada') {
          actionPanel += `
            <div class="glass-panel" style="margin-top:20px;">
              <h3>Autorización del residente de obra (HU-15)</h3>
              <p style="font-size:13px; color:var(--text-muted);">Esta estimación todavía no ha sido turnada por supervisión. La residencia no puede autorizar ni rechazar hasta que supervisión la revise y la turne.</p>
            </div>
          `;
        }

        if (this.state.user.rol === 'residente' && data.estado === 'en_revision') {
          actionPanel += `
            <div class="glass-panel" style="margin-top:20px;">
              <h3>Autorización del residente de obra (HU-15)</h3>
              <p style="margin-bottom:15px; font-size:13px; color:var(--text-muted);">El residente autoriza o rechaza formalmente la estimación (Art. 53/54 LOPSRM).</p>
              <div style="display:flex; gap:10px;">
                <button class="btn btn-primary" onclick="app.resolverEstimacion('${data.id}', 'autorizada')">Autorizar para Pago</button>
                <button class="btn btn-secondary btn-danger" onclick="app.resolverEstimacion('${data.id}', 'rechazada')">Rechazar estimación</button>
              </div>
            </div>
          `;
        }

        if (data.estado === 'rechazada') {
          const severidadBadge = { Baja: 'badge-authorized', Media: 'badge-presented', Alta: 'badge-review', Critica: 'badge-rejected' };
          const observacionesList = (data.observaciones || []).length
            ? `<div style="margin:12px 0;">${(data.observaciones || []).map(o => `
                <div style="border:1px solid var(--border-color); border-radius:6px; padding:10px; margin-bottom:8px;">
                  <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:6px;">
                    <span class="badge badge-review" style="text-transform:capitalize;">${escapeHtml(o.seccion) || 'General'}</span>
                    ${o.concepto ? `<span class="badge badge-presented">${escapeHtml(o.concepto)}</span>` : ''}
                    ${o.tipo ? `<span class="badge badge-presented">${escapeHtml(o.tipo)}</span>` : ''}
                    ${o.severidad ? `<span class="badge ${severidadBadge[o.severidad] || 'badge-presented'}">${escapeHtml(o.severidad)}</span>` : ''}
                  </div>
                  <p style="font-size:13px; color:#334155; margin:0;">${escapeHtml(o.comentario) || ''}</p>
                </div>
              `).join('')}</div>`
            : `<p style="font-size:13px; color:var(--text-muted); margin-top:12px;">No se registraron observaciones detalladas.</p>`;
          const reingresarBtn = this.state.user.rol === 'contratista'
            ? `<button class="btn btn-primary" onclick="app.reingresarEstimacionForm('${data.id}')">Reingresar Nueva Version</button>`
            : '';

          actionPanel += `
            <div class="glass-panel" style="margin-top:20px;">
              <h3>Estimación rechazada - Observaciones (HU-16)</h3>
              <p style="margin-bottom:0; font-size:13px; color:var(--text-muted);">${data.comentario_residencia ? `Resolucion de residencia: ${escapeHtml(data.comentario_residencia)}` : 'Atienda las observaciones tecnicas antes de reingresar.'}</p>
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
              <h3>Tránsito a pago y suficiencia presupuestal (HU-20)</h3>
              <p style="margin-bottom:15px; font-size:13px; color:var(--text-muted);">Verifique suficiencia presupuestal (Art. 24 LOPSRM) e ingrese factura/CFDI para generar la instruccin.</p>
              <div style="display:flex; gap:10px;">
                <button class="btn btn-primary" onclick="app.verificarPresupuesto('${data.id}')">Verificar Suficiencia (Art. 24)</button>
                <button class="btn btn-secondary" onclick="app.instruccionPagoDialog('${data.id}')">Cargar factura / Generar instrucción</button>
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

        // RESUMEN POR PARTIDA: agrupa los conceptos de esta estimación por su partida (campo opcional del catálogo).
        const partidaGroups = {};
        contract.catalogo.forEach(c => {
          const key = c.partida || 'Sin Partida';
          if (!partidaGroups[key]) partidaGroups[key] = [];
          const qty = parseFloat(data.avances[c.clave] || 0);
          partidaGroups[key].push({ clave: c.clave, descripcion: c.descripcion, importe: qty * c.precio_unitario });
        });

        let partidaRows = '';
        Object.entries(partidaGroups).forEach(([partida, items]) => {
          const subtotalPartida = items.reduce((s, i) => s + i.importe, 0);
          partidaRows += `<tr style="background:#f8fafc;"><td colspan="2" style="font-weight:700; color:var(--escom-blue);">${escapeHtml(partida)}</td><td></td></tr>`;
          items.forEach(i => {
            partidaRows += `
              <tr>
                <td style="padding-left:28px;">${escapeHtml(i.clave)}</td>
                <td>${escapeHtml(i.descripcion)}</td>
                <td>$${i.importe.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            `;
          });
          partidaRows += `<tr style="font-weight:700; border-top:1px solid #cbd5e1;"><td colspan="2" style="text-align:right;">Subtotal ${escapeHtml(partida)}:</td><td>$${subtotalPartida.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`;
        });

        let conceptRows = '';
        let importeServiciosTotal = 0;
        contract.catalogo.forEach(concept => {
          const segunProyecto = concept.cantidad;
          const hastaAnterior = cantidadesAnteriores[concept.clave] || 0;
          const deEstaEstimacion = parseFloat(data.avances[concept.clave] || 0);
          const totalEstimado = hastaAnterior + deEstaEstimacion;
          const porEjecutar = segunProyecto - totalEstimado;
          const importe = deEstaEstimacion * concept.precio_unitario;
          importeServiciosTotal += importe;

          conceptRows += `
            <tr>
              <td><strong>${escapeHtml(concept.clave)}</strong><br><span style="font-size:11.5px; color:var(--text-muted);">${escapeHtml(concept.descripcion)}</span></td>
              <td style="white-space:nowrap;">${escapeHtml(concept.unidad)}</td>
              <td style="white-space:nowrap;">${segunProyecto.toLocaleString('es-MX')}</td>
              <td style="white-space:nowrap;">${hastaAnterior.toLocaleString('es-MX')}</td>
              <td style="white-space:nowrap; font-weight:600;">${deEstaEstimacion.toLocaleString('es-MX')}</td>
              <td style="white-space:nowrap; font-weight:600;">${totalEstimado.toLocaleString('es-MX')}</td>
              <td style="white-space:nowrap;">${porEjecutar.toLocaleString('es-MX')}</td>
              <td style="white-space:nowrap;">$${concept.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td style="white-space:nowrap;">$${importe.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          `;
        });

        outlet.innerHTML = `
          <div class="main-container" style="max-width: 900px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
              <div>
                <span class="user-badge" style="background:#5c1e30; color:white; border:none;">Estimación periodo #${data.periodo_numero}</span>
                <h1>Detalle y liquidación de estimación</h1>
              </div>
              <button class="btn btn-secondary" onclick="app.renderEstimacionesScreen()">
                <span class="material-icons-round">arrow_back</span> Regresar
              </button>
            </div>

            <div class="glass-panel">
              <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:4px;">
                <span style="font-size:12px; font-weight:700; color:var(--text-muted);">ESTATUS ACTUAL:</span>
                <span class="badge badge-presented">${data.estado.toUpperCase()}</span>
                ${data.plazo_revision ? this.renderPlazoBadge(data.plazo_revision) : ''}
                ${data.plazo_pago ? this.renderPlazoBadge(data.plazo_pago) : ''}
              </div>
            </div>

            <div class="glass-panel caratula-oficial">
              <div class="caratula-titlebar">
                <div>
                  <div class="caratula-eyebrow">${escapeHtml(contract.folio)}</div>
                  <h2>Carátula de Estimación</h2>
                </div>
                <table class="caratula-table caratula-box-numero">
                  <tr><td>ESTIMACIÓN NÚMERO</td><td>PERIODO</td></tr>
                  <tr><td><strong>${data.periodo_numero}</strong></td><td><strong>${data.fecha_inicio} al ${data.fecha_fin}</strong></td></tr>
                  <tr><td>HOJA</td><td>FECHA</td></tr>
                  <tr><td><strong>1 de 1</strong></td><td><strong>${new Date(data.fecha_creacion || Date.now()).toLocaleDateString('es-MX')}</strong></td></tr>
                </table>
              </div>

              <table class="caratula-table caratula-header-table">
                <tr><td class="label">DESCRIPCIÓN DE LA OBRA O SERVICIO</td><td colspan="3">${escapeHtml(contract.objeto)}</td></tr>
                <tr>
                  <td class="label">NÚMERO DE CONTRATO</td><td>${escapeHtml(contract.folio)}</td>
                  <td class="label">FECHA DEL CONTRATO</td><td>${contract.fecha_inicio}</td>
                </tr>
                <tr>
                  <td class="label">CONTRATISTA (RAZÓN SOCIAL)</td><td>${escapeHtml(empresaContrato?.razon_social || empresaContrato?.nombre_comercial) || 'Sin capturar'}</td>
                  <td class="label">R.F.C.</td><td>${escapeHtml(empresaContrato?.rfc) || 'Sin capturar'}</td>
                </tr>
              </table>

              <h3 class="caratula-seccion">1. Importes sin incluir I.V.A.</h3>
              <table class="caratula-table">
                <thead><tr><th></th><th>Importe</th><th>Porcentaje</th></tr></thead>
                <tbody>
                  <tr><td>Importe del Contrato</td><td>$${contract.monto.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>100.00%</td></tr>
                  <tr><td>Importe Estimado Acumulado Anterior</td><td>$${subtotalAcumuladoAnterior.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>${(contract.monto ? subtotalAcumuladoAnterior / contract.monto * 100 : 0).toFixed(2)}%</td></tr>
                  <tr><td>Importe de la Estimación Actual</td><td>$${data.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>${(contract.monto ? data.subtotal / contract.monto * 100 : 0).toFixed(2)}%</td></tr>
                  <tr style="font-weight:700;"><td>Importe Estimado Acumulado Actual</td><td>$${subtotalAcumuladoActual.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>${(contract.monto ? subtotalAcumuladoActual / contract.monto * 100 : 0).toFixed(2)}%</td></tr>
                  <tr><td>Saldo por Estimar</td><td>$${(contract.monto - subtotalAcumuladoActual).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>${(contract.monto ? (contract.monto - subtotalAcumuladoActual) / contract.monto * 100 : 0).toFixed(2)}%</td></tr>
                </tbody>
              </table>

              <h3 class="caratula-seccion">2. Del Anticipo</h3>
              <table class="caratula-table">
                <thead><tr><th></th><th>Importe</th><th>Porcentaje</th></tr></thead>
                <tbody>
                  <tr><td>Importe del Anticipo</td><td>$${anticipoContrato.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>100.00%</td></tr>
                  <tr><td>Importe Amortizado Acumulado Anterior</td><td>$${anticipoAcumuladoAnterior.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>${(anticipoContrato ? anticipoAcumuladoAnterior / anticipoContrato * 100 : 0).toFixed(2)}%</td></tr>
                  <tr><td>Importe de la Amortización Actual</td><td>$${data.anticipo_amortizado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>${(anticipoContrato ? data.anticipo_amortizado / anticipoContrato * 100 : 0).toFixed(2)}%</td></tr>
                  <tr style="font-weight:700;"><td>Importe Amortizado Acumulado Actual</td><td>$${anticipoAcumuladoActual.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>${(anticipoContrato ? anticipoAcumuladoActual / anticipoContrato * 100 : 0).toFixed(2)}%</td></tr>
                  <tr><td>Saldo por Amortizar</td><td>$${(anticipoContrato - anticipoAcumuladoActual).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>${(anticipoContrato ? (anticipoContrato - anticipoAcumuladoActual) / anticipoContrato * 100 : 0).toFixed(2)}%</td></tr>
                </tbody>
              </table>

              <h3 class="caratula-seccion">3. Del Neto a Recibir</h3>
              <table class="caratula-table caratula-table-single">
                <tbody>
                  <tr><td>Importe Estimación</td><td>$${data.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
                  <tr><td>I.V.A. Estimación (16%)</td><td>$${data.iva.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
                  <tr style="font-weight:700;"><td>Total de Estimación</td><td>$${data.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
                  <tr><td>Amortización Anticipo (${contract.anticipo_porcentaje}%)</td><td>- $${data.anticipo_amortizado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
                  <tr><td>Retenciones (5 al millar, Art. 191 LFD)</td><td>- $${data.retencion_5_millar.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
                  <tr><td>Trabajos No Ejecutados / Penalizaciones</td><td>- $${data.penalizaciones.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
                  <tr class="total-row"><td>TOTAL NETO A PAGAR</td><td>$${data.liquido_a_pagar.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
                </tbody>
              </table>
              <p class="caratula-letras">(${numeroALetras(data.liquido_a_pagar)})</p>

              <div class="caratula-firmas">
                <div class="firma-col">
                  <div class="firma-linea"></div>
                  <strong>Formuló</strong>
                  <div>${escapeHtml(nombreUsuario(contract.superintendente_id))}</div>
                  <span>Contratista</span>
                </div>
                <div class="firma-col">
                  <div class="firma-linea"></div>
                  <strong>Revisó</strong>
                  <div>${escapeHtml(nombreUsuario(contract.supervision_id))}</div>
                  <span>Supervisión</span>
                </div>
                <div class="firma-col">
                  <div class="firma-linea"></div>
                  <strong>Autorizó</strong>
                  <div>${escapeHtml(nombreUsuario(contract.residente_id))}</div>
                  <span>Residente de Obra</span>
                </div>
                <div class="firma-col">
                  <div class="firma-linea"></div>
                  <strong>Vo. Bo.</strong>
                  <div>${escapeHtml(dependenciaContrato?.nombre_contacto) || escapeHtml(dependenciaContrato?.nombre) || 'Sin asignar'}</div>
                  <span>Dependencia</span>
                </div>
              </div>
            </div>

            <div class="glass-panel caratula-oficial">
              <h2>Resumen por Partida</h2>
              <p style="font-size:12.5px; color:var(--text-muted); margin-top:4px; margin-bottom:12px;">Desglose del importe de esta estimación agrupado por partida del catálogo.</p>
              <table class="caratula-table">
                <thead><tr><th>Núm. de Partida / Clave</th><th>Descripción</th><th>Importe</th></tr></thead>
                <tbody>${partidaRows}</tbody>
                <tfoot><tr class="total-row"><td colspan="2">TOTAL</td><td>$${data.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr></tfoot>
              </table>
            </div>

            <div class="glass-panel">
              <h2>Estimación de Servicios Ejecutados</h2>
              <p style="font-size:12.5px; color:var(--text-muted); margin-top:4px; margin-bottom:12px;">Cantidades de obra por concepto: contratado, acumulado a estimaciones previas, de este periodo, acumulado total y remanente por ejecutar.</p>
              <div class="table-container" style="margin-top:16px; overflow-x:auto;">
                <table style="min-width:1000px; table-layout:fixed;">
                  <colgroup>
                    <col style="width:250px;">
                    <col style="width:90px;">
                    <col style="width:100px;">
                    <col style="width:110px;">
                    <col style="width:110px;">
                    <col style="width:100px;">
                    <col style="width:100px;">
                    <col style="width:110px;">
                    <col style="width:130px;">
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Concepto / Especificación</th>
                      <th>Unidad</th>
                      <th>Según Proyecto</th>
                      <th>Hasta Est. Anterior</th>
                      <th>De Esta Estimación</th>
                      <th>Total Estimado</th>
                      <th>Por Ejecutar</th>
                      <th>Precio Unitario</th>
                      <th>Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${conceptRows}
                  </tbody>
                  <tfoot>
                    <tr style="font-weight:700; border-top:2px solid #0f172a;">
                      <td colspan="8" style="text-align:right;">Importe Total de esta Estimación:</td>
                      <td>$${importeServiciosTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div class="glass-panel">
              <h2>Anexos del Periodo (HU-12)</h2>
              <div class="dashboard-grid" style="margin-top:16px;">
                <div class="col-4">
                  <h3>Registro Fotografico</h3>
                  ${(data.fotos || []).length === 0
                    ? '<p style="font-size:12.5px; color:var(--text-muted); margin-top:8px;">Sin fotos cargadas</p>'
                    : `<div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;">${data.fotos.map(f => `<a href="${f.path}" target="_blank"><img src="${f.path}" alt="${escapeHtml(f.nombre)}" style="width:64px; height:64px; object-fit:cover; border-radius:6px; border:1px solid var(--border-color);"></a>`).join('')}</div>`
                  }
                </div>
                <div class="col-4">
                  <h3>Soportes</h3>
                  ${(data.soportes || []).length === 0
                    ? '<p style="font-size:12.5px; color:var(--text-muted); margin-top:8px;">Sin soportes cargados</p>'
                    : `<ul class="doc-list">${data.soportes.map(s => `<li><a href="${s.path}" target="_blank">${escapeHtml(s.nombre)}</a></li>`).join('')}</ul>`
                  }
                </div>
                <div class="col-4">
                  <h3>Notas de bitácora vinculadas</h3>
                  ${notasVinculadas.length === 0
                    ? '<p style="font-size:12.5px; color:var(--text-muted); margin-top:8px;">Sin notas vinculadas</p>'
                    : `<ul class="doc-list">${notasVinculadas.map(n => `<li>Nota #${n.folio} (${escapeHtml(n.tipo)})</li>`).join('')}</ul>`
                  }
                </div>
              </div>
            </div>

            <div class="glass-panel">
              <h2>Hoja de Ruta de la Estimación</h2>
              <p style="font-size:12.5px; color:var(--text-muted); margin-top:4px; margin-bottom:16px;">Trazabilidad de custodia y responsables por etapa — equivalente digital de la hoja de ruta física de estimaciones para pago.</p>
              <div class="hoja-ruta-lista">
                ${pasosHojaRuta.map(p => this.renderHojaRutaPaso(p)).join('')}
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
              this.showToast('Estimación enviada a revisión', 'success');
              this.viewEstimacionDetail(data.id);
            } catch(err) {
              this.showToast(err.message, 'error');
            }
          });
        }

      } catch (e) {}
    },

    // RESOLVER ESTIMACIÓN (HU-15): Envía la resolución final del residente de obra ("autorizada" o "rechazada").
    async resolverEstimacion(estId, resolucion) {
      try {
        await this.api(`/api/estimaciones/${estId}/resolver`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resolucion, comentarios: "Resolucion del residente" })
        });
        this.showToast(resolucion === 'autorizada' ? 'Estimación autorizada' : 'Estimación rechazada', 'success');
        this.viewEstimacionDetail(estId);
      } catch(e) {}
    },

    filaObservacionRevisionHtml() {
      const contract = this.state.currentContractData;
      const opcionesConcepto = contract.catalogo.map(c => `<option value="${c.clave}">${escapeHtml(c.clave)}</option>`).join('');
      return `
        <div class="turn-obs-row dashboard-grid" style="gap:8px; margin-bottom:10px; border:1px solid var(--border-color); border-radius:6px; padding:10px;">
          <div class="col-3 form-group" style="margin-bottom:0;">
            <label>Seccion</label>
            <select class="obs-seccion">
              <option value="caratula">Caratula</option>
              <option value="generadores">Generadores</option>
              <option value="fotos">Registro Fotografico</option>
              <option value="soportes">Soportes</option>
              <option value="notas">Notas</option>
            </select>
          </div>
          <div class="col-3 form-group" style="margin-bottom:0;">
            <label>Concepto (opcional)</label>
            <select class="obs-concepto">
              <option value="">N/A</option>
              ${opcionesConcepto}
            </select>
          </div>
          <div class="col-2 form-group" style="margin-bottom:0;">
            <label>Tipo</label>
            <select class="obs-tipo">
              <option>Faltante</option>
              <option>Incompleto</option>
              <option>Incorrecto</option>
              <option>Otro</option>
            </select>
          </div>
          <div class="col-2 form-group" style="margin-bottom:0;">
            <label>Severidad</label>
            <select class="obs-severidad">
              <option>Baja</option>
              <option selected>Media</option>
              <option>Alta</option>
              <option>Critica</option>
            </select>
          </div>
          <div class="col-2" style="display:flex; align-items:flex-end;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="this.closest('.turn-obs-row').remove()">Quitar</button>
          </div>
          <div class="col-12 form-group" style="margin-bottom:0;">
            <label>Comentario</label>
            <textarea class="obs-comentario" rows="2" placeholder="Describa la observacion de esta seccion..." required></textarea>
          </div>
        </div>
      `;
    },

    agregarFilaObservacionRevision() {
      document.getElementById('turn-obs-rows').insertAdjacentHTML('beforeend', this.filaObservacionRevisionHtml());
    },

    // TURNAR A RESIDENCIA (HU-15): Abre el modal para que supervisión registre observaciones seccionadas detalladas.
    turnarAResidenteDialog(estId) {
      this.showModal(`
        <h2>Revision Tecnica por Seccion (HU-15)</h2>
        <p style="font-size:13px; color:var(--text-muted); margin-bottom:16px;">
          Conforme al Art. 53 LOPSRM, revise la estimación sección por sección (carátula, generadores, registro fotográfico, soportes y notas) antes de turnarla a residencia.
        </p>
        <form id="turn-est-form" style="max-height:60vh; overflow-y:auto; padding-right:10px;">
          <div id="turn-obs-rows">${this.filaObservacionRevisionHtml()}</div>
          <button type="button" class="btn btn-secondary btn-sm" onclick="app.agregarFilaObservacionRevision()">
            <span class="material-icons-round" style="font-size:14px;">add</span> Agregar observacion
          </button>
          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
            <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">Turnar a Residencia</button>
          </div>
        </form>
      `);

      document.getElementById('turn-est-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const observaciones = [...document.querySelectorAll('.turn-obs-row')].map(row => ({
          seccion: row.querySelector('.obs-seccion').value,
          concepto: row.querySelector('.obs-concepto').value || null,
          tipo: row.querySelector('.obs-tipo').value,
          severidad: row.querySelector('.obs-severidad').value,
          comentario: row.querySelector('.obs-comentario').value
        }));

        if (observaciones.length === 0) {
          this.showToast('Agregue al menos una observacion antes de turnar', 'info');
          return;
        }

        try {
          await this.api(`/api/estimaciones/${estId}/revisar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ observaciones })
          });
          this.showToast('Turnado exitoso', 'success');
          this.closeModal();
          this.viewEstimacionDetail(estId);
        } catch (err) {}
      });
    },

    // VERIFICAR PRESUPUESTO (HU-20): Llama al backend para validar la suficiencia presupuestal (Art. 24 LOPSRM).
    async verificarPresupuesto(estId) {
      try {
        const data = await this.api(`/api/estimaciones/${estId}/presupuesto`, {
          method: 'POST'
        });
        this.showToast(data.message, 'success');
      } catch(e) {}
    },

    // INSTRUCCIÓN DE PAGO (HU-20): Modal para cargar Factura y XML y enviar la instrucción a finanzas (valida fianza).
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
            <button type="submit" class="btn btn-primary">Generar instrucción</button>
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

          this.showToast('Instrucción de pago enviada a finanzas', 'success');
          this.closeModal();
          this.viewEstimacionDetail(estId);
        } catch(err) {
          this.showToast(err.message, 'error');
        }
      });
    },

    // REGISTRAR PAGO (HU-21): Abre el formulario modal para capturar la transferencia SPEI y conciliar el pago.
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

    // DESCARGAR OBSERVACIONES (HU-16): Genera y descarga el reporte de observaciones en PDF o Excel real.
    descargarObservaciones(estId, formato) {
      const url = `/api/estimaciones/${estId}/observaciones/export?formato=${formato}`;
      const link = document.createElement('a');
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      this.showToast(`Generando observaciones en ${formato === 'pdf' ? 'PDF' : 'Excel'}...`, 'success');
    },

    // REINGRESAR ESTIMACIÓN (HU-16): Permite reingresar una estimación previamente rechazada como una nueva versión.
    reingresarEstimacionForm(estId) {
      const contract = this.state.currentContractData;

      let conceptInputs = '';
      contract.catalogo.forEach(c => {
        conceptInputs += `
          <div class="col-6 form-group">
            <label>Clave: ${escapeHtml(c.clave)} (${escapeHtml(c.descripcion)})</label>
            <input type="number" class="reest-av-qty" data-clave="${escapeHtml(c.clave)}" placeholder="0" step="any" required>
          </div>
        `;
      });

      this.showModal(`
        <h2>Reingresar estimación (HU-16)</h2>
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
          this.showToast('Reingreso de estimación guardado en borrador', 'success');
          this.closeModal();
          this.renderEstimacionesScreen();
        } catch (err) {}
      });
    }
  };
})();
