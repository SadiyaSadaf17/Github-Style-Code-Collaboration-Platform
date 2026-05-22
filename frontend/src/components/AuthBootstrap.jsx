import { useEffect } from 'react';
import { useAuth } from '../store/authStore';

/** Runs once on app load to restore cookie or OAuth session. */
export default function AuthBootstrap() {
  const bootstrap = useAuth((s) => s.bootstrap);
  const setCurrentUser = useAuth((s) => s.setCurrentUser);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const onExpired = () => setCurrentUser(null);
    window.addEventListener('app-session-expired', onExpired);
    return () => window.removeEventListener('app-session-expired', onExpired);
  }, [setCurrentUser]);

  return null;
}
