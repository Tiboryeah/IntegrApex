(function () {
  window.IntegrApexModules = window.IntegrApexModules || {};

  window.IntegrApexModules.contratos = {
    // ==========================================
    // Pantalla de alta de contratos (HU-01).
    // ==========================================
    // ALTA DE CONTRATO (HU-01): Renderiza el formulario de registro de un contrato de obra pública en sus diferentes bloques.
    async renderAltaContrato() {
      const outlet = document.getElementById('app-router-outlet');

      try {
        const [users, dependencias, empresas] = await Promise.all([
          this.api('/api/users'),
          this.loadDependenciasOpts(),
          this.loadEmpresasOpts()
        ]);

        this._altaContratoUsers = users;

        const depOpts = '<option value="">Selecciona una dependencia...</option>' +
          dependencias.map(d => `<option value="${d.id}">${escapeHtml(d.nombre)}${d.siglas ? ' — ' + escapeHtml(d.siglas) : ''}</option>`).join('');
        const empOpts = '<option value="">Selecciona una empresa...</option>' +
          empresas.map(e => `<option value="${e.id}">${escapeHtml(e.nombre_comercial)}${e.razon_social ? ' — ' + escapeHtml(e.razon_social.toUpperCase()) : ''}</option>`).join('');

        outlet.innerHTML = `
          <div class="main-container" style="max-width: 1140px;">
            <div class="contract-page-header">
              <div>
                <div class="eyebrow">HU-01 · Alta de Contrato</div>
                <h1>Nuevo Contrato</h1>
                <p class="contract-page-sub">Registra el expediente completo del contrato de obra pública: identificación, equipo, catálogo, programa, elementos jurídicos, garantías y amortización.</p>
              </div>
              <button class="btn btn-secondary" onclick="app.navigate('inicio')">
                Cancelar
              </button>
            </div>
            <form id="alta-contrato-form">

              <div class="contract-section">
                <div class="contract-section-header">
                  <div class="contract-step-badge"><span class="material-icons-round">badge</span></div>
                  <div class="contract-section-heading">
                    <div class="heading-text">
                      <h2>1. Identificación</h2>
                      <p>Folio, nombre, ubicación y las partes contratantes de la obra.</p>
                    </div>
                  </div>
                </div>
                <div class="dashboard-grid">
                  <div class="col-6 form-group">
                    <label>FOLIO <span style="color:var(--accent-red);">*</span></label>
                    <input type="text" id="c-folio" placeholder="Ej. CONT-2024-001" required>
                  </div>
                  <div class="col-6 form-group">
                    <label>NOMBRE DE LA OBRA <span style="color:var(--accent-red);">*</span></label>
                    <input type="text" id="c-objeto" placeholder="Descripción breve de la obra" required>
                  </div>
                  <div class="col-12 form-group">
                    <label>UBICACIÓN DE LA OBRA <span style="color:var(--accent-red);">*</span></label>
                    <input type="text" id="c-ubicacion" placeholder="Domicilio, colonia, municipio/alcaldía y estado donde se ejecutará la obra" required>
                  </div>
                  <div class="col-12 form-group">
                    <label>DEPENDENCIA CONTRATANTE <span style="color:var(--accent-red);">*</span></label>
                    <div style="display:flex; gap:8px; align-items:center;">
                      <select id="c-dependencia" style="flex:1;">${depOpts}</select>
                      <button type="button" class="btn btn-secondary btn-sm" onclick="app.altaContratNuevaDep()">
                        + Nuevo
                      </button>
                    </div>
                  </div>
                  <div class="col-12 form-group" style="margin-bottom:0;">
                    <label>EMPRESA CONTRATISTA <span style="color:var(--accent-red);">*</span></label>
                    <div style="display:flex; gap:8px; align-items:center;">
                      <select id="c-empresa" style="flex:1;">${empOpts}</select>
                      <button type="button" class="btn btn-secondary btn-sm" onclick="app.altaContratNuevaEmp()">
                        + Nuevo
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="contract-section">
                <div class="contract-section-header">
                  <div class="contract-step-badge"><span class="material-icons-round">payments</span></div>
                  <div class="contract-section-heading">
                    <div class="heading-text">
                      <h2>2. Objeto del Contrato</h2>
                      <p>Monto, modalidad de pago, plazo y anticipo.</p>
                    </div>
                  </div>
                </div>
                <div class="dashboard-grid">
                  <div class="col-6 form-group">
                    <label>Monto Total Sin IVA (Subtotal) <span style="font-size:11px; color:var(--text-muted); font-weight:normal;">(Se calcula sumando el catálogo)</span></label>
                    <input type="text" id="c-monto" value="120,000.00" readonly style="background:#f1f5f9; cursor:not-allowed; font-weight:700; color:#334155;">
                  </div>
                  <div class="col-6 form-group">
                    <label>Modalidad de Pago</label>
                    <select id="c-modalidad">
                      <option value="Precios Unitarios">Precios Unitarios</option>
                      <option value="Precio Alzado">Precio Alzado</option>
                      <option value="Mixto">Mixto</option>
                    </select>
                  </div>
                  <div class="col-4 form-group">
                    <label>Plazo (Dias Naturales)</label>
                    <input type="number" id="c-plazo" placeholder="120" required>
                  </div>
                  <div class="col-4 form-group">
                    <label>Fecha de Inicio</label>
                    <input type="date" id="c-inicio" required>
                  </div>
                  <div class="col-4 form-group" style="margin-bottom:0;">
                    <label>Anticipo (%)</label>
                    <input type="number" id="c-anticipo" value="30" min="0" max="100" step="0.01" required onchange="app.refreshAltaDerivedValues()">
                  </div>
                </div>
              </div>

              <div class="contract-section">
                <div class="contract-section-header">
                  <div class="contract-step-badge"><span class="material-icons-round">groups</span></div>
                  <div class="contract-section-heading">
                    <div class="heading-text">
                      <h2>3. Equipo de Contrato</h2>
                      <p>Asigna cualquier rol (Residente, Contratista, Supervisión, Dependencia o Finanzas). Se requiere al menos un Residente y un Contratista.</p>
                    </div>
                    <button type="button" class="btn btn-primary btn-sm" onclick="app.openNuevoUsuarioEquipoModal()">
                      <span class="material-icons-round" style="font-size:14px;">person_add</span> Nuevo Usuario
                    </button>
                  </div>
                </div>
                <div class="table-container" style="margin-bottom:12px;">
                  <table id="equipo-table">
                    <colgroup>
                      <col style="width:26%;">
                      <col style="width:62%;">
                      <col style="width:12%;">
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Rol</th>
                        <th>Persona</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody id="equipo-table-body"></tbody>
                  </table>
                </div>
                <button type="button" class="btn btn-secondary btn-sm" onclick="app.addEquipoRow()">
                  <span class="material-icons-round" style="font-size:14px;">add</span> Agregar integrante
                </button>
              </div>

              <div class="contract-section">
                <div class="contract-section-header">
                  <div class="contract-step-badge"><span class="material-icons-round">list_alt</span></div>
                  <div class="contract-section-heading">
                    <div class="heading-text">
                      <h2>4. Catálogo de Conceptos</h2>
                      <p>Partida, clave, descripción, unidad, cantidad y precio unitario de cada concepto contratado.</p>
                    </div>
                  </div>
                </div>
                <div class="table-container" style="overflow-x:auto; margin-bottom:16px;">
                  <table id="catalogo-table" style="table-layout:fixed;">
                    <colgroup>
                      <col style="width:90px;">
                      <col style="width:130px;">
                      <col style="width:auto; min-width:220px;">
                      <col style="width:80px;">
                      <col style="width:100px;">
                      <col style="width:120px;">
                      <col style="width:130px;">
                      <col style="width:50px;">
                    </colgroup>
                    <thead>
                      <tr>
                        <th>PARTIDA</th>
                        <th>CLAVE</th>
                        <th>DESCRIPCIÓN</th>
                        <th>UNIDAD</th>
                        <th>CANTIDAD</th>
                        <th>P. UNITARIO</th>
                        <th style="text-align:right;">IMPORTE</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><input type="text" class="cat-partida" value="AD.01" placeholder="AD.01" pattern="[A-Za-z0-9_.\\-]{0,20}" title="Ej. AD.01 (opcional)" style="width:100%; padding:8px; box-sizing:border-box;"></td>
                        <td><input type="text" class="cat-clave" value="CON-01" required pattern="[A-Za-z0-9_\\-]{2,20}" title="2 a 20 caracteres: letras, números, guion o guion bajo" style="width:100%; padding:8px; box-sizing:border-box;"></td>
                        <td><input type="text" class="cat-desc" value="Excavacion en zanja" required minlength="5" pattern=".*[A-Za-zÀ-ÿ]{3,}.*" title="Mínimo 5 caracteres, con una descripción real del concepto" style="width:100%; padding:8px; box-sizing:border-box;"></td>
                        <td><input type="text" class="cat-unidad" value="m3" required pattern="[A-Za-zÀ-ÿ0-9%\\/.]{1,10}" title="1 a 10 caracteres (ej. m2, m3, kg, pza)" style="width:100%; padding:8px; box-sizing:border-box;"></td>
                        <td><input type="number" class="cat-cantidad" value="1000" required min="0.0001" step="any" title="Debe ser mayor a cero" style="width:100%; padding:8px; box-sizing:border-box;" oninput="app.recalcCatImportes()"></td>
                        <td><input type="number" class="cat-precio" value="120" required min="0.01" step="0.01" title="Debe ser mayor a cero" style="width:100%; padding:8px; box-sizing:border-box;" oninput="app.recalcCatImportes()"></td>
                        <td class="cat-importe" style="text-align:right; font-weight:600; white-space:nowrap; padding-right:8px;">$120,000.00</td>
                        <td style="text-align:center;">
                          <button type="button" class="btn btn-secondary btn-sm" onclick="app.removeConceptRow(this)" title="Eliminar concepto">
                            <span class="material-icons-round" style="font-size:14px;">delete</span>
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <button type="button" class="btn btn-secondary btn-sm" onclick="app.addConceptRow()">
                  <span class="material-icons-round" style="font-size: 14px;">add</span> Agregar Concepto
                </button>
              </div>

              <div class="contract-section">
                <div class="contract-section-header">
                  <div class="contract-step-badge"><span class="material-icons-round">calendar_view_month</span></div>
                  <div class="contract-section-heading">
                    <div class="heading-text">
                      <h2>5. Programa de Obra Mes a Mes</h2>
                      <p>Capture la cantidad programada por concepto y periodo. La suma por concepto no debe exceder la cantidad contratada.</p>
                    </div>
                  </div>
                </div>
                <div id="programa-captura-wrapper" class="table-container">
                  <div style="padding:18px; color:var(--text-muted);">Capture catalogo y plazo para generar el programa.</div>
                </div>
              </div>

              <div class="contract-section">
                <div class="contract-section-header">
                  <div class="contract-step-badge"><span class="material-icons-round">gavel</span></div>
                  <div class="contract-section-heading">
                    <div class="heading-text">
                      <h2>6. Elementos Jurídicos</h2>
                      <p>Documentación legal que respalda a cada una de las partes.</p>
                    </div>
                  </div>
                </div>
                <div class="dashboard-grid">
                  <div class="col-6 form-group">
                    <label>Elementos de la Dependencia</label>
                    <textarea id="c-jur-dep" rows="3" placeholder="Oficio de adjudicacion, suficiencia presupuestal, autorizaciones..." required></textarea>
                    <div style="margin-top: 8px;">
                      <label style="font-size:11px; color:var(--text-muted); font-weight:600; display:block; margin-bottom:4px;">ADJUNTAR DOCUMENTO (OPCIONAL)</label>
                      <input type="file" id="c-jur-dep-file" accept=".pdf,.zip,.doc,.docx" style="display:none;" onchange="document.getElementById('c-jur-dep-file-lbl').textContent = this.files[0]?.name || 'Adjuntar archivo'">
                      <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('c-jur-dep-file').click()" style="display:inline-flex; align-items:center; gap:4px; padding:6px 12px; font-size:12px;">
                        <span class="material-icons-round" style="font-size:14px;">attach_file</span>
                        <span id="c-jur-dep-file-lbl">Adjuntar archivo</span>
                      </button>
                    </div>
                  </div>
                  <div class="col-6 form-group">
                    <label>Elementos del Contratista</label>
                    <textarea id="c-jur-cont" rows="3" placeholder="Acta constitutiva, representante legal, documentacion fiscal..." required></textarea>
                    <div style="margin-top: 8px;">
                      <label style="font-size:11px; color:var(--text-muted); font-weight:600; display:block; margin-bottom:4px;">ADJUNTAR DOCUMENTO (OPCIONAL)</label>
                      <input type="file" id="c-jur-cont-file" accept=".pdf,.zip,.doc,.docx" style="display:none;" onchange="document.getElementById('c-jur-cont-file-lbl').textContent = this.files[0]?.name || 'Adjuntar archivo'">
                      <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('c-jur-cont-file').click()" style="display:inline-flex; align-items:center; gap:4px; padding:6px 12px; font-size:12px;">
                        <span class="material-icons-round" style="font-size:14px;">attach_file</span>
                        <span id="c-jur-cont-file-lbl">Adjuntar archivo</span>
                      </button>
                    </div>
                  </div>
                  <div class="col-12 form-group" style="margin-bottom:0;">
                    <label>Fundamento Legal</label>
                    <input type="text" id="c-jur-fundamento" value="LOPSRM / RLOPSRM" required>
                  </div>
                </div>
              </div>

              <div class="contract-section">
                <div class="contract-section-header">
                  <div class="contract-step-badge"><span class="material-icons-round">verified_user</span></div>
                  <div class="contract-section-heading">
                    <div class="heading-text">
                      <h2>7. Garantías Iniciales</h2>
                      <p>Anticipo, cumplimiento y vicios ocultos.</p>
                    </div>
                  </div>
                </div>
                <div class="table-container">
                  <table id="garantias-table">
                    <thead>
                      <tr>
                        <th>Tipo</th>
                        <th>Afianzadora</th>
                        <th>Vigencia</th>
                        <th>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr data-tipo="anticipo">
                        <td><strong>Anticipo</strong></td>
                        <td><input type="text" class="gar-afianzadora" placeholder="Afianzadora" required style="padding:8px;"></td>
                        <td><input type="date" class="gar-vigencia" required style="padding:8px;"></td>
                        <td><input type="text" class="gar-monto" id="gar-anticipo" required style="padding:8px;" oninput="app.handleGarMontoInput(this)"></td>
                      </tr>
                      <tr data-tipo="cumplimiento">
                        <td><strong>Cumplimiento</strong></td>
                        <td><input type="text" class="gar-afianzadora" placeholder="Afianzadora" required style="padding:8px;"></td>
                        <td><input type="date" class="gar-vigencia" required style="padding:8px;"></td>
                        <td><input type="text" class="gar-monto" id="gar-cumplimiento" required style="padding:8px;" oninput="app.handleGarMontoInput(this)"></td>
                      </tr>
                      <tr data-tipo="vicios_ocultos">
                        <td><strong>Vicios ocultos</strong></td>
                        <td><input type="text" class="gar-afianzadora" placeholder="Afianzadora" required style="padding:8px;"></td>
                        <td><input type="date" class="gar-vigencia" required style="padding:8px;"></td>
                        <td><input type="text" class="gar-monto" id="gar-vicios" required style="padding:8px;" oninput="app.handleGarMontoInput(this)"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="contract-section">
                <div class="contract-section-header">
                  <div class="contract-step-badge"><span class="material-icons-round">calculate</span></div>
                  <div class="contract-section-heading">
                    <div class="heading-text">
                      <h2>8. Amortización y Penalizaciones</h2>
                      <p>Plan de amortización calculado y porcentajes de retención/penas.</p>
                    </div>
                  </div>
                </div>
                <div class="dashboard-grid">
                  <div class="col-6 form-group">
                    <label>Plan de amortizacion calculado</label>
                    <div id="amortizacion-preview" class="readonly-summary">Capture monto, anticipo y plazo para calcular el plan.</div>
                  </div>
                  <div class="col-3 form-group">
                    <label>Retencion 5 al millar (%)</label>
                    <input type="number" id="c-retencion" value="0.5" step="0.01" required>
                  </div>
                  <div class="col-3 form-group">
                    <label>Pena convencional diaria (%)</label>
                    <input type="number" id="c-pena-diaria" value="0.2" step="0.01" required>
                  </div>
                  <div class="col-12" style="margin-bottom:0;">
                    <div class="readonly-summary">
                      Umbral informativo de anticipo: si el anticipo rebasa el 30%, documente justificacion y autorizacion conforme al Art. 50 fr. IV LOPSRM y Art. 139 RLOPSRM.
                    </div>
                  </div>
                </div>
              </div>

              <div class="contract-section">
                <div class="contract-section-header">
                  <div class="contract-step-badge"><span class="material-icons-round">picture_as_pdf</span></div>
                  <div class="contract-section-heading">
                    <div class="heading-text">
                      <h2>9. Documento del Contrato</h2>
                      <p>Adjunta el PDF firmado si ya está disponible.</p>
                    </div>
                    <span class="optional-tag">Opcional</span>
                  </div>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <div id="pdf-wrapper" style="
                    display: flex; align-items: center; gap: 16px;
                    border: 2px dashed #cbd5e1; border-radius: 12px;
                    padding: 20px 24px; cursor: pointer;
                    background: #f8fafc; transition: border-color .2s, background .2s;
                  " onmouseenter="this.style.borderColor='var(--primary)';this.style.background='#eff6ff';"
                     onmouseleave="this.style.borderColor='#cbd5e1';this.style.background='#f8fafc';">
                    <span class="material-icons-round" style="font-size:32px; color:#94a3b8;">attach_file</span>
                    <div>
                      <div id="pdf-label-main" style="font-size:14px; font-weight:600; color:#374151;">Seleccionar archivo PDF</div>
                      <div id="pdf-label-sub" style="font-size:12px; color:var(--text-muted); margin-top:2px;">Haz clic para adjuntar el contrato firmado</div>
                    </div>
                    <input type="file" id="c-pdf" accept=".pdf" style="display: none;">
                  </div>
                </div>
              </div>

              <div class="contract-submit-bar">
                <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                  <span style="font-size:12px; font-weight:700; letter-spacing:.05em; color:#374151;">ESTATUS INICIAL:</span>
                  <span style="
                    background: #dcfce7; color: #16a34a;
                    border: 1px solid #86efac;
                    border-radius: 999px; padding: 3px 14px;
                    font-size: 13px; font-weight: 700;
                    display:inline-flex; align-items:center; gap:5px;
                  ">
                    <span class="material-icons-round" style="font-size:14px;">check_circle</span>
                    Vigente
                  </span>
                  <span style="font-size:12px; color:var(--text-muted);">(se asigna automáticamente)</span>
                </div>
                <button type="submit" class="btn btn-primary" style="padding: 12px 32px; font-size:15px; font-weight:700;">
                  <span class="material-icons-round" style="font-size:16px;">save</span>
                  Registrar Contrato
                </button>
              </div>
            </form>
          </div>
        `;

        const equipoBody = document.getElementById('equipo-table-body');
        if (equipoBody) {
          equipoBody.innerHTML = this.buildEquipoRowHtml('residente') + this.buildEquipoRowHtml('contratista');
        }

        const wrapper = document.getElementById('pdf-wrapper');
        const fileInput = document.getElementById('c-pdf');

        wrapper.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
          if (fileInput.files.length > 0) {
            const name = fileInput.files[0].name;
            document.getElementById('pdf-label-main').textContent = name;
            document.getElementById('pdf-label-main').style.color = 'var(--accent-green)';
            document.getElementById('pdf-label-sub').textContent = 'PDF seleccionado · haz clic para cambiar';
            wrapper.style.borderColor = 'var(--accent-green)';
          }
        });

        document.getElementById('alta-contrato-form').addEventListener('submit', (e) => {
          e.preventDefault();
          app.submitAltaContrato();
        });

        ['c-monto', 'c-anticipo', 'c-plazo'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.addEventListener('input', () => app.refreshAltaDerivedValues());
        });
        // Formatear inicialmente si tiene valores
        const montoEl = document.getElementById('c-monto');
        if (montoEl && montoEl.value) {
          montoEl.value = app.formatNumberWithCommas(montoEl.value);
        }
        this.refreshAltaDerivedValues();
      } catch (e) {}
    },

    // CALCULAR VALORES DERIVADOS: Recalcula automáticamente montos de garantías sugeridas y el plan de amortización mensual.
    refreshAltaDerivedValues() {
      const rawMonto = document.getElementById('c-monto')?.value || '';
      const monto = parseFloat(rawMonto.replace(/,/g, '') || 0);
      const anticipo = parseFloat(document.getElementById('c-anticipo')?.value || 30);
      const plazo = parseInt(document.getElementById('c-plazo')?.value || 0, 10);
      const anticipoMonto = monto * (anticipo / 100);
      const cumplimientoMonto = monto * 0.1;
      const meses = Math.max(1, Math.ceil((plazo || 30) / 30));

      const garAnticipo = document.getElementById('gar-anticipo');
      const garCumplimiento = document.getElementById('gar-cumplimiento');
      const garVicios = document.getElementById('gar-vicios');
      if (garAnticipo && !garAnticipo.dataset.touched) garAnticipo.value = anticipoMonto ? app.formatNumberWithCommas(anticipoMonto.toFixed(2)) : '';
      if (garCumplimiento && !garCumplimiento.dataset.touched) garCumplimiento.value = cumplimientoMonto ? app.formatNumberWithCommas(cumplimientoMonto.toFixed(2)) : '';
      if (garVicios && !garVicios.dataset.touched) garVicios.value = cumplimientoMonto ? app.formatNumberWithCommas(cumplimientoMonto.toFixed(2)) : '';

      document.querySelectorAll('.gar-monto').forEach(input => {
        input.addEventListener('input', () => { input.dataset.touched = 'true'; }, { once: true });
      });

      const preview = document.getElementById('amortizacion-preview');
      if (preview) {
        const mensual = meses ? anticipoMonto / meses : 0;
        preview.innerHTML = `
          <strong>${meses}</strong> periodo(s) mensuales.
          Anticipo estimado: <strong>$${anticipoMonto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>.
          Amortizacion por periodo: <strong>$${mensual.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>.
        `;
      }
      this.renderProgramaCaptura();
    },

    // OBTENER CONCEPTOS ACTUALES: Obtiene las filas del catálogo del formulario como objetos del frontend.
    getCatalogoDraft() {
      const catalogo = [];
      document.querySelectorAll('#catalogo-table tbody tr').forEach(r => {
        const clave = r.querySelector('.cat-clave')?.value || '';
        const partida = r.querySelector('.cat-partida')?.value?.trim() || '';
        const descripcion = r.querySelector('.cat-desc')?.value || '';
        const unidad = r.querySelector('.cat-unidad')?.value || '';
        const cantidad = parseFloat(r.querySelector('.cat-cantidad')?.value || 0);
        const precio_unitario = parseFloat(r.querySelector('.cat-precio')?.value || 0);
        if (clave) catalogo.push({ clave, partida, descripcion, unidad, cantidad, precio_unitario });
      });
      return catalogo;
    },

    // DIBUJAR CAPTURA DEL PROGRAMA: Renderiza la tabla Gantt para ingresar la cantidad mensual programada por concepto.
    renderProgramaCaptura() {
      const wrapper = document.getElementById('programa-captura-wrapper');
      if (!wrapper) return;
      const plazo = parseInt(document.getElementById('c-plazo')?.value || 0, 10);
      const months = Math.max(1, Math.ceil((plazo || 30) / 30));
      const catalogo = this.getCatalogoDraft().filter(c => c.cantidad > 0);
      if (catalogo.length === 0) {
        wrapper.innerHTML = `<div style="padding:18px; color:var(--text-muted);">Capture conceptos con cantidad para generar el programa.</div>`;
        return;
      }

      // Conserva lo ya capturado a mano si la tabla se vuelve a dibujar (p. ej. al editar el catálogo o el plazo).
      const valoresPrevios = {};
      document.querySelectorAll('#programa-table .prog-input').forEach(input => {
        valoresPrevios[`${input.dataset.clave}|${input.dataset.mes}`] = input.value;
      });

      const header = Array.from({ length: months }, (_, idx) => `<th>Mes ${idx + 1}</th>`).join('');
      const rows = catalogo.map(c => {
        const cells = Array.from({ length: months }, (_, idx) => {
          const mes = idx + 1;
          const valorPrevio = valoresPrevios[`${c.clave}|${mes}`];
          return `
            <td>
              <input type="number" class="prog-input" data-clave="${escapeHtml(c.clave)}" data-mes="${mes}" min="0" step="any" value="${valorPrevio !== undefined ? escapeHtml(valorPrevio) : '0'}" style="padding:6px;">
            </td>
          `;
        }).join('');
        return `
          <tr>
            <td><strong>${escapeHtml(c.clave)}</strong></td>
            <td>${c.cantidad.toLocaleString('es-MX')} ${escapeHtml(c.unidad)}</td>
            ${cells}
          </tr>
        `;
      }).join('');

      wrapper.innerHTML = `
        <table id="programa-table">
          <thead>
            <tr>
              <th>Concepto</th>
              <th>Cantidad contratada</th>
              ${header}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    },

    // RECOPILAR DATOS DEL PROGRAMA: Lee la tabla del cronograma y estructura el plan de avances mensuales para el servidor.
    collectProgramaCaptura(catalogo, months) {
      const programa = Array.from({ length: months }, (_, idx) => ({ mes: idx + 1, avances: {} }));
      const inputs = document.querySelectorAll('#programa-table .prog-input');
      if (inputs.length === 0) {
        catalogo.forEach(c => {
          for (let m = 1; m <= months; m++) {
            programa[m - 1].avances[c.clave] = 0;
          }
        });
        return programa;
      }

      inputs.forEach(input => {
        const mes = parseInt(input.dataset.mes, 10);
        const clave = input.dataset.clave;
        if (programa[mes - 1] && clave) {
          programa[mes - 1].avances[clave] = parseFloat(input.value || 0);
        }
      });
      return programa;
    },

    // AGREGAR FILA DE CONCEPTO: Inserta una fila vacía en la tabla del catálogo de conceptos.
    addConceptRow() {
      const tbody = document.querySelector('#catalogo-table tbody');
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><input type="text" class="cat-partida" placeholder="AD.01" pattern="[A-Za-z0-9_.\\-]{0,20}" title="Ej. AD.01 (opcional)" style="width:100%; padding:6px; box-sizing:border-box;"></td>
        <td><input type="text" class="cat-clave" placeholder="CON-0X" required pattern="[A-Za-z0-9_\\-]{2,20}" title="2 a 20 caracteres: letras, números, guion o guion bajo" style="width:100%; padding:6px; box-sizing:border-box;"></td>
        <td><input type="text" class="cat-desc" placeholder="Descripción del concepto" required minlength="5" pattern=".*[A-Za-zÀ-ÿ]{3,}.*" title="Mínimo 5 caracteres, con una descripción real del concepto" style="width:100%; padding:6px; box-sizing:border-box;"></td>
        <td><input type="text" class="cat-unidad" placeholder="m2" required pattern="[A-Za-zÀ-ÿ0-9%\\/.]{1,10}" title="1 a 10 caracteres (ej. m2, m3, kg, pza)" style="width:100%; padding:6px; box-sizing:border-box;"></td>
        <td><input type="number" class="cat-cantidad" placeholder="0" required min="0.0001" step="any" title="Debe ser mayor a cero" style="width:100%; padding:6px; box-sizing:border-box;" oninput="app.recalcCatImportes()"></td>
        <td><input type="number" class="cat-precio" placeholder="0" required min="0.01" step="0.01" title="Debe ser mayor a cero" style="width:100%; padding:6px; box-sizing:border-box;" oninput="app.recalcCatImportes()"></td>
        <td class="cat-importe" style="text-align:right; font-weight:600; white-space:nowrap; padding-right:8px;">$0.00</td>
        <td style="text-align:center;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="app.removeConceptRow(this)" title="Eliminar concepto">
            <span class="material-icons-round" style="font-size:14px;">delete</span>
          </button>
        </td>
      `;
      tbody.appendChild(row);
      this.renderProgramaCaptura();
    },

    // ELIMINAR FILA DE CONCEPTO: Quita el concepto de la tabla, exige que quede al menos uno.
    removeConceptRow(btn) {
      const tbody = document.querySelector('#catalogo-table tbody');
      if (tbody.querySelectorAll('tr').length <= 1) {
        this.showToast('El catálogo debe tener al menos un concepto', 'error');
        return;
      }
      btn.closest('tr').remove();
      this.recalcCatImportes();
    },

    // Sumar importes del catálogo y actualizar el monto total
    recalcCatImportes() {
      const rows = document.querySelectorAll('#catalogo-table tbody tr');
      let totalSum = 0;
      rows.forEach(r => {
        const qty = parseFloat(r.querySelector('.cat-cantidad')?.value) || 0;
        const prc = parseFloat(r.querySelector('.cat-precio')?.value) || 0;
        const imp = qty * prc;
        totalSum += imp;
        const cell = r.querySelector('.cat-importe');
        if (cell) {
          cell.textContent = `$${imp.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          cell.style.textAlign = 'right';
          cell.style.fontWeight = '600';
          cell.style.whiteSpace = 'nowrap';
          cell.style.paddingRight = '8px';
        }
      });

      const cMontoInput = document.getElementById('c-monto');
      if (cMontoInput) {
        cMontoInput.value = this.formatNumberWithCommas(totalSum.toFixed(2));
      }

      this.renderProgramaCaptura();
      this.refreshAltaDerivedValues();
    },

    // AGREGAR DEPENDENCIA DESDE FORMULARIO DE CONTRATO: Abre el modal y, al guardar, recarga el select y selecciona el nuevo registro.
    altaContratNuevaDep() {
      this.openNuevaDependenciaModal(async (dep) => {
        const lista = await this.loadDependenciasOpts();
        const sel = document.getElementById('c-dependencia');
        if (!sel) return;
        sel.innerHTML = '<option value="">Selecciona una dependencia...</option>' +
          lista.map(d => `<option value="${d.id}"${d.id === dep.id ? ' selected' : ''}>${escapeHtml(d.nombre)}${d.siglas ? ' — ' + escapeHtml(d.siglas) : ''}</option>`).join('');
      });
    },

    // AGREGAR EMPRESA DESDE FORMULARIO DE CONTRATO: Abre el modal y, al guardar, recarga el select y selecciona el nuevo registro.
    altaContratNuevaEmp() {
      this.openNuevaEmpresaModal(async (emp) => {
        const lista = await this.loadEmpresasOpts();
        const sel = document.getElementById('c-empresa');
        if (!sel) return;
        sel.innerHTML = '<option value="">Selecciona una empresa...</option>' +
          lista.map(e => `<option value="${e.id}"${e.id === emp.id ? ' selected' : ''}>${escapeHtml(e.nombre_comercial)}${e.razon_social ? ' — ' + escapeHtml(e.razon_social.toUpperCase()) : ''}</option>`).join('');
      });
    },

    // OPCIONES DE PERSONA PARA UNA FILA DEL EQUIPO: Filtra los usuarios aprobados del rol indicado.
    getEquipoPersonaOptions(rol, selectedId) {
      const users = (this._altaContratoUsers || []).filter(u => u.rol === rol && u.estado === 'aprobado');
      return '<option value="">Selecciona...</option>' +
        users.map(u => `<option value="${u.id}"${u.id === selectedId ? ' selected' : ''}>${escapeHtml(u.nombre)} (${escapeHtml(u.email)})</option>`).join('');
    },

    // CONSTRUIR FILA DEL EQUIPO: Cada fila permite elegir cualquier rol (Residente, Contratista, Supervisión, Dependencia, Finanzas) y una persona de ese rol.
    buildEquipoRowHtml(rol, selectedId) {
      const rolLabels = { residente: 'Residente', contratista: 'Contratista', supervision: 'Supervisión', dependencia: 'Dependencia', finanzas: 'Finanzas' };
      const rolOptions = Object.entries(rolLabels).map(([v, l]) => `<option value="${v}"${v === rol ? ' selected' : ''}>${l}</option>`).join('');
      const rowId = 'eqr' + Math.random().toString(36).slice(2, 9);
      return `
        <tr data-row-id="${rowId}">
          <td><select class="eq-row-rol" onchange="app.onEquipoRolChange('${rowId}')">${rolOptions}</select></td>
          <td><select class="eq-row-persona" data-row-id="${rowId}">${this.getEquipoPersonaOptions(rol, selectedId)}</select></td>
          <td style="text-align:center;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="this.closest('tr').remove()" title="Quitar del equipo">
              <span class="material-icons-round" style="font-size:14px;">close</span>
            </button>
          </td>
        </tr>
      `;
    },

    // CAMBIAR ROL DE UNA FILA: Refresca las opciones de persona según el nuevo rol elegido en esa fila.
    onEquipoRolChange(rowId) {
      const row = document.querySelector(`tr[data-row-id="${rowId}"]`);
      if (!row) return;
      const rol = row.querySelector('.eq-row-rol').value;
      row.querySelector('.eq-row-persona').innerHTML = this.getEquipoPersonaOptions(rol);
    },

    // AGREGAR INTEGRANTE: Añade una fila vacía (Residente por defecto) a la tabla de Equipo de Contrato.
    addEquipoRow(rol = 'residente', selectedId) {
      const tbody = document.getElementById('equipo-table-body');
      if (!tbody) return;
      tbody.insertAdjacentHTML('beforeend', this.buildEquipoRowHtml(rol, selectedId));
    },

    // ABRIR MODAL NUEVO USUARIO (EQUIPO DE CONTRATO): Réplica exacta del alta de usuario de Gestión de Usuarios (rol dependencia),
    // incluyendo selector de ROL libre, para que un residente pueda dar de alta cualquier rol y asignarlo aquí mismo al contrato.
    async openNuevoUsuarioEquipoModal() {
      const [empresas, dependencias] = await Promise.all([
        this.loadEmpresasOpts(),
        this.loadDependenciasOpts()
      ]);
      const empresaActual = document.getElementById('c-empresa')?.value || '';
      const dependenciaActual = document.getElementById('c-dependencia')?.value || '';
      const empOpts = '<option value="">Sin empresa</option>' +
        empresas.map(e => `<option value="${e.id}"${e.id === empresaActual ? ' selected' : ''}>${escapeHtml(e.nombre_comercial)}</option>`).join('');
      const depOpts = '<option value="">Sin dependencia</option>' +
        dependencias.map(d => `<option value="${d.id}"${d.id === dependenciaActual ? ' selected' : ''}>${escapeHtml(d.nombre)}</option>`).join('');

      const modalContainer = document.getElementById('modal-container');
      const modalContent = document.getElementById('modal-content-outlet');
      modalContent.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <h2 style="font-size:20px;color:#0f172a;margin:0;">Nuevo Usuario</h2>
          <button onclick="app.closeModal()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);">
            <span class="material-icons-round">close</span>
          </button>
        </div>

        <div style="display:flex;flex-direction:column;align-items:center;margin-bottom:24px;">
          <div id="equ-foto-preview" style="width:80px;height:80px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer;border:3px solid #e2e8f0;transition:border-color .2s;"
               onclick="document.getElementById('equ-foto-input').click()"
               onmouseenter="this.style.borderColor='var(--primary)'"
               onmouseleave="this.style.borderColor='#e2e8f0'">
            <span class="material-icons-round" style="font-size:40px;color:#94a3b8;">person</span>
          </div>
          <input type="file" id="equ-foto-input" accept="image/*" style="display:none;">
          <button type="button" onclick="document.getElementById('equ-foto-input').click()"
                  style="background:none;border:none;color:var(--primary);font-size:13px;cursor:pointer;margin-top:8px;font-weight:600;">
            Subir foto
          </button>
        </div>

        <div style="font-size:13px;font-weight:700;letter-spacing:.06em;color:var(--primary);margin-bottom:14px;">DATOS DE ACCESO</div>
        <div class="form-grid-2">
          <div class="form-group full">
            <label>NOMBRE COMPLETO <span style="color:var(--accent-red);">*</span></label>
            <input type="text" id="equ-nombre" placeholder="Ej. Juan Pérez" autocomplete="off">
          </div>
          <div class="form-group full">
            <label>CORREO ELECTRÓNICO <span style="color:var(--accent-red);">*</span></label>
            <input type="email" id="equ-email" placeholder="usuario@empresa.com" autocomplete="off">
          </div>
          <div class="form-group full">
            <label>CONTRASEÑA <span style="color:var(--accent-red);">*</span></label>
            <input type="password" id="equ-password" placeholder="Mínimo 8 caracteres">
          </div>
          <div class="form-group">
            <label>ROL <span style="color:var(--accent-red);">*</span></label>
            <div style="display:flex;gap:6px;align-items:center;">
              <select id="equ-rol" style="flex:1;">
                <option value="residente">Residente</option>
                <option value="contratista">Contratista</option>
                <option value="supervision">Supervisión</option>
                <option value="dependencia">Dependencia</option>
                <option value="finanzas">Finanzas</option>
              </select>
              <button type="button" class="btn btn-secondary btn-sm" onclick="app.altaEquipoNuevoRango()" title="Nuevo rango">+</button>
            </div>
          </div>
          <div class="form-group">
            <label>EMPRESA</label>
            <div style="display:flex;gap:6px;align-items:center;">
              <select id="equ-empresa" style="flex:1;">${empOpts}</select>
              <button type="button" class="btn btn-secondary btn-sm" onclick="app.altaEquipoNuevaEmp()" title="Nueva empresa">+</button>
            </div>
          </div>
          <div class="form-group full">
            <label>DEPENDENCIA</label>
            <div style="display:flex;gap:6px;align-items:center;">
              <select id="equ-dependencia" style="flex:1;">${depOpts}</select>
              <button type="button" class="btn btn-secondary btn-sm" onclick="app.altaEquipoNuevaDep()" title="Nueva dependencia">+</button>
            </div>
          </div>
        </div>

        <div style="font-size:13px;font-weight:700;letter-spacing:.06em;color:var(--primary);margin-top:20px;margin-bottom:14px;padding-top:16px;border-top:1px solid var(--border-color);">DATOS PROFESIONALES</div>
        <div class="form-grid-2">
          <div class="form-group">
            <label>TÍTULO</label>
            <select id="equ-titulo">
              <option value="Ing.">Ing.</option>
              <option value="Lic.">Lic.</option>
              <option value="Arq.">Arq.</option>
              <option value="Mtro.">Mtro.</option>
              <option value="Dr.">Dr.</option>
            </select>
          </div>
          <div class="form-group">
            <label>ESPECIALIDAD</label>
            <input type="text" id="equ-especialidad" placeholder="Ej. Civil, Eléctrica">
          </div>
          <div class="form-group">
            <label>CÉDULA PROF.</label>
            <input type="text" id="equ-cedula" placeholder="Núm. de cédula" maxlength="8">
          </div>
          <div class="form-group">
            <label>TELÉFONO</label>
            <input type="tel" id="equ-telefono" placeholder="55 0000 0000" maxlength="10">
          </div>
          <div class="form-group full">
            <label>NSS</label>
            <input type="text" id="equ-nss" placeholder="Número de Seguridad Social" maxlength="11">
          </div>
          <div class="form-group full">
            <label>NOTAS / OBSERVACIONES</label>
            <textarea id="equ-notas" rows="2" placeholder="Información adicional relevante sobre el participante..."></textarea>
          </div>
        </div>

        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:24px;">
          <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
          <button class="btn btn-primary" id="equ-submit-btn" onclick="app.submitNuevoUsuarioEquipo()">
            <span class="material-icons-round" style="font-size:16px;">person_add</span>
            Crear Usuario
          </button>
        </div>
      `;

      document.getElementById('equ-foto-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const preview = document.getElementById('equ-foto-preview');
          preview.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
          preview.dataset.fotoDataUrl = ev.target.result;
        };
        reader.readAsDataURL(file);
      });

      ['equ-telefono', 'equ-nss', 'equ-cedula'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
          input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
          });
        }
      });

      modalContainer.style.display = 'flex';
    },

    // AGREGAR EMPRESA/DEPENDENCIA DESDE EL ALTA DE USUARIO DEL EQUIPO: mismo patrón que en Gestión de Usuarios.
    altaEquipoNuevaEmp() {
      this.openNuevaEmpresaModal(async (emp) => {
        const lista = await this.loadEmpresasOpts();
        const sel = document.getElementById('equ-empresa');
        if (!sel) return;
        sel.innerHTML = '<option value="">Sin empresa</option>' +
          lista.map(e => `<option value="${e.id}" ${e.id === emp.id ? 'selected' : ''}>${escapeHtml(e.nombre_comercial)}</option>`).join('');
      });
    },

    altaEquipoNuevaDep() {
      this.openNuevaDependenciaModal(async (dep) => {
        const lista = await this.loadDependenciasOpts();
        const sel = document.getElementById('equ-dependencia');
        if (!sel) return;
        sel.innerHTML = '<option value="">Sin dependencia</option>' +
          lista.map(d => `<option value="${d.id}" ${d.id === dep.id ? 'selected' : ''}>${escapeHtml(d.nombre)}</option>`).join('');
      });
    },

    // AGREGAR UN "RANGO" LIBRE AL SELECT DE ROL: solicitado explícitamente aunque hoy no tiene lógica de permisos asociada.
    altaEquipoNuevoRango() {
      const modalContainer = document.getElementById('modal-container');
      const modalContent = document.getElementById('modal-content-outlet');
      modalContent.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
          <h2 style="font-size:20px; color:#0f172a; margin:0;">Nuevo Rango</h2>
          <button onclick="app.closeModal()" style="background:none; border:none; cursor:pointer; color:var(--text-muted);">
            <span class="material-icons-round">close</span>
          </button>
        </div>
        <div class="form-group full">
          <label>NOMBRE DEL RANGO <span style="color:var(--accent-red);">*</span></label>
          <input type="text" id="rango-nombre" placeholder="Ej. Coordinador de obra">
        </div>
        <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:24px;">
          <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="app.guardarEquipoNuevoRango()">
            <span class="material-icons-round" style="font-size:16px;">save</span> Guardar
          </button>
        </div>
      `;
      modalContainer.style.display = 'flex';
    },

    guardarEquipoNuevoRango() {
      const nombre = document.getElementById('rango-nombre')?.value?.trim() || '';
      if (!nombre) {
        this.showToast('Escribe un nombre para el nuevo rango', 'error');
        return;
      }
      this.showToast(`Rango "${nombre}" agregado (uso interno, sin permisos propios todavía)`, 'info');
      this.closeModal();
    },

    // GUARDAR NUEVO USUARIO DEL EQUIPO: Crea el usuario con cualquier rol (igual que Gestión de Usuarios) y,
    // si el rol corresponde a residente/contratista/supervisión, lo asigna automáticamente en el contrato.
    async submitNuevoUsuarioEquipo() {
      const btn = document.getElementById('equ-submit-btn');
      if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }
      const resetBtn = () => { if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons-round" style="font-size:16px;">person_add</span> Crear Usuario'; } };

      const payload = {
        nombre: document.getElementById('equ-nombre')?.value?.trim() || '',
        email: document.getElementById('equ-email')?.value?.trim() || '',
        password: document.getElementById('equ-password')?.value || '',
        rol: document.getElementById('equ-rol')?.value || 'residente',
        empresa_id: document.getElementById('equ-empresa')?.value || null,
        dependencia_id: document.getElementById('equ-dependencia')?.value || null,
        titulo: document.getElementById('equ-titulo')?.value || 'Ing.',
        especialidad: document.getElementById('equ-especialidad')?.value?.trim() || '',
        cedula: document.getElementById('equ-cedula')?.value?.trim() || '',
        telefono: document.getElementById('equ-telefono')?.value?.trim() || '',
        nss: document.getElementById('equ-nss')?.value?.trim() || '',
        notas: document.getElementById('equ-notas')?.value?.trim() || ''
      };

      if (!payload.nombre || !payload.email || !payload.password) {
        this.showToast('Nombre, correo y contraseña son obligatorios', 'error');
        resetBtn();
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(payload.email)) {
        this.showToast('El correo electrónico no tiene un formato válido', 'error');
        resetBtn();
        return;
      }

      if (payload.password.length < 8) {
        this.showToast('La contraseña debe tener al menos 8 caracteres', 'error');
        resetBtn();
        return;
      }

      if (payload.telefono && !/^\d{10}$/.test(payload.telefono)) {
        this.showToast('El teléfono debe tener exactamente 10 dígitos numéricos', 'error');
        resetBtn();
        return;
      }

      if (payload.cedula && !/^\d{7,8}$/.test(payload.cedula)) {
        this.showToast('La cédula profesional debe tener entre 7 y 8 dígitos numéricos', 'error');
        resetBtn();
        return;
      }

      if (payload.nss && !/^\d{11}$/.test(payload.nss)) {
        this.showToast('El NSS debe tener exactamente 11 dígitos numéricos', 'error');
        resetBtn();
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

        // Refresca la lista de usuarios disponible y agrega una fila nueva ya asignada a este rol/persona.
        this._altaContratoUsers = await this.api('/api/users');
        this.addEquipoRow(data.user.rol, data.user.id);
        this.showToast(`"${data.user.nombre}" creado y agregado al equipo de contrato`, 'success');
      } catch (e) {
        this.showToast(e.message, 'error');
        resetBtn();
      }
    },

    // Helper de formateo de moneda con comas
    formatNumberWithCommas(value) {
      let clean = value.replace(/[^0-9.]/g, '');
      const dotIndex = clean.indexOf('.');
      if (dotIndex !== -1) {
        clean = clean.substring(0, dotIndex + 1) + clean.substring(dotIndex + 1).replace(/\./g, '');
      }
      const parts = clean.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      if (parts[1]) {
        parts[1] = parts[1].substring(0, 2);
      }
      return parts.join('.');
    },

    handleMontoInput() {
      const input = document.getElementById('c-monto');
      if (input) {
        input.value = this.formatNumberWithCommas(input.value);
      }
      this.refreshAltaDerivedValues();
    },

    handleGarMontoInput(input) {
      if (input) {
        input.value = this.formatNumberWithCommas(input.value);
        input.dataset.touched = 'true';
      }
    },

    // GUARDAR CONTRATO: Envía todo el FormData (incluyendo archivo PDF, catálogo, programa y garantías) al backend.
    async submitAltaContrato() {
      const formData = new FormData();
      formData.append('folio', document.getElementById('c-folio').value);
      formData.append('objeto', document.getElementById('c-objeto').value);
      formData.append('ubicacion_obra', document.getElementById('c-ubicacion').value);

      const rawMonto = document.getElementById('c-monto').value || '';
      formData.append('monto', rawMonto.replace(/,/g, ''));
      formData.append('anticipo_porcentaje', document.getElementById('c-anticipo').value);
      formData.append('plazo_dias', document.getElementById('c-plazo').value);
      formData.append('fecha_inicio', document.getElementById('c-inicio').value);
      formData.append('modalidad_pago', document.getElementById('c-modalidad').value);

      const equipoRows = Array.from(document.querySelectorAll('#equipo-table-body tr')).map(row => ({
        rol: row.querySelector('.eq-row-rol').value,
        usuario_id: row.querySelector('.eq-row-persona').value
      })).filter(r => r.usuario_id);

      const residenteRow = equipoRows.find(r => r.rol === 'residente');
      const contratistaRow = equipoRows.find(r => r.rol === 'contratista');
      const supervisionRow = equipoRows.find(r => r.rol === 'supervision');

      if (!residenteRow) {
        this.showToast('Debes asignar al menos un Residente de Obra en el Equipo de Contrato', 'error');
        return;
      }
      if (!contratistaRow) {
        this.showToast('Debes asignar al menos un Superintendente (Contratista) en el Equipo de Contrato', 'error');
        return;
      }

      formData.append('residente_id', residenteRow.usuario_id);
      formData.append('superintendente_id', contratistaRow.usuario_id);
      formData.append('supervision_id', supervisionRow ? supervisionRow.usuario_id : '');
      formData.append('equipo', JSON.stringify(equipoRows));
      formData.append('dependencia_id', document.getElementById('c-dependencia')?.value || '');
      formData.append('empresa_id', document.getElementById('c-empresa')?.value || '');

      const pdfInput = document.getElementById('c-pdf');
      if (pdfInput.files.length > 0) {
        formData.append('pdf_contrato', pdfInput.files[0]);
      }

      const jurDepFileInput = document.getElementById('c-jur-dep-file');
      if (jurDepFileInput && jurDepFileInput.files.length > 0) {
        formData.append('jur_dep_file', jurDepFileInput.files[0]);
      }

      const jurContFileInput = document.getElementById('c-jur-cont-file');
      if (jurContFileInput && jurContFileInput.files.length > 0) {
        formData.append('jur_cont_file', jurContFileInput.files[0]);
      }

      const catalogo = [];
      const rows = document.querySelectorAll('#catalogo-table tbody tr');
      rows.forEach(r => {
        catalogo.push({
          clave: r.querySelector('.cat-clave').value,
          partida: r.querySelector('.cat-partida')?.value?.trim() || '',
          descripcion: r.querySelector('.cat-desc').value,
          unidad: r.querySelector('.cat-unidad').value,
          cantidad: parseFloat(r.querySelector('.cat-cantidad').value),
          precio_unitario: parseFloat(r.querySelector('.cat-precio').value)
        });
      });
      formData.append('catalogo', JSON.stringify(catalogo));

      const months = Math.ceil(parseInt(document.getElementById('c-plazo').value) / 30);
      const programa = this.collectProgramaCaptura(catalogo, months);
      formData.append('programa', JSON.stringify(programa));

      const juridicos = {
        dependencia: document.getElementById('c-jur-dep').value,
        contratista: document.getElementById('c-jur-cont').value,
        fundamento_legal: document.getElementById('c-jur-fundamento').value
      };
      formData.append('juridicos', JSON.stringify(juridicos));

      const garantias = [];
      document.querySelectorAll('#garantias-table tbody tr').forEach(row => {
        const rawGarMonto = row.querySelector('.gar-monto').value || '';
        garantias.push({
          tipo: row.dataset.tipo,
          afianzadora: row.querySelector('.gar-afianzadora').value,
          vigencia: row.querySelector('.gar-vigencia').value,
          monto: parseFloat(rawGarMonto.replace(/,/g, '') || 0)
        });
      });
      formData.append('garantias', JSON.stringify(garantias));

      const rawMontoDec = document.getElementById('c-monto').value || '';
      const monto = parseFloat(rawMontoDec.replace(/,/g, '') || 0);
      const anticipo = parseFloat(document.getElementById('c-anticipo').value || 30);
      const anticipoMonto = monto * (anticipo / 100);
      const amortizacionPlan = [];
      for (let p = 1; p <= months; p++) {
        amortizacionPlan.push({
          periodo: p,
          porcentaje: parseFloat((anticipo / months).toFixed(4)),
          monto: parseFloat((anticipoMonto / months).toFixed(2))
        });
      }
      formData.append('amortizacion_plan', JSON.stringify(amortizacionPlan));

      const penalizaciones = [
        {
          tipo: 'retencion_5_millar',
          descripcion: 'Retencion 5 al millar por vigilancia e inspeccion, Art. 191 LFD',
          porcentaje: parseFloat(document.getElementById('c-retencion').value || 0.5),
          monto_base: monto
        },
        {
          tipo: 'pena_convencional_diaria',
          descripcion: 'Pena convencional diaria por atraso imputable al contratista',
          porcentaje: parseFloat(document.getElementById('c-pena-diaria').value || 0.2),
          monto_base: monto
        }
      ];
      formData.append('penalizaciones', JSON.stringify(penalizaciones));

      try {
        const res = await fetch('/api/contratos', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        this.showToast('Contrato registrado con éxito', 'success');
        this.navigate('contracts-dashboard');
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    }
  };
})();
