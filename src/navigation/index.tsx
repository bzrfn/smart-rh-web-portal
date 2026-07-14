import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppShell from '../app/layout/AppShell';
import Dashboard from '../modules/dashboard/Dashboard';
import Usuarios from '../modules/usuarios/Usuarios';
import Asistencia from '../modules/asistencia/Asistencia';
import QrAsistencia from '../modules/asistencia/QrAsistencia';
import Vacaciones from '../modules/vacaciones/index';
import Nomina from '../modules/nomina/index';
import Contratos from '../modules/contratos/index';
import DocumentacionEmpleado from '../modules/documentacion/DocumentacionEmpleado';
import ETLProcess from '../components/ETLProcess';
import Soporte from '../modules/soporte/Soporte';
import { useAuth } from '../app/auth/AuthContext';
import Login from '../modules/dashboard/Login';
import Register from '../modules/dashboard/Register';
import ForgotPassword from '../modules/dashboard/ForgotPassword';
import ResetPassword from '../modules/dashboard/ResetPassword';
import VerifyLoginCode from '../modules/dashboard/VerifyLoginCode';
import VerifyAccount from '../modules/dashboard/VerifyAccount';
import LandingPage from '../modules/landing/LandingPage';
import AnalisisSupervisado from '../modules/ml/AnalisisSupervisado';
import AnalisisKMeans from '../pages/AnalisisKMeans';

export default function Navigation() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route
        path="/login"
        element={user ? <Navigate to="/portal" replace /> : <Login />}
      />

      <Route
        path="/register"
        element={user ? <Navigate to="/portal" replace /> : <Register />}
      />

      <Route
        path="/verify-login-code"
        element={user ? <Navigate to="/portal" replace /> : <VerifyLoginCode />}
      />

      <Route
        path="/verify-account"
        element={user ? <Navigate to="/portal" replace /> : <VerifyAccount />}
      />

      <Route
        path="/forgot-password"
        element={user ? <Navigate to="/portal" replace /> : <ForgotPassword />}
      />

      <Route
        path="/reset-password"
        element={user ? <Navigate to="/portal" replace /> : <ResetPassword />}
      />

      {user ? (
        <Route path="/portal" element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="asistencia" element={<Asistencia />} />
          <Route path="qr-asistencia" element={<QrAsistencia />} />
          <Route path="vacaciones" element={<Vacaciones />} />
          <Route path="nomina" element={<Nomina />} />
          <Route path="contratos" element={<Contratos />} />
          <Route path="documentacion" element={<DocumentacionEmpleado />} />

          {user.role === 'admin' && (
            <Route path="analisis-supervisado" element={<AnalisisSupervisado />} />
          )}

          {user.role === 'admin' && (
            <Route path="analisis-kmeans" element={<AnalisisKMeans />} />
          )}

          {user.role === 'admin' && <Route path="soporte" element={<Soporte />} />}
          {user.role === 'admin' && <Route path="etl" element={<ETLProcess />} />}
        </Route>
      ) : (
        <Route path="/portal/*" element={<Navigate to="/login" replace />} />
      )}

      <Route path="/usuarios" element={<Navigate to="/portal/usuarios" replace />} />
      <Route path="/asistencia" element={<Navigate to="/portal/asistencia" replace />} />
      <Route path="/qr-asistencia" element={<Navigate to="/portal/qr-asistencia" replace />} />
      <Route path="/vacaciones" element={<Navigate to="/portal/vacaciones" replace />} />
      <Route path="/nomina" element={<Navigate to="/portal/nomina" replace />} />
      <Route path="/contratos" element={<Navigate to="/portal/contratos" replace />} />
      <Route path="/documentacion" element={<Navigate to="/portal/documentacion" replace />} />

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