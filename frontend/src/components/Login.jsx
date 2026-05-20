import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Github, AlertCircle } from 'lucide-react';
import { useAuth } from '../store/authStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const flash = location.state?.message;
  const from = location.state?.from || '/';

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, navigate, from]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const ok = await login({ email, password });
    if (ok) navigate(from, { replace: true });
  };

  const startOAuth = (provider) => {
    window.location.href = `${API_BASE}/auth/${provider}`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] bg-[#f6f8fa] px-4">
      <div className="mb-6 text-[#24292f]">
        <Github size={48} />
      </div>

      <div className="w-full max-w-[340px] p-5 bg-white border border-[#d0d7de] rounded-md shadow-sm">
        <h1 className="text-2xl font-light text-center mb-4 text-[#1f2328]">Sign in</h1>

        {flash && (
          <div className="p-3 mb-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded-md">
            {flash}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2 mb-4">
          <button
            type="button"
            onClick={() => startOAuth('google')}
            className="w-full py-2 text-sm font-medium border border-[#d0d7de] rounded-md hover:bg-[#f6f8fa]"
          >
            Continue with Google
          </button>
          <button
            type="button"
            onClick={() => startOAuth('github')}
            className="w-full py-2 text-sm font-medium border border-[#d0d7de] rounded-md hover:bg-[#f6f8fa]"
          >
            Continue with GitHub
          </button>
        </div>

        <p className="text-center text-xs text-gray-500 mb-4">or sign in with email</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm mb-2 text-[#1f2328]">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              className="w-full px-3 py-1 border border-[#d0d7de] rounded-md focus:border-[#0969da] outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="password" className="text-sm text-[#1f2328]">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs text-[#0969da] hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="w-full px-3 py-1 border border-[#d0d7de] rounded-md focus:border-[#0969da] outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 text-sm font-semibold text-white bg-[#2da44e] rounded-md hover:bg-[#2c974b] ${loading ? 'opacity-70' : ''}`}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>

      <div className="w-full max-w-[340px] mt-4 p-4 border border-[#d8dee4] rounded-md text-center">
        <p className="text-sm text-[#1f2328]">
          New here?{' '}
          <Link to="/signup" className="text-[#0969da] hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
