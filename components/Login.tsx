import React, { useState } from 'react';
import ChickenIcon from './ChickenIcon';
import { supabase } from '../supabaseClient';

interface LoginProps {
    onLogin: (username: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const email = `${username.toLowerCase()}@pollito.app`;

        const { error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            setError('Usuario o contraseña incorrectos.');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-secondary-light via-primary-light to-secondary-lighter dark:from-gray-800 dark:via-primary/50 dark:to-gray-900 flex flex-col items-center justify-center p-6 text-center selection:bg-primary-light selection:text-white">
            <div className="w-full max-w-xs">
                <ChickenIcon className="w-24 h-24 text-primary mx-auto drop-shadow-lg" />
                
                <h1 className="text-4xl font-bold text-primary-dark dark:text-primary mt-4">Bienvenido Pollito</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2 mb-8">Inicia sesión para continuar</p>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Usuario"
                        className="w-full bg-black/5 dark:bg-white/5 backdrop-blur-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-500/80 dark:placeholder:text-gray-400/80 border-0 rounded-xl py-3.5 px-5 focus:outline-none focus:ring-2 focus:ring-primary/70 transition-all duration-300"
                        aria-label="Nombre de usuario"
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Contraseña"
                        className="w-full bg-black/5 dark:bg-white/5 backdrop-blur-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-500/80 dark:placeholder:text-gray-400/80 border-0 rounded-xl py-3.5 px-5 focus:outline-none focus:ring-2 focus:ring-primary/70 transition-all duration-300"
                        aria-label="Contraseña"
                    />

                    {error && (
                        <p className="text-red-500 text-sm pt-2 animate-pop-in">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full !mt-6 bg-primary text-white font-bold rounded-full px-8 py-3.5 shadow-lg hover:bg-primary-dark transform hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:ring-primary disabled:bg-primary-light disabled:cursor-wait"
                    >
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
