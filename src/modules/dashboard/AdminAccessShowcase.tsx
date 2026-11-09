import './AdminAccess.css';

export default function AdminAccessShowcase() {
  return (
        <div className="auth-showcase-card">
          <div className="auth-showcase-badge">
            Acceso administrativo protegido
          </div>

          <h1 className="auth-showcase-title">
            SMART RH
          </h1>

          <p className="auth-showcase-text">
            Antes de iniciar sesión, el administrador general debe
            autorizar el acceso mediante un código temporal.
          </p>

          <div className="auth-showcase-points">
            <div className="auth-showcase-point">
              <span className="auth-showcase-dot" />

              <div>
                <h3>
                  1. Solicita el acceso
                </h3>

                <p>
                  SMART RH envía un código temporal al administrador
                  general responsable de aprobar el ingreso.
                </p>
              </div>
            </div>

            <div className="auth-showcase-point">
              <span className="auth-showcase-dot" />

              <div>
                <h3>
                  2. Ingresa tu cuenta
                </h3>

                <p>
                  Después de validar la autorización,
                  cada administrador debe ingresar su propio
                  correo y contraseña.
                </p>
              </div>
            </div>

            <div className="auth-showcase-point">
              <span className="auth-showcase-dot" />

              <div>
                <h3>
                  3. Confirma el segundo código
                </h3>

                <p>
                  Después de la contraseña, escribe el segundo
                  código enviado a tu correo personal.
                </p>
              </div>
            </div>
          </div>
        </div>
  );
}
