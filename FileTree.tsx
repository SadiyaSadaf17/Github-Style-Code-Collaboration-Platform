import React, { useState } from 'react';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children?: FileNode[];
}

interface FileTreeProps {
  tree: FileNode[];
  onFileClick: (path: string) => void;
  selectedPath: string | null;
}

const FileTree: React.FC<FileTreeProps> = ({ tree, onFileClick, selectedPath }) => {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const renderTree = (nodes: FileNode[]) => {
    return [...nodes]
      .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1))
      .map((node) => {
        const isExpanded = expandedFolders[node.path];
        const isSelected = selectedPath === node.path;

        if (node.type === 'dir') {
          return (
            <div key={node.path} className="select-none">
              <div
                onClick={() => toggleFolder(node.path)}
                className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-gray-800 text-gray-300 transition-colors"
              >
                <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                <span className="font-medium">📁 {node.name}</span>
              </div>
              {isExpanded && node.children && (
                <div className="pl-4 border-l border-gray-700 ml-3">
                  {renderTree(node.children)}
                </div>
              )}
            </div>
          );
        }

        return (
          <div
            key={node.path}
            onClick={() => onFileClick(node.path)}
            className={`px-2 py-1 cursor-pointer hover:bg-gray-800 transition-colors truncate ${
              isSelected ? 'bg-indigo-600/30 text-indigo-400 border-r-2 border-indigo-500' : 'text-gray-400'
            }`}
          >
            📄 {node.name}
          </div>
        );
      });
  };

  return <div className="py-2 text-sm">{renderTree(tree)}</div>;
};

export default FileTree;