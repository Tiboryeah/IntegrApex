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
        const users = await this.api('/api/users');

        const residentes = users.filter(u => u.rol === 'residente' && u.estado === 'aprobado');
        const contratistas = users.filter(u => u.rol === 'contratista' && u.estado === 'aprobado');
        const supervisores = users.filter(u => u.rol === 'supervision' && u.estado === 'aprobado');

        const resOpts = residentes.map(u => `<option value="${u.id}">${u.nombre} (${u.email})</option>`).join('');
        const conOpts = contratistas.map(u => `<option value="${u.id}">${u.nombre} (${u.email})</option>`).join('');
        const supOpts = '<option value="">Ninguno</option>' + supervisores.map(u => `<option value="${u.id}">${u.nombre} (${u.email})</option>`).join('');

        outlet.innerHTML = `
          <div class="main-container" style="max-width: 900px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
              <h1>Alta de Contrato (HU-01)</h1>
              <button class="btn btn-secondary" onclick="app.navigate('inicio')">
                Cancelar
              </button>
            </div>
            <form id="alta-contrato-form" class="glass-panel">
              <h2 style="font-size:16px; margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:8px; color:var(--primary);">1. Datos Generales</h2>
              <div class="dashboard-grid">
                <div class="col-6 form-group">
                  <label>Folio Contractual (unico)</label>
                  <input type="text" id="c-folio" placeholder="SOP-2026-007" required>
                </div>
                <div class="col-6 form-group">
                  <label>Monto Total Sin IVA (Subtotal)</label>
                  <input type="number" id="c-monto" placeholder="8500000" required onchange="app.refreshAltaDerivedValues()">
                </div>
                <div class="col-12 form-group">
                  <label>Objeto del Contrato</label>
                  <textarea id="c-objeto" rows="2" placeholder="Describa el objeto de la obra..." required></textarea>
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
                <div class="col-4 form-group">
                  <label>Modalidad de Pago</label>
                  <select id="c-modalidad">
                    <option value="Precios Unitarios">Precios Unitarios</option>
                    <option value="Precio Alzado">Precio Alzado</option>
                    <option value="Mixto">Mixto</option>
                  </select>
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
                <div class="table-container">
                  <table id="catalogo-table">
                    <thead>
                      <tr>
                        <th>Clave</th>
                        <th>Descripción</th>
                        <th>Unidad</th>
                        <th>Cantidad</th>
                        <th>P. Unitario</th>
                        <th>Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><input type="text" class="cat-clave" value="CON-01" required style="padding: 6px;"></td>
                        <td><input type="text" class="cat-desc" value="Excavacion en zanja" required style="padding: 6px;"></td>
                        <td><input type="text" class="cat-unidad" value="m3" required style="padding: 6px;"></td>
                        <td><input type="number" class="cat-cantidad" value="1000" required style="padding: 6px;" onchange="app.recalcCatImportes()"></td>
                        <td><input type="number" class="cat-precio" value="120" required style="padding: 6px;" onchange="app.recalcCatImportes()"></td>
                        <td class="cat-importe">$120,000.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <button type="button" class="btn btn-secondary btn-sm" style="margin-top: 10px;" onclick="app.addConceptRow()">
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
                </div>
                <div class="col-6 form-group">
                  <label>Elementos del Contratista</label>
                  <textarea id="c-jur-cont" rows="3" placeholder="Acta constitutiva, representante legal, documentacion fiscal..." required></textarea>
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
                      <td><input type="number" class="gar-monto" id="gar-anticipo" min="0.01" step="0.01" required style="padding:6px;"></td>
                    </tr>
                    <tr data-tipo="cumplimiento">
                      <td><strong>Cumplimiento</strong></td>
                      <td><input type="text" class="gar-afianzadora" placeholder="Afianzadora" required style="padding:6px;"></td>
                      <td><input type="date" class="gar-vigencia" required style="padding:6px;"></td>
                      <td><input type="number" class="gar-monto" id="gar-cumplimiento" min="0.01" step="0.01" required style="padding:6px;"></td>
                    </tr>
                    <tr data-tipo="vicios_ocultos">
                      <td><strong>Vicios ocultos</strong></td>
                      <td><input type="text" class="gar-afianzadora" placeholder="Afianzadora" required style="padding:6px;"></td>
                      <td><input type="date" class="gar-vigencia" required style="padding:6px;"></td>
                      <td><input type="number" class="gar-monto" id="gar-vicios" min="0.01" step="0.01" required style="padding:6px;"></td>
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

              <h2 style="font-size:16px; margin-top:20px; margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:8px; color:var(--primary);">8. Archivo PDF del Contrato</h2>
              <div class="form-group">
                <div class="file-upload-wrapper" id="pdf-wrapper" style="border: 2px dashed #cbd5e1; padding: 24px; border-radius: 8px; text-align: center; cursor: pointer;">
                  <span class="material-icons-round" style="font-size: 40px; color: var(--text-muted);">picture_as_pdf</span>
                  <p style="margin-top: 8px; font-size:13px; color: var(--text-muted);">Selecciona el PDF firmado del contrato</p>
                  <input type="file" id="c-pdf" accept=".pdf" style="display: none;">
                </div>
                <p id="pdf-selected-name" style="margin-top: 10px; font-size: 13px; color: var(--accent-green); text-align: center; font-weight: 600;"></p>
              </div>

              <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 30px; padding: 14px; font-size:15px;">
                Guardar Contrato Nuevo
              </button>
            </form>
          </div>
        `;

        const wrapper = document.getElementById('pdf-wrapper');
        const fileInput = document.getElementById('c-pdf');
        const selectedName = document.getElementById('pdf-selected-name');

        wrapper.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
          if (fileInput.files.length > 0) {
            selectedName.textContent = `Archivo seleccionado: ${fileInput.files[0].name}`;
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
        this.refreshAltaDerivedValues();
      } catch (e) {}
    },

    // CALCULAR VALORES DERIVADOS: Recalcula automáticamente montos de garantías sugeridas y el plan de amortización mensual.
    refreshAltaDerivedValues() {
      const monto = parseFloat(document.getElementById('c-monto')?.value || 0);
      const anticipo = parseFloat(document.getElementById('c-anticipo')?.value || 30);
      const plazo = parseInt(document.getElementById('c-plazo')?.value || 0, 10);
      const anticipoMonto = monto * (anticipo / 100);
      const cumplimientoMonto = monto * 0.1;
      const meses = Math.max(1, Math.ceil((plazo || 30) / 30));

      const garAnticipo = document.getElementById('gar-anticipo');
      const garCumplimiento = document.getElementById('gar-cumplimiento');
      const garVicios = document.getElementById('gar-vicios');
      if (garAnticipo && !garAnticipo.dataset.touched) garAnticipo.value = anticipoMonto ? anticipoMonto.toFixed(2) : '';
      if (garCumplimiento && !garCumplimiento.dataset.touched) garCumplimiento.value = cumplimientoMonto ? cumplimientoMonto.toFixed(2) : '';
      if (garVicios && !garVicios.dataset.touched) garVicios.value = cumplimientoMonto ? cumplimientoMonto.toFixed(2) : '';

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
            <input type="number" class="prog-input" data-clave="${c.clave}" data-mes="${idx + 1}" min="0" step="any" value="${perMonth.toFixed(4)}" style="padding:6px;">
          </td>
        `).join('');
        return `
          <tr>
            <td><strong>${c.clave}</strong></td>
            <td>${c.cantidad.toLocaleString('es-MX')} ${c.unidad}</td>
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
        <td><input type="text" class="cat-clave" placeholder="CON-0X" required style="padding: 6px;"></td>
        <td><input type="text" class="cat-desc" placeholder="Descripción" required style="padding: 6px;"></td>
        <td><input type="text" class="cat-unidad" placeholder="m2" required style="padding: 6px;"></td>
        <td><input type="number" class="cat-cantidad" placeholder="0" required style="padding: 6px;" onchange="app.recalcCatImportes()"></td>
        <td><input type="number" class="cat-precio" placeholder="0" required style="padding: 6px;" onchange="app.recalcCatImportes()"></td>
        <td class="cat-importe">$0.00</td>
      `;
      tbody.appendChild(row);
      this.renderProgramaCaptura();
    },

    // RECALCULAR IMPORTES: Multiplica cantidad por precio unitario por fila en la tabla del catálogo.
    recalcCatImportes() {
      const rows = document.querySelectorAll('#catalogo-table tbody tr');
      rows.forEach(r => {
        const qty = parseFloat(r.querySelector('.cat-cantidad').value || 0);
        const prc = parseFloat(r.querySelector('.cat-precio').value || 0);
        const imp = qty * prc;
        r.querySelector('.cat-importe').textContent = `$${imp.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
      });
      this.renderProgramaCaptura();
    },

    // GUARDAR CONTRATO: Envía todo el FormData (incluyendo archivo PDF, catálogo, programa y garantías) al backend.
    async submitAltaContrato() {
      const formData = new FormData();
      formData.append('folio', document.getElementById('c-folio').value);
      formData.append('objeto', document.getElementById('c-objeto').value);
      formData.append('monto', document.getElementById('c-monto').value);
      formData.append('anticipo_porcentaje', document.getElementById('c-anticipo').value);
      formData.append('plazo_dias', document.getElementById('c-plazo').value);
      formData.append('fecha_inicio', document.getElementById('c-inicio').value);
      formData.append('modalidad_pago', document.getElementById('c-modalidad').value);
      formData.append('residente_id', document.getElementById('c-residente').value);
      formData.append('superintendente_id', document.getElementById('c-contratista').value);
      formData.append('supervision_id', document.getElementById('c-supervision').value);

      const pdfInput = document.getElementById('c-pdf');
      if (pdfInput.files.length > 0) {
        formData.append('pdf_contrato', pdfInput.files[0]);
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
        garantias.push({
          tipo: row.dataset.tipo,
          afianzadora: row.querySelector('.gar-afianzadora').value,
          vigencia: row.querySelector('.gar-vigencia').value,
          monto: parseFloat(row.querySelector('.gar-monto').value || 0)
        });
      });
      formData.append('garantias', JSON.stringify(garantias));

      const monto = parseFloat(document.getElementById('c-monto').value || 0);
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
