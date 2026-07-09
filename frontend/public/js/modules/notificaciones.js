(function () {
  window.IntegrApexModules = window.IntegrApexModules || {};

  const TIPO_ICONOS = {
    fianza_vencimiento: 'verified_user',
    alerta_concepto: 'notifications_active',
    alerta_concepto_disparo: 'warning',
    estimacion_presentada: 'query_stats',
    instruccion_pago: 'payments'
  };

  const TIPO_LABELS = {
    fianza_vencimiento: 'Fianza',
    alerta_concepto: 'Alerta configurada',
    alerta_concepto_disparo: 'Atraso',
    estimacion_presentada: 'Estimacion',
    instruccion_pago: 'Pago'
  };

  window.IntegrApexModules.notificaciones = {
    // INICIALIZACIÓN DE POLLING: Activa la consulta recurrente de notificaciones al servidor cada 30 segundos y el cierre de dropdown al hacer clic fuera.
    initNotifPolling() {
      if (this.state.notifPollHandle) return;
      this.loadNotificaciones();
      this.state.notifPollHandle = setInterval(() => this.loadNotificaciones(), 30000);

      if (!this.state.notifDocListenerBound) {
        document.addEventListener('click', (e) => {
          const dropdown = document.getElementById('notif-dropdown');
          const bellBtn = document.getElementById('notif-bell-btn');
          if (!dropdown || dropdown.style.display === 'none') return;
          if (dropdown.contains(e.target) || (bellBtn && bellBtn.contains(e.target))) return;
          dropdown.style.display = 'none';
        });
        this.state.notifDocListenerBound = true;
      }
    },

    // CONSULTAR NOTIFICACIONES: Llama al servidor de forma silenciosa para obtener las notificaciones vigentes de la sesión.
    async loadNotificaciones() {
      try {
        const data = await this.api('/api/notificaciones', {}, true);
        this.state.notificaciones = data.notificaciones || [];
        this.renderNotifBadge(data.no_leidas || 0);
        const dropdown = document.getElementById('notif-dropdown');
        if (dropdown && dropdown.style.display !== 'none') {
          this.renderNotifDropdown();
        }
      } catch (e) {}
    },

    // RENDERIZAR BADGE CONTADOR: Actualiza el globo rojo indicador de notificaciones no leídas en la campana del topbar.
    renderNotifBadge(count) {
      const badge = document.getElementById('notif-unread-badge');
      if (!badge) return;
      if (count > 0) {
        badge.style.display = 'block';
        badge.textContent = count > 99 ? '99+' : String(count);
      } else {
        badge.style.display = 'none';
      }
    },

    // DESPLEGAR DROPDOWN: Muestra u oculta la bandeja descolgable al hacer clic en la campana.
    toggleNotifDropdown() {
      const dropdown = document.getElementById('notif-dropdown');
      if (!dropdown) return;
      const opening = dropdown.style.display === 'none';
      dropdown.style.display = opening ? 'block' : 'none';
      if (opening) this.renderNotifDropdown();
    },

    // RENDERIZAR DROPDOWN: Dibuja la lista de notificaciones recientes en el dropdown y los botones de acción correspondientes.
    renderNotifDropdown() {
      const dropdown = document.getElementById('notif-dropdown');
      if (!dropdown) return;
      const items = this.state.notificaciones || [];

      const rows = items.length === 0
        ? `<div style="padding:24px; text-align:center; color:var(--text-muted); font-size:13px;">Sin notificaciones</div>`
        : items.slice(0, 20).map(n => {
          const contratoLabel = n.contrato?.folio || n.contrato_id || 'Sin contrato';
          const tipoLabel = TIPO_LABELS[n.tipo] || n.tipo || 'Aviso';
          return `
            <div style="padding:12px 14px; border-bottom:1px solid var(--border-color); background:${n.leida ? 'transparent' : 'rgba(59,130,246,0.06)'}; cursor:pointer;" onclick="app.abrirNotificacion('${n.id}')">
              <div style="display:flex; align-items:flex-start; gap:8px;">
                <span class="material-icons-round" style="font-size:16px; color: var(--ipn-maroon-light); margin-top:1px;">${TIPO_ICONOS[n.tipo] || 'info'}</span>
                <div style="flex:1;">
                  <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap; margin-bottom:5px;">
                    <span class="user-badge" style="font-size:10px; padding:2px 7px; background:#f1f5f9; color:#334155;">${escapeHtml(tipoLabel)}</span>
                    <span style="font-size:11px; font-weight:700; color:#475569;">${escapeHtml(contratoLabel)}</span>
                  </div>
                  <p style="font-size:12.5px; line-height:1.4; color:#334155; margin:0;">${escapeHtml(n.mensaje)}</p>
                  <div style="display:flex; justify-content:space-between; gap:8px; align-items:center; margin-top:6px;">
                    <span style="font-size:10.5px; color:var(--text-muted);">${new Date(n.creado_en).toLocaleString('es-MX')}</span>
                    ${n.contrato_id ? '<span style="font-size:10.5px; color:var(--ipn-maroon); font-weight:700;">Abrir contrato</span>' : ''}
                  </div>
                </div>
                ${n.leida ? '' : '<span style="width:7px; height:7px; border-radius:50%; background:#2563eb; margin-top:4px; flex-shrink:0;"></span>'}
              </div>
            </div>
          `;
        }).join('');

      const marcarTodasBtn = items.some(n => !n.leida)
        ? `<button class="btn btn-secondary btn-sm" style="width:100%; border-radius:0;" onclick="app.marcarTodasNotifLeidas()">Marcar todas como leidas</button>`
        : '';

      dropdown.innerHTML = `
        <div style="padding:12px 14px; border-bottom:1px solid var(--border-color); font-weight:700; font-size:13px;">Notificaciones</div>
        <div>${rows}</div>
        ${marcarTodasBtn}
      `;
    },

    // ABRIR NOTIFICACION: Marca la notificacion como leida y navega al contrato relacionado cuando existe.
    async abrirNotificacion(id) {
      const notif = (this.state.notificaciones || []).find(n => n.id === id);
      try {
        await this.api(`/api/notificaciones/${id}/leer`, { method: 'PATCH' }, true);
      } catch (e) {}

      const dropdown = document.getElementById('notif-dropdown');
      if (dropdown) dropdown.style.display = 'none';
      await this.loadNotificaciones();

      if (notif && notif.contrato_id) {
        this.state.currentContractId = notif.contrato_id;
        this.state.activeTab = this.getNotifTargetTab(notif.tipo);
        this.navigate('contract-detail', { id: notif.contrato_id });
      }
    },

    getNotifTargetTab(tipo) {
      if (tipo === 'fianza_vencimiento') return 'fianzas';
      if (tipo === 'alerta_concepto' || tipo === 'alerta_concepto_disparo') return 'programa';
      return 'config';
    },

    // MARCAR COMO LEÍDA: Informa al servidor que el usuario leyó una notificación en específico y actualiza el listado.
    async marcarNotifLeida(id) {
      try {
        await this.api(`/api/notificaciones/${id}/leer`, { method: 'PATCH' }, true);
        await this.loadNotificaciones();
      } catch (e) {}
    },

    // MARCAR TODAS COMO LEÍDAS: Llama al backend para marcar todo el listado de notificaciones pendientes de leer como leídas.
    async marcarTodasNotifLeidas() {
      try {
        await this.api('/api/notificaciones/leer-todas', { method: 'POST' }, true);
        await this.loadNotificaciones();
      } catch (e) {}
    }
  };
})();
