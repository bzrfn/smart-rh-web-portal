import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { assertSaved } from '../../services/feedback';
import SmartRhIcon from '../../components/SmartRhIcon';
import PasswordField from '../../components/PasswordField';
import './AdminInvitationAccept.css';

type Profile = { nombre: string; apellido: string; telefono: string; direccion: string };
type Preview = { correo: string; tipoCuenta: 'admin' | 'empleado'; fechaIngreso: string | null;
  diasVacaciones: number; requiresProfileCompletion: boolean; existingAccount: boolean; perfil: Profile };
const EMPTY_PROFILE: Profile = { nombre: '', apellido: '', telefono: '', direccion: '' };

export default function AdminInvitationAccept() {
  const [searchParams] = useSearchParams();
  const invitationId = useMemo(() => String(searchParams.get('invitationId') || '').trim().toLowerCase(), [searchParams]);
  const token = useMemo(() => String(searchParams.get('token') || '').trim().toLowerCase(), [searchParams]);
  const tipoCuenta = useMemo(() => searchParams.get('tipoCuenta') === 'empleado' ? 'empleado' : 'admin', [searchParams]);
  const linkValido = /^[a-f0-9]{64}$/.test(invitationId) && /^[a-f0-9]{64}$/.test(token);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [contrasena, setContrasena] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activatedRole, setActivatedRole] = useState('');
  const [attempt, setAttempt] = useState(0);
  const submitting = useRef(false);

  useEffect(() => {
    let active = true;
    setPreview(null); setProfile(EMPTY_PROFILE); setContrasena(''); setConfirmar(''); setSuccess(''); setError('');
    if (!linkValido) { setError('La invitación es inválida o está incompleta. Solicita un enlace nuevo.'); setChecking(false); return; }
    setChecking(true);
    void api.post('/auth/invitations/inspect', { invitationId, token, tipoCuenta }).then(({ data }) => {
      if (!active) return;
      assertSaved(data, 'No se pudo verificar la invitación.');
      if (!data.invitation?.correo || data.invitation.tipoCuenta !== tipoCuenta) throw new Error('Invitación inválida.');
      setPreview(data.invitation); setProfile({ ...EMPTY_PROFILE, ...data.invitation.perfil });
    }).catch((cause: any) => {
      if (active) setError(cause?.response?.data?.message || 'No se pudo verificar el enlace. Reintenta o solicita una invitación nueva si venció.');
    }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [invitationId, token, tipoCuenta, linkValido, attempt]);

  function update(field: keyof Profile, value: string) { setProfile((before) => ({ ...before, [field]: value })); }
  async function activate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preview || checking || submitting.current) return;
    setError('');
    if (preview.requiresProfileCompletion && Object.values(profile).some((value) => !value.trim())) { setError('Completa tu nombre, apellidos, teléfono y dirección.'); return; }
    if (contrasena.length < 8 || contrasena.length > 128 || !contrasena.trim()) { setError('La contraseña debe tener entre 8 y 128 caracteres.'); return; }
    if (contrasena !== confirmar) { setError('Las contraseñas no coinciden.'); return; }
    submitting.current = true; setLoading(true);
    try {
      const { data } = await api.post('/auth/invitations/accept', {
        invitationId, token, tipoCuenta, contrasena,
        ...(preview.requiresProfileCompletion ? { perfil: profile } : {}),
      });
      assertSaved(data, 'No se pudo confirmar la activación.');
      setSuccess(data?.message || 'Cuenta activada correctamente.');
      setActivatedRole(String(data?.user?.role || preview.tipoCuenta).toLowerCase());
      setContrasena(''); setConfirmar(''); setProfile(EMPTY_PROFILE);
    } catch (cause: any) {
      setError(cause?.response?.data?.message || 'No se pudo confirmar la activación. Tus datos siguen en el formulario; reintenta o solicita un enlace nuevo si venció.');
    } finally { submitting.current = false; setLoading(false); }
  }

  return <main className="auth-page invitation-accept-page">
    <div className={`auth-card invitation-accept-card ${success ? 'invitation-activated' : ''}`} aria-busy={checking || loading}>
      <div className="auth-showcase-badge">SMART RH · Invitación personal</div>
      <div className="invitation-stage-icon"><SmartRhIcon name={success ? 'check' : 'user'} /></div>
      {!success && <ol className="invitation-steps" aria-label="Pasos de activación"><li className={preview ? 'complete' : 'current'}>1. Verificar enlace</li><li className={preview ? 'current' : ''}>2. Completar perfil</li><li>3. Cuenta lista</li></ol>}
      <h1>{success ? 'Tu cuenta está lista' : 'Activa tu cuenta'}</h1>
      {!success && <p className="invitation-lead">Tu acceso a SMART RH comienza aquí. Verifica tus datos y completa tu perfil.</p>}
      {checking && <p className="module-info" role="status">Verificando tu invitación…</p>}
      {error && <p className="module-error" role="alert">{error}</p>}
      {!checking && !preview && !success && linkValido && <button className="btn btn-secondary" type="button" onClick={() => setAttempt((value) => value + 1)}>Volver a verificar</button>}
      {success && <div className="invitation-success-message" role="status"><p>{success}</p><p className="auth-helper-text">{activatedRole === 'admin' ? 'Continúa al acceso administrativo con tu correo y la contraseña que acabas de crear.' : 'Ya puedes ingresar a la aplicación SMART RH con tu correo y tu nueva contraseña.'}</p></div>}
      {preview && !success && <>
        <dl className="invitation-assigned-data" aria-label="Datos asignados por administración">
          <div><dt>Correo</dt><dd>{preview.correo}</dd></div>
          <div><dt>Rol</dt><dd>{preview.tipoCuenta === 'admin' ? 'Administrador' : 'Empleado'}</dd></div>
          <div><dt>Fecha de ingreso</dt><dd>{preview.fechaIngreso || 'No registrada'}</dd></div>
          <div><dt>Vacaciones iniciales</dt><dd>{preview.diasVacaciones} días{preview.requiresProfileCompletion ? ' · asignación automática' : ''}</dd></div>
        </dl>
        <form className="invitation-completion-form" onSubmit={activate}>
          <fieldset disabled={loading}>
            {preview.requiresProfileCompletion ? <>
              <legend>Completa tus datos personales</legend>
              <p className="auth-helper-text">Correo, rol y fecha de ingreso fueron asignados por administración. Completa los siguientes campos obligatorios.</p>
              <div className="invitation-personal-grid">
                <label className="form-label">Nombre(s)<input name="nombre" required maxLength={100} autoComplete="given-name" value={profile.nombre} onChange={(e) => update('nombre', e.target.value)} /></label>
                <label className="form-label">Apellidos<input name="apellido" required maxLength={100} autoComplete="family-name" value={profile.apellido} onChange={(e) => update('apellido', e.target.value)} /></label>
                <label className="form-label">Teléfono<input name="telefono" required type="tel" inputMode="tel" maxLength={30} autoComplete="tel" value={profile.telefono} onChange={(e) => update('telefono', e.target.value)} /></label>
                <label className="form-label invitation-address">Dirección<input name="direccion" required maxLength={500} autoComplete="street-address" value={profile.direccion} onChange={(e) => update('direccion', e.target.value)} /></label>
              </div>
            </> : <><legend>Crea tu contraseña</legend><p className="auth-helper-text">{preview.existingAccount ? 'La cuenta ya existe. Conservarás sus datos y establecerás una contraseña nueva.' : 'Esta invitación ya incluye tus datos. Define tu contraseña para terminar.'}</p></>}
            <div className="invitation-personal-grid">
              <PasswordField label="Contraseña" autoComplete="new-password" required maxLength={128} value={contrasena} onChange={(e) => setContrasena(e.target.value)} />
              <PasswordField label="Confirmar contraseña" autoComplete="new-password" required maxLength={128} value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
            </div>
            <p className="auth-helper-text">Usa entre 8 y 128 caracteres. No compartas tu contraseña ni el enlace de invitación.</p>
            <button className="btn" type="submit" disabled={loading || !linkValido}>{loading ? 'Activando tu cuenta…' : 'Guardar mis datos y activar cuenta'}</button>
          </fieldset>
        </form>
      </>}
      <div className="invitation-return"><Link className={success ? 'invitation-primary-link' : 'invitation-home-link'} to={activatedRole === 'admin' ? '/admin/acceso' : '/'}>{activatedRole === 'admin' ? 'Ir al acceso administrativo' : 'Volver al inicio'}{success && <SmartRhIcon name="send" />}</Link></div>
    </div>
  </main>;
}
