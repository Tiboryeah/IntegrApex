(function () {
  window.IntegrApexModules = window.IntegrApexModules || {};

  window.IntegrApexModules.archivoFotografico = {
    // PESTAÑA ARCHIVO FOTOGRÁFICO: Galería de evidencias de avance de obra, independiente de las estimaciones.
    renderArchivoFotograficoTab(contract, outlet) {
      const evidencias = [...(contract.archivo_fotografico || [])].sort((a, b) => new Date(b.fecha_evidencia) - new Date(a.fecha_evidencia));

      const puedeSubir = ['residente', 'contratista', 'supervision'].includes(this.state.user.rol);

      let galeriaHtml = '';
      if (evidencias.length === 0) {
        galeriaHtml = `<div style="text-align:center; color:var(--text-muted); padding:40px;">Aún no hay evidencias fotográficas cargadas para este contrato.</div>`;
      } else {
        galeriaHtml = evidencias.map(ev => `
          <div class="col-6 glass-panel" style="padding:18px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:10px;">
              <div>
                <strong style="font-size:14px;">${escapeHtml(ev.descripcion)}</strong>
                <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">
                  ${ev.fecha_evidencia} · ${escapeHtml(ev.creado_por_nombre)}
                </div>
              </div>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">
              ${(ev.fotos || []).map(f => `
                <a href="${f.path}" target="_blank">
                  <img src="${f.path}" alt="${escapeHtml(f.nombre)}" style="width:96px; height:96px; object-fit:cover; border-radius:8px; border:1px solid var(--border-color);">
                </a>
              `).join('')}
            </div>
          </div>
        `).join('');
      }

      outlet.innerHTML = `
        <div class="dashboard-grid">
          <div class="col-12" style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <h2 style="margin:0;">Archivo Fotográfico</h2>
              <p style="font-size:12.5px; color:var(--text-muted); margin-top:4px;">Evidencias del avance de obra, con fecha y descripción, independientes de las estimaciones.</p>
            </div>
            ${puedeSubir ? `
              <button class="btn btn-primary btn-sm" onclick="app.subirEvidenciaFotograficaDialog()">
                <span class="material-icons-round" style="font-size:16px;">add_a_photo</span> Subir Evidencia
              </button>
            ` : ''}
          </div>
          ${galeriaHtml}
        </div>
      `;
    },

    // SUBIR EVIDENCIA: Abre el modal para cargar una o varias fotos con descripción y fecha del avance.
    subirEvidenciaFotograficaDialog() {
      const hoy = new Date().toISOString().split('T')[0];
      this.showModal(`
        <h2>Subir Evidencia Fotográfica</h2>
        <form id="evidencia-foto-form" style="margin-top:16px;">
          <div class="form-group">
            <label>Descripción del avance</label>
            <textarea id="ef-desc" rows="3" placeholder="Ej. Colado de losa de azotea, eje A-B" required></textarea>
          </div>
          <div class="form-group">
            <label>Fecha de la evidencia</label>
            <input type="date" id="ef-fecha" value="${hoy}" required>
          </div>
          <div class="form-group">
            <label>Fotografías (una o varias)</label>
            <input type="file" id="ef-fotos" accept="image/*" multiple required>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
            <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary" id="ef-submit-btn">Subir</button>
          </div>
        </form>
      `);

      document.getElementById('evidencia-foto-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('ef-submit-btn');
        btn.disabled = true;
        btn.textContent = 'Subiendo...';

        const formData = new FormData();
        formData.append('descripcion', document.getElementById('ef-desc').value);
        formData.append('fecha_evidencia', document.getElementById('ef-fecha').value);
        Array.from(document.getElementById('ef-fotos').files).forEach(f => formData.append('fotos', f));

        try {
          const res = await fetch(`/api/contratos/${this.state.currentContractId}/archivo-fotografico`, {
            method: 'POST',
            body: formData
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          this.showToast('Evidencia fotográfica guardada con éxito', 'success');
          this.closeModal();
          this.renderContractDetail();
        } catch (err) {
          this.showToast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = 'Subir';
        }
      });
    }
  };
})();
