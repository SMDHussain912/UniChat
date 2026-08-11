import { Suspense, lazy } from 'react';
import './App.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoadingSpinner } from './components/Loading/LoadingSpinner';
import Home from './components/Home';

const Login = lazy(() => import('./components/Login'));

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <Login />
      </Suspense>
    );
  }

  return <Home user={user} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
