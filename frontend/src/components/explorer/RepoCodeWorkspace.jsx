import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { repoBlobUrl } from '../../utils/repoPaths.js';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FileCode, Copy, Edit, Save, X } from 'lucide-react';
import api from '../../services/api.js';
import { useSocket } from '../../contexts/SocketContext';
import MonacoEditor from '../editor/MonacoEditor';
import FileBreadcrumbs from './FileBreadcrumbs';
import VirtualizedFileTree from './VirtualizedFileTree';
import QuickFileOpen from './QuickFileOpen';
import { getLanguageFromPath } from '../../utils/fileLanguage';

function tabKey(repoId, path) {
  return `${repoId}:${path}`;
}

export default function RepoCodeWorkspace({
  repoId,
  repoInfo,
  files,
  canWrite,
  initialPath = '',
  onFilesRefresh,
  showBreadcrumbs = true,
}) {
  const navigate = useNavigate();
  const { subscribe, connected } = useSocket();

  const [openTabs, setOpenTabs] = useState(() => (initialPath ? [initialPath] : []));
  const [activePath, setActivePath] = useState(initialPath || '');
  const [contents, setContents] = useState({});
  const [savedContents, setSavedContents] = useState({});
  const [loadingPath, setLoadingPath] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved');
  const autoSaveTimer = useRef(null);
  const [quickOpen, setQuickOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setQuickOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const loadFile = useCallback(
    async (path) => {
      if (!path) return;
      setLoadingPath(path);
      try {
        const res = await api.get(`/file-api/repos/${repoId}/file`, { params: { path } });
        const text = res.data.payload?.content ?? '';
        setContents((c) => ({ ...c, [path]: text }));
        setSavedContents((c) => ({ ...c, [path]: text }));
      } catch (err) {
        console.error('Failed to load file', err);
      } finally {
        setLoadingPath(null);
      }
    },
    [repoId]
  );

  const openFile = useCallback(
    (path, { newTab = false } = {}) => {
      if (!path) return;
      setOpenTabs((tabs) => {
        if (tabs.includes(path)) return tabs;
        if (newTab) return [...tabs, path];
        return tabs.length ? tabs : [path];
      });
      setActivePath(path);
      if (contents[path] === undefined) loadFile(path);
      navigate(repoBlobUrl(repoId, path), { replace: true });
    },
    [repoId, contents, loadFile, navigate]
  );

  useEffect(() => {
    if (initialPath && initialPath !== activePath) {
      openFile(initialPath);
    }
  }, [initialPath]);

  useEffect(() => {
    const unsubs = [
      subscribe('file:renamed', (data) => {
        if (String(data.repositoryId) !== String(repoId)) return;
        setOpenTabs((tabs) => tabs.map((t) => (t === data.fromPath ? data.toPath : t)));
        setActivePath((p) => (p === data.fromPath ? data.toPath : p));
        onFilesRefresh?.();
      }),
      subscribe('file:deleted', (data) => {
        if (String(data.repositoryId) !== String(repoId)) return;
        setOpenTabs((tabs) => tabs.filter((t) => t !== data.path));
        setActivePath((p) => (p === data.path ? '' : p));
        onFilesRefresh?.();
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [repoId, subscribe, onFilesRefresh]);

  const closeTab = (path, e) => {
    e?.stopPropagation();
    setOpenTabs((tabs) => {
      const next = tabs.filter((t) => t !== path);
      if (activePath === path) {
        const fallback = next[next.length - 1] || '';
        setActivePath(fallback);
        if (fallback) navigate(repoBlobUrl(repoId, fallback), { replace: true });
        else navigate(`/repo/${repoId}`, { replace: true });
      }
      return next;
    });
  };

  const saveFile = useCallback(
    async (path, text) => {
      setSaveStatus('saving');
      try {
        await api.patch(`/file-api/repos/${repoId}/file`, { content: text }, { params: { path } });
        setSavedContents((s) => ({ ...s, [path]: text }));
        setSaveStatus('saved');
      } catch (err) {
        console.error('Save failed', err);
        setSaveStatus('error');
      }
    },
    [repoId]
  );

  const activeContent = activePath ? contents[activePath] ?? '' : '';
  const savedContent = activePath ? savedContents[activePath] ?? '' : '';
  const isDirty = isEditing && activeContent !== savedContent;
  const language = getLanguageFromPath(activePath);

  useEffect(() => {
    if (!isEditing || !activePath || !isDirty) return undefined;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => saveFile(activePath, activeContent), 2500);
    return () => clearTimeout(autoSaveTimer.current);
  }, [activeContent, isEditing, isDirty, activePath, saveFile]);

  const handleRename = async (fromPath) => {
    const toPath = window.prompt('New path', fromPath);
    if (!toPath || toPath === fromPath) return;
    try {
      await api.patch(`/file-api/repos/${repoId}/file/move`, { fromPath, toPath });
      onFilesRefresh?.();
      if (activePath === fromPath) openFile(toPath);
    } catch (err) {
      alert(err.response?.data?.message || 'Rename failed');
    }
  };

  const handleDelete = async (path) => {
    if (!window.confirm(`Delete ${path}?`)) return;
    try {
      await api.delete(`/file-api/repos/${repoId}/file`, { params: { path } });
      onFilesRefresh?.();
      closeTab(path);
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const ownerName = repoInfo?.owner?.username || repoInfo?.owner?.name;

  return (
    <>
    {quickOpen && (
      <QuickFileOpen
        files={files}
        onSelect={(path) => openFile(path)}
        onClose={() => setQuickOpen(false)}
      />
    )}
    <div className="flex border border-[#d0d7de] rounded-md overflow-hidden bg-white min-h-[480px]">
      <div className="w-56 sm:w-64 shrink-0 border-r border-[#d0d7de]">
        <VirtualizedFileTree
          repoId={repoId}
          files={files}
          selectedPath={activePath}
          canWrite={canWrite}
          onSelectFile={openFile}
          onRenameFile={handleRename}
          onDeleteFile={handleDelete}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {openTabs.length > 0 && (
          <div className="flex border-b border-[#d0d7de] bg-[#f6f8fa] overflow-x-auto shrink-0">
            {openTabs.map((path) => {
              const dirty = contents[path] !== savedContents[path];
              return (
                <button
                  key={tabKey(repoId, path)}
                  type="button"
                  onClick={() => openFile(path)}
                  className={`group flex items-center gap-1 px-3 py-2 text-xs font-mono border-r border-[#d0d7de] max-w-[200px] shrink-0 ${
                    activePath === path ? 'bg-white text-[#0969da] font-semibold' : 'text-gray-600 hover:bg-white/60'
                  }`}
                >
                  <span className="truncate">{path.split('/').pop()}</span>
                  {dirty && <span className="text-[#9a6700]">•</span>}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => closeTab(path, e)}
                    onKeyDown={(e) => e.key === 'Enter' && closeTab(path, e)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-200"
                  >
                    <X size={12} />
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {!activePath ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm p-8">
            Select a file from the tree or press <kbd className="px-1 border rounded mx-1">Ctrl+P</kbd> to quick open.
          </div>
        ) : (
          <>
            {showBreadcrumbs && (
              <div className="px-4 pt-3">
                <FileBreadcrumbs
                  repoId={repoId}
                  repoName={repoInfo?.name}
                  ownerName={ownerName}
                  filePath={activePath}
                />
              </div>
            )}

            <div className="border-t border-[#d0d7de] bg-[#f6f8fa] px-3 py-2 flex flex-wrap justify-between items-center gap-2 mx-4 mt-2 rounded-t-md border border-b-0">
              <div className="flex items-center gap-2 text-sm font-medium min-w-0">
                <FileCode size={16} className="text-gray-500 shrink-0" />
                <span className="font-mono truncate">{activePath}</span>
                {isDirty && (
                  <span className="text-xs text-[#9a6700] font-semibold shrink-0">Unsaved</span>
                )}
                {!connected && isEditing && (
                  <span className="text-xs text-amber-800 bg-amber-100 px-2 py-0.5 rounded shrink-0">
                    Reconnecting…
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isEditing && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      saveStatus === 'saving'
                        ? 'bg-yellow-100 text-yellow-800'
                        : saveStatus === 'error'
                          ? 'bg-red-100 text-red-800'
                          : isDirty
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'error' ? 'Save failed' : isDirty ? 'Edited' : 'Saved'}
                  </span>
                )}
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => saveFile(activePath, activeContent)}
                      className="p-1.5 border border-[#d0d7de] rounded-md hover:bg-white text-green-600"
                      title="Save (Ctrl+S)"
                    >
                      <Save size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setContents((c) => ({ ...c, [activePath]: savedContent }));
                        setIsEditing(false);
                      }}
                      className="p-1.5 border border-[#d0d7de] rounded-md hover:bg-white"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(activeContent)}
                      className="p-1.5 border border-[#d0d7de] rounded-md hover:bg-white"
                    >
                      <Copy size={16} className="text-gray-600" />
                    </button>
                    {canWrite && (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="p-1.5 border border-[#d0d7de] rounded-md hover:bg-white"
                      >
                        <Edit size={16} className="text-gray-600" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 border border-t-0 border-[#d0d7de] mx-4 mb-4 rounded-b-md overflow-hidden bg-white min-h-[360px]">
              {loadingPath === activePath ? (
                <div className="p-8 text-center text-gray-500">Loading…</div>
              ) : isEditing ? (
                <MonacoEditor
                  value={activeContent}
                  onChange={(v) => setContents((c) => ({ ...c, [activePath]: v }))}
                  language={language}
                  repoId={repoId}
                  filePath={activePath}
                  height="min(70vh, 520px)"
                  onSave={(text) => saveFile(activePath, text)}
                  isDirty={isDirty}
                />
              ) : (
                <SyntaxHighlighter
                  language={language === 'plaintext' ? undefined : language}
                  style={oneLight}
                  showLineNumbers
                  customStyle={{ margin: 0, fontSize: '13px', maxHeight: '70vh' }}
                >
                  {activeContent}
                </SyntaxHighlighter>
              )}
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
}
