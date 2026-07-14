import { useEffect } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import Navigation from '../navigation';
import { setAuthToken } from '../services/api';

function Inner() {
  const { token } = useAuth();

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  return <Navigation isAuthed={Boolean(token)} />;
}

export default function App() {
  return (
    <AuthProvider>
      <Inner />
    </AuthProvider>
  );
}