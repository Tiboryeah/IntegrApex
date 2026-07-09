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

        const residentes = users.filter(u => u.rol === 'residente' && u.estado === 'aprobado');
        const contratistas = users.filter(u => u.rol === 'contratista' && u.estado === 'aprobado');
        const supervisores = users.filter(u => u.rol === 'supervision' && u.estado === 'aprobado');

        const resOpts = residentes.map(u => `<option value="${u.id}">${escapeHtml(u.nombre)} (${escapeHtml(u.email)})</option>`).join('');
        const conOpts = contratistas.map(u => `<option value="${u.id}">${escapeHtml(u.nombre)} (${escapeHtml(u.email)})</option>`).join('');
        const supOpts = '<option value="">Ninguno</option>' + supervisores.map(u => `<option value="${u.id}">${escapeHtml(u.nombre)} (${escapeHtml(u.email)})</option>`).join('');

        const depOpts = '<option value="">Selecciona una dependencia...</option>' +
          dependencias.map(d => `<option value="${d.id}">${escapeHtml(d.nombre)}${d.siglas ? ' — ' + escapeHtml(d.siglas) : ''}</option>`).join('');
        const empOpts = '<option value="">Selecciona una empresa...</option>' +
          empresas.map(e => `<option value="${e.id}">${escapeHtml(e.nombre_comercial)}${e.razon_social ? ' — ' + escapeHtml(e.razon_social.toUpperCase()) : ''}</option>`).join('');

        outlet.innerHTML = `
          <div class="main-container" style="max-width: 900px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
              <h1>Nuevo Contrato</h1>
              <button class="btn btn-secondary" onclick="app.navigate('inicio')">
                Cancelar
              </button>
            </div>
            <form id="alta-contrato-form" class="glass-panel">

              <h2 style="font-size:16px; margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:8px; color:var(--primary);">IDENTIFICACIÓN</h2>
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
                  <label>DEPENDENCIA CONTRATANTE <span style="color:var(--accent-red);">*</span></label>
                  <div style="display:flex; gap:8px; align-items:center;">
                    <select id="c-dependencia" style="flex:1;">${depOpts}</select>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="app.altaContratNuevaDep()">
                      + Nuevo
                    </button>
                  </div>
                </div>
                <div class="col-12 form-group">
                  <label>EMPRESA CONTRATISTA <span style="color:var(--accent-red);">*</span></label>
                  <div style="display:flex; gap:8px; align-items:center;">
                    <select id="c-empresa" style="flex:1;">${empOpts}</select>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="app.altaContratNuevaEmp()">
                      + Nuevo
                    </button>
                  </div>
                </div>
              </div>

              <h2 style="font-size:16px; margin-top:20px; margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:8px; color:var(--primary);">OBJETO DEL CONTRATO</h2>
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
                <div class="col-4 form-group">
                  <label>Anticipo (%)</label>
                  <input type="number" id="c-anticipo" value="30" min="0" max="100" step="0.01" required onchange="app.refreshAltaDerivedValues()">
                </div>
              </div>

              <h2 style="font-size:16px; margin-top:20px; margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:8px; color:var(--primary);">2. Equipo de Contrato</h2>
              <div class="dashboard-grid">
                <div class="col-4 form-group">
                  <label>Residente de Obra</label>
                  <select id="c-residente" required>${resOpts}</select>
                </div>
                <div class="col-4 form-group">
                  <label>Superintendente (Contratista)</label>
                  <select id="c-contratista" required>${conOpts}</select>
                </div>
                <div class="col-4 form-group">
                  <label>Supervisor técnico</label>
                  <select id="c-supervision">${supOpts}</select>
                </div>
              </div>

              <h2 style="font-size:16px; margin-top:20px; margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:8px; color:var(--primary);">3. Catálogo de conceptos</h2>
              <div style="margin-bottom: 20px;">
                <div class="table-container" style="overflow-x:auto;">
                  <table id="catalogo-table" style="min-width:700px; table-layout:fixed; width:100%;">
                    <colgroup>
                      <col style="width:100px;">
                      <col style="width:auto; min-width:160px;">
                      <col style="width:80px;">
                      <col style="width:100px;">
                      <col style="width:120px;">
                      <col style="width:130px;">
                    </colgroup>
                    <thead>
                      <tr>
                        <th>CLAVE</th>
                        <th>DESCRIPCIÓN</th>
                        <th>UNIDAD</th>
                        <th>CANTIDAD</th>
                        <th>P. UNITARIO</th>
                        <th style="text-align:right;">IMPORTE</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><input type="text" class="cat-clave" value="CON-01" required style="width:100%; padding:6px; box-sizing:border-box;"></td>
                        <td><input type="text" class="cat-desc" value="Excavacion en zanja" required style="width:100%; padding:6px; box-sizing:border-box;"></td>
                        <td><input type="text" class="cat-unidad" value="m3" required style="width:100%; padding:6px; box-sizing:border-box;"></td>
                        <td><input type="number" class="cat-cantidad" value="1000" required style="width:100%; padding:6px; box-sizing:border-box;" oninput="app.recalcCatImportes()"></td>
                        <td><input type="number" class="cat-precio" value="120" required style="width:100%; padding:6px; box-sizing:border-box;" oninput="app.recalcCatImportes()"></td>
                        <td class="cat-importe" style="text-align:right; font-weight:600; white-space:nowrap; padding-right:8px;">$120,000.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <button type="button" class="btn btn-secondary btn-sm" style="margin-top: 12px;" onclick="app.addConceptRow()">
                  <span class="material-icons-round" style="font-size: 14px;">add</span> Agregar Concepto
                </button>
              </div>

              <h2 style="font-size:16px; margin-top:20px; margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:8px; color:var(--primary);">4. Programa de Obra Mes a Mes</h2>
              <p style="font-size:13px; color:var(--text-muted); line-height:1.5; margin-bottom:12px;">
                Capture la cantidad programada por concepto y periodo. La suma por concepto no debe exceder la cantidad contratada.
              </p>
              <div id="programa-captura-wrapper" class="table-container" style="margin-bottom:18px;">
                <div style="padding:18px; color:var(--text-muted);">Capture catalogo y plazo para generar el programa.</div>
              </div>

              <h2 style="font-size:16px; margin-top:20px; margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:8px; color:var(--primary);">5. Elementos Juridicos</h2>
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
                <div class="col-12 form-group">
                  <label>Fundamento Legal</label>
                  <input type="text" id="c-jur-fundamento" value="LOPSRM / RLOPSRM" required>
                </div>
              </div>

              <h2 style="font-size:16px; margin-top:20px; margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:8px; color:var(--primary);">6. Garantías iniciales</h2>
              <div class="table-container" style="margin-bottom:18px;">
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
                      <td><input type="text" class="gar-afianzadora" placeholder="Afianzadora" required style="padding:6px;"></td>
                      <td><input type="date" class="gar-vigencia" required style="padding:6px;"></td>
                      <td><input type="text" class="gar-monto" id="gar-anticipo" required style="padding:6px;" oninput="app.handleGarMontoInput(this)"></td>
                    </tr>
                    <tr data-tipo="cumplimiento">
                      <td><strong>Cumplimiento</strong></td>
                      <td><input type="text" class="gar-afianzadora" placeholder="Afianzadora" required style="padding:6px;"></td>
                      <td><input type="date" class="gar-vigencia" required style="padding:6px;"></td>
                      <td><input type="text" class="gar-monto" id="gar-cumplimiento" required style="padding:6px;" oninput="app.handleGarMontoInput(this)"></td>
                    </tr>
                    <tr data-tipo="vicios_ocultos">
                      <td><strong>Vicios ocultos</strong></td>
                      <td><input type="text" class="gar-afianzadora" placeholder="Afianzadora" required style="padding:6px;"></td>
                      <td><input type="date" class="gar-vigencia" required style="padding:6px;"></td>
                      <td><input type="text" class="gar-monto" id="gar-vicios" required style="padding:6px;" oninput="app.handleGarMontoInput(this)"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h2 style="font-size:16px; margin-top:20px; margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:8px; color:var(--primary);">7. Amortizacion y Penalizaciones</h2>
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
                <div class="col-12">
                  <div class="readonly-summary">
                    Umbral informativo de anticipo: si el anticipo rebasa el 30%, documente justificacion y autorizacion conforme al Art. 50 fr. IV LOPSRM y Art. 139 RLOPSRM.
                  </div>
                </div>
              </div>

              <h2 style="font-size:13px; font-weight:700; letter-spacing:.06em; margin-top:28px; margin-bottom:12px; color:var(--primary);">CONTRATO PDF <span style="font-weight:400; color:var(--text-muted); font-size:12px;">(opcional)</span></h2>
              <div class="form-group">
                <div id="pdf-wrapper" style="
                  display: flex; align-items: center; gap: 16px;
                  border: 2px dashed #cbd5e1; border-radius: 10px;
                  padding: 18px 24px; cursor: pointer;
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

              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:28px; padding-top:20px; border-top:1px solid var(--border-color);">
                <div style="display:flex; align-items:center; gap:10px;">
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
        const descripcion = r.querySelector('.cat-desc')?.value || '';
        const unidad = r.querySelector('.cat-unidad')?.value || '';
        const cantidad = parseFloat(r.querySelector('.cat-cantidad')?.value || 0);
        const precio_unitario = parseFloat(r.querySelector('.cat-precio')?.value || 0);
        if (clave) catalogo.push({ clave, descripcion, unidad, cantidad, precio_unitario });
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

      const header = Array.from({ length: months }, (_, idx) => `<th>Mes ${idx + 1}</th>`).join('');
      const rows = catalogo.map(c => {
        const perMonth = c.cantidad / months;
        const cells = Array.from({ length: months }, (_, idx) => `
          <td>
            <input type="number" class="prog-input" data-clave="${escapeHtml(c.clave)}" data-mes="${idx + 1}" min="0" step="any" value="${perMonth.toFixed(4)}" style="padding:6px;">
          </td>
        `).join('');
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
            programa[m - 1].avances[c.clave] = c.cantidad / months;
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
        <td><input type="text" class="cat-clave" placeholder="CON-0X" required style="width:100%; padding:6px; box-sizing:border-box;"></td>
        <td><input type="text" class="cat-desc" placeholder="Descripción del concepto" required style="width:100%; padding:6px; box-sizing:border-box;"></td>
        <td><input type="text" class="cat-unidad" placeholder="m2" required style="width:100%; padding:6px; box-sizing:border-box;"></td>
        <td><input type="number" class="cat-cantidad" placeholder="0" required style="width:100%; padding:6px; box-sizing:border-box;" oninput="app.recalcCatImportes()"></td>
        <td><input type="number" class="cat-precio" placeholder="0" required style="width:100%; padding:6px; box-sizing:border-box;" oninput="app.recalcCatImportes()"></td>
        <td class="cat-importe" style="text-align:right; font-weight:600; white-space:nowrap; padding-right:8px;">$0.00</td>
      `;
      tbody.appendChild(row);
      this.renderProgramaCaptura();
    },

    // Sumar importes del catálogo y actualizar el monto total
    recalcCatImportes() {
      const rows = document.querySelectorAll('#catalogo-table tbody tr');
      let totalSum = 0;
      rows.forEach(r => {
        const qty = parseFloat(r.querySelector('.cat-cantidad')?.value || 0);
        const prc = parseFloat(r.querySelector('.cat-precio')?.value || 0);
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
      
      const rawMonto = document.getElementById('c-monto').value || '';
      formData.append('monto', rawMonto.replace(/,/g, ''));
      formData.append('anticipo_porcentaje', document.getElementById('c-anticipo').value);
      formData.append('plazo_dias', document.getElementById('c-plazo').value);
      formData.append('fecha_inicio', document.getElementById('c-inicio').value);
      formData.append('modalidad_pago', document.getElementById('c-modalidad').value);
      formData.append('residente_id', document.getElementById('c-residente').value);
      formData.append('superintendente_id', document.getElementById('c-contratista').value);
      formData.append('supervision_id', document.getElementById('c-supervision').value);
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
