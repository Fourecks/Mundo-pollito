import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Folder, Note } from '../types';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import FolderIcon from './icons/FolderIcon';
import SparklesIcon from './icons/SparklesIcon';
import { GoogleGenAI } from "@google/genai";
import ConfirmationModal from './ConfirmationModal';
import ChevronLeftIcon from './icons/ChevronLeftIcon';

// Debounce helper
const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};

interface NotesSectionProps {
    folders: Folder[];
    onAddFolder: (name: string) => Promise<Folder | null>;
    onUpdateFolder: (folderId: number, name: string) => Promise<void>;
    onDeleteFolder: (folderId: number) => Promise<void>;
    onAddNote: (folderId: number) => Promise<Note | null>;
    onUpdateNote: (note: Note) => Promise<void>;
    onDeleteNote: (noteId: number, folderId: number) => Promise<void>;
    isMobile?: boolean;
}

const NotesSection: React.FC<NotesSectionProps> = ({
    folders,
    onAddFolder,
    onUpdateFolder,
    onDeleteFolder,
    onAddNote,
    onUpdateNote,
    onDeleteNote,
    isMobile = false,
}) => {
    const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
    const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    
    // State for local editing of a note before saving
    const [activeNoteContent, setActiveNoteContent] = useState('');
    const [activeNoteTitle, setActiveNoteTitle] = useState('');

    const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
    const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

    const debouncedContent = useDebounce(activeNoteContent, 1000);
    const debouncedTitle = useDebounce(activeNoteTitle, 1000);

    const editorInitialized = useRef(false);
    
    // Select first folder and note by default
    useEffect(() => {
        if (!selectedFolderId && folders.length > 0) {
            const firstFolderId = folders[0].id;
            setSelectedFolderId(firstFolderId);
        }
    }, [folders, selectedFolderId]);
    
    useEffect(() => {
        const currentFolder = folders.find(f => f.id === selectedFolderId);
        if(currentFolder && (!selectedNoteId || !currentFolder.notes.some(n => n.id === selectedNoteId)) && currentFolder.notes.length > 0) {
           setSelectedNoteId(currentFolder.notes[0].id);
        } else if (currentFolder && currentFolder.notes.length === 0) {
            setSelectedNoteId(null);
        }
    }, [selectedFolderId, folders, selectedNoteId]);

    const selectedFolder = folders.find(f => f.id === selectedFolderId);
    const selectedNote = selectedFolder?.notes.find(n => n.id === selectedNoteId);

    // Update local editor state when selectedNote changes
    useEffect(() => {
        if (selectedNote) {
            setActiveNoteTitle(selectedNote.title);
            setActiveNoteContent(selectedNote.content);
            editorInitialized.current = true;
        } else {
            setActiveNoteTitle('');
            setActiveNoteContent('');
            editorInitialized.current = false;
        }
    }, [selectedNote]);
    
    // Auto-save logic
    useEffect(() => {
        if (selectedNote && editorInitialized.current && (debouncedTitle !== selectedNote.title || debouncedContent !== selectedNote.content)) {
            onUpdateNote({ ...selectedNote, title: debouncedTitle, content: debouncedContent });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedTitle, debouncedContent]);

    const handleSelectNote = (noteId: number) => {
        editorInitialized.current = false; // Prevent auto-save on selection change
        setSelectedNoteId(noteId);
    };
    
    const handleSelectFolder = (folderId: number) => {
        setSelectedFolderId(folderId);
        setSelectedNoteId(null); // Reset note selection
    }

    const handleAddNewNote = async () => {
        if (!selectedFolderId) return;
        const newNote = await onAddNote(selectedFolderId);
        if (newNote) {
            setSelectedNoteId(newNote.id);
        }
    };
    
    const confirmDeleteNote = async () => {
        if (noteToDelete && selectedFolderId) {
            const currentNotes = selectedFolder?.notes || [];
            const noteIndex = currentNotes.findIndex(n => n.id === noteToDelete.id);
            await onDeleteNote(noteToDelete.id, selectedFolderId);
            if(selectedNoteId === noteToDelete.id) {
                const nextNote = currentNotes[noteIndex + 1] || currentNotes[noteIndex - 1] || null;
                setSelectedNoteId(nextNote ? nextNote.id : null);
            }
            setNoteToDelete(null);
        }
    };

    const confirmDeleteFolder = async () => {
        if (folderToDelete) {
            await onDeleteFolder(folderToDelete.id);
            if(selectedFolderId === folderToDelete.id) {
                setSelectedFolderId(folders.length > 0 ? folders[0].id : null);
            }
            setFolderToDelete(null);
        }
    }

    const handleMagicNote = async () => {
        if (!activeNoteContent || isAiLoading) return;
        setIsAiLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            const prompt = `Based on the following notes, generate a short summary and three actionable bullet points. Be concise and clear. Notes:\n\n"${activeNoteContent}"`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            const resultText = response.text;
            
            setActiveNoteContent(prev => `${prev}\n\n✨ **Resumen Mágico:**\n${resultText}`);
        } catch (error) {
            console.error("Gemini AI Error in Notes:", error);
            setActiveNoteContent(prev => `${prev}\n\n✨ **Error:** No se pudo generar el resumen.`);
        } finally {
            setIsAiLoading(false);
        }
    };

    // Filtered notes based on search
    const filteredNotes = selectedFolder?.notes.filter(note =>
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const FolderList = () => (
        <div className="flex flex-col w-full md:w-48 lg:w-64 flex-shrink-0 bg-black/5 dark:bg-black/20 border-r border-secondary-light/30 dark:border-gray-700/50">
            <div className="p-2 border-b border-secondary-light/30 dark:border-gray-700/50 flex justify-between items-center flex-shrink-0">
                <h3 className="font-bold text-primary-dark dark:text-primary text-base px-2">Carpetas</h3>
                <button onClick={() => onAddFolder('Nueva Carpeta')} className="p-2 rounded-full hover:bg-white dark:hover:bg-gray-700 text-primary-dark dark:text-primary"><PlusIcon /></button>
            </div>
            <div className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-1">
                {folders.map(folder => (
                    <button
                        key={folder.id}
                        onClick={() => handleSelectFolder(folder.id)}
                        className={`w-full text-left p-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition-colors ${selectedFolderId === folder.id ? 'bg-primary-light/50 text-primary-dark dark:bg-primary/20 dark:text-primary' : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50'}`}
                    >
                        <FolderIcon />
                        <span className="truncate flex-grow">{folder.name}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{folder.notes.length}</span>
                    </button>
                ))}
            </div>
        </div>
    );
    
     const NoteList = () => (
         <div className={`
             ${isMobile && selectedNoteId ? 'hidden' : ''}
             flex flex-col ${isMobile ? 'w-full h-full' : 'w-48 lg:w-64'} flex-shrink-0 border-r border-secondary-light/30 dark:border-gray-700/50
         `}>
             <div className="p-2 border-b border-secondary-light/30 dark:border-gray-700/50 flex items-center flex-shrink-0">
                 {isMobile && <button onClick={() => setSelectedFolderId(null)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><ChevronLeftIcon /></button>}
                 <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-transparent text-sm w-full focus:outline-none px-2 py-1" />
                 <button onClick={handleAddNewNote} className="p-2 rounded-full text-primary-dark dark:text-primary hover:bg-primary-light/30 dark:hover:bg-primary/10"><PlusIcon/></button>
             </div>
             <div className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-1">
                 {filteredNotes.map(note => (
                     <button key={note.id} onClick={() => handleSelectNote(note.id)} className={`w-full text-left p-2 rounded-lg transition-colors ${selectedNoteId === note.id ? 'bg-primary-light/50 dark:bg-primary/20' : 'hover:bg-white/50 dark:hover:bg-gray-700/50'}`}>
                         <h4 className="font-bold text-sm truncate text-gray-800 dark:text-gray-100">{note.title || 'Nota sin título'}</h4>
                         <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{note.content.substring(0, 30) || 'Sin contenido'}</p>
                     </button>
                 ))}
             </div>
         </div>
     );

    const NoteEditor = () => (
        <div className={`
            ${isMobile && !selectedNoteId ? 'hidden' : 'flex'}
            flex flex-col flex-grow min-w-0 h-full
        `}>
            {selectedNote ? (
                <>
                    <div className="p-2 border-b border-secondary-light/30 dark:border-gray-700/50 flex items-center justify-between flex-shrink-0">
                         {isMobile && <button onClick={() => setSelectedNoteId(null)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><ChevronLeftIcon /></button>}
                         <input type="text" value={activeNoteTitle} onChange={e => setActiveNoteTitle(e.target.value)} placeholder="Título de la nota" className="font-bold text-gray-800 dark:text-gray-100 bg-transparent focus:outline-none w-full px-2 py-1"/>
                         <div className="flex items-center">
                            <button onClick={handleMagicNote} disabled={isAiLoading || !activeNoteContent} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-primary-dark dark:hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed" title="Resumen Mágico">
                                <SparklesIcon className={isAiLoading ? 'animate-pulse' : ''} />
                            </button>
                            <button onClick={() => setNoteToDelete(selectedNote)} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400" title="Eliminar nota"><TrashIcon className="h-5 w-5"/></button>
                         </div>
                    </div>
                    <textarea value={activeNoteContent} onChange={e => setActiveNoteContent(e.target.value)} placeholder="Escribe algo..." className="flex-grow w-full p-4 bg-transparent focus:outline-none resize-none text-sm custom-scrollbar"></textarea>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 p-4">
                    <p>{ selectedFolder && selectedFolder.notes.length > 0 ? 'Selecciona una nota para verla.' : 'Crea una nota para empezar.'}</p>
                </div>
            )}
        </div>
    );
    
    if (isMobile) {
        return (
            <div className="flex flex-col h-full w-full">
                {!selectedFolderId ? <FolderList /> : <NoteList />}
                {selectedNoteId && <NoteEditor />}
                 <ConfirmationModal isOpen={!!noteToDelete} onClose={() => setNoteToDelete(null)} onConfirm={confirmDeleteNote} title="Eliminar Nota" message="¿Seguro que quieres eliminar esta nota?" />
                 <ConfirmationModal isOpen={!!folderToDelete} onClose={() => setFolderToDelete(null)} onConfirm={confirmDeleteFolder} title="Eliminar Carpeta" message="¿Seguro que quieres eliminar esta carpeta y todas sus notas?" />
            </div>
        )
    }

    return (
        <div className="flex h-full w-full">
            <FolderList />
            {selectedFolder && <NoteList />}
            <NoteEditor />
             <ConfirmationModal isOpen={!!noteToDelete} onClose={() => setNoteToDelete(null)} onConfirm={confirmDeleteNote} title="Eliminar Nota" message="¿Seguro que quieres eliminar esta nota?" />
             <ConfirmationModal isOpen={!!folderToDelete} onClose={() => setFolderToDelete(null)} onConfirm={confirmDeleteFolder} title="Eliminar Carpeta" message="¿Seguro que quieres eliminar esta carpeta y todas sus notas?" />
        </div>
    );
};

export default NotesSection;
