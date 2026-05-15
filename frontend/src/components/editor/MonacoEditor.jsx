import React, { useRef, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useSocket } from '../../contexts/SocketContext';

const MonacoEditor = ({
  value,
  onChange,
  language = 'javascript',
  theme = 'vs-dark',
  repoId,
  filePath,
  readOnly = false,
  height = '400px'
}) => {
  const editorRef = useRef(null);
  const { socket, emit, on, off } = useSocket();
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [collaborators, setCollaborators] = useState([]);

  useEffect(() => {
    if (!socket || !repoId) return;

    // Join repository room for collaboration
    emit('join-repo', repoId);

    // Listen for collaboration events
    const handleFileEditStart = (data) => {
      if (data.filePath === filePath && data.userId !== socket.id) {
        setIsCollaborating(true);
        setCollaborators(prev => [...prev.filter(c => c.id !== data.userId), {
          id: data.userId,
          name: data.username || 'Anonymous',
          color: getRandomColor()
        }]);
      }
    };

    const handleFileEditUpdate = (data) => {
      if (data.filePath === filePath && data.userId !== socket.id) {
        // Handle real-time content sync
        // This would require Operational Transforms for proper sync
        console.log('Collaborative edit:', data);
      }
    };

    const handleFileEditEnd = (data) => {
      if (data.filePath === filePath && data.userId !== socket.id) {
        setCollaborators(prev => prev.filter(c => c.id !== data.userId));
        if (collaborators.length <= 1) {
          setIsCollaborating(false);
        }
      }
    };

    const handlePresenceJoin = (data) => {
      if (data.userId !== socket.id) {
        setCollaborators(prev => [...prev, {
          id: data.userId,
          name: data.username || 'Anonymous',
          color: getRandomColor()
        }]);
      }
    };

    const handlePresenceLeave = (data) => {
      setCollaborators(prev => prev.filter(c => c.id !== data.userId));
    };

    on('file:edit:start', handleFileEditStart);
    on('file:edit:update', handleFileEditUpdate);
    on('file:edit:end', handleFileEditEnd);
    on('presence:join', handlePresenceJoin);
    on('presence:leave', handlePresenceLeave);

    return () => {
      off('file:edit:start', handleFileEditStart);
      off('file:edit:update', handleFileEditUpdate);
      off('file:edit:end', handleFileEditEnd);
      off('presence:join', handlePresenceJoin);
      off('presence:leave', handlePresenceLeave);
      emit('leave-repo', repoId);
    };
  }, [socket, repoId, filePath, emit, on, off]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Configure editor options
    editor.updateOptions({
      fontSize: 14,
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      wordWrap: 'on',
      lineNumbers: 'on',
      renderWhitespace: 'selection',
      bracketPairColorization: { enabled: true }
    });

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Handle save
      console.log('Save triggered');
    });
  };

  const handleEditorChange = (value) => {
    onChange?.(value);

    // Emit collaboration event
    if (socket && repoId && filePath) {
      emit('file:edit:update', {
        repoId,
        filePath,
        content: value,
        cursor: editorRef.current?.getPosition()
      });
    }
  };

  const handleEditorFocus = () => {
    if (socket && repoId && filePath) {
      emit('file:edit:start', {
        repoId,
        filePath,
        username: 'Current User' // This should come from auth context
      });
    }
  };

  const handleEditorBlur = () => {
    if (socket && repoId && filePath) {
      emit('file:edit:end', {
        repoId,
        filePath
      });
    }
  };

  return (
    <div className="relative">
      {/* Collaboration indicator */}
      {isCollaborating && (
        <div className="absolute top-2 right-2 z-10 bg-green-500 text-white px-2 py-1 rounded text-xs">
          {collaborators.length} collaborator{collaborators.length > 1 ? 's' : ''} active
        </div>
      )}

      {/* Collaborator cursors would go here */}
      <div className="collaborator-cursors">
        {collaborators.map(collaborator => (
          <div
            key={collaborator.id}
            className="collaborator-cursor"
            style={{ borderColor: collaborator.color }}
          >
            {collaborator.name}
          </div>
        ))}
      </div>

      <Editor
        height={height}
        language={language}
        value={value}
        theme={theme}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          readOnly,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          minimap: { enabled: true },
          fontSize: 14,
          wordWrap: 'on',
          lineNumbers: 'on',
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true }
        }}
        onFocus={handleEditorFocus}
        onBlur={handleEditorBlur}
      />
    </div>
  );
};

// Utility function for random colors
const getRandomColor = () => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

export default MonacoEditor;