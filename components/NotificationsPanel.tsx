import React from 'react';
import CloseIcon from './icons/CloseIcon';
import BellIcon from './icons/BellIcon';
import ClipboardListIcon from './icons/ClipboardListIcon';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile?: boolean;
  
  dailyEncouragementHour: number | null;
  onSetDailyEncouragement: (hour: number | null) => void;

  dailySummaryHour: number | null;
  onSetDailySummary: (hour: number | null) => void;

  onSendTestNotification: () => void;
}

const HourSelector: React.FC<{ selectedHour: number | null, onChange: (hour: number | null) => void }> = ({ selectedHour, onChange }) => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return (
        <select 
            value={selectedHour === null ? '' : selectedHour} 
            onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
            className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-800 dark:text-gray-200 border-2 border-secondary-light dark:border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-on-transparent"
        >
            <option value="">Desactivado</option>
            {hours.map(h => (
                <option key={h} value={h}>{`${String(h).padStart(2, '0')}:00`}</option>
            ))}
        </select>
    );
};


const NotificationsPanel: React.FC<NotificationsPanelProps> = (props) => {
    const { isOpen, onClose, isMobile } = props;
    
    if (!isOpen) return null;

    const panelContent = (
        <div className="flex flex-col h-full">
            <header className="flex-shrink-0 p-3 text-center relative border-b border-secondary-light/50 dark:border-gray-700/50 flex items-center justify-center">
                <h3 className="font-bold text-lg text-primary-dark dark:text-primary">Ajustes de Notificaciones</h3>
                <button onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                    <CloseIcon />
                </button>
            </header>
            <main className="flex-grow p-4 overflow-y-auto custom-scrollbar">
                <div className="w-full max-w-sm mx-auto space-y-4">
                    {/* Dosis Diaria */}
                    <div className="bg-white/70 dark:bg-gray-800/70 p-4 rounded-xl">
                        <div className="flex items-center gap-3 mb-2">
                             <div className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary-light/50 dark:bg-secondary/20 text-secondary-dark dark:text-secondary">
                                <BellIcon className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 dark:text-gray-100">Dosis de Ánimo</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Recibe un texto bíblico de ánimo cada día.</p>
                            </div>
                        </div>
                        <HourSelector selectedHour={props.dailyEncouragementHour} onChange={props.onSetDailyEncouragement} />
                    </div>
                    
                    {/* Resumen Diario */}
                    <div className="bg-white/70 dark:bg-gray-800/70 p-4 rounded-xl">
                        <div className="flex items-center gap-3 mb-2">
                             <div className="w-8 h-8 flex items-center justify-center rounded-full bg-primary-light/50 dark:bg-primary/20 text-primary-dark dark:text-primary">
                                <ClipboardListIcon />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 dark:text-gray-100">Resumen Diario</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Recibe un resumen de tus tareas del día.</p>
                            </div>
                        </div>
                        <HourSelector selectedHour={props.dailySummaryHour} onChange={props.onSetDailySummary} />
                    </div>
                    
                    <button
                        onClick={props.onSendTestNotification}
                        className="w-full mt-4 bg-secondary text-white font-bold rounded-full px-4 py-2.5 text-sm shadow-md hover:bg-secondary-dark transition-colors duration-200"
                    >
                        Enviar Notificación de Prueba
                    </button>
                </div>
            </main>
        </div>
    );

    if (isMobile) {
        return (
            <>
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60000] animate-fade-in" onClick={onClose}></div>
                <div className="fixed bottom-0 left-0 right-0 max-h-[90vh] bg-secondary-lighter dark:bg-gray-800 rounded-t-2xl shadow-2xl flex flex-col z-[60001] animate-slide-up" onClick={e => e.stopPropagation()}>
                    {panelContent}
                </div>
            </>
        );
    }
    
     return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60000]" onClick={onClose}>
            <div
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-auto w-full max-w-sm bg-secondary-lighter dark:bg-gray-800/90 backdrop-blur-xl shadow-2xl rounded-2xl flex flex-col transition-transform duration-300 transform animate-pop-in"
                onClick={e => e.stopPropagation()}
            >
                {panelContent}
            </div>
        </div>
    );
};

export default NotificationsPanel;