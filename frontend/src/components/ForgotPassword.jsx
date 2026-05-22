import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Github, AlertCircle, ArrowLeft } from 'lucide-react';
import api from '../services/api.js';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await api.post('/user-api/users/forgot-password', { email: email.trim() });
      setMessage(res.data.message || 'Check your email for reset instructions.');
      if (res.data.devResetLink) {
        setMessage((prev) => `${prev} (Dev: use link ${res.data.devResetLink})`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] bg-[#f6f8fa] px-4">
      <Github size={40} className="mb-4 text-[#24292f]" />
      <div className="w-full max-w-[400px] p-6 bg-white border border-[#d0d7de] rounded-md shadow-sm">
        <h1 className="text-xl font-semibold text-[#1f2328] mb-2">Reset your password</h1>
        <p className="text-sm text-gray-600 mb-6">
          Enter your account email and we will send you a link to choose a new password (SMTP optional — check server logs in development).
        </p>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
        {message && (
          <div className="p-3 mb-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded-md">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm mb-1 text-[#1f2328]">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2 border border-[#d0d7de] rounded-md focus:border-[#0969da] outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 text-sm font-semibold text-white bg-[#2da44e] rounded-md hover:bg-[#2c974b] disabled:opacity-60"
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <Link to="/login" className="inline-flex items-center gap-2 mt-6 text-sm text-[#0969da] hover:underline">
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </div>
    </div>
  );
}

export default ForgotPassword;
