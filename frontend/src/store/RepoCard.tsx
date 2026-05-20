import React from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export interface Repository {
  _id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  owner: {
    username: string;
  };
  stats: {
    stars: number;
    forks: number;
  };
  updatedAt: string;
}

interface RepoCardProps {
  repo: Repository;
}

const RepoCard: React.FC<RepoCardProps> = ({ repo }) => {
  return (
    <div className="p-5 border-b border-gray-700 hover:bg-gray-800/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Link 
              to={`/${repo.owner.username}/${repo.name}`} 
              className="text-xl font-semibold text-blue-400 hover:underline"
            >
              {repo.name}
            </Link>
            <span className="px-2 py-0.5 text-xs font-medium text-gray-400 border border-gray-600 rounded-full">
              {repo.isPrivate ? 'Private' : 'Public'}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-400 max-w-2xl">
            {repo.description || 'No description provided.'}
          </p>
          <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <span>★</span> {repo.stats.stars}
            </div>
            <div className="flex items-center gap-1">
              <span>⇌</span> {repo.stats.forks}
            </div>
            <span>Updated {formatDistanceToNow(new Date(repo.updatedAt))} ago</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepoCard;