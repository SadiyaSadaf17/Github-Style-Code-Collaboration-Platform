import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const refreshToken = searchParams.get('refreshToken');

      if (token && refreshToken) {
        try {
          // Fetch user profile using the new token
          const response = await api.get('/auth/profile', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          setAuth(response.data.user, token, refreshToken);
          navigate('/dashboard');
        } catch (error) {
          console.error('OAuth profile fetch failed', error);
          navigate('/login?error=oauth_failed');
        }
      } else {
        navigate('/login?error=missing_tokens');
      }
    };

    handleCallback();
  }, [searchParams, setAuth, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      <span className="ml-4">Completing secure login...</span>
    </div>
  );
};

export default OAuthCallback;