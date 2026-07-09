(function () {
  window.IntegrApexModules = window.IntegrApexModules || {};

  window.IntegrApexModules.contratosShell = {
  async renderContractsDashboard() {
    this.showLoggedInUI();
    const outlet = document.getElementById('app-router-outlet');

    try {
      const contracts = await this.api('/api/contratos');

      let gridHtml = '';
      if (contracts.length === 0) {
        gridHtml = `<div class="col-12 glass-panel" style="padding: 40px; text-align: center; color: var(--text-muted);">
          No tienes contratos asociados asignados
        </div>`;
      } else {
        contracts.forEach(c => {
          gridHtml += `
            <div class="col-4 mini-card" style="display:flex; flex-direction:column; justify-content:space-between;" onclick="app.selectContract('${c.id}')">
              <div>
                <span class="user-badge" style="background: var(--ipn-maroon); color:white; font-size:10px; font-weight:700;">${c.folio}</span>
                <h3 style="margin-top: 12px; font-size:15px; line-height: 1.4; color:#0f172a;">
                  ${c.objeto}
                </h3>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 10px;">
                  Monto: <strong>$${c.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>
              <div style="margin-top:20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-muted); border-top: 1px solid var(--border-color); padding-top: 12px; margin-top:16px;">
                  <span>Inicio: ${c.fecha_inicio}</span>
                  <span>Término: ${c.fecha_termino}</span>
                </div>
              </div>
            </div>
          `;
        });
      }

      outlet.innerHTML = `
        <div class="main-container">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h1>Listado de contratos asignados</h1>
          </div>
          <div class="dashboard-grid">
            ${gridHtml}
          </div>
        </div>
      `;
    } catch (e) {}
  },

  async selectContract(contractId) {
    this.state.currentContractId = contractId;
    try {
      const contract = await this.api(`/api/contratos/${contractId}`);
      if (contract) {
        this.state.currentContractData = contract;
        document.getElementById('current-contract-selector').style.display = 'flex';
        document.getElementById('header-contract-folio').textContent = contract.folio;
        this.showToast(`Contrato ${contract.folio} seleccionado`, 'success');
        this.navigate('contract-detail', { id: contractId });
      }
    } catch (e) {}
  },

  async renderContractDetail() {
    const outlet = document.getElementById('app-router-outlet');
    const id = this.state.currentContractId;

    try {
      const contract = await this.api(`/api/contratos/${id}`);
      this.state.currentContractData = contract;

      document.getElementById('current-contract-selector').style.display = 'flex';
      document.getElementById('header-contract-folio').textContent = contract.folio;

      outlet.innerHTML = `
        <div class="main-container">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div>
              <span class="user-badge" style="background:var(--ipn-maroon); font-size:11px; font-weight:700; color:white;">${contract.folio}</span>
              <h1 style="margin-top: 8px; font-size: 24px; color:#0f172a;">${contract.objeto}</h1>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary" onclick="app.navigate('inicio')">
                <span class="material-icons-round">arrow_back</span> Inicio
              </button>
              <button class="btn btn-primary" onclick="app.renderEstimacionesScreen()">
                <span class="material-icons-round">receipt_long</span> Estimaciones
              </button>
            </div>
          </div>

          <div class="tabs">
            <div class="tab" onclick="app.switchTab('config')">Configuración</div>
            <div class="tab" onclick="app.switchTab('catalogo')">Catálogo</div>
            <div class="tab" onclick="app.switchTab('programa')">Programa y avance</div>
            <div class="tab" onclick="app.switchTab('fianzas')">Garantías</div>
            <div class="tab" onclick="app.switchTab('documentos')">Minutas / Visitas</div>
            <div class="tab" onclick="app.switchTab('bitacora')">Bitácora de notas</div>
            <div class="tab" onclick="app.switchTab('convenios')">Convenios</div>
          </div>

          <div id="tab-content-outlet"></div>
        </div>
      `;

      this.renderActiveTabContent();
    } catch(e) {}
  },

  switchTab(tabName) {
    this.state.activeTab = tabName;
    this.renderActiveTabContent();
  },

  renderActiveTabContent() {
    const contract = this.state.currentContractData;
    const outlet = document.getElementById('tab-content-outlet');
    if (!outlet) return;

    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(t => {
      if (t.textContent.toLowerCase().includes(this.state.activeTab.substring(0,4))) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    const tabRenderers = {
      config: 'renderConfigTab',
      catalogo: 'renderCatalogoTab',
      programa: 'renderProgramaTab',
      fianzas: 'renderFianzasTab',
      documentos: 'renderDocumentosTab',
      bitacora: 'renderBitacoraTab',
      convenios: 'renderConveniosTab'
    };

    const rendererName = tabRenderers[this.state.activeTab];
    if (rendererName && typeof this[rendererName] === 'function') {
      this[rendererName](contract, outlet);
    }
  },
  };
})();
