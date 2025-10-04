

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Folder, Note } from '../types';
import PlusIcon from './icons/PlusIcon';
import FolderIcon from './icons/FolderIcon';
import TrashIcon from './icons/TrashIcon';
import ChickenIcon from './ChickenIcon';
import ConfirmationModal from './ConfirmationModal';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import SparklesIcon from './icons/SparklesIcon';
import { GoogleGenAI } from "@google/genai";
import MobileHeader from './MobileHeader';


interface NotesSectionProps {
  folders: Folder[];
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
  isMobile?: boolean;
}

const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return new Intl.DateTimeFormat('es-ES', { hour: 'numeric', minute: '2-digit' }).format(date);
    }
    if (date.toDateString() === yesterday.toDateString()) {
        return 'Ayer';
    }
    return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

const NotesSection: React.FC<NotesSectionProps> = ({ folders, setFolders, isMobile = false }) => {
    const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [draftNote, setDraftNote] = useState<Note | null>(null);
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
    const [editingFolderName, setEditingFolderName] = useState('');
    const [mobileView, setMobileView] = useState<'list' | 'editor'>('list');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isAiMenuOpen, setIsAiMenuOpen] = useState(false);
    const [confirmModalState, setConfirmModalState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
    });

    const folderInputRef = useRef<HTMLInputElement>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);
    const timeoutRef = useRef<number | null>(null);
    const draftRef = useRef(draftNote);
    const aiMenuRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
      draftRef.current = draftNote;
    }, [draftNote]);

    useEffect(() => {
        const activeFolderExists = folders.some(f => f.id === activeFolderId);
        if (!activeFolderId || !activeFolderExists) {
            if (folders.length > 0) setActiveFolderId(folders[0].id);
            else setActiveFolderId(null);
            setActiveNoteId(null);
            setDraftNote(null);
            return;
        }
        const activeFolder = folders.find(f => f.id === activeFolderId);
        if (activeFolder && activeNoteId) {
            const activeNoteExists = activeFolder.notes.some(n => n.id === activeNoteId);
            if (!activeNoteExists) {
                setActiveNoteId(null);
                setDraftNote(null);
            }
        }
    }, [folders, activeFolderId, activeNoteId]);

    useEffect(() => {
        if (editingFolderId && folderInputRef.current) folderInputRef.current.focus();
    }, [editingFolderId]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          if (aiMenuRef.current && !aiMenuRef.current.contains(event.target as Node)) {
            setIsAiMenuOpen(false);
          }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }, []);

    const handleSaveNote = useCallback((noteToSave: Note) => {
        if (!activeFolderId || !noteToSave) return;
        setFolders(prevFolders => prevFolders.map(f =>
            f.id === activeFolderId
                ? { ...f, notes: f.notes.map(n => n.id === noteToSave.id ? { ...noteToSave, updatedAt: new Date().toISOString() } : n).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()) }
                : f
        ));
    }, [activeFolderId, setFolders]);

    useEffect(() => {
        if (draftNote) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = window.setTimeout(() => handleSaveNote(draftNote), 1000);
        }
        return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    }, [draftNote, handleSaveNote]);
    
    useEffect(() => {
      return () => {
          if (draftRef.current) {
              if (timeoutRef.current) clearTimeout(timeoutRef.current);
              handleSaveNote(draftRef.current);
          }
      };
    }, [handleSaveNote]);

    const selectNote = (note: Note) => {
        if (draftNote && draftNote.id !== note.id) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            handleSaveNote(draftNote);
        }
        setActiveNoteId(note.id);
        setDraftNote({ ...note });
        if (isMobile) setMobileView('editor');
    };
    
    const handleSelectFolder = (folderId: string) => {
        setActiveFolderId(folderId);
        setActiveNoteId(null);
        setDraftNote(null);
        if(isMobile) setMobileView('list');
    };

    const handleAddFolder = () => {
        const newFolder: Folder = { id: `folder-${Date.now()}`, name: "Nueva Carpeta", notes: [] };
        setFolders(prev => [newFolder, ...prev]);
        setActiveFolderId(newFolder.id);
        setEditingFolderId(newFolder.id);
        setEditingFolderName(newFolder.name);
        setActiveNoteId(null);
        setDraftNote(null);
        if (isMobile) setMobileView('list');
    };

    const handleRenameFolder = () => {
        if (!editingFolderId) return;
        setFolders(prev => prev.map(f => f.id === editingFolderId ? { ...f, name: editingFolderName.trim() || "Carpeta sin nombre" } : f));
        setEditingFolderId(null);
    };
    
    const closeConfirmModal = () => setConfirmModalState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    const handleDeleteFolder = (folderId: string, folderName: string) => {
        setConfirmModalState({
            isOpen: true, title: 'Eliminar Carpeta', message: `¿Seguro que quieres eliminar la carpeta "${folderName}" y todas sus notas? Esta acción no se puede deshacer.`,
            onConfirm: () => { setFolders(prev => prev.filter(f => f.id !== folderId)); closeConfirmModal(); }
        });
    };

    const handleAddNote = () => {
        if (!activeFolderId) return;
        const newNote: Note = { id: `note-${Date.now()}`, title: "", content: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        setFolders(prev => prev.map(f => f.id === activeFolderId ? { ...f, notes: [newNote, ...f.notes] } : f));
        setActiveNoteId(newNote.id);
        setDraftNote(newNote);
        if (isMobile) setMobileView('editor');
        setTimeout(() => titleInputRef.current?.focus(), 0);
    };

    const handleDeleteNote = (noteId: string, noteTitle: string) => {
        if (!activeFolderId) return;
        const folderId = activeFolderId;
        setConfirmModalState({
            isOpen: true, title: 'Eliminar Nota', message: `¿Seguro que quieres eliminar la nota "${noteTitle || 'Nota sin título'}"?`,
            onConfirm: () => { setFolders(prev => prev.map(f => f.id === folderId ? { ...f, notes: f.notes.filter(n => n.id !== noteId) } : f)); closeConfirmModal(); }
        });
    };
    
    const handleAiAction = async (action: 'summarize' | 'fix' | 'brainstorm' | 'continue') => {
        if (!draftNote || isAiLoading) return;
    
        setIsAiLoading(true);
        setIsAiMenuOpen(false);
    
        let prompt = '';
        const currentContent = draftNote.content;
        const currentTitle = draftNote.title;
    
        switch(action) {
            case 'summarize':
                prompt = `¡Pío, pío! Pollito, resume esta nota para mí en los puntos más importantes. Aquí está el texto:\n\n---\n\n${currentContent}`;
                break;
            case 'fix':
                prompt = `Pollito, por favor corrige la ortografía y gramática del siguiente texto, pero mantén el tono original. No cambies el significado ni agregues nada nuevo. Solo devuelve el texto corregido. Aquí está el texto:\n\n---\n\n${currentContent}`;
                break;
            case 'brainstorm':
                prompt = `¡Hola, pollito! Ayúdame a hacer una lluvia de ideas sobre este tema: "${currentTitle || 'esta nota'}". Dame una lista de puntos o ideas clave en un formato de lista con viñetas.`;
                break;
            case 'continue':
                prompt = `Pollito, continúa escribiendo a partir de este texto, manteniendo el mismo estilo y tema:\n\n---\n\n${currentContent}`;
                break;
        }
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    systemInstruction: "Eres un asistente de escritura para la sección de notas, con la personalidad de 'Pollito Inteligente'. Eres amigable, servicial y llamas al usuario 'pollito'. Ayuda a escribir, resumir y corregir notas de manera clara y positiva. Responde siempre en español y devuelve únicamente el texto solicitado, sin añadir frases introductorias o de despedida."
                }
            });
            const aiText = response.text;
            
            let newContent = '';
            if (action === 'continue') {
                newContent = currentContent ? `${currentContent}\n${aiText}` : aiText;
            } else {
                newContent = aiText;
            }
            
            setDraftNote(prev => prev ? { ...prev, content: newContent, updatedAt: new Date().toISOString() } : null);
        } catch (error) {
            console.error("Notes AI Error:", error);
            setDraftNote(prev => prev ? { ...prev, content: prev.content + "\n\n---\n¡Pío! Lo siento pollito, no pude completar esa tarea. Mis circuitos se cruzaron." } : null);
        } finally {
            setIsAiLoading(false);
        }
    };

    const activeFolder = folders.find(f => f.id === activeFolderId);
    const sortedNotes = activeFolder?.notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()) || [];
    
    const aiActions = [
        { id: 'continue', label: 'Continuar escritura', disabled: !draftNote?.content, tooltip: '' },
        { id: 'summarize', label: 'Resumir nota', disabled: !draftNote?.content || draftNote.content.length < 50, tooltip: 'Necesita al menos 50 caracteres' },
        { id: 'fix', label: 'Corregir ortografía', disabled: !draftNote?.content, tooltip: '' },
        { id: 'brainstorm', label: 'Lluvia de ideas (del título)', disabled: !draftNote?.title, tooltip: 'La nota necesita un título' },
    ];
    
    if (isMobile) {
        return (
            <div className="relative h-full w-full overflow-hidden">
                {/* List View */}
                <div className={`absolute inset-0 transition-transform duration-300 ease-in-out flex flex-col bg-transparent ${mobileView === 'editor' ? '-translate-x-full' : 'translate-x-0'}`}>
                    <MobileHeader title="Notas">
                        <button onClick={handleAddFolder} className="p-2 rounded-full hover:bg-secondary-lighter/50 dark:hover:bg-gray-700/50"><PlusIcon /></button>
                    </MobileHeader>
                     <div className="overflow-y-auto custom-scrollbar p-2">
                        {folders.map(folder => (
                             <div key={folder.id} className="group relative mb-2">
                                <button onClick={() => handleSelectFolder(folder.id)} className={`w-full text-left py-2 px-3 rounded-lg transition-colors duration-200 flex items-center gap-2 text-sm whitespace-nowrap ${activeFolderId === folder.id ? 'bg-primary-light/50 dark:bg-primary/20 text-primary-dark dark:text-primary font-semibold' : 'bg-white/60 dark:bg-gray-700/50 hover:bg-white/90 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>
                                    <FolderIcon /> <span className="truncate">{folder.name}</span>
                                </button>
                            </div>
                        ))}
                     </div>
                     <div className="p-2 flex justify-between items-center border-y border-secondary-light/30 dark:border-gray-700 flex-shrink-0">
                        <h2 className="font-bold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider pl-1">Notas</h2>
                        <button onClick={handleAddNote} disabled={!activeFolderId} className="p-2 rounded-full hover:bg-secondary-lighter/50 dark:hover:bg-gray-700/50 disabled:opacity-50"><PlusIcon /></button>
                    </div>
                     <div className="flex-grow overflow-y-auto custom-scrollbar space-y-2 p-2">
                        {activeFolder && sortedNotes.map(note => (
                            <button key={note.id} onClick={() => selectNote(note)} className={`w-full text-left p-3 rounded-xl transition-all duration-200 bg-white/80 dark:bg-gray-700/70 shadow-sm hover:shadow-md hover:-translate-y-0.5`}>
                                <h4 className={`font-semibold text-sm truncate text-primary-dark dark:text-primary`}>{note.title || "Nueva Nota"}</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">{note.content || "Sin contenido adicional"}</p>
                                <p className="text-right text-xs text-gray-400 dark:text-gray-500 mt-2">{formatDate(note.updatedAt)}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Editor View */}
                 <div className={`absolute inset-0 transition-transform duration-300 ease-in-out flex flex-col bg-secondary-lighter/90 dark:bg-gray-800/95 ${mobileView === 'list' ? 'translate-x-full' : 'translate-x-0'}`}>
                     {draftNote ? (
                        <>
                           <MobileHeader title="">
                                <button onClick={() => setMobileView('list')} className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><ChevronLeftIcon /></button>
                                <div className="flex-grow"></div>
                                <button onClick={() => handleDeleteNote(draftNote.id, draftNote.title)} aria-label="Eliminar nota" className="p-2 rounded-full text-gray-400 dark:text-gray-500 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-500 dark:hover:text-red-400 transition-colors"><TrashIcon /></button>
                           </MobileHeader>
                            <div className="flex-grow flex flex-col p-4 overflow-y-auto custom-scrollbar">
                                <input ref={titleInputRef} type="text" value={draftNote.title} onChange={e => setDraftNote(prev => prev ? { ...prev, title: e.target.value } : null)} placeholder="Título..." className="text-2xl font-bold bg-transparent focus:outline-none mb-4 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" />
                                <textarea value={draftNote.content} onChange={e => setDraftNote(prev => prev ? { ...prev, content: e.target.value } : null)} placeholder="Escribe lo que quieras..." className="flex-grow bg-transparent focus:outline-none resize-none text-gray-700 dark:text-gray-300 leading-relaxed placeholder-gray-400 dark:placeholder-gray-500 text-base" />
                            </div>
                            <footer className="flex-shrink-0 p-2 border-t border-secondary-light/50 dark:border-gray-700 flex items-center justify-between">
                                <div className="text-xs text-gray-500 dark:text-gray-400 pl-2">
                                    Caracteres: {draftNote.content.length}
                                </div>
                                <div className="relative" ref={aiMenuRef}>
                                    <button onClick={() => setIsAiMenuOpen(!isAiMenuOpen)} disabled={isAiLoading} className="flex items-center gap-1.5 bg-primary-light/50 dark:bg-primary/20 text-primary-dark dark:text-primary px-3 py-1.5 rounded-full hover:bg-primary-light dark:hover:bg-primary/40 transition-colors disabled:opacity-50">
                                        {isAiLoading ? <div className="w-4 h-4 border-2 border-primary/50 border-t-primary rounded-full animate-spin"></div> : <SparklesIcon className="h-4 w-4" />}
                                        <span className="text-sm font-semibold">Asistente</span>
                                    </button>
                                    {isAiMenuOpen && (
                                        <div className="absolute bottom-full right-0 mb-2 w-56 bg-white/90 dark:bg-gray-700/90 backdrop-blur-md rounded-lg shadow-xl z-10 animate-pop-in origin-bottom-right p-1">
                                            {aiActions.map(action => (
                                                <button key={action.id} onClick={() => handleAiAction(action.id as any)} disabled={action.disabled || isAiLoading} className="w-full text-left px-3 py-2 text-sm rounded-md transition-colors text-gray-800 dark:text-gray-200 hover:bg-secondary-lighter dark:hover:bg-gray-600 disabled:text-gray-400 dark:disabled:text-gray-500" title={action.disabled ? action.tooltip : ''}>{action.label}</button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </footer>
                        </>
                     ) : null}
                </div>
                 <ConfirmationModal isOpen={confirmModalState.isOpen} onClose={closeConfirmModal} onConfirm={confirmModalState.onConfirm} title={confirmModalState.title} message={confirmModalState.message} confirmText="Eliminar" cancelText="Cancelar"/>
            </div>
        );
    }

    return (
        <div className="flex h-full w-full overflow-hidden">
            {/* Sidebar */}
            <aside className={`w-full md:w-[250px] flex-shrink-0 bg-secondary-lighter/60 md:bg-black/5 dark:bg-gray-900/60 md:dark:bg-black/20 backdrop-blur-sm flex-col h-full border-r border-secondary-light/30 dark:border-gray-700/50 flex`}>
                <div className="p-3 flex justify-between items-center border-b border-secondary-light/30 dark:border-gray-700/50 flex-shrink-0">
                    <h2 className="font-bold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider">Carpetas</h2>
                    <button onClick={handleAddFolder} className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-secondary-light dark:hover:bg-gray-700 hover:text-secondary-dark transition-colors"><PlusIcon /></button>
                </div>
                <div className="overflow-y-auto custom-scrollbar space-y-1 p-2 flex-shrink-0">
                    {folders.map(folder => (
                        <div key={folder.id} className="group relative">
                            {editingFolderId === folder.id ? (
                                <input ref={folderInputRef} type="text" value={editingFolderName} onChange={e => setEditingFolderName(e.target.value)} onBlur={handleRenameFolder} onKeyDown={e => e.key === 'Enter' && handleRenameFolder()} className="w-full py-1.5 px-3 rounded-lg bg-white dark:bg-gray-600 border border-primary dark:border-primary-dark focus:outline-none focus:ring-1 focus:ring-primary text-sm text-gray-900 dark:text-gray-100" />
                            ) : (
                                <button onClick={() => handleSelectFolder(folder.id)} onDoubleClick={() => { setEditingFolderId(folder.id); setEditingFolderName(folder.name); }} className={`w-full text-left py-1.5 px-3 rounded-lg transition-colors duration-200 flex items-center gap-2 text-sm whitespace-nowrap ${activeFolderId === folder.id ? 'bg-primary-light/50 dark:bg-primary/20 text-primary-dark dark:text-primary font-semibold' : 'hover:bg-secondary-lighter/70 dark:hover:bg-gray-700/70 text-gray-700 dark:text-gray-300'}`}>
                                    <FolderIcon /> <span className="truncate">{folder.name}</span>
                                </button>
                            )}
                            {folders.length > 1 && editingFolderId !== folder.id && (
                                <button onClick={() => handleDeleteFolder(folder.id, folder.name)} aria-label={`Eliminar ${folder.name}`} className="absolute top-1/2 -translate-y-1/2 right-2 p-1 rounded-full text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="h-4 w-4" /></button>
                            )}
                        </div>
                    ))}
                </div>
                <div className="mt-auto p-3 flex justify-between items-center border-y border-secondary-light/30 dark:border-gray-700/50 flex-shrink-0">
                    <h2 className="font-bold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider">Notas</h2>
                    <button onClick={handleAddNote} disabled={!activeFolderId} className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-secondary-light dark:hover:bg-gray-700 hover:text-secondary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><PlusIcon /></button>
                </div>
                <div className="flex-grow overflow-y-auto custom-scrollbar space-y-1 p-2">
                    {activeFolder && sortedNotes.map(note => (
                        <button key={note.id} onClick={() => selectNote(note)} className={`w-full text-left p-2 rounded-lg transition-colors duration-200 ${activeNoteId === note.id ? 'bg-white dark:bg-gray-700/80 shadow-sm' : 'hover:bg-secondary-lighter/70 dark:hover:bg-gray-700/70 text-gray-700 dark:text-gray-300'}`}>
                            <h4 className={`font-semibold text-sm truncate ${activeNoteId === note.id ? 'text-primary-dark dark:text-primary' : 'text-gray-800 dark:text-gray-200'}`}>{note.title || "Nueva Nota"}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{note.content || "Sin contenido adicional"}</p>
                        </button>
                    ))}
                    {activeFolder && sortedNotes.length === 0 && (
                        <div className="text-center text-xs text-gray-500 dark:text-gray-400 p-4">Esta carpeta está vacía.</div>
                    )}
                </div>
            </aside>

            {/* Editor */}
            <main className="flex-grow flex flex-col relative">
                {draftNote ? (
                    <>
                        <header className="flex-shrink-0 p-3 flex justify-between items-center border-b border-secondary-light/30 dark:border-gray-700/50">
                            <input ref={titleInputRef} type="text" value={draftNote.title} onChange={e => setDraftNote(prev => prev ? { ...prev, title: e.target.value } : null)} placeholder="Título..." className="text-xl font-bold bg-transparent focus:outline-none w-full text-gray-800 dark:text-gray-100" />
                            <div className="relative" ref={aiMenuRef}>
                                <button onClick={() => setIsAiMenuOpen(!isAiMenuOpen)} disabled={isAiLoading} className="flex items-center gap-1.5 bg-primary-light/50 dark:bg-primary/20 text-primary-dark dark:text-primary px-3 py-1.5 rounded-full hover:bg-primary-light dark:hover:bg-primary/40 transition-colors disabled:opacity-50">
                                    {isAiLoading ? <div className="w-4 h-4 border-2 border-primary/50 border-t-primary rounded-full animate-spin"></div> : <SparklesIcon className="h-4 w-4" />}
                                    <span className="text-sm font-semibold">Asistente</span>
                                </button>
                                {isAiMenuOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-56 bg-white/90 dark:bg-gray-700/90 backdrop-blur-md rounded-lg shadow-xl z-10 animate-pop-in origin-top-right p-1">
                                        {aiActions.map(action => (
                                            <button key={action.id} onClick={() => handleAiAction(action.id as any)} disabled={action.disabled || isAiLoading} className="w-full text-left px-3 py-2 text-sm rounded-md transition-colors text-gray-800 dark:text-gray-200 hover:bg-secondary-lighter dark:hover:bg-gray-600 disabled:text-gray-400 dark:disabled:text-gray-500" title={action.disabled ? action.tooltip : ''}>{action.label}</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button onClick={() => handleDeleteNote(draftNote.id, draftNote.title)} aria-label="Eliminar nota" className="p-2 rounded-full text-gray-400 dark:text-gray-500 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-500 dark:hover:text-red-400 transition-colors"><TrashIcon /></button>
                        </header>
                        <div className="flex-grow flex flex-col p-4 overflow-y-auto custom-scrollbar">
                            <textarea value={draftNote.content} onChange={e => setDraftNote(prev => prev ? { ...prev, content: e.target.value } : null)} placeholder="Escribe lo que quieras..." className="flex-grow bg-transparent focus:outline-none resize-none text-gray-700 dark:text-gray-300 leading-relaxed" />
                        </div>
                        <footer className="flex-shrink-0 p-2 text-xs text-right text-gray-500 dark:text-gray-400">
                            Editado: {formatDate(draftNote.updatedAt)} | Caracteres: {draftNote.content.length}
                        </footer>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                        <ChickenIcon className="w-20 h-20 text-secondary dark:text-secondary-dark opacity-70 mb-4" />
                        <h3 className="font-bold text-lg">Selecciona una nota para verla</h3>
                        <p className="text-sm mt-1">O crea una nueva para empezar a escribir.</p>
                    </div>
                )}
            </main>
            <ConfirmationModal isOpen={confirmModalState.isOpen} onClose={closeConfirmModal} onConfirm={confirmModalState.onConfirm} title={confirmModalState.title} message={confirmModalState.message} confirmText="Eliminar" cancelText="Cancelar"/>
        </div>
    );
};

// FIX: Added default export.
export default NotesSection;