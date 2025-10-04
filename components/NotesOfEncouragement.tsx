import React, { useState, useMemo, useEffect, useRef } from 'react';
import { EncouragementNote } from '../types';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import SettingsIcon from './icons/SettingsIcon';
import CloseIcon from './icons/CloseIcon';
import ChevronLeftIcon from './icons/ChevronLeftIcon';

interface NotesOfEncouragementProps {
  currentUser: string;
  notes: EncouragementNote[];
  setNotes: React.Dispatch<React.SetStateAction<EncouragementNote[]>>;
  isMobile?: boolean;
  onBack: () => void;
}

const notePositions = [ // percentage values: [top, left]
    [35, 20], [45, 15], [55, 25], [30, 30], [40, 38], 
    [50, 45], [25, 50], [38, 58], [52, 65], [30, 70], [42, 78], [55, 80]
];

const noteColors = [
    { bg: 'bg-pink-400', glow: 'shadow-pink-300' },
    { bg: 'bg-yellow-400', glow: 'shadow-yellow-300' },
    { bg: 'bg-teal-400', glow: 'shadow-teal-300' },
    { bg: 'bg-sky-400', glow: 'shadow-sky-300' },
    { bg: 'bg-purple-400', glow: 'shadow-purple-300' },
    { bg: 'bg-orange-400', glow: 'shadow-orange-300' }
];

const NotesOfEncouragement: React.FC<NotesOfEncouragementProps> = ({ currentUser, notes, setNotes, isMobile, onBack }) => {
    const [view, setView] = useState<'idle' | 'revealed' | 'editing'>('idle');
    const [selectedNote, setSelectedNote] = useState<{note: EncouragementNote, color: typeof noteColors[0], startPos: {x: number, y: number}} | null>(null);
    const [animationState, setAnimationState] = useState<'pre-fly' | 'flying' | 'revealed'>('pre-fly');

    const [newNoteText, setNewNoteText] = useState('');

    const isAdmin = useMemo(() => currentUser.toLowerCase() === 'sito', [currentUser]);
    const customNotes = useMemo(() => notes.filter(n => !n.id.startsWith('d-')), [notes]);

    const handleNoteClick = (note: EncouragementNote, e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const startPos = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        const randomColor = noteColors[Math.floor(Math.random() * noteColors.length)];
        
        setSelectedNote({ note, color: randomColor, startPos });
        setView('revealed');
        setAnimationState('pre-fly');
    };
    
    useEffect(() => {
        if (view === 'revealed') {
            const timer = setTimeout(() => setAnimationState('flying'), 50);
            return () => clearTimeout(timer);
        }
    }, [view]);

    const handleAddNote = () => {
        if (!newNoteText.trim() || !isAdmin) return;
        const newNote: EncouragementNote = { id: `c-${Date.now()}`, text: newNoteText.trim() };
        setNotes(prev => [...prev, newNote]);
        setNewNoteText('');
    };

    const handleDeleteNote = (id: string) => {
        if (!isAdmin) return;
        setNotes(prev => prev.filter(note => note.id !== id));
    };

    const handleReset = () => {
        setView('idle');
        setAnimationState('pre-fly');
        setSelectedNote(null);
    };

    const Stars = useMemo(() => Array.from({ length: 50 }).map((_, i) => (
        <div key={i} className="star" style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            width: `${Math.random() * 2 + 1}px`,
            height: `${Math.random() * 2 + 1}px`,
            animationDelay: `${Math.random() * 10}s`,
        }} />
    )), []);

    if (view === 'editing') {
         return (
            <div className="w-full h-full flex flex-col p-4 bg-yellow-50/50 dark:bg-gray-800/30">
                <header className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="font-bold text-xl text-primary-dark dark:text-primary">Mis Notitas</h2>
                    <button onClick={() => setView('idle')} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><CloseIcon /></button>
                </header>
                <div className="flex-grow space-y-2 overflow-y-auto custom-scrollbar pr-2">
                    {customNotes.map(note => (
                        <div key={note.id} className="bg-white/70 dark:bg-gray-700/70 p-2 rounded-lg flex justify-between items-center group">
                            <p className="text-sm text-gray-700 dark:text-gray-200">{note.text}</p>
                            <button onClick={() => handleDeleteNote(note.id)} className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="h-4 w-4" /></button>
                        </div>
                    ))}
                    {customNotes.length === 0 && (
                        <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">Aún no has añadido notitas personalizadas.</p>
                    )}
                </div>
                <footer className="mt-4 flex gap-2 flex-shrink-0">
                    <input
                        type="text" value={newNoteText} onChange={e => setNewNoteText(e.target.value)}
                        placeholder="Escribe una nueva notita..."
                        className="flex-grow bg-white/80 dark:bg-gray-700/80 text-gray-800 dark:text-gray-100 border-2 border-secondary-light dark:border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                    <button onClick={handleAddNote} className="bg-primary text-white p-2 rounded-lg hover:bg-primary-dark transition-colors"><PlusIcon /></button>
                </footer>
            </div>
        );
    }
    
    return (
        <div className="notes-game-bg">
            {Stars}
            <div className={`w-full h-full flex flex-col items-center justify-center transition-all duration-500 ${view === 'revealed' ? 'animate-fade-out-bg' : ''}`}>
                 <header className="absolute top-0 left-0 p-3 flex items-center justify-between w-full">
                    <button onClick={onBack} className="flex items-center gap-2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-sm text-white font-semibold backdrop-blur-sm"><ChevronLeftIcon className="h-5 w-5 text-white" /> Volver</button>
                    {isAdmin && (
                        <button onClick={() => setView('editing')} className="p-3 bg-white/10 hover:bg-white/20 rounded-full shadow-md text-white backdrop-blur-sm" title="Editar mis notitas">
                            <SettingsIcon />
                        </button>
                    )}
                </header>

                <div className="notes-tree-container relative w-full max-w-2xl aspect-[4/3] -mt-10">
                    <svg viewBox="0 0 400 300" className="absolute inset-0 w-full h-full drop-shadow-2xl">
                        <path d="M200 300 V 200 C 150 150, 150 150, 100 100 S 50 50, 50 0" fill="none" stroke="#4a2511" strokeWidth="10" />
                        <path d="M200 250 C 250 200, 250 200, 300 150 S 350 100, 350 50" fill="none" stroke="#4a2511" strokeWidth="8" />
                        <path d="M150 150 C 100 100, 100 100, 50 50" fill="none" stroke="#4a2511" strokeWidth="6" />
                        <path d="M250 200 C 300 150, 300 150, 350 100" fill="none" stroke="#4a2511" strokeWidth="5" />
                    </svg>
                    {notePositions.map((pos, i) => {
                         const note = notes[i % notes.length];
                         const color = noteColors[i % noteColors.length];
                         return (
                            <button 
                                key={i}
                                onClick={(e) => handleNoteClick(note, e)}
                                className="absolute w-8 h-8 rounded-full light-fruit transition-transform hover:!scale-125"
                                style={{ 
                                    top: `${pos[0]}%`, left: `${pos[1]}%`, 
                                    backgroundColor: `var(--color-primary-light)`,
                                    '--glow-color': `var(--color-primary)`
                                } as React.CSSProperties}
                             />
                        );
                    })}
                </div>
                <h1 className="notes-game-title text-2xl font-bold text-white/90 drop-shadow-lg -mt-4">Elige un fruto de luz</h1>
            </div>

            {view === 'revealed' && selectedNote && (
                <div className="absolute inset-0 flex items-center justify-center p-4">
                    <div 
                        className={`absolute rounded-2xl shadow-2xl ${selectedNote.color.bg}`}
                        style={{
                            '--start-x': `${selectedNote.startPos.x - window.innerWidth / 2}px`,
                            '--start-y': `${selectedNote.startPos.y - window.innerHeight / 2}px`,
                            visibility: animationState === 'pre-fly' ? 'hidden' : 'visible',
                            animationPlayState: animationState === 'flying' ? 'running' : 'paused'
                        } as React.CSSProperties}
                        onAnimationEnd={() => setAnimationState('revealed')}
                    >
                         <div 
                            className={`relative w-80 h-80 flex items-center justify-center p-8 text-center origin-center ${animationState === 'flying' ? 'animate-fly-unfold' : ''}`}
                            style={{transform: animationState === 'revealed' ? 'translate(0, 0) scale(1) rotate(360deg)' : 'translate(var(--start-x), var(--start-y)) scale(0.1) rotate(0deg)'}}
                          >
                           <div className={`font-['Caveat',cursive] text-3xl text-white/90 opacity-0 ${animationState === 'revealed' ? 'animate-reveal-note-content' : ''}`}>
                             {selectedNote.note.text}
                           </div>
                         </div>
                    </div>
                     {animationState === 'revealed' && (
                       <button onClick={handleReset} className="absolute bottom-10 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-primary-dark dark:text-primary font-semibold rounded-full px-6 py-2 shadow-md hover:scale-105 transition-transform animate-pop-in">
                         Otra vez
                       </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotesOfEncouragement;