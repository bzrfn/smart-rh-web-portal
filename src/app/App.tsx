import FeedbackHost from '../components/FeedbackHost';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import Navigation from '../navigation';
import { setAuthToken } from '../services/api';

function Inner() {
  const { token, user } = useAuth();

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  return <><Navigation /><FeedbackHost key={user?.id ?? "public"} /></>;
}

export default function App() {
  return (
    <AuthProvider>
      <Inner />
    </AuthProvider>
  );
}
