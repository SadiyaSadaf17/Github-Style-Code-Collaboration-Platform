import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../store/authStore';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { completeOAuth } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      const err = searchParams.get('error');
      if (err) {
        setError(decodeURIComponent(err));
        return;
      }

      const accessToken =
        searchParams.get('access_token') || searchParams.get('token');
      const refreshToken = searchParams.get('refresh_token') || searchParams.get('refreshToken');

      if (!accessToken) {
        setError('Missing access token from OAuth provider.');
        return;
      }

      try {
        await completeOAuth(accessToken, refreshToken);
        navigate('/', { replace: true });
      } catch (e) {
        setError(e.response?.data?.message || 'OAuth sign-in failed.');
      }
    };
    run();
  }, [searchParams, completeOAuth, navigate]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="flex items-center gap-2 text-red-800 bg-red-50 border border-red-200 rounded-md p-4 max-w-md text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
        <button
          type="button"
          onClick={() => navigate('/login', { replace: true })}
          className="mt-4 text-sm text-[#0969da] hover:underline"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] text-gray-500 text-sm">
      Completing sign-in…
    </div>
  );
}
