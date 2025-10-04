import React, { useState, useEffect, useRef, useCallback } from 'react';
import ExpandIcon from './icons/ExpandIcon';
import ClockIcon from './icons/ClockIcon';
import CloseIcon from './icons/CloseIcon';
import { GalleryImage } from '../types';

const ChevronLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
);

const intervalOptions = [
    { label: '5 seg', value: 5000 },
    { label: '15 seg', value: 15000 },
    { label: '30 seg', value: 30000 },
    { label: '1 min', value: 60000 },
    { label: '5 min', value: 300000 },
];

const MemoriesCarousel: React.FC<{ images: GalleryImage[] }> = ({ images }) => {
    const [currentIndex, setCurrentIndex] = useState(0); // The 'real' index
    const [isPaused, setIsPaused] = useState(false);
    const [slideInterval, setSlideInterval] = useState(60000);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    
    const transitionTimeoutRef = useRef<number | null>(null);
    const intervalRef = useRef<number | null>(null);
    const settingsRef = useRef<HTMLDivElement>(null);

    const [isTransitioning, setIsTransitioning] = useState(true);
    const [slides, setSlides] = useState<string[]>([]);
    const [activeSlide, setActiveSlide] = useState(1);

    useEffect(() => {
        if (images.length > 0) {
            const urls = images.map(img => img.url);
            setSlides([urls[urls.length - 1], ...urls, urls[0]]);
            setCurrentIndex(0);
            setActiveSlide(1);
        } else {
            setSlides([]);
        }
    }, [images]);

    useEffect(() => {
        try {
            const savedInterval = localStorage.getItem('memoriesInterval');
            if (savedInterval) setSlideInterval(parseInt(savedInterval, 10));
        } catch (e) { console.error("Could not load memories interval", e); }
    }, []);

    const changeSlide = useCallback((direction: 'next' | 'prev') => {
        if (transitionTimeoutRef.current || images.length <= 1) return;
        setIsTransitioning(true);
        const newActiveSlide = direction === 'next' ? activeSlide + 1 : activeSlide - 1;
        setActiveSlide(newActiveSlide);

        if (direction === 'next') {
            setCurrentIndex(prev => (prev + 1) % images.length);
        } else {
            setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
        }

        transitionTimeoutRef.current = window.setTimeout(() => {
            if (newActiveSlide === 0) {
                setIsTransitioning(false);
                setActiveSlide(images.length);
            } else if (newActiveSlide === images.length + 1) {
                setIsTransitioning(false);
                setActiveSlide(1);
            }
            transitionTimeoutRef.current = null;
        }, 500);
    }, [activeSlide, images.length]);

    useEffect(() => {
        if (!isPaused && images.length > 1) {
            intervalRef.current = window.setInterval(() => changeSlide('next'), slideInterval);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [isPaused, slideInterval, changeSlide, images.length]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) setIsSettingsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isViewerOpen) return;
            if (e.key === 'ArrowRight') setCurrentIndex(prev => (prev + 1) % images.length);
            if (e.key === 'ArrowLeft') setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
            if (e.key === 'Escape') setIsViewerOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isViewerOpen, images.length]);

    if (images.length === 0) return null;

    const handleSetInterval = (value: number) => {
        setSlideInterval(value);
        localStorage.setItem('memoriesInterval', String(value));
        setIsSettingsOpen(false);
    };

    return (
        <>
            <div
                className="fixed bottom-4 left-4 z-30 w-56 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl shadow-2xl group animate-pop-in hidden md:block"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
            >
                <div className="p-2 bg-black/5 dark:bg-black/20 border-b border-black/10 dark:border-white/10"><h3 className="text-xs font-bold text-gray-600 dark:text-gray-300 tracking-wider uppercase text-center">Recuerdos</h3></div>
                <div className="w-full h-40 overflow-hidden relative bg-black/5 dark:bg-black/20">
                    <div
                        className="flex h-full"
                        style={{
                            transform: `translateX(-${activeSlide * 100}%)`,
                            transition: isTransitioning ? 'transform 500ms ease-in-out' : 'none',
                        }}
                    >
                        {slides.map((src, index) => (
                            <img key={`${src.slice(-20)}-${index}`} src={src} alt="Recuerdo" className="w-full h-full object-contain flex-shrink-0" />
                        ))}
                    </div>
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-between p-2">
                        <button onClick={() => changeSlide('prev')} aria-label="Recuerdo anterior" className="bg-black/40 text-white p-1.5 rounded-full hover:bg-black/60"><ChevronLeftIcon /></button>
                        <div className="flex items-center gap-2">
                             <button onClick={() => setIsSettingsOpen(s => !s)} aria-label="Ajustes de velocidad" className="bg-black/40 text-white p-2 rounded-full hover:bg-black/60 relative"><ClockIcon className="h-4 w-4" /></button>
                            <button onClick={() => setIsViewerOpen(true)} aria-label="Expandir recuerdo" className="bg-black/40 text-white p-2 rounded-full hover:bg-black/60"><ExpandIcon className="h-4 w-4"/></button>
                        </div>
                        <button onClick={() => changeSlide('next')} aria-label="Siguiente recuerdo" className="bg-black/40 text-white p-1.5 rounded-full hover:bg-black/60"><ChevronRightIcon /></button>
                    </div>
                </div>
                 {isSettingsOpen && (
                    <div ref={settingsRef} className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-32 bg-white/90 dark:bg-gray-700/90 backdrop-blur-md rounded-lg shadow-xl z-10 animate-pop-in origin-bottom p-1">
                        {intervalOptions.map(opt => (
                            <button key={opt.value} onClick={() => handleSetInterval(opt.value)} className={`w-full text-left px-3 py-1.5 text-xs rounded-md transition-colors ${slideInterval === opt.value ? 'bg-primary-light/50 dark:bg-primary/20 text-primary-dark dark:text-primary font-semibold' : 'text-gray-700 dark:text-gray-200 hover:bg-secondary-lighter dark:hover:bg-gray-600'}`}>{opt.label}</button>
                        ))}
                    </div>
                )}
            </div>

            {isViewerOpen && images[currentIndex] && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsViewerOpen(false)}>
                    <div className="relative w-full h-full max-w-5xl max-h-[90vh] flex items-center justify-center">
                        <img src={images[currentIndex].url} alt={`Recuerdo ${currentIndex + 1}`} className="object-contain w-auto h-auto max-w-full max-h-full block animate-pop-in" onClick={e => e.stopPropagation()} />
                        <button onClick={e => { e.stopPropagation(); setIsViewerOpen(false); }} aria-label="Cerrar visor" className="absolute top-4 right-4 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full shadow-md z-10 transition-all duration-300"><CloseIcon /></button>
                    </div>
                </div>
            )}
        </>
    );
};

export default MemoriesCarousel;