import React, { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Github, AlertCircle } from 'lucide-react';
import api from '../services/api.js';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenFromUrl = useMemo(() => searchParams.get('token') || '', [searchParams]);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!tokenFromUrl) {
      setError('Missing reset token. Open the link from your email.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/user-api/users/reset-password', {
        token: tokenFromUrl,
        newPassword: password,
      });
      navigate('/login', { replace: true, state: { message: 'Password updated. Sign in with your new password.' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] bg-[#f6f8fa] px-4">
      <Github size={40} className="mb-4 text-[#24292f]" />
      <div className="w-full max-w-[400px] p-6 bg-white border border-[#d0d7de] rounded-md shadow-sm">
        <h1 className="text-xl font-semibold text-[#1f2328] mb-6">Choose a new password</h1>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="pw" className="block text-sm mb-1 text-[#1f2328]">
              New password
            </label>
            <input
              id="pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full px-3 py-2 border border-[#d0d7de] rounded-md outline-none focus:border-[#0969da]"
            />
          </div>
          <div>
            <label htmlFor="pw2" className="block text-sm mb-1 text-[#1f2328]">
              Confirm password
            </label>
            <input
              id="pw2"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              className="w-full px-3 py-2 border border-[#d0d7de] rounded-md outline-none focus:border-[#0969da]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 text-sm font-semibold text-white bg-[#2da44e] rounded-md hover:bg-[#2c974b] disabled:opacity-60"
          >
            {loading ? 'Saving…' : 'Update password'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#0969da]">
          <Link to="/login" className="hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPassword;
