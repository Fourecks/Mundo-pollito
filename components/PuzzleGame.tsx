import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GalleryImage } from '../types';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import { triggerConfetti } from '../utils/confetti';
import ChickenIcon from './ChickenIcon';

interface PuzzleGameProps {
    images: GalleryImage[];
    onBack: () => void;
    isMobile?: boolean;
}

type Piece = { id: number; img: string; correctIndex: number };
type GameState = 'selecting-image' | 'selecting-difficulty' | 'playing' | 'solved';

const motivationalMessages = [
    "¡Lo lograste! Cada pieza en su lugar, como tú, encontrando tu camino. ✨",
    "¡Felicidades! Un recuerdo reconstruido con paciencia y cariño. ❤️",
    "¡Excelente! Ver el cuadro completo es una gran recompensa. 🧩",
    "¡Bien hecho! Has demostrado que con calma, todo toma forma.",
];

const PuzzleGame: React.FC<PuzzleGameProps> = ({ images, onBack, isMobile }) => {
    const [gameState, setGameState] = useState<GameState>('selecting-image');
    const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
    const [difficulty, setDifficulty] = useState(3);
    const [pieces, setPieces] = useState<Piece[]>([]);
    const [boardState, setBoardState] = useState<(Piece | null)[]>([]);
    const [pieceBank, setPieceBank] = useState<Piece[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [draggedPieceId, setDraggedPieceId] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [isOverBank, setIsOverBank] = useState(false);
    const [aspectRatio, setAspectRatio] = useState(1);
    const [heldPiece, setHeldPiece] = useState<{ piece: Piece; fromIndex: number; from: 'bank' | 'board' } | null>(null);


    const draggedItem = useRef<{ piece: Piece; fromIndex: number; from: 'bank' | 'board' } | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const resetGame = () => {
        setGameState('selecting-image');
        setSelectedImage(null);
        setPieces([]);
        setBoardState([]);
        setPieceBank([]);
        setHeldPiece(null);
    };

    const startGame = useCallback(async (image: GalleryImage, diff: number) => {
        setIsLoading(true);
        setDifficulty(diff);
        setGameState('playing');

        const img = new Image();
        img.crossOrigin = "Anonymous"; // Handle potential CORS issues with canvas
        img.src = image.url;
        await new Promise(resolve => { img.onload = resolve; });
        
        setAspectRatio(img.width / img.height);

        const canvas = canvasRef.current;
        if (!canvas) {
            console.error("Canvas not found, aborting game start.");
            setIsLoading(false);
            return;
        }

        const pieceWidth = img.width / diff;
        const pieceHeight = img.height / diff;
        const tempPieces: Piece[] = [];
        
        canvas.width = pieceWidth;
        canvas.height = pieceHeight;
        const ctx = canvas.getContext('2d');

        for (let y = 0; y < diff; y++) {
            for (let x = 0; x < diff; x++) {
                ctx?.clearRect(0, 0, pieceWidth, pieceHeight);
                ctx?.drawImage(img, x * pieceWidth, y * pieceHeight, pieceWidth, pieceHeight, 0, 0, pieceWidth, pieceHeight);
                const dataUrl = canvas.toDataURL();
                const index = y * diff + x;
                tempPieces.push({ id: Math.random(), img: dataUrl, correctIndex: index });
            }
        }
        
        setPieces(tempPieces);
        setPieceBank([...tempPieces].sort(() => Math.random() - 0.5));
        setBoardState(Array(diff * diff).fill(null));
        setIsLoading(false);
    }, []);
    
    useEffect(() => {
        if (gameState === 'playing' && boardState.length > 0 && boardState.every(p => p !== null)) {
            const isSolved = boardState.every((piece, index) => piece && piece.correctIndex === index);
            if (isSolved) {
                setGameState('solved');
                triggerConfetti();
            }
        }
    }, [boardState, gameState]);

    // --- Desktop Drag & Drop Logic ---
    const handleDragStart = (piece: Piece, fromIndex: number, from: 'bank' | 'board') => {
        if (isMobile) return;
        draggedItem.current = { piece, fromIndex, from };
        setDraggedPieceId(piece.id);
    };

    const handleDragEnd = () => {
        if (isMobile) return;
        draggedItem.current = null;
        setDraggedPieceId(null);
        setDragOverIndex(null);
        setIsOverBank(false);
    };

    const handleDrop = (toIndex: number) => {
        if (!draggedItem.current) return;
        const { piece, fromIndex, from } = draggedItem.current;

        const newBoardState = [...boardState];
        const newPieceBank = [...pieceBank];
        
        const targetPiece = newBoardState[toIndex];

        if (from === 'bank') {
            newBoardState[toIndex] = piece;
            newPieceBank.splice(fromIndex, 1);
            if(targetPiece) {
                newPieceBank.push(targetPiece);
            }
        } else { // from === 'board'
            if(targetPiece) { // Swap two board pieces
                [newBoardState[fromIndex], newBoardState[toIndex]] = [newBoardState[toIndex], newBoardState[fromIndex]];
            } else { // Move from board to empty slot
                newBoardState[toIndex] = piece;
                newBoardState[fromIndex] = null;
            }
        }

        setBoardState(newBoardState);
        setPieceBank(newPieceBank.sort(() => Math.random() - 0.5));
        setDragOverIndex(null);
    };
    
    const handleBankDrop = () => {
        if (!draggedItem.current || draggedItem.current.from === 'bank') {
            setIsOverBank(false);
            return;
        }
        
        const { piece, fromIndex } = draggedItem.current;
        const newBoardState = [...boardState];
        const newPieceBank = [...pieceBank];

        newBoardState[fromIndex] = null;
        newPieceBank.push(piece);

        setBoardState(newBoardState);
        setPieceBank(newPieceBank.sort(() => Math.random() - 0.5));
        setIsOverBank(false);
    }

    // --- Mobile Click Logic ---
    const handleMobileClick = (clickedPiece: Piece | null, index: number, from: 'bank' | 'board') => {
        if (!isMobile) return;

        if (heldPiece) {
            // This is the second click (placing the piece)
            draggedItem.current = heldPiece; // Use existing drop logic
            if (from === 'board') {
                handleDrop(index);
            } else { // Clicked on the bank, but we need to drop on a specific piece index to swap. The logic needs to be simpler
                 handleBankDrop();
            }
            draggedItem.current = null;
            setHeldPiece(null);

        } else if (clickedPiece) {
            // This is the first click (picking up a piece)
            setHeldPiece({ piece: clickedPiece, fromIndex: index, from });
        }
    };
    
    const handleBankClick = () => {
        if (isMobile && heldPiece && heldPiece.from === 'board') {
            draggedItem.current = heldPiece;
            handleBankDrop();
            draggedItem.current = null;
            setHeldPiece(null);
        }
    };


    if (isLoading) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                 <ChickenIcon className="w-16 h-16 text-primary animate-pulse" />
                <p className="font-semibold text-gray-600 dark:text-gray-300 mt-4">Cortando las piezas...</p>
                <canvas ref={canvasRef} className="hidden" />
            </div>
        )
    }

    if (gameState === 'selecting-image') {
        return (
            <div className="flex flex-col h-full">
                <header className="p-3 border-b border-secondary-light/30 dark:border-gray-700/50 flex items-center">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><ChevronLeftIcon /></button>
                    <h2 className="font-bold text-lg text-primary-dark dark:text-primary ml-2">Elige un Recuerdo</h2>
                </header>
                {images.length === 0 ? (
                     <div className="flex-grow flex items-center justify-center text-center text-gray-500 dark:text-gray-400">
                        <p>No hay imágenes en tu galería para jugar. <br/>¡Añade algunas primero!</p>
                    </div>
                ) : (
                    <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {images.map(image => (
                                // FIX: Use `image.id` for the key as `uuid` does not exist on the `GalleryImage` type.
                                <button key={image.id} onClick={() => { setSelectedImage(image); setGameState('selecting-difficulty'); }} className="rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 block w-full aspect-square focus:outline-none focus:ring-4 focus:ring-primary">
                                    <img src={image.url} alt="Recuerdo" className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }
    
     if (gameState === 'selecting-difficulty' && selectedImage) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                <img src={selectedImage.url} alt="Seleccionado" className="max-w-xs max-h-48 rounded-lg shadow-xl mb-6" />
                <h2 className="font-bold text-xl text-primary-dark dark:text-primary mb-4">Elige la Dificultad</h2>
                <div className="flex flex-col sm:flex-row gap-4">
                    <button onClick={() => startGame(selectedImage, 3)} className="px-6 py-3 bg-green-400 text-white font-bold rounded-full shadow-md hover:bg-green-500 transition-transform hover:scale-105">Fácil (3x3)</button>
                    <button onClick={() => startGame(selectedImage, 4)} className="px-6 py-3 bg-yellow-400 text-white font-bold rounded-full shadow-md hover:bg-yellow-500 transition-transform hover:scale-105">Medio (4x4)</button>
                    <button onClick={() => startGame(selectedImage, 6)} className="px-6 py-3 bg-red-400 text-white font-bold rounded-full shadow-md hover:bg-red-500 transition-transform hover:scale-105">Difícil (6x6)</button>
                </div>
                 <button onClick={() => setGameState('selecting-image')} className="mt-8 text-sm text-gray-500 hover:text-primary-dark dark:hover:text-primary">Elegir otra imagen</button>
            </div>
        );
    }
    
    if (gameState === 'playing' || gameState === 'solved') {
        const solvedClass = gameState === 'solved' ? 'border-0 gap-0 p-0' : 'border-2 border-dashed border-secondary-light dark:border-gray-600 gap-1 p-1';

        return (
            <div className="flex flex-col h-full">
                <header className="p-3 border-b border-secondary-light/30 dark:border-gray-700/50 flex items-center justify-between flex-shrink-0">
                    <button onClick={resetGame} className="flex items-center gap-2 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-sm text-primary-dark dark:text-primary font-semibold"><ChevronLeftIcon /> Volver</button>
                    <span className="font-bold text-gray-600 dark:text-gray-300">{difficulty}x{difficulty}</span>
                </header>
                <div className="puzzle-game-layout flex-grow flex flex-col items-center justify-center gap-4 p-4 overflow-auto">
                    {/* Game Board */}
                    <div className="puzzle-board-container relative w-full max-w-lg" style={{ aspectRatio: aspectRatio }}>
                        <div 
                            className={`grid ${solvedClass} rounded-xl bg-secondary-lighter/30 dark:bg-gray-800/30 w-full h-full transition-all duration-500`}
                            style={{ 
                                gridTemplateColumns: `repeat(${difficulty}, 1fr)`,
                                gridTemplateRows: `repeat(${difficulty}, 1fr)`
                            }}
                        >
                            {boardState.map((piece, i) => (
                                <div 
                                    key={i} 
                                    className={`transition-all duration-200 ${dragOverIndex === i ? 'bg-primary/20 scale-105' : 'bg-black/5 dark:bg-black/20'} ${heldPiece ? 'cursor-pointer hover:bg-primary/20' : ''}`}
                                    onDragOver={e => { e.preventDefault(); if(!isMobile) setDragOverIndex(i); }}
                                    onDragLeave={() => { if(!isMobile) setDragOverIndex(null); }}
                                    onDrop={() => { if(!isMobile) handleDrop(i); }}
                                    onClick={isMobile ? () => handleMobileClick(piece, i, 'board') : undefined}
                                >
                                    {piece && (
                                        <img 
                                            src={piece.img} 
                                            draggable={!isMobile} 
                                            onDragStart={() => handleDragStart(piece, i, 'board')}
                                            onDragEnd={handleDragEnd}
                                            className={`w-full h-full object-cover transition-all duration-200 ${isMobile ? '' : 'cursor-grab'} ${draggedPieceId === piece.id ? 'opacity-50' : ''} ${heldPiece?.piece.id === piece.id ? 'ring-4 ring-primary-dark ring-offset-2 z-10' : ''}`}
                                            style={{ transition: gameState === 'solved' ? 'opacity 0.5s 0.5s' : '', opacity: gameState === 'solved' ? 0.999 : 1 }} // Opacity trick to trigger transition
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                        {gameState === 'solved' && (
                            <div className="absolute inset-0 bg-white/70 dark:bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl animate-fade-in">
                                <h2 className="text-3xl font-bold text-primary-dark dark:text-primary drop-shadow-lg text-center">{motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]}</h2>
                                <button onClick={resetGame} className="mt-6 bg-primary text-white font-bold rounded-full px-8 py-3 shadow-md hover:bg-primary-dark transform hover:scale-105 active:scale-95 transition-all duration-200">Jugar de Nuevo</button>
                            </div>
                        )}
                    </div>
                    {/* Piece Bank */}
                     {gameState !== 'solved' && (
                        <div 
                            className={`puzzle-bank-container w-full lg:w-56 h-48 lg:h-full rounded-xl p-2 flex-shrink-0 overflow-auto custom-scrollbar transition-all ${isOverBank || (isMobile && heldPiece?.from === 'board') ? 'bg-primary/20 ring-2 ring-primary' : 'bg-white/50 dark:bg-gray-800/50'}`}
                            onDragOver={e => { e.preventDefault(); if (!isMobile && draggedItem.current?.from === 'board') setIsOverBank(true); }}
                            onDragLeave={() => { if(!isMobile) setIsOverBank(false); }}
                            onDrop={() => { if(!isMobile) handleBankDrop(); }}
                            onClick={handleBankClick}
                        >
                            <div className={`grid grid-cols-4 lg:grid-cols-2 gap-2`}>
                                {pieceBank.map((piece, i) => (
                                    <img 
                                        key={piece.id} 
                                        src={piece.img}
                                        draggable={!isMobile}
                                        onDragStart={() => handleDragStart(piece, i, 'bank')}
                                        onDragEnd={handleDragEnd}
                                        onClick={isMobile ? (e) => { e.stopPropagation(); handleMobileClick(piece, i, 'bank'); } : undefined}
                                        className={`w-full object-cover rounded-md shadow-sm transition-all duration-200 ${isMobile ? 'cursor-pointer' : 'cursor-grab'} ${draggedPieceId === piece.id ? 'opacity-50' : ''} ${heldPiece?.piece.id === piece.id ? 'ring-4 ring-primary-dark ring-offset-2 z-10' : ''}`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                 <canvas ref={canvasRef} className="hidden" />
            </div>
        );
    }

    return null;
};

export default PuzzleGame;