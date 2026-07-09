(function () {
  window.IntegrApexModules = window.IntegrApexModules || {};

  window.IntegrApexModules.auth = {
    renderLogin() {
      document.getElementById('app-header').style.display = 'none';
      document.getElementById('app-sidebar').style.display = 'none';
      const outlet = document.getElementById('app-router-outlet');

      outlet.innerHTML = `
        <div class="auth-wrapper">
          <section class="auth-shell" aria-label="Acceso a IntegrApex">
            <aside class="auth-panel">
              <div class="auth-panel-brand">
                <div class="brand-icon auth-brand-icon">I</div>
                <div>
                  <div class="auth-brand-title">IntegrApex</div>
                  <div class="auth-brand-subtitle">IPN · ESCOM</div>
                </div>
              </div>

              <div class="auth-panel-copy">
                <p class="auth-kicker">Gestión técnico-administrativa</p>
                <h1>Contratos de obra pública con trazabilidad por rol.</h1>
                <p>Accede a expedientes, bitácoras, estimaciones, fianzas y reportes con registro de usuario y fecha en cada operación.</p>
              </div>

              <div class="auth-panel-list">
                <span><span class="material-icons-round">verified_user</span> Acceso por rol</span>
                <span><span class="material-icons-round">history_edu</span> Evidencia documental</span>
                <span><span class="material-icons-round">query_stats</span> Seguimiento ejecutivo</span>
              </div>
            </aside>

            <div class="auth-card">
              <div class="auth-card-header">
                <p class="auth-kicker">Acceso seguro</p>
                <h2>Iniciar sesión</h2>
                <p>Ingresa con tu cuenta institucional. El sistema reconocerá automáticamente tu rol.</p>
              </div>

              <form id="login-form" class="auth-form">
                <div class="form-group">
                  <label for="login-email">Correo electrónico</label>
                  <div class="auth-input-wrap">
                    <span class="material-icons-round">mail</span>
                    <input type="email" id="login-email" placeholder="usuario@dependencia.gob.mx" autocomplete="email" required>
                  </div>
                </div>
                <div class="form-group">
                  <label for="login-password">Contraseña</label>
                  <div class="auth-input-wrap">
                    <span class="material-icons-round">lock</span>
                    <input type="password" id="login-password" placeholder="Ingresa tu contraseña" autocomplete="current-password" required>
                  </div>
                </div>
                <button type="submit" class="btn btn-primary auth-submit">
                  <span class="material-icons-round">login</span>
                  Iniciar sesión
                </button>
              </form>

              <div class="auth-footer">
                <span>¿Eres nuevo?</span>
                <a href="#" onclick="app.navigate('register')">Solicitar acceso</a>
              </div>
            </div>
          </section>
        </div>
      `;

      document.getElementById('login-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
          const data = await this.api('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          this.state.user = data.user;
          this.showLoggedInUI();
          this.showToast(`Bienvenido, ${data.user.nombre}`, 'success');
          this.navigate('inicio');
        } catch (err) {}
      });
    },

    renderRegister() {
      document.getElementById('app-header').style.display = 'none';
      document.getElementById('app-sidebar').style.display = 'none';
      const outlet = document.getElementById('app-router-outlet');

      outlet.innerHTML = `
        <div class="auth-wrapper">
          <section class="auth-shell auth-register-shell" aria-label="Solicitud de acceso a IntegrApex">
            <aside class="auth-panel auth-register-panel">
              <div class="auth-panel-brand">
                <div class="brand-icon auth-brand-icon">I</div>
                <div>
                  <div class="auth-brand-title">IntegrApex</div>
                  <div class="auth-brand-subtitle">IPN · ESCOM</div>
                </div>
              </div>

              <div class="auth-panel-copy">
                <p class="auth-kicker">Alta controlada</p>
                <h1>Solicita tu acceso institucional.</h1>
                <p>Tu cuenta quedará pendiente hasta que la dependencia confirme identidad, rol y permisos dentro del sistema.</p>
              </div>

              <div class="auth-review-steps">
                <span><strong>1</strong> Envías tu solicitud</span>
                <span><strong>2</strong> La dependencia valida el rol</span>
                <span><strong>3</strong> Inicias sesión con permisos activos</span>
              </div>
            </aside>

            <div class="auth-card auth-register-card">
              <div class="auth-card-header">
                <p class="auth-kicker">Solicitud de acceso</p>
                <h2>Registro de usuario</h2>
                <p>Captura tus datos tal como deben aparecer en la bitácora, estimaciones y trazabilidad de firmas.</p>
              </div>

              <form id="register-form" class="auth-form">
                <div class="form-group">
                  <label for="reg-name">Nombre completo</label>
                  <div class="auth-input-wrap">
                    <span class="material-icons-round">badge</span>
                    <input type="text" id="reg-name" placeholder="Ing. Juan Pérez" autocomplete="name" required>
                  </div>
                </div>
                <div class="form-group">
                  <label for="reg-email">Correo electrónico</label>
                  <div class="auth-input-wrap">
                    <span class="material-icons-round">alternate_email</span>
                    <input type="email" id="reg-email" placeholder="jperez@integrapex.test" autocomplete="email" required>
                  </div>
                </div>
                <div class="form-group">
                  <label for="reg-password">Contraseña</label>
                  <div class="auth-input-wrap">
                    <span class="material-icons-round">lock</span>
                    <input type="password" id="reg-password" placeholder="Crea una contraseña" autocomplete="new-password" required>
                  </div>
                </div>
                <div class="form-group">
                  <label for="reg-role">Rol solicitado</label>
                  <div class="auth-input-wrap">
                    <span class="material-icons-round">manage_accounts</span>
                    <select id="reg-role" required>
                      <option value="residente">Residente de obra</option>
                      <option value="contratista">Contratista / Superintendente</option>
                      <option value="supervision">Supervisión técnica</option>
                      <option value="dependencia">Administrador de dependencia</option>
                      <option value="finanzas">Responsable de finanzas</option>
                    </select>
                  </div>
                </div>
                <button type="submit" class="btn btn-primary auth-submit">
                  <span class="material-icons-round">how_to_reg</span>
                  Enviar solicitud
                </button>
              </form>

              <div class="auth-footer">
                <span>¿Ya tienes cuenta?</span>
                <a href="#" onclick="app.navigate('login')">Iniciar sesión</a>
              </div>
            </div>
          </section>
        </div>
      `;

      document.getElementById('register-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const nombre = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const rol = document.getElementById('reg-role').value;

        try {
          await this.api('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, email, password, rol })
          });
          this.showToast('Solicitud registrada. Pendiente de activación.', 'success');
          this.navigate('login');
        } catch (err) {}
      });
    }
  };
})();
