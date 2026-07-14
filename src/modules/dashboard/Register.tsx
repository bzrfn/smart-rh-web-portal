import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setAuthToken } from '../../services/api';
import { useAuth } from '../../app/auth/AuthContext';

export default function Register() {
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [fechaIngreso, setFechaIngreso] = useState('');
  const [fotoBase64, setFotoBase64] = useState('');
  const [fotoFilename, setFotoFilename] = useState('');
  const [fotoPreview, setFotoPreview] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  function onPhotoChange(file?: File) {
    if (!file) return;

    setFotoFilename(file.name);

    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || '');
      setFotoBase64(result);
      setFotoPreview(result);
    };

    reader.readAsDataURL(file);
  }

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    setError('');
    setInfo('');

    const correoLimpio = correo.trim().toLowerCase();

    if (!nombre.trim() || !apellido.trim() || !correoLimpio || !contrasena.trim()) {
      setError('Completa nombre, apellido, correo y contraseña.');
      return;
    }

    try {
      setLoading(true);

      const { data } = await api.post('/auth/register', {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        correo: correoLimpio,
        contrasena,
        rol_id: 2,
        telefono: telefono.trim() || null,
        direccion: direccion.trim() || null,
        fecha_ingreso: fechaIngreso || null,
        dias_vacaciones_disponibles: 12,
        foto_perfil_base64: fotoBase64 || null,
        foto_perfil_filename: fotoFilename || null,
      });

      if (!data?.ok) {
        setError(data?.message ?? 'No se pudo crear la cuenta.');
        return;
      }

      if (data?.requiresEmailVerification) {
        navigate('/verify-account', {
          state: {
            correo: data?.correo || correoLimpio,
            message: data?.message,
          },
        });
        return;
      }

      if (data?.token && data?.user) {
        setAuthToken(data.token);
        setAuth({ token: data.token, user: data.user });
        navigate('/portal', { replace: true });
        return;
      }

      setInfo('Cuenta creada. Revisa tu correo para confirmar tu cuenta.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-page-premium">
      <Link to="/" className="auth-back-home">
        ← Volver al sitio principal
      </Link>

      <div className="bg-shape bg-shape-top-left-large" />
      <div className="bg-shape bg-shape-top-left-small" />
      <div className="bg-shape bg-shape-bottom-right-large" />
      <div className="bg-shape bg-shape-bottom-right-small" />

      <div className="auth-premium-grid">
        <div className="auth-showcase-card">
          <div className="auth-showcase-badge">Alta de usuarios</div>

          <h1 className="auth-showcase-title">Crear acceso</h1>

          <p className="auth-showcase-text">
            Registra una nueva cuenta. SMART RH enviará un código de confirmación
            al correo registrado antes de permitir el acceso.
          </p>

          <div className="auth-showcase-points">
            <div className="auth-showcase-point">
              <span className="auth-showcase-dot" />
              <div>
                <h3>Confirmación por correo</h3>
                <p>La cuenta se activa únicamente después de validar el código recibido.</p>
              </div>
            </div>

            <div className="auth-showcase-point">
              <span className="auth-showcase-dot" />
              <div>
                <h3>Perfil completo</h3>
                <p>Agrega datos de contacto, fecha de ingreso y foto desde el registro.</p>
              </div>
            </div>

            <div className="auth-showcase-point">
              <span className="auth-showcase-dot" />
              <div>
                <h3>Documentación lista</h3>
                <p>La imagen quedará disponible para credencial y expediente digital.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-wrapper auth-wrapper-premium">
          <div className="auth-brand-block">
            <h1 className="auth-brand">SMART RH</h1>
            <p className="auth-brand-subtitle">Alta de cuenta</p>
          </div>

          <form className="auth-card auth-card-premium" onSubmit={submit}>
            <div className="auth-card-header">
              <div>
                <p className="auth-eyebrow">Nuevo acceso</p>
                <h2 className="auth-title">Crear cuenta</h2>
              </div>

              <div className="auth-card-icon">＋</div>
            </div>

            <p className="auth-description">
              Completa la información. Al finalizar recibirás un código de confirmación.
            </p>

            <div className="auth-photo-upload">
              <div className="auth-photo-preview">
                {fotoPreview ? (
                  <img src={fotoPreview} alt="Vista previa" />
                ) : (
                  <span>{nombre?.[0]?.toUpperCase() || 'S'}</span>
                )}
              </div>

              <label className="auth-file-box">
                <strong>Foto de perfil</strong>
                <span>{fotoFilename || 'Seleccionar imagen PNG, JPG o WEBP'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onPhotoChange(e.target.files?.[0])}
                />
              </label>
            </div>

            <label className="auth-label">Nombre</label>
            <input className="auth-input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Juan" />

            <label className="auth-label">Apellido</label>
            <input className="auth-input" value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="Pérez" />

            <label className="auth-label">Correo</label>
            <input className="auth-input" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="usuario@empresa.com" />

            <label className="auth-label">Contraseña</label>
            <input className="auth-input" type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} placeholder="••••••••" />

            <label className="auth-label">Teléfono</label>
            <input className="auth-input" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ej. 55 1234 5678" />

            <label className="auth-label">Dirección</label>
            <input className="auth-input" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Dirección del empleado" />

            <label className="auth-label">Fecha de ingreso</label>
            <input className="auth-input" type="date" value={fechaIngreso} onChange={(e) => setFechaIngreso(e.target.value)} />

            <button className="auth-submit" type="submit" disabled={loading}>
              <span>{loading ? 'Creando cuenta...' : 'Crear cuenta y enviar código'}</span>
              <span className="auth-submit-icon">✓</span>
            </button>

            {error && <p className="auth-error">{error}</p>}
            {info && <p className="auth-info">{info}</p>}

            <div className="auth-footer-links">
              <Link to="/login" className="auth-link primary">
                Volver al login
              </Link>

              <Link to="/" className="auth-link">
                Ir al sitio principal
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}