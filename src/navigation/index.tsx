import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppShell from '../app/layout/AppShell';
import Dashboard from '../modules/dashboard/Dashboard';
import Usuarios from '../modules/usuarios/Usuarios';
import Asistencia from '../modules/asistencia/Asistencia';
import Vacaciones from '../modules/vacaciones/index';
import Incapacidades from '../modules/incapacidades';
import Nomina from '../modules/nomina/index';
import Contratos from '../modules/contratos/index';
import DocumentacionEmpleado from '../modules/documentacion/DocumentacionEmpleado';
import ETLProcess from '../components/ETLProcess';
import Soporte from '../modules/soporte/Soporte';
import { useAuth } from '../app/auth/AuthContext';
import AdminAccess from '../modules/dashboard/AdminAccess';
import AdminLogin from '../modules/dashboard/AdminLogin';
import ForgotPassword from '../modules/dashboard/ForgotPassword';
import ResetPassword from '../modules/dashboard/ResetPassword';
import AdminInvitationAccept from '../modules/dashboard/AdminInvitationAccept';
import VerifyLoginCode from '../modules/dashboard/VerifyLoginCode';
import LandingPage from '../modules/landing/LandingPage';
import TerminalAttendance from '../modules/terminal/TerminalAttendance';
import AdminDestination from '../modules/terminal/AdminDestination';
import TerminalApproval from '../modules/terminal/TerminalApproval';
import AnalisisSupervisado from '../modules/ml/AnalisisSupervisado';
import AnalisisKMeans from '../pages/AnalisisKMeans';
import DashboardAnalitico from '../pages/DashboardAnalitico';

export default function Navigation() {
  const { user } = useAuth();

  const isAdmin =
    String(
      user?.role ||
      ''
    )
      .trim()
      .toLowerCase() ===
    'admin';

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/terminal" element={<TerminalAttendance />} />
      <Route
        path="/admin/destino"
        element={<AdminDestination />}
      />

      <Route
        path="/admin/acceso"
        element={
          isAdmin
            ? <Navigate to="/portal" replace />
            : <AdminAccess />
        }
      />

      <Route
        path="/admin/login"
        element={
          isAdmin
            ? <Navigate to="/portal" replace />
            : <AdminLogin />
        }
      />

      <Route
        path="/login"
        element={
          <Navigate
            to={isAdmin ? '/portal' : '/admin/acceso'}
            replace
          />
        }
      />

      <Route
        path="/register"
        element={
          <Navigate
            to={isAdmin ? '/portal' : '/admin/acceso'}
            replace
          />
        }
      />

      <Route
        path="/verify-login-code"
        element={isAdmin ? <Navigate to="/portal" replace /> : <VerifyLoginCode />}
      />

      <Route
        path="/verify-account"
        element={
          <Navigate
            to={isAdmin ? '/portal' : '/admin/acceso'}
            replace
          />
        }
      />

      <Route
        path="/forgot-password"
        element={isAdmin ? <Navigate to="/portal" replace /> : <ForgotPassword />}
      />

      <Route
        path="/reset-password"
        element={isAdmin ? <Navigate to="/portal" replace /> : <ResetPassword />}
      />

      <Route
        path="/admin/invitacion"
        element={<AdminInvitationAccept />}
      />

      {isAdmin ? (
        <Route path="/portal" element={<AppShell />}>
          <Route index element={<Dashboard />} />

          <Route path="usuarios" element={<Usuarios />} />
          <Route path="asistencia" element={<Asistencia />} />
              <Route path="terminal-autorizacion" element={<TerminalApproval />} />
          <Route path="vacaciones" element={<Vacaciones />} />
          <Route path="incapacidades" element={<Incapacidades />} />
          <Route path="nomina" element={<Nomina />} />
          <Route path="contratos" element={<Contratos />} />
          <Route path="documentacion" element={<DocumentacionEmpleado />} />

          {isAdmin && (
            <Route path="dashboard-analitico" element={<DashboardAnalitico />} />
          )}

          {isAdmin && (
            <Route path="analisis-supervisado" element={<AnalisisSupervisado />} />
          )}

          {isAdmin && (
            <Route path="analisis-kmeans" element={<AnalisisKMeans />} />
          )}

          {isAdmin && <Route path="soporte" element={<Soporte />} />}
          {isAdmin && <Route path="etl" element={<ETLProcess />} />}
        </Route>
      ) : (
        <Route path="/portal/*" element={<Navigate to="/admin/acceso" replace />} />
      )}

      <Route path="/usuarios" element={<Navigate to="/portal/usuarios" replace />} />
      <Route path="/asistencia" element={<Navigate to="/portal/asistencia" replace />} />
      <Route path="/vacaciones" element={<Navigate to="/portal/vacaciones" replace />} />
      <Route path="/incapacidades" element={<Navigate to="/portal/incapacidades" replace />} />
      <Route path="/nomina" element={<Navigate to="/portal/nomina" replace />} />
      <Route path="/contratos" element={<Navigate to="/portal/contratos" replace />} />
      <Route path="/documentacion" element={<Navigate to="/portal/documentacion" replace />} />

      <Route
        path="/dashboard-analitico"
        element={<Navigate to="/portal/dashboard-analitico" replace />}
      />

      <Route
        path="/analitica-visual"
        element={<Navigate to="/portal/dashboard-analitico" replace />}
      />

      <Route
        path="/analisis-supervisado"
        element={<Navigate to="/portal/analisis-supervisado" replace />}
      />

      <Route
        path="/analisis-kmeans"
        element={<Navigate to="/portal/analisis-kmeans" replace />}
      />

      <Route
        path="/kmeans"
        element={<Navigate to="/portal/analisis-kmeans" replace />}
      />

      <Route path="/soporte" element={<Navigate to="/portal/soporte" replace />} />
      <Route path="/etl" element={<Navigate to="/portal/etl" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}