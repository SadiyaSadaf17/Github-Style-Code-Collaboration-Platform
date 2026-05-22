import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api.js';
import RepoCodeWorkspace from './explorer/RepoCodeWorkspace';
import { decodeRepoFilePath } from '../utils/repoPaths.js';

function FileViewer() {
  const params = useParams();
  const repoId = params.repoId;
  const filePath = decodeRepoFilePath(params['*'] || params['*filePath'] || '');
  const [repoInfo, setRepoInfo] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshFiles = useCallback(async () => {
    const [repoRes, fileRes] = await Promise.all([
      api.get(`/repo-api/repos/${repoId}`),
      api.get(`/file-api/repos/${repoId}/files`),
    ]);
    setRepoInfo(repoRes.data.payload || repoRes.data);
    setFiles(fileRes.data.payload || fileRes.data || []);
  }, [repoId]);

  useEffect(() => {
    setLoading(true);
    refreshFiles()
      .catch((err) => console.error('Error loading repo', err))
      .finally(() => setLoading(false));
  }, [refreshFiles]);

  if (loading) {
    return <div className="p-10 text-center text-gray-500">Loading workspace…</div>;
  }

  const canWrite =
    repoInfo?.currentUserRole === 'owner' || repoInfo?.currentUserRole === 'collaborator';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <RepoCodeWorkspace
        repoId={repoId}
        repoInfo={repoInfo}
        files={files}
        canWrite={canWrite}
        initialPath={filePath}
        onFilesRefresh={refreshFiles}
        showBreadcrumbs
      />
    </div>
  );
}

export default FileViewer;
