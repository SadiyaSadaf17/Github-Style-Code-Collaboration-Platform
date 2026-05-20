import React, { useState } from 'react';
import api from '../services/api';
import { Repository } from './RepoCard';

interface CreateRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (repo: Repository) => void;
}

const CreateRepoModal: React.FC<CreateRepoModalProps> = ({ isOpen, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/repos', { name, description, isPrivate });
      onCreated(response.data.repository);
      onClose();
      setName('');
      setDescription('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create repository');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-xl">
        <h2 className="text-xl font-bold text-white mb-4">Create a new repository</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Repository name *</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-awesome-project"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description (optional)</label>
            <textarea
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white focus:ring-2 focus:ring-indigo-500 outline-none h-20"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-6 py-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="visibility"
                checked={!isPrivate}
                onChange={() => setIsPrivate(false)}
                className="w-4 h-4 text-indigo-600 bg-gray-900 border-gray-600"
              />
              <span className="text-sm text-gray-300">Public</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="visibility"
                checked={isPrivate}
                onChange={() => setIsPrivate(true)}
                className="w-4 h-4 text-indigo-600 bg-gray-900 border-gray-600"
              />
              <span className="text-sm text-gray-300">Private</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create repository'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRepoModal;