import React, { useState } from 'react';
import ChickenIcon from './ChickenIcon';

interface LoginProps {
    onLogin: (username: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const lowerUsername = username.toLowerCase();

        if ((lowerUsername === 'suly' || lowerUsername === 'sito') && password.toLowerCase() === 'pollito') {
            const correctCaseUsername = lowerUsername.charAt(0).toUpperCase() + lowerUsername.slice(1);
            onLogin(correctCaseUsername);
        } else {
            setError('Usuario o contraseña incorrectos.');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-secondary-light via-primary-light to-secondary-lighter dark:from-gray-800 dark:via-primary/50 dark:to-gray-900 flex flex-col items-center justify-center p-4 selection:bg-primary-light selection:text-white">
            <div className="relative z-10 w-full max-w-sm">
                <form 
                    onSubmit={handleSubmit}
                    className="bg-white/70 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 pt-10 text-center"
                >
                    <div className="inline-block p-3 bg-primary-light/50 dark:bg-primary/20 rounded-full mb-4">
                        <ChickenIcon className="w-12 h-12 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold text-primary-dark dark:text-primary mb-2">Bienvenido Pollito</h1>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">Inicia sesión para continuar</p>
                    
                    <div className="space-y-4">
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Usuario"
                            className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-800 dark:text-gray-100 border-2 border-secondary-light dark:border-gray-600 rounded-xl py-3 px-5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300"
                            aria-label="Nombre de usuario"
                        />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Contraseña"
                            className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-800 dark:text-gray-100 border-2 border-secondary-light dark:border-gray-600 rounded-xl py-3 px-5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300"
                            aria-label="Contraseña"
                        />
                    </div>

                    {error && (
                        <p className="text-red-500 text-sm mt-4 animate-pop-in">{error}</p>
                    )}

                    <button
                        type="submit"
                        className="w-full mt-6 bg-primary text-white font-bold rounded-full px-8 py-3 shadow-md hover:bg-primary-dark transform hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                        Entrar
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;