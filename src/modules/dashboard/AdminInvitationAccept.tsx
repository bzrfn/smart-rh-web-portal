import {
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useSearchParams,
} from 'react-router-dom';

import {
  api,
} from '../../services/api';
import PasswordField from '../../components/PasswordField';


export default function AdminInvitationAccept() {
  const [
    searchParams,
  ] =
    useSearchParams();

  const invitationId =
    useMemo(
      () =>
        String(
          searchParams.get(
            'invitationId'
          ) ||
          ''
        )
          .trim()
          .toLowerCase(),
      [
        searchParams,
      ]
    );

  const token =
    useMemo(
      () =>
        String(
          searchParams.get(
            'token'
          ) ||
          ''
        )
          .trim()
          .toLowerCase(),
      [
        searchParams,
      ]
    );

  const tipoCuenta =
    useMemo(
      () =>
        searchParams.get('tipoCuenta') === 'empleado'
          ? 'empleado'
          : 'admin',
      [searchParams]
    );

  const [
    contrasena,
    setContrasena,
  ] =
    useState(
      ''
    );

  const [
    confirmar,
    setConfirmar,
  ] =
    useState(
      ''
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState(
      ''
    );

  const [
    success,
    setSuccess,
  ] =
    useState(
      ''
    );

  const [
    activatedRole,
    setActivatedRole,
  ] = useState('');


  const linkValido =
    /^[a-f0-9]{64}$/.test(
      invitationId
    ) &&
    /^[a-f0-9]{64}$/.test(
      token
    );


  async function activate() {
    setError(
      ''
    );

    setSuccess(
      ''
    );


    if (
      !linkValido
    ) {
      setError(
        'La invitación es inválida o está incompleta.'
      );

      return;
    }


    if (
      contrasena.length < 8
    ) {
      setError(
        'La contraseña debe tener al menos 8 caracteres.'
      );

      return;
    }


    if (
      contrasena !==
      confirmar
    ) {
      setError(
        'Las contraseñas no coinciden.'
      );

      return;
    }


    try {
      setLoading(
        true
      );


      const {
        data,
      } =
        await api.post(
          '/auth/invitations/accept',
          {
            invitationId,
            token,
            tipoCuenta,
            contrasena,
          }
        );


      setSuccess(
        data?.message ||
        'Cuenta activada correctamente.'
      );

      setActivatedRole(
        String(
          data?.user?.role || ''
        ).toLowerCase()
      );

      setContrasena(
        ''
      );

      setConfirmar(
        ''
      );

    } catch (
      e: any
    ) {
      setError(
        e?.response?.data?.message ||
        'La invitación es inválida, venció o ya fue utilizada.'
      );

    } finally {
      setLoading(
        false
      );
    }
  }


  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-showcase-badge">
          SMART RH · Invitación personal
        </div>

        <h1>
          Activar tu cuenta
        </h1>

        <p>
          Define una contraseña segura para terminar la activación.
        </p>

        {!linkValido && (
          <p className="module-error">
            El enlace de invitación es inválido o está incompleto.
          </p>
        )}

        {error && (
          <p className="module-error">
            {error}
          </p>
        )}

        {success && (
          <p className="module-info">
            {success}
          </p>
        )}

        {!success && (
          <div className="form-grid">
            <PasswordField
              label="Contraseña"
              autoComplete="new-password"
              value={contrasena}
              onChange={
                (
                  event
                ) =>
                  setContrasena(
                    event.target.value
                  )
              }
            />

            <PasswordField
              label="Confirmar contraseña"
              autoComplete="new-password"
              value={confirmar}
              onChange={
                (
                  event
                ) =>
                  setConfirmar(
                    event.target.value
                  )
              }
            />

            <button
              className="btn"
              type="button"
              disabled={
                loading ||
                !linkValido
              }
              onClick={
                activate
              }
            >
              {
                loading
                  ? 'Activando...'
                  : 'Activar cuenta'
              }
            </button>
          </div>
        )}

        <div
          style={{
            marginTop:
              20,
          }}
        >
          <Link
            to={activatedRole === 'admin' ? '/admin/acceso' : '/'}
          >
            {activatedRole === 'admin' ? 'Ir al acceso administrativo' : 'Volver al inicio'}
          </Link>
        </div>
      </div>
    </div>
  );
}
