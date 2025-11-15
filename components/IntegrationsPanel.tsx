import React from 'react';
import { GCalSettings, GoogleCalendar } from '../types';
import CloseIcon from './icons/CloseIcon';
import ChickenIcon from './ChickenIcon';


interface IntegrationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile?: boolean;
  
  // Auth Props (for Google APIs)
  isSignedIn: boolean;
  onAuthClick: () => void;
  isGapiReady: boolean;

  // Google Calendar Props
  gcalSettings: GCalSettings;
  onGCalSettingsChange: (settings: GCalSettings) => void;
  userCalendars: GoogleCalendar[];
}


const IntegrationsPanel: React.FC<IntegrationsPanelProps> = (props) => {
    const { isOpen, onClose, isMobile, isSignedIn, onAuthClick, isGapiReady, gcalSettings, onGCalSettingsChange, userCalendars } = props;
    
    if (!isOpen) return null;

    const panelContent = (
        <div className="flex flex-col h-full">
            <header className="flex items-center justify-between p-4 border-b border-secondary-light/50 dark:border-gray-700/50 flex-shrink-0">
                <h2 className="text-xl font-bold text-primary-dark dark:text-primary">Integraciones</h2>
                <button onClick={onClose} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-primary-light/50 dark:hover:bg-gray-700 hover:text-primary-dark transition-colors"><CloseIcon /></button>
            </header>
            
            <div className="flex-grow overflow-y-auto custom-scrollbar p-4">
                {!isSignedIn ? (
                    <div className="p-4 text-center">
                        <ChickenIcon className="w-16 h-16 text-primary mb-4 mx-auto" />
                        <h3 className="font-bold text-lg text-gray-700 dark:text-gray-300">Conecta tu cuenta de Google</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Para sincronizar con Google Calendar y guardar tus recuerdos en Google Drive, conecta tu cuenta.
                        </p>
                        <button
                            onClick={onAuthClick}
                            disabled={!isGapiReady}
                            className="mt-6 bg-primary text-white font-bold rounded-full px-6 py-3 shadow-md hover:bg-primary-dark transform hover:scale-105 active:scale-95 transition-all duration-200 disabled:bg-primary-light disabled:cursor-wait"
                        >
                            {isGapiReady ? 'Conectar con Google' : 'Cargando...'}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-white/70 dark:bg-gray-800/70 p-3 rounded-xl">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Sincronizar con Google Calendar</span>
                                <div className="relative cursor-pointer" onClick={() => onGCalSettingsChange({ ...gcalSettings, enabled: !gcalSettings.enabled })}>
                                    <input type="checkbox" className="sr-only" checked={gcalSettings.enabled} readOnly />
                                    <div className={`block w-10 h-6 rounded-full transition-colors ${gcalSettings.enabled ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-600'}`}></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${gcalSettings.enabled ? 'translate-x-full' : ''}`}></div>
                                </div>
                            </div>
                            <div className={`mt-3 pt-3 border-t border-secondary-light/50 dark:border-gray-700/50 transition-opacity duration-300 ${!gcalSettings.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Elegir calendario</label>
                                <select
                                    value={gcalSettings.calendarId}
                                    onChange={(e) => onGCalSettingsChange({ ...gcalSettings, calendarId: e.target.value })}
                                    className="w-full mt-1 bg-white/80 dark:bg-gray-700/80 text-gray-800 dark:text-gray-200 border-2 border-secondary-light/50 dark:border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                >
                                    {userCalendars.map(cal => (
                                        <option key={cal.id} value={cal.id}>{cal.summary}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <div className="fixed inset-0 bg-secondary-lighter dark:bg-gray-800 z-[60000] animate-deploy">
                {panelContent}
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60000]" onClick={onClose}>
            <div
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-auto w-full max-w-md bg-secondary-lighter dark:bg-gray-800/90 backdrop-blur-xl shadow-2xl rounded-2xl flex flex-col transition-transform duration-300 transform animate-pop-in"
                onClick={e => e.stopPropagation()}
            >
                {panelContent}
            </div>
        </div>
    );
};

export default IntegrationsPanel;
