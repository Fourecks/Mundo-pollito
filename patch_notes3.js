import fs from 'fs';

let content = fs.readFileSync('components/NotesSection.tsx', 'utf-8');

// 1. Add new states
const missingStates = `  const [sortOrder, setSortOrder] = useState<'updated' | 'created' | 'title-asc' | 'title-desc'>('updated');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [toc, setToc] = useState<{level: number, text: string}[]>([]);
`;

content = content.replace(
  "  const [showNotesList, setShowNotesList] = useState(true);",
  "  const [showNotesList, setShowNotesList] = useState(true);\n" + missingStates
);

// 2. Add filter and sort logic
const oldFilter = `  // Filter notes based on view
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

const newFilter = `  // Extract all unique tags
  const allTags = Array.from(new Set(notes.flatMap(n => n.tags || [])));

  // Filter notes based on view
  const filteredNotes = notes.filter(note => {
    const matchesSearch = (note.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (note.content || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    
    if (selectedTag && (!note.tags || !note.tags.includes(selectedTag))) return false;

    // Default: don't show deleted notes unless in trash
    const isDeleted = !!note.deleted_at;
    if (currentView === 'trash') return isDeleted;
    if (isDeleted) return false;

    switch (currentView) {
      case 'all': return !note.is_archived;
      case 'inbox': return !note.folder_id && !note.is_archived;
      case 'favorites': return note.is_favorite && !note.is_archived;
      case 'recent': return !note.is_archived; // sorted by date
      case 'pinned': return note.is_pinned && !note.is_archived;
      case 'archived': return note.is_archived;
      case 'folder': return note.folder_id === selectedFolderId && !note.is_archived;
      default: return true;
    }
  }).sort((a, b) => {
     if (currentView === 'recent') {
       return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
     }
     switch(sortOrder) {
       case 'created': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
       case 'title-asc': return a.title.localeCompare(b.title);
       case 'title-desc': return b.title.localeCompare(a.title);
       case 'updated':
       default:
         return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
     }
  });`;

content = content.replace(oldFilter, newFilter);

fs.writeFileSync('components/NotesSection.tsx', content);
