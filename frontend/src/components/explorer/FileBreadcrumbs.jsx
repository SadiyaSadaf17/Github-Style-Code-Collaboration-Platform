import React from 'react';
import { Link } from 'react-router-dom';
import { repoBlobUrl } from '../../utils/repoPaths.js';

export default function FileBreadcrumbs({ repoId, repoName, ownerName, filePath }) {
  const segments = filePath ? filePath.split('/').filter(Boolean) : [];

  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-gray-600 mb-4">
      <Link to={`/repo/${repoId}`} className="text-[#0969da] hover:underline font-semibold">
        {ownerName || 'repo'}
      </Link>
      <span>/</span>
      <Link to={`/repo/${repoId}`} className="text-[#0969da] hover:underline font-semibold">
        {repoName || repoId}
      </Link>
      {segments.map((seg, idx) => {
        const partial = segments.slice(0, idx + 1).join('/');
        const isLast = idx === segments.length - 1;
        return (
          <React.Fragment key={partial}>
            <span>/</span>
            {isLast ? (
              <span className="font-mono text-[#1f2328]">{seg}</span>
            ) : (
              <Link
                to={repoBlobUrl(repoId, partial)}
                className="font-mono text-[#0969da] hover:underline"
              >
                {seg}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
