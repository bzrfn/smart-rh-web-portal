// @ts-ignore -- Jest runs in Node; the web tsconfig intentionally omits Node types.
import fs from 'node:fs';

const read = (relativePath: string) => fs.readFileSync(`src/${relativePath}`, 'utf8');

describe('Invitación segura de usuarios', () => {
  const users = read('modules/usuarios/Usuarios.tsx');
  const activation = read('modules/dashboard/AdminInvitationAccept.tsx');
  const navigation = read('navigation/index.tsx');

  test('empleados y administradores se invitan sin contraseña asignada por RH', () => {
    expect(users).toContain("'/auth/invitations'");
    expect(users).toContain("tipo_cuenta: roleId === 1 ? 'admin' : 'empleado'");
    expect(users).not.toContain('payload.contrasena');
    expect(users).not.toContain('<PasswordField');
    expect(users).toContain('Enviar invitación');
  });

  test('el enlace público activa la cuenta y conserva el acceso administrativo anterior', () => {
    expect(navigation).toContain('path="/activar-cuenta"');
    expect(navigation).toContain('path="/admin/invitacion"');
    expect(activation).toContain("'/auth/invitations/accept'");
    expect(activation).toContain("searchParams.get('tipoCuenta')");
    expect(activation).toContain('tipoCuenta,');
    expect(activation).toContain("data?.user?.role");
  });
});
