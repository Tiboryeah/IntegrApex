(function () {
  window.IntegrApexModules = window.IntegrApexModules || {};

  const ROL_LABELS = {
    residente: 'Residente',
    contratista: 'Contratista',
    supervision: 'Supervisión',
    dependencia: 'Dependencia',
    finanzas: 'Finanzas'
  };

  const ROL_COLORS = {
    residente:   { bg: '#dbeafe', color: '#1d4ed8' },
    contratista: { bg: '#fef3c7', color: '#92400e' },
    supervision: { bg: '#ede9fe', color: '#6d28d9' },
    dependencia: { bg: '#dcfce7', color: '#166534' },
    finanzas:    { bg: '#fee2e2', color: '#991b1b' }
  };

  function rolBadge(rol) {
    const c = ROL_COLORS[rol] || { bg: '#f1f5f9', color: '#475569' };
    return `<span style="background:${c.bg}; color:${c.color}; border-radius:999px; padding:2px 12px; font-size:12px; font-weight:700;">${ROL_LABELS[rol] || rol}</span>`;
  }

  function estadoBadge(estado) {
    if (estado === 'aprobado')  return `<span style="background:#dcfce7;color:#16a34a;border-radius:999px;padding:2px 10px;font-size:11px;font-weight:700;">Activo</span>`;
    if (estado === 'pendiente') return `<span style="background:#fef9c3;color:#92400e;border-radius:999px;padding:2px 10px;font-size:11px;font-weight:700;">Pendiente</span>`;
    return `<span style="background:#fee2e2;color:#991b1b;border-radius:999px;padding:2px 10px;font-size:11px;font-weight:700;">Rechazado</span>`;
  }

  window.IntegrApexModules.admin = {

    // ─── PANTALLA PRINCIPAL: GESTIÓN DE USUARIOS ─────────────────────────────────
    async renderAdminApprovals() {
      this.showLoggedInUI();
      const outlet = document.getElementById('app-router-outlet');
      outlet.innerHTML = `<div style="display:flex;justify-content:center;align-items:center;min-height:50vh;color:var(--text-muted);">Cargando...</div>`;

      try {
        const [usuarios, empresas, dependencias] = await Promise.all([
          this.api('/api/admin/usuarios'),
          this.loadEmpresasOpts(),
          this.loadDependenciasOpts()
        ]);

        // Mapas para lookup rápido
        const empMap = Object.fromEntries(empresas.map(e => [e.id, e.nombre_comercial]));
        const depMap = Object.fromEntries(dependencias.map(d => [d.id, d.nombre]));

        // Tabs: Todos / Pendientes
        const pendientes = usuarios.filter(u => u.estado === 'pendiente');

        let rows = '';
        if (usuarios.length === 0) {
          rows = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:40px;">Sin usuarios registrados aún.</td></tr>`;
        } else {
          usuarios.forEach(u => {
            const emp = empMap[u.empresa_id] || '—';
            rows += `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:36px;height:36px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;">
                      ${u.foto_url
                        ? `<img src="${escapeHtml(u.foto_url)}" style="width:100%;height:100%;object-fit:cover;">`
                        : `<span class="material-icons-round" style="font-size:20px;color:#94a3b8;">person</span>`}
                    </div>
                    <div>
                      <div style="font-weight:600;font-size:14px;color:#0f172a;">${escapeHtml(u.nombre)}</div>
                      ${u.cargo ? `<div style="font-size:11px;color:var(--text-muted);">${escapeHtml(u.cargo)}</div>` : ''}
                    </div>
                  </div>
                </td>
                <td style="font-size:13px;">${escapeHtml(u.email)}</td>
                <td>${rolBadge(u.rol)}</td>
                <td style="font-size:13px;">${escapeHtml(emp)}</td>
                <td style="font-size:13px;">${escapeHtml(u.telefono) || '—'}</td>
                <td>${estadoBadge(u.estado)}</td>
                <td>
                  ${u.estado === 'pendiente'
                    ? `<div style="display:flex;gap:6px;">
                        <select id="role-override-${u.id}" style="padding:4px 6px;font-size:12px;border-radius:6px;border:1px solid #e2e8f0;">
                          ${Object.entries(ROL_LABELS).map(([v,l]) => `<option value="${v}" ${u.rol===v?'selected':''}>${l}</option>`).join('')}
                        </select>
                        <button class="btn btn-primary btn-sm" onclick="app.resolveUserApproval('${u.id}', true)">✓</button>
                        <button class="btn btn-secondary btn-sm" onclick="app.resolveUserApproval('${u.id}', false)" style="color:#dc2626;">✕</button>
                      </div>`
                    : `<button class="btn btn-secondary btn-sm" onclick="app.openEditUsuarioModal('${u.id}')" style="font-size:12px;">
                        <span class="material-icons-round" style="font-size:14px;">edit</span>
                      </button>`}
                </td>
              </tr>`;
          });
        }

        outlet.innerHTML = `
          <div class="main-container">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
              <div>
                <h1 style="font-size:26px;color:#0f172a;margin-bottom:4px;">Gestión de Usuarios</h1>
                <p style="color:var(--text-muted);font-size:14px;">
                  <strong style="color:#0f172a;">${usuarios.length}</strong> usuarios registrados
                  ${pendientes.length > 0 ? ` · <span style="color:#d97706;font-weight:700;">${pendientes.length} pendientes de aprobación</span>` : ''}
                </p>
              </div>
              <button class="btn btn-primary" onclick="app.openNuevoUsuarioModal()">
                <span class="material-icons-round" style="font-size:16px;">person_add</span>
                Nuevo Usuario
              </button>
            </div>

            <div class="glass-panel" style="padding:0;overflow:hidden;">
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Correo</th>
                      <th>Rol</th>
                      <th>Org.</th>
                      <th>Teléfono</th>
                      <th>Estado</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>${rows}</tbody>
                </table>
              </div>
            </div>
          </div>
        `;
      } catch (e) {
        outlet.innerHTML = `<div style="padding:40px;color:var(--accent-red);">Error al cargar usuarios.</div>`;
      }
    },

    // ─── MODAL NUEVO USUARIO ─────────────────────────────────────────────────────
    async openNuevoUsuarioModal() {
      const [empresas, dependencias] = await Promise.all([
        this.loadEmpresasOpts(),
        this.loadDependenciasOpts()
      ]);

      const empOpts = '<option value="">Sin empresa</option>' +
        empresas.map(e => `<option value="${e.id}">${escapeHtml(e.nombre_comercial)}</option>`).join('');
      const depOpts = '<option value="">Sin dependencia</option>' +
        dependencias.map(d => `<option value="${d.id}">${escapeHtml(d.nombre)}</option>`).join('');

      const modalContainer = document.getElementById('modal-container');
      const modalContent = document.getElementById('modal-content-outlet');

      modalContent.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <h2 style="font-size:20px;color:#0f172a;margin:0;">Nuevo Usuario</h2>
          <button onclick="app.closeModal()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);">
            <span class="material-icons-round">close</span>
          </button>
        </div>

        <!-- Foto de perfil -->
        <div style="display:flex;flex-direction:column;align-items:center;margin-bottom:24px;">
          <div id="nu-foto-preview" style="width:80px;height:80px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer;border:3px solid #e2e8f0;transition:border-color .2s;"
               onclick="document.getElementById('nu-foto-input').click()"
               onmouseenter="this.style.borderColor='var(--primary)'"
               onmouseleave="this.style.borderColor='#e2e8f0'">
            <span class="material-icons-round" style="font-size:40px;color:#94a3b8;">person</span>
          </div>
          <input type="file" id="nu-foto-input" accept="image/*" style="display:none;">
          <button type="button" onclick="document.getElementById('nu-foto-input').click()"
                  style="background:none;border:none;color:var(--primary);font-size:13px;cursor:pointer;margin-top:8px;font-weight:600;">
            Subir foto
          </button>
        </div>

        <!-- DATOS DE ACCESO -->
        <div style="font-size:13px;font-weight:700;letter-spacing:.06em;color:var(--primary);margin-bottom:14px;">DATOS DE ACCESO</div>
        <div class="form-grid-2">
          <div class="form-group full">
            <label>NOMBRE COMPLETO <span style="color:var(--accent-red);">*</span></label>
            <input type="text" id="nu-nombre" placeholder="Ej. Juan Pérez" autocomplete="off">
          </div>
          <div class="form-group full">
            <label>CORREO ELECTRÓNICO <span style="color:var(--accent-red);">*</span></label>
            <input type="email" id="nu-email" placeholder="usuario@empresa.com" autocomplete="off">
          </div>
          <div class="form-group full">
            <label>CONTRASEÑA <span style="color:var(--accent-red);">*</span></label>
            <input type="password" id="nu-password" placeholder="Mínimo 8 caracteres">
          </div>
          <div class="form-group">
            <label>ROL <span style="color:var(--accent-red);">*</span></label>
            <select id="nu-rol">
              <option value="residente">Residente</option>
              <option value="contratista">Contratista</option>
              <option value="supervision">Supervisión</option>
              <option value="dependencia">Dependencia</option>
              <option value="finanzas">Finanzas</option>
            </select>
          </div>
          <div class="form-group">
            <label>EMPRESA</label>
            <div style="display:flex;gap:6px;align-items:center;">
              <select id="nu-empresa" style="flex:1;">${empOpts}</select>
              <button type="button" class="btn btn-secondary btn-sm" onclick="app.altaUsuarioNuevaEmp()" title="Nueva empresa">+</button>
            </div>
          </div>
          <div class="form-group full">
            <label>DEPENDENCIA</label>
            <div style="display:flex;gap:6px;align-items:center;">
              <select id="nu-dependencia" style="flex:1;">${depOpts}</select>
              <button type="button" class="btn btn-secondary btn-sm" onclick="app.altaUsuarioNuevaDep()" title="Nueva dependencia">+</button>
            </div>
          </div>
        </div>

        <!-- DATOS PROFESIONALES -->
        <div style="font-size:13px;font-weight:700;letter-spacing:.06em;color:var(--primary);margin-top:20px;margin-bottom:14px;padding-top:16px;border-top:1px solid var(--border-color);">DATOS PROFESIONALES</div>
        <div class="form-grid-2">
          <div class="form-group">
            <label>TÍTULO</label>
            <select id="nu-titulo">
              <option value="Ing.">Ing.</option>
              <option value="Lic.">Lic.</option>
              <option value="Arq.">Arq.</option>
              <option value="Mtro.">Mtro.</option>
              <option value="Dr.">Dr.</option>
            </select>
          </div>
          <div class="form-group">
            <label>ESPECIALIDAD</label>
            <input type="text" id="nu-especialidad" placeholder="Ej. Civil, Eléctrica">
          </div>
          <div class="form-group">
            <label>CÉDULA PROF.</label>
            <input type="text" id="nu-cedula" placeholder="Núm. de cédula" maxlength="8">
          </div>
          <div class="form-group">
            <label>TELÉFONO</label>
            <input type="tel" id="nu-telefono" placeholder="55 0000 0000" maxlength="10">
          </div>
          <div class="form-group full">
            <label>NSS</label>
            <input type="text" id="nu-nss" placeholder="Número de Seguridad Social" maxlength="11">
          </div>
          <div class="form-group full">
            <label>NOTAS / OBSERVACIONES</label>
            <textarea id="nu-notas" rows="2" placeholder="Información adicional relevante sobre el participante..."></textarea>
          </div>
        </div>

        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:24px;">
          <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
          <button class="btn btn-primary" id="nu-submit-btn" onclick="app.submitNuevoUsuario()">
            <span class="material-icons-round" style="font-size:16px;">person_add</span>
            Crear Usuario
          </button>
        </div>
      `;

      // Listener foto
      document.getElementById('nu-foto-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const preview = document.getElementById('nu-foto-preview');
          preview.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
          preview.dataset.fotoDataUrl = ev.target.result;
        };
        reader.readAsDataURL(file);
      });

      // Asegurar que campos numéricos solo acepten dígitos
      ['nu-telefono', 'nu-nss', 'nu-cedula'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
          input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
          });
        }
      });


      modalContainer.style.display = 'flex';
    },

    // Funciones para registrar nueva empresa o dependencia desde el modal de usuario
    altaUsuarioNuevaEmp() {
      this.openNuevaEmpresaModal(async (emp) => {
        const lista = await this.loadEmpresasOpts();
        const sel = document.getElementById('nu-empresa');
        if (!sel) return;
        sel.innerHTML = '<option value="">Sin empresa</option>' +
          lista.map(e => `<option value="${e.id}" ${e.id === emp.id ? 'selected' : ''}>${escapeHtml(e.nombre_comercial)}</option>`).join('');
      });
    },

    altaUsuarioNuevaDep() {
      this.openNuevaDependenciaModal(async (dep) => {
        const lista = await this.loadDependenciasOpts();
        const sel = document.getElementById('nu-dependencia');
        if (!sel) return;
        sel.innerHTML = '<option value="">Sin dependencia</option>' +
          lista.map(d => `<option value="${d.id}" ${d.id === dep.id ? 'selected' : ''}>${escapeHtml(d.nombre)}</option>`).join('');
      });
    },

    // Procesar envío del formulario de nuevo usuario
    async submitNuevoUsuario() {
      const btn = document.getElementById('nu-submit-btn');
      if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

      const payload = {
        nombre:        document.getElementById('nu-nombre')?.value?.trim() || '',
        email:         document.getElementById('nu-email')?.value?.trim() || '',
        password:      document.getElementById('nu-password')?.value || '',
        rol:           document.getElementById('nu-rol')?.value || 'residente',
        empresa_id:    document.getElementById('nu-empresa')?.value || null,
        dependencia_id:document.getElementById('nu-dependencia')?.value || null,
        titulo:        document.getElementById('nu-titulo')?.value || 'Ing.',
        especialidad:  document.getElementById('nu-especialidad')?.value?.trim() || '',
        cedula:        document.getElementById('nu-cedula')?.value?.trim() || '',
        telefono:      document.getElementById('nu-telefono')?.value?.trim() || '',
        nss:           document.getElementById('nu-nss')?.value?.trim() || '',
        notas:         document.getElementById('nu-notas')?.value?.trim() || ''
      };

      if (!payload.nombre || !payload.email || !payload.password) {
        this.showToast('Nombre, correo y contraseña son obligatorios', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons-round" style="font-size:16px;">person_add</span> Crear Usuario'; }
        return;
      }

      // Validar formato del correo
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(payload.email)) {
        this.showToast('El correo electrónico no tiene un formato válido', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons-round" style="font-size:16px;">person_add</span> Crear Usuario'; }
        return;
      }

      if (payload.password.length < 8) {
        this.showToast('La contraseña debe tener al menos 8 caracteres', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons-round" style="font-size:16px;">person_add</span> Crear Usuario'; }
        return;
      }

      if (payload.telefono && !/^\d{10}$/.test(payload.telefono)) {
        this.showToast('El teléfono debe tener exactamente 10 dígitos numéricos', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons-round" style="font-size:16px;">person_add</span> Crear Usuario'; }
        return;
      }

      if (payload.cedula && !/^\d{7,8}$/.test(payload.cedula)) {
        this.showToast('La cédula profesional debe tener entre 7 y 8 dígitos numéricos', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons-round" style="font-size:16px;">person_add</span> Crear Usuario'; }
        return;
      }

      if (payload.nss && !/^\d{11}$/.test(payload.nss)) {
        this.showToast('El NSS debe tener exactamente 11 dígitos numéricos', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons-round" style="font-size:16px;">person_add</span> Crear Usuario'; }
        return;
      }


      try {
        const res = await fetch('/api/admin/usuarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        this.closeModal();
        this.showToast(`Usuario "${data.user.nombre}" creado correctamente`, 'success');
        await this.renderAdminApprovals();
      } catch (e) {
        this.showToast(e.message, 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons-round" style="font-size:16px;">person_add</span> Crear Usuario'; }
      }
    },

    // ─── APROBAR / RECHAZAR SOLICITUDES ─────────────────────────────────────────
    async resolveUserApproval(userId, approve) {
      const roleOverride = document.getElementById(`role-override-${userId}`)?.value;
      try {
        await this.api('/api/admin/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, approve, role: roleOverride })
        });
        this.showToast(approve ? 'Usuario aprobado' : 'Usuario rechazado', 'success');
        await this.renderAdminApprovals();
      } catch (e) {
        this.showToast('Error al procesar la solicitud', 'error');
      }
    },

    async openEditUsuarioModal(userId) {
      try {
        const [usuarios, empresas, dependencias] = await Promise.all([
          this.api('/api/admin/usuarios'),
          this.loadEmpresasOpts(),
          this.loadDependenciasOpts()
        ]);
        const user = usuarios.find(u => u.id === userId);
        if (!user) {
          this.showToast('Usuario no encontrado', 'error');
          return;
        }

        const empOpts = '<option value="">Sin empresa</option>' +
          empresas.map(e => `<option value="${e.id}" ${e.id === user.empresa_id ? 'selected' : ''}>${escapeHtml(e.nombre_comercial)}</option>`).join('');
        const depOpts = '<option value="">Sin dependencia</option>' +
          dependencias.map(d => `<option value="${d.id}" ${d.id === user.dependencia_id ? 'selected' : ''}>${escapeHtml(d.nombre)}</option>`).join('');

        const modalContainer = document.getElementById('modal-container');
        const modalContent = document.getElementById('modal-content-outlet');

        modalContent.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <h2 style="font-size:20px;color:#0f172a;margin:0;">Editar Usuario</h2>
            <button onclick="app.closeModal()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);">
              <span class="material-icons-round">close</span>
            </button>
          </div>

          <div style="display:flex;flex-direction:column;align-items:center;margin-bottom:24px;">
            <div id="eu-foto-preview" style="width:80px;height:80px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer;border:3px solid #e2e8f0;transition:border-color .2s;"
                 onclick="document.getElementById('eu-foto-input').click()"
                 onmouseenter="this.style.borderColor='var(--primary)'"
                 onmouseleave="this.style.borderColor='#e2e8f0'">
              ${user.foto_url
                ? `<img src="${escapeHtml(user.foto_url)}" style="width:100%;height:100%;object-fit:cover;">`
                : `<span class="material-icons-round" style="font-size:40px;color:#94a3b8;">person</span>`}
            </div>
            <input type="file" id="eu-foto-input" accept="image/*" style="display:none;">
            <button type="button" onclick="document.getElementById('eu-foto-input').click()"
                    style="background:none;border:none;color:var(--primary);font-size:13px;cursor:pointer;margin-top:8px;font-weight:600;">
              Cambiar foto
            </button>
          </div>

          <div style="font-size:13px;font-weight:700;letter-spacing:.06em;color:var(--primary);margin-bottom:14px;">DATOS DE ACCESO</div>
          <div class="form-grid-2">
            <div class="form-group full">
              <label>NOMBRE COMPLETO <span style="color:var(--accent-red);">*</span></label>
              <input type="text" id="eu-nombre" value="${escapeHtml(user.nombre)}" autocomplete="off">
            </div>
            <div class="form-group full">
              <label>CORREO ELECTRONICO <span style="color:var(--accent-red);">*</span></label>
              <input type="email" id="eu-email" value="${escapeHtml(user.email)}" autocomplete="off">
            </div>
            <div class="form-group full">
              <label>NUEVA CONTRASENA</label>
              <input type="password" id="eu-password" placeholder="Dejar vacio para conservar la actual">
            </div>
            <div class="form-group">
              <label>ROL <span style="color:var(--accent-red);">*</span></label>
              <select id="eu-rol">
                ${Object.entries(ROL_LABELS).map(([value, label]) => `<option value="${value}" ${user.rol === value ? 'selected' : ''}>${label}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>ESTADO</label>
              <select id="eu-estado">
                <option value="aprobado" ${user.estado === 'aprobado' ? 'selected' : ''}>Activo</option>
                <option value="pendiente" ${user.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                <option value="rechazado" ${user.estado === 'rechazado' ? 'selected' : ''}>Rechazado</option>
              </select>
            </div>
            <div class="form-group">
              <label>EMPRESA</label>
              <select id="eu-empresa">${empOpts}</select>
            </div>
            <div class="form-group full">
              <label>DEPENDENCIA</label>
              <select id="eu-dependencia">${depOpts}</select>
            </div>
          </div>

          <div style="font-size:13px;font-weight:700;letter-spacing:.06em;color:var(--primary);margin-top:20px;margin-bottom:14px;padding-top:16px;border-top:1px solid var(--border-color);">DATOS PROFESIONALES</div>
          <div class="form-grid-2">
            <div class="form-group">
              <label>TITULO</label>
              <select id="eu-titulo">
                ${['Ing.', 'Lic.', 'Arq.', 'Mtro.', 'Dr.'].map(t => `<option value="${t}" ${user.titulo === t ? 'selected' : ''}>${t}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>ESPECIALIDAD</label>
              <input type="text" id="eu-especialidad" value="${escapeHtml(user.especialidad || '')}">
            </div>
            <div class="form-group">
              <label>CEDULA PROF.</label>
              <input type="text" id="eu-cedula" value="${escapeHtml(user.cedula || '')}" maxlength="8">
            </div>
            <div class="form-group">
              <label>TELEFONO</label>
              <input type="tel" id="eu-telefono" value="${escapeHtml(user.telefono || '')}" maxlength="10">
            </div>
            <div class="form-group full">
              <label>NSS</label>
              <input type="text" id="eu-nss" value="${escapeHtml(user.nss || '')}" maxlength="11">
            </div>
            <div class="form-group full">
              <label>NOTAS / OBSERVACIONES</label>
              <textarea id="eu-notas" rows="2">${escapeHtml(user.notas || '')}</textarea>
            </div>
          </div>

          <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:24px;">
            <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
            <button class="btn btn-primary" id="eu-submit-btn" onclick="app.submitEditUsuario('${user.id}')">
              <span class="material-icons-round" style="font-size:16px;">save</span>
              Guardar Cambios
            </button>
          </div>
        `;

        const preview = document.getElementById('eu-foto-preview');
        if (user.foto_url) preview.dataset.fotoDataUrl = user.foto_url;
        document.getElementById('eu-foto-input').addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            preview.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
            preview.dataset.fotoDataUrl = ev.target.result;
          };
          reader.readAsDataURL(file);
        });

        ['eu-telefono', 'eu-nss', 'eu-cedula'].forEach(id => {
          const input = document.getElementById(id);
          if (input) {
            input.addEventListener('input', (e) => {
              e.target.value = e.target.value.replace(/\D/g, '');
            });
          }
        });

        modalContainer.style.display = 'flex';
      } catch (e) {
        this.showToast('No se pudo cargar el usuario', 'error');
      }
    },

    async submitEditUsuario(userId) {
      const btn = document.getElementById('eu-submit-btn');
      if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }
      const resetBtn = () => {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<span class="material-icons-round" style="font-size:16px;">save</span> Guardar Cambios';
        }
      };

      const password = document.getElementById('eu-password')?.value || '';
      const payload = {
        nombre: document.getElementById('eu-nombre')?.value?.trim() || '',
        email: document.getElementById('eu-email')?.value?.trim() || '',
        rol: document.getElementById('eu-rol')?.value || 'residente',
        estado: document.getElementById('eu-estado')?.value || 'aprobado',
        empresa_id: document.getElementById('eu-empresa')?.value || null,
        dependencia_id: document.getElementById('eu-dependencia')?.value || null,
        titulo: document.getElementById('eu-titulo')?.value || '',
        especialidad: document.getElementById('eu-especialidad')?.value?.trim() || '',
        cedula: document.getElementById('eu-cedula')?.value?.trim() || '',
        telefono: document.getElementById('eu-telefono')?.value?.trim() || '',
        nss: document.getElementById('eu-nss')?.value?.trim() || '',
        notas: document.getElementById('eu-notas')?.value?.trim() || '',
        foto_url: document.getElementById('eu-foto-preview')?.dataset?.fotoDataUrl || null
      };
      if (password) payload.password = password;

      if (!payload.nombre || !payload.email) {
        this.showToast('Nombre y correo son obligatorios', 'error');
        resetBtn();
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(payload.email)) {
        this.showToast('El correo electronico no tiene un formato valido', 'error');
        resetBtn();
        return;
      }

      if (password && password.length < 8) {
        this.showToast('La contrasena debe tener al menos 8 caracteres', 'error');
        resetBtn();
        return;
      }

      if (payload.telefono && !/^\d{10}$/.test(payload.telefono)) {
        this.showToast('El telefono debe tener exactamente 10 digitos numericos', 'error');
        resetBtn();
        return;
      }

      if (payload.cedula && !/^\d{7,8}$/.test(payload.cedula)) {
        this.showToast('La cedula profesional debe tener entre 7 y 8 digitos numericos', 'error');
        resetBtn();
        return;
      }

      if (payload.nss && !/^\d{11}$/.test(payload.nss)) {
        this.showToast('El NSS debe tener exactamente 11 digitos numericos', 'error');
        resetBtn();
        return;
      }

      try {
        const res = await fetch(`/api/admin/usuarios/${encodeURIComponent(userId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        this.closeModal();
        this.showToast(`Usuario "${data.user.nombre}" actualizado correctamente`, 'success');
        await this.renderAdminApprovals();
      } catch (e) {
        this.showToast(e.message, 'error');
        resetBtn();
      }
    }
  };
})();
