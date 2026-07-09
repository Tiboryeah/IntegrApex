(function () {
  window.IntegrApexModules = window.IntegrApexModules || {};

  const TIPO_ICONOS = {
    fianza_vencimiento: 'verified_user',
    alerta_concepto: 'notifications_active',
    alerta_concepto_disparo: 'warning',
    estimacion_presentada: 'query_stats',
    instruccion_pago: 'payments'
  };

  window.IntegrApexModules.notificaciones = {
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

    toggleNotifDropdown() {
      const dropdown = document.getElementById('notif-dropdown');
      if (!dropdown) return;
      const opening = dropdown.style.display === 'none';
      dropdown.style.display = opening ? 'block' : 'none';
      if (opening) this.renderNotifDropdown();
    },

    renderNotifDropdown() {
      const dropdown = document.getElementById('notif-dropdown');
      if (!dropdown) return;
      const items = this.state.notificaciones || [];

      const rows = items.length === 0
        ? `<div style="padding:24px; text-align:center; color:var(--text-muted); font-size:13px;">Sin notificaciones</div>`
        : items.slice(0, 20).map(n => `
            <div style="padding:12px 14px; border-bottom:1px solid var(--border-color); background:${n.leida ? 'transparent' : 'rgba(59,130,246,0.06)'}; cursor:pointer;" onclick="app.marcarNotifLeida('${n.id}')">
              <div style="display:flex; align-items:flex-start; gap:8px;">
                <span class="material-icons-round" style="font-size:16px; color: var(--ipn-maroon-light); margin-top:1px;">${TIPO_ICONOS[n.tipo] || 'info'}</span>
                <div style="flex:1;">
                  <p style="font-size:12.5px; line-height:1.4; color:#334155; margin:0;">${n.mensaje}</p>
                  <span style="font-size:10.5px; color:var(--text-muted);">${new Date(n.creado_en).toLocaleString('es-MX')}</span>
                </div>
                ${n.leida ? '' : '<span style="width:7px; height:7px; border-radius:50%; background:#2563eb; margin-top:4px; flex-shrink:0;"></span>'}
              </div>
            </div>
          `).join('');

      const marcarTodasBtn = items.some(n => !n.leida)
        ? `<button class="btn btn-secondary btn-sm" style="width:100%; border-radius:0;" onclick="app.marcarTodasNotifLeidas()">Marcar todas como leidas</button>`
        : '';

      dropdown.innerHTML = `
        <div style="padding:12px 14px; border-bottom:1px solid var(--border-color); font-weight:700; font-size:13px;">Notificaciones</div>
        <div>${rows}</div>
        ${marcarTodasBtn}
      `;
    },

    async marcarNotifLeida(id) {
      try {
        await this.api(`/api/notificaciones/${id}/leer`, { method: 'PATCH' }, true);
        await this.loadNotificaciones();
      } catch (e) {}
    },

    async marcarTodasNotifLeidas() {
      try {
        await this.api('/api/notificaciones/leer-todas', { method: 'POST' }, true);
        await this.loadNotificaciones();
      } catch (e) {}
    }
  };
})();
