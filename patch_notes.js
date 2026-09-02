import fs from 'fs';

let content = fs.readFileSync('components/NotesSection.tsx', 'utf-8');

// Update selectedNote
content = content.replace(
  'const selectedFolder = folders.find(f => f.id === selectedFolderId);\n  const selectedNote = selectedFolder?.notes.find(n => n.id === selectedNoteId);',
  'const selectedFolder = folders.find(f => f.id === selectedFolderId);\n  const selectedNote = notes.find(n => n.id === selectedNoteId);'
);

// Update auto-save indicator
content = content.replace(
  '  const handleTitleChange = (newTitle: string) => {\n    setActiveNoteTitle(newTitle);\n    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);\n    saveTimeoutRef.current = setTimeout(() => {\n      saveCurrentNote(newTitle, activeNoteContent);\n    }, 600);\n  };',
  `  const handleTitleChange = (newTitle: string) => {
    setActiveNoteTitle(newTitle);
    setSaveStatus('saving');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveCurrentNote(newTitle, activeNoteContent);
      setSaveStatus('saved');
    }, 600);
  };`
);

content = content.replace(
  '  const handleEditorInput = () => {\n    if (editorRef.current) {\n      const html = editorRef.current.innerHTML;\n      setActiveNoteContent(html);\n      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);\n      saveTimeoutRef.current = setTimeout(() => {\n        saveCurrentNote(activeNoteTitle, html);\n      }, 600);\n    }\n  };',
  `  const handleEditorInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setActiveNoteContent(html);
      setSaveStatus('saving');
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveCurrentNote(activeNoteTitle, html);
        setSaveStatus('saved');
      }, 600);
    }
  };`
);

// Filter logic update
const filterOld = `  // Filter notes
  const filteredNotes = selectedFolder?.notes.filter(note =>
    (note.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (note.content || '').toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];`;

const filterNew = `  // Filter notes based on view
  const filteredNotes = notes.filter(note => {
    const matchesSearch = (note.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (note.content || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    
    // Default: don't show deleted notes unless in trash
    const isDeleted = !!note.deleted_at;
    if (currentView === 'trash') return isDeleted;
    if (isDeleted) return false;

    switch (currentView) {
      case 'all': return !note.is_archived;
      case 'inbox': return !note.folder_id && !note.is_archived;
      case 'favorites': return note.is_favorite && !note.is_archived;
      case 'recent': return !note.is_archived; // We will sort by date below
      case 'pinned': return note.is_pinned && !note.is_archived;
      case 'archived': return note.is_archived;
      case 'folder': return note.folder_id === selectedFolderId && !note.is_archived;
      default: return true;
    }
  }).sort((a, b) => {
     if (currentView === 'recent') {
       return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
     }
     return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });`;

content = content.replace(filterOld, filterNew);

// Note creation needs to be updated to handle view
const handleCreateNoteOld = `  const handleCreateNote = async () => {
    if (!selectedFolderId) return;
    const newN = await onAddNote(selectedFolderId);
    if (newN) {
      setSelectedNoteId(newN.id);
    }
  };`;

const handleCreateNoteNew = `  const handleCreateNote = async () => {
    const folderId = currentView === 'folder' ? selectedFolderId : null;
    const newN = await onAddNote(folderId);
    if (newN) {
      setSelectedNoteId(newN.id);
      if (currentView !== 'folder' && currentView !== 'inbox' && currentView !== 'all') {
         setCurrentView('inbox'); // Redirect to a view that will show the new note, or just 'all'
      }
    }
  };`;
content = content.replace(handleCreateNoteOld, handleCreateNoteNew);

// Delete confirmation logic update
content = content.replace(
  'const confirmDeleteNote = async () => {\n    if (noteToDelete && selectedFolderId) {\n      const currentNotes = selectedFolder?.notes || [];',
  'const confirmDeleteNote = async () => {\n    if (noteToDelete) {\n      const currentNotes = filteredNotes;'
);

content = content.replace(
  'await onDeleteNote(noteToDelete.id, selectedFolderId);',
  'await onDeleteNote(noteToDelete.id, noteToDelete.folder_id);'
);


fs.writeFileSync('components/NotesSection.tsx', content);
