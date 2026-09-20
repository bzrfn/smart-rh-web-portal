import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

import App from '../app/App';
import {
  AuthProvider,
  useAuth,
} from '../app/auth/AuthContext';

const STORAGE_KEY =
  'rrhh_auth';

function EmployeeSessionProbe() {
  const {
    user,
    setAuth,
  } = useAuth();

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setAuth({
            token:
              'employee-test-token',

            user: {
              id: 999,
              nombre:
                'Empleado',
              apellido:
                'Prueba',
              correo:
                'empleado.prueba@smart-rh.test',
              role:
                'empleado',
            } as any,
          });
        }}
      >
        Simular sesión empleado
      </button>

      <span data-testid="current-role">
        {user?.role || 'sin-sesion'}
      </span>
    </div>
  );
}

describe(
  'Portal web exclusivamente administrativo',
  () => {
    beforeEach(
      () => {
        localStorage.clear();

        window.history.pushState(
          {},
          '',
          '/'
        );
      }
    );

    afterEach(
      () => {
        localStorage.clear();
      }
    );

    test(
      'una sesión persistida de empleado se elimina y no monta /portal',
      async () => {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            token:
              'legacy-employee-token',

            user: {
              id:
                999,

              nombre:
                'Empleado',

              apellido:
                'Prueba',

              correo:
                'empleado.prueba@smart-rh.test',

              role:
                'empleado',
            },
          })
        );

        window.history.pushState(
          {},
          '',
          '/portal'
        );

        render(
          <BrowserRouter>
            <App />
          </BrowserRouter>
        );

        await waitFor(
          () => {
            expect(
              window.location.pathname
            ).toBe(
              '/admin/acceso'
            );
          }
        );

        expect(
          localStorage.getItem(
            STORAGE_KEY
          )
        ).toBeNull();

        expect(
          await screen.findByRole(
            'heading',
            {
              name:
                /solicitar autorización/i,
            }
          )
        ).toBeInTheDocument();
      }
    );

    test(
      'setAuth rechaza una sesión de empleado y no la persiste',
      () => {
        render(
          <AuthProvider>
            <EmployeeSessionProbe />
          </AuthProvider>
        );

        fireEvent.click(
          screen.getByRole(
            'button',
            {
              name:
                /simular sesión empleado/i,
            }
          )
        );

        expect(
          screen.getByTestId(
            'current-role'
          )
        ).toHaveTextContent(
          'sin-sesion'
        );

        expect(
          localStorage.getItem(
            STORAGE_KEY
          )
        ).toBeNull();
      }
    );
  }
);
