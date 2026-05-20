import React, { useState } from 'react';
import { X, Globe, Lock } from 'lucide-react';
import api from '../../services/api';

export default function CreateRepoModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', visibility: 'public' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/repo-api/repos', {
        name: form.name.trim(),
        description: form.description,
        isPrivate: form.visibility === 'private',
      });
      const repo = res.data.payload || res.data;
      onCreated?.(repo);
      onClose();
      setForm({ name: '', description: '', visibility: 'public' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create repository');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-lg bg-white rounded-lg border border-[#d0d7de] shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#d0d7de]">
          <h2 className="text-lg font-semibold text-[#1f2328]">Create a new repository</h2>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-md p-2">{error}</p>
          )}
          <div>
            <label htmlFor="repo-name" className="block text-sm font-medium mb-1">
              Repository name *
            </label>
            <input
              id="repo-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border border-[#d0d7de] rounded-md text-sm"
              required
              pattern="[a-zA-Z0-9._-]+"
              title="Letters, numbers, dots, hyphens, underscores"
            />
          </div>
          <div>
            <label htmlFor="repo-desc" className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              id="repo-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-[#d0d7de] rounded-md text-sm"
            />
          </div>
          <fieldset>
            <legend className="text-sm font-medium mb-2">Visibility</legend>
            <label className="flex items-center gap-2 mb-2 cursor-pointer">
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={form.visibility === 'public'}
                onChange={() => setForm((f) => ({ ...f, visibility: 'public' }))}
              />
              <Globe size={16} className="text-gray-500" />
              <span className="text-sm">Public — anyone can see this repository</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="visibility"
                value="private"
                checked={form.visibility === 'private'}
                onChange={() => setForm((f) => ({ ...f, visibility: 'private' }))}
              />
              <Lock size={16} className="text-gray-500" />
              <span className="text-sm">Private — you choose who can see</span>
            </label>
          </fieldset>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-[#d0d7de] rounded-md hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#2da44e] rounded-md hover:bg-[#2c974b] disabled:opacity-60"
            >
              {loading ? 'Creating…' : 'Create repository'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
