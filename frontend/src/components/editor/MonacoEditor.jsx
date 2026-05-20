import React, { useRef, useEffect, useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../store/authStore';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD', '#85C1E9'];

function pickColor(id) {
  let hash = 0;
  const s = String(id || '');
  for (let i = 0; i < s.length; i += 1) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

const MonacoEditor = ({
  value,
  onChange,
  language = 'javascript',
  theme = 'vs-dark',
  repoId,
  filePath,
  readOnly = false,
  height = '400px',
  onSave,
}) => {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);
  const remoteApplyRef = useRef(false);
  const emitTimerRef = useRef(null);
  const versionRef = useRef(0);

  const { getSocket, emit, subscribe, joinRepo, leaveRepo } = useSocket();
  const { currentUser } = useAuth();
  const [collaborators, setCollaborators] = useState([]);

  const displayName = currentUser?.username || currentUser?.name || 'You';
  const authUserId = currentUser?._id || currentUser?.id;

  useEffect(() => {
    if (!repoId) return undefined;

    joinRepo(repoId);
    emit('presence:join', {
      repoId,
      username: displayName,
      userId: authUserId,
      filePath,
    });

    const socketId = getSocket()?.id;

    const handleFileEditUpdate = (data) => {
      if (data.filePath !== filePath) return;
      if (data.userId === socketId || data.authUserId === authUserId) return;
      if (data.content == null) return;

      const editor = editorRef.current;
      if (!editor) return;

      remoteApplyRef.current = true;
      const model = editor.getModel();
      if (model) {
        editor.executeEdits('remote', [
          {
            range: model.getFullModelRange(),
            text: data.content,
          },
        ]);
        onChange?.(data.content);
      }
      remoteApplyRef.current = false;

      if (data.cursor && data.userId) {
        const deco = editor.deltaDecorations(decorationsRef.current, [
          {
            range: new monacoRef.current.Range(
              data.cursor.lineNumber,
              data.cursor.column,
              data.cursor.lineNumber,
              data.cursor.column + 1
            ),
            options: {
              className: 'collab-cursor-line',
              beforeContentClassName: 'collab-cursor-label',
              hoverMessage: { value: data.username || 'Collaborator' },
            },
          },
        ]);
        decorationsRef.current = deco;
      }
    };

    const handlePresenceJoin = (data) => {
      if (data.socketId === socketId) return;
      setCollaborators((prev) => {
        const id = data.socketId || data.userId;
        if (prev.some((c) => c.id === id)) return prev;
        return [
          ...prev,
          {
            id,
            name: data.username || 'Guest',
            color: pickColor(id),
          },
        ];
      });
    };

    const handlePresenceLeave = (data) => {
      const id = data.socketId || data.userId;
      setCollaborators((prev) => prev.filter((c) => c.id !== id));
    };

    const unsubs = [
      subscribe('file:edit:update', handleFileEditUpdate),
      subscribe('presence:join', handlePresenceJoin),
      subscribe('presence:leave', handlePresenceLeave),
    ];

    return () => {
      emit('presence:leave', { repoId, userId: authUserId, filePath });
      unsubs.forEach((u) => u());
      leaveRepo(repoId);
    };
  }, [repoId, filePath, displayName, authUserId, joinRepo, leaveRepo, emit, subscribe, getSocket, onChange]);

  const scheduleEmit = useCallback(
    (content, cursor) => {
      if (remoteApplyRef.current || !getSocket()?.connected) return;
      clearTimeout(emitTimerRef.current);
      emitTimerRef.current = setTimeout(() => {
        versionRef.current += 1;
        emit('file:edit:update', {
          repoId,
          filePath,
          content,
          cursor,
          username: displayName,
          authUserId,
          version: versionRef.current,
        });
      }, 120);
    },
    [repoId, filePath, displayName, authUserId, emit, getSocket]
  );

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.updateOptions({
      fontSize: 14,
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      wordWrap: 'on',
    });

    editor.onDidChangeCursorPosition((e) => {
      if (remoteApplyRef.current) return;
      scheduleEmit(editor.getValue(), e.position);
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave?.(editor.getValue());
    });

    emit('file:edit:start', {
      repoId,
      filePath,
      username: displayName,
      authUserId,
    });
  };

  const handleEditorChange = (newValue) => {
    if (remoteApplyRef.current) return;
    onChange?.(newValue);
    const pos = editorRef.current?.getPosition();
    scheduleEmit(newValue, pos);
  };

  const handleEditorBlur = () => {
    emit('file:edit:end', { repoId, filePath, authUserId });
  };

  return (
    <div className="relative">
      {collaborators.length > 0 && (
        <div className="absolute top-2 right-2 z-10 flex flex-wrap gap-1 max-w-[50%] justify-end">
          {collaborators.map((c) => (
            <span
              key={c.id}
              className="text-xs px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: c.color }}
            >
              {c.name}
            </span>
          ))}
        </div>
      )}

      <Editor
        height={height}
        language={language}
        value={value}
        theme={theme}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        onBlur={handleEditorBlur}
        options={{
          readOnly,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          minimap: { enabled: true },
          fontSize: 14,
          wordWrap: 'on',
        }}
      />
    </div>
  );
};

export default MonacoEditor;
