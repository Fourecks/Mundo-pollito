import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { config } from '../config';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        // Inicializar Google Identity Services (GSI) si está disponible
        if (typeof window !== 'undefined' && window.google?.accounts?.id && config.GOOGLE_CLIENT_ID) {
            try {
                window.google.accounts.id.initialize({
                    client_id: config.GOOGLE_CLIENT_ID,
                    callback: async (response: any) => {
                        if (response.credential) {
                            setGoogleLoading(true);
                            setError(null);
                            try {
                                const { error: signInError } = await supabase.auth.signInWithIdToken({
                                    provider: 'google',
                                    token: response.credential,
                                });
                                if (signInError) {
                                    setError(signInError.message || 'Error al iniciar sesión con Google.');
                                }
                            } catch (err: any) {
                                setError(err?.message || 'Error al procesar el inicio de sesión.');
                            } finally {
                                setGoogleLoading(false);
                            }
                        }
                    },
                    auto_select: false,
                    cancel_on_tap_outside: true,
                });
            } catch (e) {
                console.warn('GSI Init:', e);
            }
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setMessage(null);
        setLoading(true);

        const cleanEmail = email.trim();

        if (isSignUp) {
            try {
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email: cleanEmail,
                    password: password,
                });
                if (signUpError) {
                    setError(signUpError.message);
                } else if (data?.user) {
                    if (data.session) {
                        setMessage('¡Cuenta creada correctamente!');
                    } else {
                        setMessage('Cuenta registrada. Ya puedes iniciar sesión con tus credenciales.');
                        setIsSignUp(false);
                    }
                }
            } catch (err: any) {
                setError(err?.message || 'No fue posible crear la cuenta.');
            }
        } else {
            try {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: cleanEmail,
                    password: password,
                });
                if (signInError) {
                    if (signInError.message.toLowerCase().includes('invalid login credentials')) {
                        setError('El correo o la contraseña no son correctos.');
                    } else {
                        setError(signInError.message);
                    }
                }
            } catch (err: any) {
                setError(err?.message || 'Error al iniciar sesión.');
            }
        }
        setLoading(false);
    };

    const handleGoogleLogin = async () => {
        setError(null);
        setMessage(null);
        setGoogleLoading(true);

        try {
            if (window.google?.accounts?.id && config.GOOGLE_CLIENT_ID) {
                window.google.accounts.id.prompt((notification: any) => {
                    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                        performSupabaseOAuth();
                    }
                });
            } else {
                await performSupabaseOAuth();
            }
        } catch (err: any) {
            await performSupabaseOAuth();
        }
    };

    const performSupabaseOAuth = async () => {
        try {
            const { error: oauthError } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                },
            });
            if (oauthError) {
                setError(oauthError.message || 'Error al conectar con Google.');
            }
        } catch (err: any) {
            setError('No fue posible completar la autenticación con Google.');
        } finally {
            setGoogleLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#faf7f2] dark:bg-[#121316] flex flex-col items-center justify-center p-4 sm:p-6 select-none transition-colors duration-200">
            {/* Main Auth Container */}
            <div className="w-full max-w-[390px]">
                
                {/* Brand Identity */}
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-amber-100/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/40 flex items-center justify-center shadow-sm mb-3">
                        <span className="text-3xl filter drop-shadow-sm select-none">🐥</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
                        Pollito Productivo
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[280px]">
                        Tareas, hábitos y concentración en un solo lugar
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white dark:bg-[#1a1c20] rounded-3xl p-6 sm:p-7 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4)] border border-gray-100 dark:border-gray-800/80">
                    
                    {/* Mode Switcher Segmented Control */}
                    <div className="flex p-1 bg-gray-100/90 dark:bg-gray-800/80 rounded-xl mb-5">
                        <button
                            type="button"
                            onClick={() => {
                                setIsSignUp(false);
                                setError(null);
                                setMessage(null);
                            }}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                !isSignUp 
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs' 
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                            }`}
                        >
                            Iniciar sesión
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setIsSignUp(true);
                                setError(null);
                                setMessage(null);
                            }}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                isSignUp 
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs' 
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                            }`}
                        >
                            Crear cuenta
                        </button>
                    </div>

                    {/* Google OAuth Button (Prominent, Standard Pattern) */}
                    <button
                        onClick={handleGoogleLogin}
                        disabled={googleLoading}
                        type="button"
                        className="w-full bg-white dark:bg-gray-800/90 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200 font-medium rounded-xl py-2.5 px-4 text-xs sm:text-[13px] border border-gray-200 dark:border-gray-700/80 shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-3 disabled:opacity-60 cursor-pointer"
                    >
                        {googleLoading ? (
                            <span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-gray-800 dark:border-t-white rounded-full animate-spin" />
                        ) : (
                            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                        )}
                        <span>Continuar con Google</span>
                    </button>

                    {/* Divider */}
                    <div className="relative my-4 flex items-center justify-center">
                        <div className="w-full border-t border-gray-100 dark:border-gray-800" />
                        <span className="absolute px-2.5 bg-white dark:bg-[#1a1c20] text-[11px] text-gray-400 font-normal">
                            o con tu correo
                        </span>
                    </div>

                    {/* Feedback Messages */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50/90 dark:bg-red-950/30 border border-red-200/80 dark:border-red-900/40 rounded-xl flex items-start gap-2.5 text-left animate-in fade-in duration-150">
                            <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed font-medium">{error}</p>
                        </div>
                    )}

                    {message && (
                        <div className="mb-4 p-3 bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40 rounded-xl flex items-start gap-2.5 text-left animate-in fade-in duration-150">
                            <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed font-medium">{message}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-3.5">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 text-left">
                                Correo electrónico
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <Mail size={15} />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="nombre@ejemplo.com"
                                    required
                                    autoComplete="email"
                                    className="w-full bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder:text-gray-400 border border-gray-200 dark:border-gray-700/80 rounded-xl py-2 pl-9 pr-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 dark:focus:border-amber-400 transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 text-left">
                                Contraseña
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <Lock size={15} />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                                    className="w-full bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder:text-gray-400 border border-gray-200 dark:border-gray-700/80 rounded-xl py-2 pl-9 pr-9 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 dark:focus:border-amber-400 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none"
                                >
                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-semibold rounded-xl py-2.5 px-4 text-xs sm:text-[13px] transition-all focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                        >
                            {loading ? (
                                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white dark:border-gray-400 dark:border-t-gray-900 rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>{isSignUp ? 'Crear cuenta' : 'Entrar'}</span>
                                    <ArrowRight size={14} />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Subtle Footer Note */}
                <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center mt-5">
                    Tus datos se sincronizan de forma segura con tu cuenta.
                </p>
            </div>
        </div>
    );
};

export default Login;
