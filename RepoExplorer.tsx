import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import FileTree, { FileNode } from '../../components/explorer/FileTree';
import FileViewer from '../../components/explorer/FileViewer';

interface FileResponse {
  path: string;
  [key: string]: any;
}

const RepoExplorer = () => {
  const { repoId } = useParams<{ repoId: string }>();
  const [tree, setTree] = useState<FileNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchFileList = async () => {
      try {
        const response = await api.get(`/repos/${repoId}/files`);
        const flatFiles = response.data.files || [];
        setTree(buildTree(flatFiles));
      } catch (err) {
        setError('Failed to load repository files.');
      }
    };
    fetchFileList();
  }, [repoId]);

  // Utility to convert flat path list to nested tree
  const buildTree = useCallback((files: FileResponse[]): FileNode[] => {
    const root: FileNode[] = [];
    const map: Record<string, FileNode> = {};

    files.forEach((file) => {
      const parts = file.path.split('/');
      let currentLevel = root;
      let currentPath = '';

      parts.forEach((part: string, index: number) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const isLast = index === parts.length - 1;

        if (!map[currentPath]) {
          const newNode: FileNode = {
            name: part,
            path: currentPath,
            type: isLast ? 'file' : 'dir',
            children: isLast ? undefined : [],
          };
          map[currentPath] = newNode;
          currentLevel.push(newNode);
        }
        currentLevel = map[currentPath].children!;
      });
    });
    return root;
  }, []);

  const fetchFileContent = useCallback(async (path: string) => {
    setLoadingContent(true);
    setSelectedPath(path);
    try {
      const response = await api.get(`/repos/${repoId}/file`, { params: { path } });
      setFileContent(response.data.content || '');
    } catch (err) {
      setError('Failed to load file content.');
    } finally {
      setLoadingContent(false);
    }
  }, [repoId]);

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-900 text-white overflow-hidden">
      {/* Sidebar - File Tree */}
      <div className="w-64 border-r border-gray-700 bg-gray-800/50 flex flex-col">
        <div className="p-3 border-b border-gray-700 flex items-center justify-between">
          <span className="font-semibold text-sm">Explorer</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {error && <div className="p-4 text-xs text-red-400">{error}</div>}
          <FileTree 
            tree={tree} 
            onFileClick={fetchFileContent} 
            selectedPath={selectedPath} 
          />
        </div>
      </div>

      {/* Main Content - File Viewer */}
      <div className="flex-1 flex flex-col bg-gray-900">
        {selectedPath ? (
          <>
            <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center gap-2">
              <span className="text-xs text-gray-400">Path:</span>
              <span className="text-xs font-mono text-indigo-400">{selectedPath}</span>
            </div>
            <div className="flex-1">
              <FileViewer 
                content={fileContent} 
                path={selectedPath} 
                loading={loadingContent} 
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a file to view its content
          </div>
        )}
      </div>
    </div>
  );
};

export default RepoExplorer;