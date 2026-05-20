import { useEffect } from 'react';
import { useAuth } from '../store/authStore';

/** Runs once on app load to restore cookie or OAuth session. */
export default function AuthBootstrap() {
  const bootstrap = useAuth((s) => s.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return null;
}
