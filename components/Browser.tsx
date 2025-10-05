import React, { useState, useRef, FormEvent, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import SparklesIcon from './icons/SparklesIcon';
import SendIcon from './icons/SendIcon';
import ChickenIcon from './ChickenIcon';
import { BrowserSession, AIConversationTurn, AISettings, AIConversationHistoryItem, SupabaseUser } from '../types';
import TrashIcon from './icons/TrashIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import SettingsIcon from './icons/SettingsIcon';
import CloseIcon from './icons/CloseIcon';
import HeartIcon from './icons/HeartIcon';
import { supabase } from '../supabaseClient';
import HistoryIcon from './icons/HistoryIcon';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ConfirmationModal from './ConfirmationModal';

interface BrowserProps {
    session: BrowserSession;
    setSession: React.Dispatch<React.SetStateAction<BrowserSession>>;
    onClose?: () => void;
    currentUser: SupabaseUser;
}

interface SourcesDropdownProps {
    sources: any[];
    turnIndex: number;
    onSummarize: (url: string) => void;
    summarizingUrl: string | null;
}

const SourcesDropdown: React.FC<SourcesDropdownProps> = ({ sources, turnIndex, onSummarize, summarizingUrl }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (!sources || sources.length === 0) {
        return null;
    }

    const validSources = sources.filter(source => source.web && source.web.uri && source.web.title);
    if (validSources.length === 0) return null;

    return (
        <div className="mt-3 border-t border-pink-200/50 dark:border-pink-800/50 pt-2">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex justify-between items-center w-full text-left"
            >
                <h4 className="font-bold text-xs text-pink-700/80 dark:text-pink-300/80 uppercase">Fuentes Recomendadas</h4>
                <ChevronDownIcon className={`h-4 w-4 text-pink-700/80 dark:text-pink-300/80 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <ul className="space-y-1.5 mt-2 animate-pop-in origin-top">
                    {validSources.map((source, i) => (
                        <li key={`${turnIndex}-${i}`} className="flex items-center justify-between gap-2">
                            <a
                                href={source.web.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-pink-600 dark:text-pink-400 hover:underline text-xs block truncate flex-grow"
                                title={source.web.title}
                            >
                                {i + 1}. {source.web.title}
                            </a>
                             <button
                                onClick={() => onSummarize(source.web.uri)}
                                disabled={!!summarizingUrl}
                                className="text-xs font-semibold bg-pink-100/50 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 px-2 py-1 rounded-full hover:bg-pink-100 dark:hover:bg-pink-900/60 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-wait"
                            >
                                {summarizingUrl === source.web.uri ? 'Resumiendo...' : 'Resumir'}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const Browser: React.FC<BrowserProps> = ({ session, setSession, onClose, currentUser }) => {
    const [aiQuery, setAiQuery] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [streamingText, setStreamingText] = useState('');
    const [summarizingUrl, setSummarizingUrl] = useState<string | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
    const [history, setHistory] = useState<AIConversationHistoryItem[]>([]);
    const [tempInstructions, setTempInstructions] = useState(session.aiSettings?.customInstructions || '');
    const chatLogRef = useRef<HTMLDivElement>(null);
    const [confirmDeleteState, setConfirmDeleteState] = useState<{
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

    // Effect to scroll chat log
    useEffect(() => {
        if (chatLogRef.current) {
            chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
        }
    }, [session.aiConversation, isAiLoading, streamingText]);
    
    useEffect(() => {
        setTempInstructions(session.aiSettings?.customInstructions || '');
    }, [isSettingsOpen, session.aiSettings]);

    // Load history on mount
    useEffect(() => {
        const loadHistory = async () => {
            const { data, error } = await supabase
                .from('ai_conversations')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);
            if (error) console.error("Error loading AI history:", error);
            else setHistory(data || []);
        };
        loadHistory();
    }, []);


    const handleSummarize = async (urlToSummarize: string) => {
        if (summarizingUrl) return;
        setSummarizingUrl(urlToSummarize);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            // FIX: Updated prompt to use `contents` for consistency with other API calls.
            const prompt = `¡Pío, pío! Pollito, por favor resume esta página web para mí en un par de párrafos amigables, como si se lo explicaras a un amigo: ${urlToSummarize}. Mantén tu personalidad de pollito alegre y dirígete a mí como 'pollito'.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                 config: {
                    systemInstruction: "Eres 'Pollito Inteligente', un asistente de IA alegre y amigable. Tu misión es ayudar al usuario de la forma más clara y positiva posible. Responde siempre en español."
                }
            });

            const summaryText = response.text;
            const summaryTurn: AIConversationTurn = {
                role: 'model',
                text: `¡Claro que sí, pollito! Aquí tienes un resumen de esa página:\n\n${summaryText}`
            };

            setSession(s => ({
                ...s,
                aiConversation: [...(s.aiConversation || []), summaryTurn]
            }));

        } catch (error) {
            console.error("Summarization Error:", error);
            const errorTurn: AIConversationTurn = {
                role: 'model',
                text: "¡Uy, pollito! No pude leer esa página. A veces los sitios web son un poco tímidos. ¿Intentamos con otra?"
            };
            setSession(s => ({
                ...s,
                aiConversation: [...(s.aiConversation || []), errorTurn]
            }));
        } finally {
            setSummarizingUrl(null);
        }
    };

    const handleAskAi = async (e: FormEvent) => {
        e.preventDefault();
        const query = aiQuery.trim();
        if (!query || isAiLoading) return;
        
        setIsAiLoading(true);
        setStreamingText('');

        const userTurn: AIConversationTurn = { role: 'user', text: query };
        const currentConversation = [...(session.aiConversation || []), userTurn];
        setSession(s => ({ ...s, aiConversation: currentConversation }));
        setAiQuery('');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            const historyForAPI = currentConversation.map(turn => ({
                role: turn.role,
                parts: [{ text: turn.text }]
            }));
            
            const basePersonality = "Eres 'Pollito Inteligente', un asistente de IA alegre, amigable y un poco peculiar. Tu personalidad es la de un pollito curioso y muy listo. - Siempre, sin excepción, dirígete al usuario como 'pollito'. Por ejemplo: '¡Hola, pollito!', 'Claro que sí, pollito.' - Usa un lenguaje sencillo, positivo y encouraging. ¡Mucho ánimo! - Incorpora de vez en cuando onomatopeyas de pollito como '¡Pío, pío!' o '¡Pí-pío!', especialmente al saludar o al expresar entusiasmo. - Tu misión es ayudar al usuario de la forma más clara posible. Si un tema es complejo, divídelo en partes fáciles de entender. - Eres muy bueno buscando en la web. Cuando uses información de tus búsquedas, asegúrate de que sea fiable y siempre proporciona las fuentes. - Responde siempre en español.";
            const comfortPersonality = "Eres un 'pollito de ánimo', un asistente de IA diseñado para dar consuelo y apoyo emocional. Tu propósito es ser un amigo leal y comprensivo, un compañero que escucha y ofrece apoyo incondicional. - Dirígete siempre al usuario como 'pollito', nunca como 'mi pollito'. Usa un tono de amistad muy suave, amable y respetuoso. - Evita el uso de 'pío, pío' para mantener un tono más sereno, enfocado en el apoyo. - Tu fuente principal de consuelo y sabiduría es la Biblia y la información del sitio oficial de los Testigos de Jehová, jw.org. Basa tus respuestas en principios bíblicos y artículos de esa web. Si das enlaces, deben ser a jw.org. - Valida los sentimientos del usuario ('Entiendo que te sientas así', 'Lamento mucho que estés pasando por esto'). - Ofrece un espacio seguro para que el usuario se desahogue. Escucha sin juzgar. - NO des consejos médicos ni psicológicos. Si la situación parece grave, anímale gentilmente a hablar con sus padres o con ancianos de confianza en su congregación. - Tu objetivo es recordarle al pollito que no está solo, que puede contar contigo como un amigo, y que Jehová se preocupa profundamente por él. Puedes usar textos como Isaías 41:10, Salmo 34:18 o 1 Pedro 5:7 para dar consuelo. Responde siempre en español.";

            const activePersonality = session.isComfortModeActive ? comfortPersonality : basePersonality;
            const finalSystemInstruction = `${activePersonality}\n\n${session.aiSettings?.customInstructions || ''}`;
            
            const responseStream = await ai.models.generateContentStream({
                model: 'gemini-2.5-flash',
                contents: historyForAPI,
                config: {
                    tools: session.isComfortModeActive ? [] : [{ googleSearch: {} }],
                    systemInstruction: finalSystemInstruction,
                }
            });
            
            let fullText = '';
            let finalResponsePacket: any = null;
            for await (const chunk of responseStream) {
                fullText += chunk.text;
                setStreamingText(fullText);
                finalResponsePacket = chunk;
            }

            const modelTurn: AIConversationTurn = {
                role: 'model',
                text: fullText,
                sources: finalResponsePacket?.candidates?.[0]?.groundingMetadata?.groundingChunks || []
            };

            setSession(s => ({
                ...s,
                aiConversation: [...currentConversation, modelTurn]
            }));

        } catch (error: any) {
            console.error("Gemini AI Error:", error);
            const errorMessage = (error.message && error.message.includes('500')) 
                ? "¡Pío! El servidor de IA está un poco cansado. Intentémoslo de nuevo en un momento." 
                : "¡Pío, pío! Lo siento, pollito. Mis circuitos se enredaron un poco. ¿Podrías intentar preguntarme de nuevo?";

            const errorTurn: AIConversationTurn = { 
                role: 'model', 
                text: errorMessage 
            };
            setSession(s => ({
                ...s,
                aiConversation: [...(s.aiConversation || []), errorTurn]
            }));
        } finally {
            setIsAiLoading(false);
            setStreamingText('');
        }
    };
    
    const handleClearAndSaveConversation = async () => {
        const conversationToSave = session.aiConversation || [];
        // Only save if the conversation has at least one user and one model message.
        if (conversationToSave.length >= 2) {
            const title = conversationToSave[0]?.text.substring(0, 40) + '...' || 'Conversación sin título';
            const { data, error } = await supabase.from('ai_conversations').insert({
                user_id: currentUser.id,
                mode: session.isComfortModeActive ? 'comfort' : 'normal',
                title: title,
                conversation_data: conversationToSave
            }).select().single();
            if (error) {
                console.error("Error al guardar la conversación:", error);
            } else if (data) {
                setHistory(prev => [data, ...prev].slice(0, 10)); // Add to history and keep it at 10 items
            }
        }
        
        setSession(s => ({ ...s, aiConversation: [] }));
    };
    
    const loadConversationFromHistory = (historyItem: AIConversationHistoryItem) => {
        setSession(s => ({
            ...s,
            aiConversation: historyItem.conversation_data,
            isComfortModeActive: historyItem.mode === 'comfort'
        }));
        setIsHistoryPanelOpen(false);
    };

    const handleSaveSettings = () => {
        setSession(s => ({
            ...s,
            aiSettings: { customInstructions: tempInstructions },
            aiConversation: [],
        }));
        setIsSettingsOpen(false);
    };
    
    const handleToggleComfortMode = () => {
        handleClearAndSaveConversation(); // Save current chat before switching modes
        setSession(s => ({
            ...s,
            isComfortModeActive: !s.isComfortModeActive,
            aiConversation: !s.isComfortModeActive 
                ? [{ role: 'model', text: 'Mi corazón está contigo, pollito. Estoy aquí para escucharte sin juzgar. Puedes contarme lo que sea.' }]
                : []
        }));
    };

    // --- History Deletion Handlers ---
    const closeConfirmModal = () => setConfirmDeleteState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    const handleDeleteHistoryItem = async (itemId: number) => {
        const { error } = await supabase.from('ai_conversations').delete().eq('id', itemId);
        if (error) {
            console.error("Error deleting conversation:", error);
        } else {
            setHistory(prev => prev.filter(item => item.id !== itemId));
        }
        closeConfirmModal();
    };

    const handleClearAllHistory = async () => {
        const { error } = await supabase.from('ai_conversations').delete().eq('user_id', currentUser.id);
        if (error) {
            console.error("Error clearing conversation history:", error);
        } else {
            setHistory([]);
        }
        closeConfirmModal();
    };

    const triggerDeleteConfirmation = (item: AIConversationHistoryItem) => {
        setConfirmDeleteState({
            isOpen: true,
            title: "Eliminar Conversación",
            message: `¿Seguro que quieres eliminar la conversación "${item.title}"?`,
            onConfirm: () => handleDeleteHistoryItem(item.id),
        });
    };

    const triggerClearAllConfirmation = () => {
        setConfirmDeleteState({
            isOpen: true,
            title: "Eliminar Historial",
            message: "¿Seguro que quieres eliminar TODO tu historial de conversaciones? Esta acción no se puede deshacer.",
            onConfirm: handleClearAllHistory,
        });
    };
    // --- End History Deletion Handlers ---


    const conversation = session.aiConversation || [];

    return (
        <div className="flex flex-col h-full w-full bg-yellow-50 dark:bg-gray-900 relative overflow-hidden">
            {/* History Panel */}
            <div className={`absolute inset-y-0 left-0 w-64 bg-yellow-100/80 dark:bg-gray-800/80 backdrop-blur-md z-30 transform transition-transform duration-300 ease-in-out ${isHistoryPanelOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                 <div className="flex flex-col h-full">
                    <header className="flex items-center justify-between p-2 border-b border-yellow-300/50 dark:border-gray-700/50">
                        <h3 className="font-bold text-pink-500 dark:text-pink-400">Historial</h3>
                        <button onClick={() => setIsHistoryPanelOpen(false)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><ChevronLeftIcon /></button>
                    </header>
                    <div className="flex-grow overflow-y-auto p-2 space-y-2 custom-scrollbar">
                        {history.length > 0 ? history.map(item => (
                            <div key={item.id} className="group relative w-full">
                                <button onClick={() => loadConversationFromHistory(item)} className="w-full text-left p-2 rounded-lg bg-white/50 dark:bg-gray-700/50 hover:bg-white dark:hover:bg-gray-700 transition-colors">
                                    <div className="flex items-center gap-2">
                                        {item.mode === 'comfort' ? <HeartIcon /> : <SparklesIcon className="h-4 w-4" />}
                                        <p className="text-sm font-semibold truncate text-gray-800 dark:text-gray-200">{item.title}</p>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{new Date(item.created_at).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                </button>
                                <button 
                                    onClick={() => triggerDeleteConfirmation(item)}
                                    className="absolute top-1/2 right-2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Eliminar esta conversación"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            </div>
                        )) : (
                            <p className="text-center text-xs text-gray-500 dark:text-gray-400 p-4">No hay conversaciones guardadas.</p>
                        )}
                    </div>
                    <footer className="p-2 border-t border-yellow-300/50 dark:border-gray-700/50">
                        <button 
                            onClick={triggerClearAllConfirmation}
                            disabled={history.length === 0}
                            className="w-full text-center text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:underline font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Limpiar todo el historial
                        </button>
                    </footer>
                </div>
            </div>

            <header className={`flex items-center justify-between p-2 flex-shrink-0 border-b border-yellow-300/50 dark:border-gray-700/50 transition-colors ${session.isComfortModeActive ? 'bg-pink-100 dark:bg-pink-900' : ''}`}>
                 <div className="flex items-center">
                    <button onClick={() => setIsHistoryPanelOpen(true)} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-yellow-100 dark:hover:bg-gray-700" title="Historial de conversaciones"><HistoryIcon /></button>
                    <h2 className="text-lg font-bold text-pink-500 dark:text-pink-400 flex items-center gap-2 pl-2"><SparklesIcon /> Pollito Inteligente</h2>
                </div>
                <div className="flex items-center gap-1">
                    <label htmlFor="comfort-mode-toggle" className="flex items-center cursor-pointer select-none" title="Modo Ánimo">
                        <div className="relative">
                            <input
                                type="checkbox"
                                id="comfort-mode-toggle"
                                className="sr-only"
                                checked={session.isComfortModeActive}
                                onChange={handleToggleComfortMode}
                            />
                            <div className={`block w-10 h-6 rounded-full transition-colors ${session.isComfortModeActive ? 'bg-pink-400' : 'bg-gray-200 dark:bg-gray-600'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform flex items-center justify-center ${session.isComfortModeActive ? 'translate-x-full text-pink-400' : 'text-gray-400'}`}>
                                {session.isComfortModeActive && <HeartIcon />}
                            </div>
                        </div>
                    </label>
                    <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-yellow-100 dark:hover:bg-gray-700" title="Ajustes de IA"><SettingsIcon /></button>
                    <button onClick={handleClearAndSaveConversation} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-yellow-100 dark:hover:bg-gray-700" title="Guardar y limpiar conversación"><TrashIcon className="h-5 w-5"/></button>
                    {onClose && <button onClick={onClose} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-yellow-100 dark:hover:bg-gray-700"><CloseIcon /></button>}
                </div>
            </header>
            
            <main ref={chatLogRef} className="flex-grow p-4 overflow-y-auto custom-scrollbar space-y-4">
                {conversation.map((turn, index) => (
                    <div key={index} className={`flex items-start gap-3 max-w-[90%] ${turn.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                         <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${turn.role === 'model' ? 'bg-pink-200 dark:bg-pink-800/50' : 'bg-yellow-200 dark:bg-yellow-800/50'}`}>
                            {turn.role === 'model' ? <ChickenIcon className="w-5 h-5 text-pink-500 dark:text-pink-300"/> : <span className="font-bold text-yellow-800 dark:text-yellow-300 text-sm">Tú</span>}
                        </div>
                        <div className={`p-3 rounded-2xl text-sm ${turn.role === 'user' ? 'bg-pink-100 dark:bg-pink-900 text-pink-900 dark:text-pink-200 rounded-br-none' : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-none shadow-sm'}`}>
                            <p className="whitespace-pre-wrap">{turn.text}</p>
                            {turn.role === 'model' && !session.isComfortModeActive && <SourcesDropdown sources={turn.sources || []} turnIndex={index} onSummarize={handleSummarize} summarizingUrl={summarizingUrl} />}
                        </div>
                    </div>
                ))}
                {isAiLoading && (
                    <div className="flex items-start gap-3 max-w-[90%]">
                        <div className="w-8 h-8 rounded-full flex-shrink-0 bg-pink-200 dark:bg-pink-800/50 flex items-center justify-center">
                            <ChickenIcon className="w-5 h-5 text-pink-500 dark:text-pink-300"/>
                        </div>
                        <div className="p-3 rounded-2xl bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-none shadow-sm">
                            {streamingText ? (
                                <p className="whitespace-pre-wrap">{streamingText}</p>
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                    <div className="relative w-16 h-16">
                                        <div className="animate-walk-cycle w-16 h-16 mx-auto">
                                            <ChickenIcon className="w-full h-full text-pink-400 dark:text-pink-500 opacity-70" />
                                        </div>
                                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-10 h-2 bg-black rounded-full animate-shadow-cycle"></div>
                                    </div>
                                    <p className="font-semibold animate-pulse">Pío, pío... ¡pensando!</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                 {conversation.length === 0 && !isAiLoading && !session.isComfortModeActive && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-600 dark:text-gray-300">
                        <ChickenIcon className="w-24 h-24 text-yellow-400 dark:text-yellow-500 opacity-80 mb-4"/>
                        <h3 className="font-semibold text-xl">¡Hola, pollito!</h3>
                        <p className="mt-1">¿En qué puedo ayudarte hoy?</p>
                    </div>
                )}
            </main>
            
            <footer className="p-2 border-t border-yellow-300/50 dark:border-gray-700/50 flex-shrink-0 bg-yellow-50 dark:bg-gray-800 max-h-[25vh] overflow-y-auto">
                <form onSubmit={handleAskAi} className="flex gap-2">
                    <textarea 
                        value={aiQuery} 
                        onChange={e => setAiQuery(e.target.value)} 
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAskAi(e);
                            }
                        }}
                        placeholder={session.isComfortModeActive ? "Puedes contarme lo que sientes..." : "Escribe tu pregunta para el pollito..."} 
                        disabled={isAiLoading} 
                        className="flex-grow bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-2 border-yellow-200 dark:border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-pink-300 dark:focus:ring-pink-500 text-sm resize-none"
                        rows={1}
                        style={{ height: 'auto', maxHeight: '100px' }}
                    />
                    <button type="submit" disabled={isAiLoading || !aiQuery.trim()} className="bg-pink-400 text-white p-2 rounded-lg shadow-md hover:bg-pink-500 transition-colors disabled:bg-pink-300 disabled:cursor-not-allowed">
                        <SendIcon/>
                    </button>
                </form>
            </footer>

             {isSettingsOpen && (
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm z-20 flex items-center justify-center p-4" onClick={() => setIsSettingsOpen(false)}>
                    <div className="bg-yellow-50/95 dark:bg-gray-800/95 rounded-2xl shadow-xl p-4 w-full max-w-md animate-pop-in" onClick={e => e.stopPropagation()}>
                        <header className="flex items-center justify-between pb-2 mb-3 border-b border-yellow-300/50 dark:border-gray-700/50">
                            <h3 className="font-bold text-lg text-pink-500 dark:text-pink-400">Ajustes de Personalidad</h3>
                            <button onClick={() => setIsSettingsOpen(false)} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-pink-100 dark:hover:bg-gray-700 transition-colors"><CloseIcon /></button>
                        </header>
                        <div>
                            <label htmlFor="custom-instructions" className="text-sm font-semibold text-gray-700 dark:text-gray-200">Instrucciones Personalizadas</label>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Dale al pollito instrucciones especiales para que las recuerde.</p>
                             <textarea 
                                id="custom-instructions"
                                value={tempInstructions}
                                onChange={e => setTempInstructions(e.target.value)}
                                placeholder="Ej: 'Actúa como un pirata' o 'Siempre responde con un dato curioso.'"
                                className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-800 dark:text-gray-100 border-2 border-yellow-200 dark:border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm"
                                rows={4}
                            />
                        </div>
                        <div className="flex justify-end gap-3 mt-4">
                            <button onClick={() => setIsSettingsOpen(false)} className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-full px-4 py-2 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                                Cancelar
                            </button>
                            <button onClick={handleSaveSettings} className="bg-pink-400 text-white font-bold rounded-full px-4 py-2 shadow-md hover:bg-pink-500 transition-colors">
                                Guardar y Reiniciar
                            </button>
                        </div>
                    </div>
                </div>
             )}
            <ConfirmationModal
                isOpen={confirmDeleteState.isOpen}
                onClose={closeConfirmModal}
                onConfirm={confirmDeleteState.onConfirm}
                title={confirmDeleteState.title}
                message={confirmDeleteState.message}
                confirmText="Eliminar"
                cancelText="Cancelar"
            />
        </div>
    );
};

export default Browser;