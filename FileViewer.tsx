import React from 'react';
import Editor from '@monaco-editor/react';

interface FileViewerProps {
  content: string;
  path: string;
  loading: boolean;
}

const getLanguageFromPath = (path: string) => {
  const ext = path.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    json: 'json',
    md: 'markdown',
    css: 'css',
    html: 'html',
  };
  return languageMap[ext || ''] || 'plaintext';
};

const FileViewer: React.FC<FileViewerProps> = ({ content, path, loading }) => {
  if (loading) {
    return <div className="h-full flex items-center justify-center text-gray-400">Loading file...</div>;
  }

  return (
    <Editor
      height="100%"
      theme="vs-dark"
      path={path}
      defaultLanguage={getLanguageFromPath(path)}
      value={content}
      options={{ readOnly: true, minimap: { enabled: true }, fontSize: 14, scrollBeyondLastLine: false }}
    />
  );
};

export default FileViewer;