import React, { useState, useEffect, useMemo } from 'react';
import { GalleryImage } from '../types';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import { triggerConfetti } from '../utils/confetti';
import ChickenIcon from './ChickenIcon';

interface Card {
  id: number;
  imageId: string;
  url: string;
}

interface MemoryGameProps {
    images: GalleryImage[];
    onBack: () => void;
    isMobile?: boolean;
}

type GameState = 'selecting-difficulty' | 'playing' | 'solved';

const motivationalMessages = [
    "¡Memoria de pollito campeón! Lo hiciste genial. ✨",
    "¡Felicidades! Cada par encontrado es un recuerdo feliz. ❤️",
    "¡Impresionante! Tu mente está tan afinada como un pío matutino. 🧩",
    "¡Lo lograste! Recordar con cariño es un superpoder.",
];

const difficulties = [
    { label: 'Fácil', pairs: 2, grid: '2x2', size: 4, gridClass: 'grid-cols-2' },
    { label: 'Normal', pairs: 8, grid: '4x4', size: 16, gridClass: 'grid-cols-4' },
    { label: 'Difícil', pairs: 18, grid: '6x6', size: 36, gridClass: 'grid-cols-6' },
];

const MemoryGame: React.FC<MemoryGameProps> = ({ images, onBack, isMobile }) => {
    const [gameState, setGameState] = useState<GameState>('selecting-difficulty');
    const [cards, setCards] = useState<Card[]>([]);
    const [gridClass, setGridClass] = useState('');
    
    const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
    const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
    const [moves, setMoves] = useState(0);
    const [positiveMessage, setPositiveMessage] = useState<string | null>(null);

    const startGame = (pairCount: number, gridCls: string) => {
        const shuffledImages = [...images].sort(() => 0.5 - Math.random());
        const selectedImages = shuffledImages.slice(0, pairCount);

        // FIX: Use `image.id` instead of `image.uuid` as `uuid` does not exist on the `GalleryImage` type.
        const cardPairs = selectedImages.flatMap((image, index) => [
            { id: index * 2, imageId: image.id, url: image.url },
            { id: index * 2 + 1, imageId: image.id, url: image.url },
        ]);

        setCards(cardPairs.sort(() => Math.random() - 0.5));
        setGridClass(gridCls);
        setGameState('playing');
        setFlippedIndices([]);
        setMatchedPairs([]);
        setMoves(0);
    };

    const handleCardClick = (index: number) => {
        if (flippedIndices.length === 2 || flippedIndices.includes(index) || (cards[index] && matchedPairs.includes(cards[index].imageId))) {
            return;
        }

        const newFlippedIndices = [...flippedIndices, index];
        setFlippedIndices(newFlippedIndices);

        if (newFlippedIndices.length === 2) {
            setMoves(moves + 1);
            const firstCard = cards[newFlippedIndices[0]];
            const secondCard = cards[newFlippedIndices[1]];

            if (firstCard.imageId === secondCard.imageId) {
                setMatchedPairs([...matchedPairs, firstCard.imageId]);
                setFlippedIndices([]);
                setPositiveMessage('¡Buen par!');
                setTimeout(() => setPositiveMessage(null), 1000);
            } else {
                setTimeout(() => setFlippedIndices([]), 1200);
            }
        }
    };
    
    const isGameWon = useMemo(() => {
        if (cards.length === 0) return false;
        return matchedPairs.length === cards.length / 2;
    }, [matchedPairs, cards]);

    useEffect(() => {
        if(isGameWon) {
            setTimeout(() => {
                setGameState('solved');
                triggerConfetti();
            }, 500);
        }
    }, [isGameWon]);


    if (gameState === 'selecting-difficulty') {
         return (
            <div className="w-full h-full flex flex-col p-4">
                <header className="p-3 border-b border-secondary-light/30 dark:border-gray-700/50 flex items-center flex-shrink-0 -mx-4 px-4">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><ChevronLeftIcon /></button>
                    <h2 className="font-bold text-lg text-primary-dark dark:text-primary ml-2">Juego de Memoria</h2>
                </header>
                 <div className="flex-grow flex flex-col items-center justify-center text-center">
                    <h2 className="font-bold text-xl text-primary-dark dark:text-primary mb-4">Elige la Dificultad</h2>
                    <div className="flex flex-col sm:flex-row gap-4">
                        {difficulties.map(d => {
                            const hasEnoughImages = images.length >= d.pairs;
                            return (
                                <button
                                    key={d.label}
                                    onClick={() => startGame(d.pairs, d.gridClass)}
                                    disabled={!hasEnoughImages}
                                    className="px-6 py-3 bg-secondary text-white font-bold rounded-full shadow-md hover:bg-secondary-dark transition-transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
                                    title={!hasEnoughImages ? `Necesitas al menos ${d.pairs} imágenes en tu galería` : ''}
                                >
                                    {d.label} ({d.grid})
                                </button>
                            );
                        })}
                    </div>
                     {images.length === 0 && (
                        <p className="mt-6 text-gray-500 dark:text-gray-400">
                           No tienes imágenes en tu galería. ¡Añade algunas para poder jugar!
                        </p>
                     )}
                 </div>
            </div>
        );
    }
    
    if (gameState === 'playing' || gameState === 'solved') {
        const gridContainerSizeClass = isMobile
            ? 'w-full aspect-square max-w-sm'
            : 'w-full max-w-lg aspect-square';

        return (
             <div className="flex flex-col h-full">
                <header className="p-3 border-b border-secondary-light/30 dark:border-gray-700/50 flex items-center justify-between flex-shrink-0">
                    <button onClick={() => setGameState('selecting-difficulty')} className="flex items-center gap-2 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-sm text-primary-dark dark:text-primary font-semibold"><ChevronLeftIcon /> Dificultad</button>
                    <div className="font-bold text-gray-600 dark:text-gray-300">Movimientos: {moves}</div>
                </header>
                <div className="flex-grow flex items-center justify-center p-2 md:p-4 overflow-auto relative">
                    <div className={`${gridContainerSizeClass} memory-grid-container`}>
                        <div className={`grid ${gridClass} gap-2 w-full h-full`}>
                             {cards.map((card, index) => {
                                const isFlipped = flippedIndices.includes(index) || matchedPairs.includes(card.imageId);
                                return (
                                     <div key={index} className="perspective-1000">
                                        <button 
                                            onClick={() => handleCardClick(index)}
                                            className="relative w-full h-full transition-transform duration-500 transform-style-3d"
                                            style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                                            disabled={isFlipped && matchedPairs.includes(card.imageId)}
                                            aria-label={`Carta ${index + 1}`}
                                        >
                                            <div className="absolute inset-0 w-full h-full bg-primary/70 rounded-lg flex items-center justify-center backface-hidden">
                                                 <ChickenIcon className="w-1/2 h-1/2 text-white/50"/>
                                            </div>
                                            <div className="absolute inset-0 w-full h-full bg-white dark:bg-gray-700 rounded-lg shadow-md backface-hidden transform-rotate-y-180">
                                                <img src={card.url} alt="Recuerdo" className="w-full h-full object-cover rounded-lg" />
                                            </div>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                     {positiveMessage && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/80 dark:bg-black/80 backdrop-blur-sm p-4 rounded-full shadow-lg text-lg font-bold text-secondary-dark dark:text-secondary animate-pop-in pointer-events-none">
                           {positiveMessage}
                        </div>
                    )}

                    {isGameWon && gameState === 'solved' && (
                         <div className="absolute inset-0 bg-white/70 dark:bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4 rounded-xl animate-fade-in">
                            <h2 className="text-2xl md:text-3xl font-bold text-primary-dark dark:text-primary drop-shadow-lg">{motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]}</h2>
                            <button onClick={() => setGameState('selecting-difficulty')} className="mt-6 bg-primary text-white font-bold rounded-full px-8 py-3 shadow-md hover:bg-primary-dark transform hover:scale-105 active:scale-95 transition-all duration-200">Jugar de Nuevo</button>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    
    return null;
};

export default MemoryGame;