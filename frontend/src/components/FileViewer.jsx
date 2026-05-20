import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FileCode, Copy, Edit, Save, X } from 'lucide-react';
import api from '../services/api';
import MonacoEditor from './editor/MonacoEditor';
import FileBreadcrumbs from './explorer/FileBreadcrumbs';
import { getLanguageFromPath } from '../utils/fileLanguage';

function FileViewer() {
  const { repoId, '*': filePath } = useParams();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [repoInfo, setRepoInfo] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved');
  const autoSaveTimer = useRef(null);

  const language = getLanguageFromPath(filePath);

  const fetchFile = useCallback(async () => {
    try {
      const [repoRes, fileRes] = await Promise.all([
        api.get(`/repo-api/repos/${repoId}`),
        api.get(`/file-api/repos/${repoId}/file`, { params: { path: filePath } }),
      ]);
      setRepoInfo(repoRes.data.payload || repoRes.data);
      const fileContent = fileRes.data.payload?.content ?? '';
      setContent(fileContent);
      setEditedContent(fileContent);
    } catch (err) {
      console.error('Error fetching file', err);
    } finally {
      setLoading(false);
    }
  }, [repoId, filePath]);

  useEffect(() => {
    setLoading(true);
    fetchFile();
  }, [fetchFile]);

  const saveFile = useCallback(
    async (text) => {
      setSaveStatus('saving');
      try {
        await api.patch(
          `/file-api/repos/${repoId}/file`,
          { content: text },
          { params: { path: filePath } }
        );
        setContent(text);
        setSaveStatus('saved');
      } catch (err) {
        console.error('Save failed', err);
        setSaveStatus('error');
      }
    },
    [repoId, filePath]
  );

  useEffect(() => {
    if (!isEditing) return undefined;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (editedContent !== content) {
        saveFile(editedContent);
      }
    }, 2500);
    return () => clearTimeout(autoSaveTimer.current);
  }, [editedContent, isEditing, content, saveFile]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
  };

  if (loading) {
    return <div className="p-10 text-center text-gray-500">Reading file…</div>;
  }

  const ownerName = repoInfo?.owner?.username || repoInfo?.owner?.name;
  const lineCount = (isEditing ? editedContent : content).split('\n').length;
  const sizeKb = (new Blob([isEditing ? editedContent : content]).size / 1024).toFixed(2);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <FileBreadcrumbs
        repoId={repoId}
        repoName={repoInfo?.name}
        ownerName={ownerName}
        filePath={filePath}
      />

      <div className="border border-[#d0d7de] rounded-t-md bg-[#f6f8fa] p-2 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileCode size={16} className="text-gray-500" />
          <span className="font-mono text-[#1f2328]">{filePath}</span>
          <span className="text-gray-400">|</span>
          <span>{lineCount} lines</span>
          <span className="text-gray-400">|</span>
          <span>{sizeKb} KB</span>
          <span className="text-gray-400">|</span>
          <span className="text-xs uppercase text-gray-500">{language}</span>
        </div>

        <div className="flex items-center gap-2">
          {isEditing && (
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                saveStatus === 'saving'
                  ? 'bg-yellow-100 text-yellow-800'
                  : saveStatus === 'error'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
              }`}
            >
              {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'error' ? 'Save failed' : 'Saved'}
            </span>
          )}
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => saveFile(editedContent)}
                className="p-1.5 border border-[#d0d7de] rounded-md hover:bg-white text-green-600"
                title="Save (Ctrl+S)"
              >
                <Save size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditedContent(content);
                  setIsEditing(false);
                }}
                className="p-1.5 border border-[#d0d7de] rounded-md hover:bg-white text-gray-600"
              >
                <X size={16} />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={copyToClipboard}
                className="p-1.5 border border-[#d0d7de] rounded-md hover:bg-white"
              >
                <Copy size={16} className="text-gray-600" />
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="p-1.5 border border-[#d0d7de] rounded-md hover:bg-white text-gray-600"
              >
                <Edit size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="border border-t-0 border-[#d0d7de] rounded-b-md overflow-hidden bg-white">
        {isEditing ? (
          <MonacoEditor
            value={editedContent}
            onChange={setEditedContent}
            language={language}
            repoId={repoId}
            filePath={filePath}
            height="70vh"
            onSave={saveFile}
          />
        ) : (
          <SyntaxHighlighter
            language={language === 'plaintext' ? undefined : language}
            style={oneLight}
            showLineNumbers
            customStyle={{ margin: 0, fontSize: '13px', maxHeight: '70vh' }}
            codeTagProps={{ style: { fontFamily: 'ui-monospace, monospace' } }}
          >
            {content}
          </SyntaxHighlighter>
        )}
      </div>
    </div>
  );
}

export default FileViewer;
