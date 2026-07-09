(function () {
  window.IntegrApexModules = window.IntegrApexModules || {};

  window.IntegrApexModules.catalogo = {

    // ─── PANTALLA PRINCIPAL: BANCO DE CATÁLOGOS ─────────────────────────────────
    async renderCatalogoBanco() {
      this.showLoggedInUI();
      const outlet = document.getElementById('app-router-outlet');
      outlet.innerHTML = `
        <div class="main-container">
          <div style="margin-bottom: 28px;">
            <h1 style="font-size: 26px; color: #0f172a; margin-bottom: 6px;">Banco de Catálogos</h1>
            <p style="color: var(--text-muted); font-size: 14px;">Administra el directorio de dependencias contratantes y empresas contratistas.</p>
          </div>

          <div class="tabs" id="catalogo-tabs">
            <div class="tab active" id="tab-dep" onclick="app.switchCatalogoTab('dependencias')">
              <span class="material-icons-round" style="font-size:16px; vertical-align:middle; margin-right:4px;">account_balance</span>
              Dependencias
            </div>
            <div class="tab" id="tab-emp" onclick="app.switchCatalogoTab('empresas')">
              <span class="material-icons-round" style="font-size:16px; vertical-align:middle; margin-right:4px;">business</span>
              Empresas
            </div>
          </div>

          <div id="catalogo-tab-content" style="margin-top: 24px;"></div>
        </div>
      `;
      await this.renderDependenciasTab();
    },

    // ─── CAMBIAR TAB ────────────────────────────────────────────────────────────
    async switchCatalogoTab(tab) {
      document.querySelectorAll('#catalogo-tabs .tab').forEach(t => t.classList.remove('active'));
      document.getElementById(tab === 'dependencias' ? 'tab-dep' : 'tab-emp').classList.add('active');
      if (tab === 'dependencias') {
        await this.renderDependenciasTab();
      } else {
        await this.renderEmpresasTab();
      }
    },

    // ─── TAB DEPENDENCIAS ───────────────────────────────────────────────────────
    async renderDependenciasTab() {
      const outlet = document.getElementById('catalogo-tab-content');
      outlet.innerHTML = `<div style="color: var(--text-muted); padding: 20px;">Cargando...</div>`;
      try {
        const lista = await this.api('/api/catalogo/dependencias');
        const canAdd = this.state.user && ['residente', 'dependencia'].includes(this.state.user.rol);

        let rows = '';
        if (lista.length === 0) {
          rows = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:32px;">
            Sin dependencias registradas. ${canAdd ? 'Usa el botón para agregar la primera.' : ''}
          </td></tr>`;
        } else {
          lista.forEach(d => {
            rows += `
              <tr>
                <td><strong>${escapeHtml(d.nombre)}</strong>${d.siglas ? `<br><span style="font-size:11px; color:var(--text-muted);">${escapeHtml(d.siglas)}</span>` : ''}</td>
                <td style="font-size:13px;">${escapeHtml(d.rfc) || '—'}</td>
                <td style="font-size:13px;">${escapeHtml(d.nombre_contacto) || '—'}</td>
                <td style="font-size:13px;">${escapeHtml(d.email) || '—'}</td>
                <td style="font-size:13px; color:var(--text-muted);">${escapeHtml(d.telefono) || '—'}</td>
              </tr>`;
          });
        }

        outlet.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <span style="font-size:14px; color:var(--text-muted);">
              <strong style="color:#0f172a;">${lista.length}</strong> dependencia${lista.length !== 1 ? 's' : ''} registrada${lista.length !== 1 ? 's' : ''} · orden alfabético
            </span>
            ${canAdd ? `<button class="btn btn-primary btn-sm" onclick="app.openNuevaDependenciaModal()">
              <span class="material-icons-round" style="font-size:16px;">add</span> Nueva Dependencia
            </button>` : ''}
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nombre / Siglas</th>
                  <th>RFC</th>
                  <th>Contacto</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`;
      } catch (e) {
        outlet.innerHTML = `<div style="color:var(--accent-red); padding:20px;">Error al cargar dependencias.</div>`;
      }
    },

    // ─── TAB EMPRESAS ───────────────────────────────────────────────────────────
    async renderEmpresasTab() {
      const outlet = document.getElementById('catalogo-tab-content');
      outlet.innerHTML = `<div style="color: var(--text-muted); padding: 20px;">Cargando...</div>`;
      try {
        const lista = await this.api('/api/catalogo/empresas');
        const canAdd = this.state.user && ['residente', 'dependencia'].includes(this.state.user.rol);

        let rows = '';
        if (lista.length === 0) {
          rows = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:32px;">
            Sin empresas registradas. ${canAdd ? 'Usa el botón para agregar la primera.' : ''}
          </td></tr>`;
        } else {
          lista.forEach(e => {
            rows += `
              <tr>
                <td><strong>${escapeHtml(e.nombre_comercial)}</strong>${e.razon_social ? `<br><span style="font-size:11px; color:var(--text-muted);">${escapeHtml(e.razon_social)}</span>` : ''}</td>
                <td style="font-size:13px;">${escapeHtml(e.rfc) || '—'}</td>
                <td style="font-size:13px;">${escapeHtml(e.representante) || '—'}</td>
                <td style="font-size:13px;">${escapeHtml(e.email) || '—'}</td>
                <td style="font-size:13px; color:var(--text-muted);">${escapeHtml(e.telefono) || '—'}</td>
              </tr>`;
          });
        }

        outlet.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <span style="font-size:14px; color:var(--text-muted);">
              <strong style="color:#0f172a;">${lista.length}</strong> empresa${lista.length !== 1 ? 's' : ''} registrada${lista.length !== 1 ? 's' : ''} · orden alfabético
            </span>
            ${canAdd ? `<button class="btn btn-primary btn-sm" onclick="app.openNuevaEmpresaModal()">
              <span class="material-icons-round" style="font-size:16px;">add</span> Nueva Empresa
            </button>` : ''}
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nombre comercial / Razón social</th>
                  <th>RFC</th>
                  <th>Representante</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`;
      } catch (e) {
        outlet.innerHTML = `<div style="color:var(--accent-red); padding:20px;">Error al cargar empresas.</div>`;
      }
    },

    // ─── MODAL NUEVA DEPENDENCIA ─────────────────────────────────────────────────
    openNuevaDependenciaModal(onSaved) {
      this._catalogoOnSaved = onSaved || null;
      const modalContainer = document.getElementById('modal-container');
      const modalContent = document.getElementById('modal-content-outlet');
      modalContent.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
          <h2 style="font-size:20px; color:#0f172a; margin:0;">Nueva Dependencia</h2>
          <button onclick="app.closeModal()" style="background:none; border:none; cursor:pointer; color:var(--text-muted);">
            <span class="material-icons-round">close</span>
          </button>
        </div>
        <div class="form-grid-2">
          <div class="form-group full">
            <label>NOMBRE <span style="color:var(--accent-red);">*</span></label>
            <input type="text" id="dep-nombre" placeholder="Ej. Grupo Aeroportuario de la Ciudad de México" autocomplete="off">
          </div>
          <div class="form-group">
            <label>SIGLAS</label>
            <input type="text" id="dep-siglas" placeholder="Ej. GACM">
          </div>
          <div class="form-group">
            <label>RFC</label>
            <input type="text" id="dep-rfc" placeholder="Ej. GAC150101ABC" style="text-transform:uppercase;" maxlength="13">
          </div>
          <div class="form-group full">
            <label>DIRECCIÓN</label>
            <input type="text" id="dep-dir" placeholder="Dirección física">
          </div>
          <div class="form-group">
            <label>TELÉFONO</label>
            <input type="text" id="dep-tel" placeholder="55 0000 0000" maxlength="10">
          </div>
          <div class="form-group">
            <label>EMAIL</label>
            <input type="email" id="dep-email" placeholder="contacto@dependencia.gob.mx">
          </div>
          <div class="form-group full">
            <label>NOMBRE DEL CONTACTO</label>
            <input type="text" id="dep-contacto" placeholder="Titular o responsable">
          </div>
        </div>
        <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:24px;">
          <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
          <button class="btn btn-primary" id="dep-submit-btn" onclick="app.submitNuevaDependencia()">
            <span class="material-icons-round" style="font-size:16px;">save</span> Guardar
          </button>
        </div>
      `;

      // Limitar caracteres en RFC y teléfono
      const rfcInput = document.getElementById('dep-rfc');
      if (rfcInput) {
        rfcInput.addEventListener('input', (e) => {
          e.target.value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        });
      }

      const telInput = document.getElementById('dep-tel');
      if (telInput) {
        telInput.addEventListener('input', (e) => {
          e.target.value = e.target.value.replace(/\D/g, '');
        });
      }

      modalContainer.style.display = 'flex';
    },

    async submitNuevaDependencia() {
      const btn = document.getElementById('dep-submit-btn');
      if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

      const payload = {
        nombre: document.getElementById('dep-nombre')?.value?.trim() || '',
        siglas: document.getElementById('dep-siglas')?.value?.trim() || '',
        rfc: document.getElementById('dep-rfc')?.value?.trim() || '',
        direccion: document.getElementById('dep-dir')?.value?.trim() || '',
        telefono: document.getElementById('dep-tel')?.value?.trim() || '',
        email: document.getElementById('dep-email')?.value?.trim() || '',
        nombre_contacto: document.getElementById('dep-contacto')?.value?.trim() || ''
      };

      if (!payload.nombre) {
        this.showToast('El nombre de la dependencia es obligatorio', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons-round" style="font-size:16px;">save</span> Guardar'; }
        return;
      }

      // Validar campos
      if (payload.rfc && !/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/i.test(payload.rfc)) {
        this.showToast('El RFC debe ser un formato válido (12 o 13 caracteres con homoclave)', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons-round" style="font-size:16px;">save</span> Guardar'; }
        return;
      }

      if (payload.telefono && !/^\d{10}$/.test(payload.telefono)) {
        this.showToast('El teléfono debe tener exactamente 10 dígitos numéricos', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons-round" style="font-size:16px;">save</span> Guardar'; }
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (payload.email && !emailRegex.test(payload.email)) {
        this.showToast('El correo electrónico no tiene un formato válido', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons-round" style="font-size:16px;">save</span> Guardar'; }
        return;
      }

      try {
        const res = await fetch('/api/catalogo/dependencias', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        this.closeModal();
        this.showToast(`Dependencia "${data.dependencia.nombre}" guardada`, 'success');

        if (typeof this._catalogoOnSaved === 'function') {
          this._catalogoOnSaved(data.dependencia);
          this._catalogoOnSaved = null;
        } else {
          await this.renderDependenciasTab();
        }
      } catch (e) {
        this.showToast(e.message, 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons-round" style="font-size:16px;">save</span> Guardar'; }
      }
    },

    // ─── MODAL NUEVA EMPRESA ─────────────────────────────────────────────────────
    openNuevaEmpresaModal(onSaved) {
      this._catalogoOnSaved = onSaved || null;
      const modalContainer = document.getElementById('modal-container');
      const modalContent = document.getElementById('modal-content-outlet');
      modalContent.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
          <h2 style="font-size:20px; color:#0f172a; margin:0;">Nueva Empresa</h2>
          <button onclick="app.closeModal()" style="background:none; border:none; cursor:pointer; color:var(--text-muted);">
            <span class="material-icons-round">close</span>
          </button>
        </div>
        <div class="form-grid-2">
          <div class="form-group full">
            <label>NOMBRE COMERCIAL <span style="color:var(--accent-red);">*</span></label>
            <input type="text" id="emp-nombre" placeholder="Ej. Autodesk" autocomplete="off">
          </div>
          <div class="form-group full">
            <label>RAZÓN SOCIAL</label>
            <input type="text" id="emp-razon" placeholder="Ej. Autodesk Inc. S.A. de C.V.">
          </div>
          <div class="form-group">
            <label>RFC</label>
            <input type="text" id="emp-rfc" placeholder="Ej. AUT150101XYZ" style="text-transform:uppercase;" maxlength="13">
          </div>
          <div class="form-group">
            <label>TELÉFONO</label>
            <input type="text" id="emp-tel" placeholder="55 0000 0000" maxlength="10">
          </div>
          <div class="form-group full">
            <label>DIRECCIÓN</label>
            <input type="text" id="emp-dir" placeholder="Dirección fiscal">
          </div>
          <div class="form-group">
            <label>EMAIL</label>
            <input type="email" id="emp-email" placeholder="contacto@empresa.com">
          </div>
          <div class="form-group">
            <label>REPRESENTANTE / CONTACTO</label>
            <input type="text" id="emp-rep" placeholder="Nombre del representante legal">
          </div>
        </div>
        <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:24px;">
          <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
          <button class="btn btn-primary" id="emp-submit-btn" onclick="app.submitNuevaEmpresa()">
            <span class="material-icons-round" style="font-size:16px;">save</span> Guardar
          </button>
        </div>
      `;

      // Limitar caracteres en RFC y teléfono
      const rfcInput = document.getElementById('emp-rfc');
      if (rfcInput) {
        rfcInput.addEventListener('input', (e) => {
          e.target.value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        });
      }

      const telInput = document.getElementById('emp-tel');
      if (telInput) {
        telInput.addEventListener('input', (e) => {
          e.target.value = e.target.value.replace(/\D/g, '');
        });
      }

      modalContainer.style.display = 'flex';
    },

    async submitNuevaEmpresa() {
      const btn = document.getElementById('emp-submit-btn');
      if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

      const payload = {
        nombre_comercial: document.getElementById('emp-nombre')?.value?.trim() || '',
        razon_social: document.getElementById('emp-razon')?.value?.trim() || '',
        rfc: document.getElementById('emp-rfc')?.value?.trim() || '',
        direccion: document.getElementById('emp-dir')?.value?.trim() || '',
        telefono: document.getElementById('emp-tel')?.value?.trim() || '',
        email: document.getElementById('emp-email')?.value?.trim() || '',
        representante: document.getElementById('emp-rep')?.value?.trim() || ''
      };

      if (!payload.nombre_comercial) {
        this.showToast('El nombre comercial es obligatorio', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons-round" style="font-size:16px;">save</span> Guardar'; }
        return;
      }

      // Validar campos
      if (payload.rfc && !/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/i.test(payload.rfc)) {
        this.showToast('El RFC debe ser un formato válido (12 o 13 caracteres con homoclave)', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons-round" style="font-size:16px;">save</span> Guardar'; }
        return;
      }

      if (payload.telefono && !/^\d{10}$/.test(payload.telefono)) {
        this.showToast('El teléfono debe tener exactamente 10 dígitos numéricos', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons-round" style="font-size:16px;">save</span> Guardar'; }
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (payload.email && !emailRegex.test(payload.email)) {
        this.showToast('El correo electrónico no tiene un formato válido', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons-round" style="font-size:16px;">save</span> Guardar'; }
        return;
      }

      try {
        const res = await fetch('/api/catalogo/empresas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        this.closeModal();
        this.showToast(`Empresa "${data.empresa.nombre_comercial}" guardada`, 'success');

        if (typeof this._catalogoOnSaved === 'function') {
          this._catalogoOnSaved(data.empresa);
          this._catalogoOnSaved = null;
        } else {
          await this.renderEmpresasTab();
        }
      } catch (e) {
        this.showToast(e.message, 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons-round" style="font-size:16px;">save</span> Guardar'; }
      }
    },

    // ─── HELPERS para selects en formulario de contratos ────────────────────────
    async loadDependenciasOpts() {
      try {
        return await this.api('/api/catalogo/dependencias');
      } catch { return []; }
    },

    async loadEmpresasOpts() {
      try {
        return await this.api('/api/catalogo/empresas');
      } catch { return []; }
    }
  };
})();
