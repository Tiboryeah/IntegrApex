(function () {
  window.IntegrApexModules = window.IntegrApexModules || {};

  const money = v => `$${(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
  const semaforoColor = { verde: '#15803d', ambar: '#d97706', rojo: '#b91c1c' };
  const tendenciaIcon = { subida: 'trending_up', bajada: 'trending_down', igual: 'trending_flat' };
  const tendenciaColor = { subida: 'var(--accent-green)', bajada: 'var(--accent-red)', igual: 'var(--text-muted)' };

  const AGRUPACIONES = {
    contratista: 'Contratista',
    ejercicio_fiscal: 'Ejercicio Fiscal',
    tipo_contratacion: 'Tipo de Contratacion'
  };

  window.IntegrApexModules.portafolio = {
    // ==========================================
    // Portafolio ejecutivo (HU-18).
    // ==========================================
    // PORTAFOLIO EJECUTIVO (HU-18): Renderiza la pantalla dedicada de portafolio que agrupa los contratos por contratista, ejercicio fiscal o tipo.
    async renderPortafolioEjecutivo() {
      this.showLoggedInUI();
      const outlet = document.getElementById('app-router-outlet');
      const agrupacion = this.state.portafolioAgrupacion || '';

      try {
        const url = agrupacion ? `/api/tableros/portafolio?agrupar_por=${agrupacion}` : '/api/tableros/portafolio';
        const data = await this.api(url);
        const contratos = agrupacion ? data.grupos.flatMap(g => g.contratos) : data;
        this.state.portafolioCache = contratos;

        const opcionesAgrupacion = Object.entries(AGRUPACIONES)
          .map(([valor, etiqueta]) => `<option value="${valor}" ${agrupacion === valor ? 'selected' : ''}>${etiqueta}</option>`)
          .join('');

        const cuerpo = agrupacion
          ? data.grupos.map(g => `
              <div class="col-12">
                <h3 style="margin-top:18px; margin-bottom:8px; color:var(--primary);">${AGRUPACIONES[agrupacion]}: ${g.clave}</h3>
              </div>
              ${g.contratos.map(c => this.renderTarjetaPortafolio(c)).join('')}
            `).join('')
          : contratos.map(c => this.renderTarjetaPortafolio(c)).join('');

        outlet.innerHTML = `
          <div class="main-container">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
              <h1>Portafolio Ejecutivo (HU-18)</h1>
              <div style="display:flex; align-items:center; gap:10px;">
                <label style="font-size:12.5px; color:var(--text-muted); font-weight:600;">Agrupar por</label>
                <select id="portafolio-agrupacion" style="padding:8px;">
                  <option value="">Sin agrupar</option>
                  ${opcionesAgrupacion}
                </select>
                <button class="btn btn-secondary" onclick="app.navigate('inicio')">
                  <span class="material-icons-round">arrow_back</span> Inicio
                </button>
              </div>
            </div>
            <p style="font-size:12.5px; color:var(--text-muted); margin-bottom:16px;">
              El semáforo combina 3 factores: avance físico vs. programado, atrasos en plazos legales (revisión 15 días, pago 20 días, fianzas vencidas) y pendientes sin atender. Clic para abrir el contrato; doble clic para el detalle consolidado.
            </p>
            <div class="dashboard-grid">
              ${contratos.length === 0 ? '<div class="col-12 glass-panel" style="padding:30px; text-align:center; color:var(--text-muted);">No hay contratos registrados</div>' : cuerpo}
            </div>
          </div>
        `;

        document.getElementById('portafolio-agrupacion').addEventListener('change', (e) => {
          this.state.portafolioAgrupacion = e.target.value;
          this.renderPortafolioEjecutivo();
        });
      } catch (e) {}
    },

    // TARJETA DE CONTRATO (HU-18): Renderiza el HTML de la minicard de un contrato con barra de avance, semáforo y badges.
    renderTarjetaPortafolio(c) {
      const tendenciaTexto = c.tendencia === 'subida' ? 'Mejorando vs. mes anterior' : c.tendencia === 'bajada' ? 'Bajando vs. mes anterior' : 'Sin cambio vs. mes anterior';
      return `
        <div class="col-4 mini-card" style="border-left:4px solid ${semaforoColor[c.semaforo]}; cursor:pointer;"
             onclick="app.handleClickTarjetaPortafolio('${c.id}')">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <span class="user-badge" style="background:var(--ipn-maroon); color:white; font-size:10px; font-weight:700;">${c.folio}</span>
            <span class="semaforo-dot ${c.semaforo}" title="Semáforo: ${c.semaforo}"></span>
          </div>
          <h3 style="margin-top:10px; font-size:14.5px; line-height:1.4; color:#0f172a;">${c.objeto}</h3>
          <div style="font-size:11.5px; color:var(--text-muted); margin-top:6px;">Contratista: ${c.contratista} | Ejercicio ${c.ejercicio_fiscal}</div>

          <div style="margin-top:14px;">
            <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-muted); margin-bottom:4px;">
              <span>Fisico ${c.avance_fisico.toFixed(1)}% / Programado ${c.avance_programado.toFixed(1)}%</span>
            </div>
            <div style="height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden; position:relative;">
              <div style="width:${Math.min(100, c.avance_programado)}%; height:100%; background:#cbd5e1; position:absolute;"></div>
              <div style="width:${Math.min(100, c.avance_fisico)}%; height:100%; background:var(--ipn-maroon); position:absolute;"></div>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:6px; margin-top:10px; font-size:11px; color:${tendenciaColor[c.tendencia]};">
            <span class="material-icons-round" style="font-size:14px;">${tendenciaIcon[c.tendencia]}</span> ${tendenciaTexto}
          </div>

          <div style="display:flex; gap:8px; margin-top:12px; border-top:1px solid var(--border-color); padding-top:10px;">
            <span class="badge ${c.atrasos_legales > 0 ? 'badge-rejected' : 'badge-authorized'}" style="font-size:10px;">${c.atrasos_legales} atraso(s) legal(es)</span>
            <span class="badge ${c.pendientes > 0 ? 'badge-presented' : 'badge-authorized'}" style="font-size:10px;">${c.pendientes} pendiente(s)</span>
          </div>
        </div>
      `;
    },

    // El doble clic nativo dispara también eventos click independientes.
    // Se usa una espera corta para distinguir apertura simple de detalle ejecutivo.
    // GESTIÓN DE CLICS EN TARJETA: Distingue un clic simple (abre expediente) de un doble clic rápido (abre detalle consolidado modal).
    handleClickTarjetaPortafolio(contratoId) {
      const now = Date.now();
      const pendiente = this.state.portafolioClickPendiente;

      if (pendiente && pendiente.id === contratoId && now - pendiente.time < 400) {
        this.state.portafolioClickPendiente = null;
        this.verDetalleConsolidadoPortafolio(contratoId);
        return;
      }

      this.state.portafolioClickPendiente = { id: contratoId, time: now };
      setTimeout(() => {
        const aun = this.state.portafolioClickPendiente;
        if (aun && aun.id === contratoId && aun.time === now) {
          this.state.portafolioClickPendiente = null;
          this.selectContract(contratoId);
        }
      }, 400);
    },

    // DETALLE CONSOLIDADO (HU-18): Abre un modal mostrando el resumen físico, programado, financiero, atrasos y penalizaciones del contrato.
    async verDetalleConsolidadoPortafolio(contratoId) {
      const item = (this.state.portafolioCache || []).find(p => p.id === contratoId);
      if (!item) return;

      try {
        const reporte = await this.api(`/api/contratos/${contratoId}/reporte-data`);
        const penalizacionesTotal = (reporte.penalizaciones || []).reduce((sum, p) => sum + (p.monto || 0), 0);

        this.showModal(`
          <h2>Detalle Consolidado - ${item.folio}</h2>
          <p style="font-size:13px; color:var(--text-muted); margin-bottom:16px;">${item.objeto}</p>
          <table style="width:100%;">
            <tr><td style="color:var(--text-muted); font-weight:600; width:55%;">Semáforo:</td><td><span class="semaforo-dot ${item.semaforo}"></span> ${item.semaforo.toUpperCase()}</td></tr>
            <tr><td style="color:var(--text-muted); font-weight:600;">Avance físico:</td><td>${item.avance_fisico.toFixed(1)}%</td></tr>
            <tr><td style="color:var(--text-muted); font-weight:600;">Avance programado (a hoy):</td><td>${item.avance_programado.toFixed(1)}%</td></tr>
            <tr><td style="color:var(--text-muted); font-weight:600;">Avance financiero:</td><td>${item.avance_financiero.toFixed(1)}%</td></tr>
            <tr><td style="color:var(--text-muted); font-weight:600;">Monto contractual:</td><td>${money(item.monto)}</td></tr>
            <tr><td style="color:var(--text-muted); font-weight:600;">Atrasos en plazos legales:</td><td>${item.atrasos_legales}</td></tr>
            <tr><td style="color:var(--text-muted); font-weight:600;">Pendientes sin atender:</td><td>${item.pendientes}</td></tr>
            <tr><td style="color:var(--text-muted); font-weight:600;">Penalizaciones acumuladas:</td><td>${money(penalizacionesTotal)}</td></tr>
          </table>
          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:24px;">
            <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cerrar</button>
            <button type="button" class="btn btn-primary" onclick="app.closeModal(); app.selectContract('${contratoId}')">Abrir Expediente</button>
          </div>
        `);
      } catch (e) {}
    }
  };
})();
