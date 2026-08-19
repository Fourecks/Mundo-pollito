import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { config } from '../config';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, HelpCircle, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [showConfigHelp, setShowConfigHelp] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(false);

    const supabaseCallbackUrl = `${config.SUPABASE_URL}/auth/v1/callback`;

    useEffect(() => {
        // Initialize Google Identity Services (GSI) if available
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
                                    if (signInError.message?.toLowerCase().includes('provider is not enabled') || (signInError as any).code === 'validation_failed') {
                                        setError('El proveedor de Google no está habilitado en tu panel de Supabase.');
                                        setShowConfigHelp(true);
                                    } else {
                                        setError(signInError.message);
                                    }
                                }
                            } catch (err: any) {
                                setError(err?.message || 'Error al iniciar sesión con Google ID Token.');
                            } finally {
                                setGoogleLoading(false);
                            }
                        }
                    },
                    auto_select: false,
                    cancel_on_tap_outside: true,
                });
            } catch (e) {
                console.warn('GSI Init note:', e);
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
                        setMessage('¡Cuenta creada y sesión iniciada!');
                    } else {
                        setMessage('Cuenta creada con éxito. Si tu proyecto de Supabase requiere confirmación de correo, revisa tu bandeja de entrada; si no, ya puedes iniciar sesión.');
                        setIsSignUp(false);
                    }
                }
            } catch (err: any) {
                setError(err?.message || 'Error inesperado al crear la cuenta.');
            }
        } else {
            try {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: cleanEmail,
                    password: password,
                });
                if (signInError) {
                    if (signInError.message.toLowerCase().includes('invalid login credentials')) {
                        setError('Correo o contraseña incorrectos.');
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
            // Intentar primero con Google Identity Services si está cargado
            if (window.google?.accounts?.id && config.GOOGLE_CLIENT_ID) {
                window.google.accounts.id.prompt((notification: any) => {
                    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                        // Fallback a signInWithOAuth estándar de Supabase
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
                if (
                    oauthError.message?.toLowerCase().includes('provider is not enabled') ||
                    (oauthError as any).code === 'validation_failed' ||
                    (oauthError as any).status === 400
                ) {
                    setError('El proveedor de Google no está habilitado en tu proyecto de Supabase.');
                    setShowConfigHelp(true);
                } else {
                    setError(oauthError.message || 'Error al iniciar con Google.');
                }
            }
        } catch (err: any) {
            setError('Error de conexión con el proveedor de Google.');
            setShowConfigHelp(true);
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(supabaseCallbackUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] flex flex-col items-center justify-center p-4 sm:p-6 transition-colors duration-200">
            <div className="w-full max-w-[420px] bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 p-7 sm:p-8">
                {/* Header */}
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-800 dark:text-slate-200 mb-3.5 border border-slate-200/60 dark:border-slate-700/60">
                        <ShieldCheck size={24} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <h1 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
                        {isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
                    </h1>
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
                        {isSignUp 
                            ? 'Regístrate para guardar y sincronizar tus tareas' 
                            : 'Accede a tu espacio de trabajo personal'}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5 text-left">
                            Correo electrónico
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                <Mail size={16} />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="tu@correo.com"
                                required
                                autoComplete="email"
                                className="w-full bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white placeholder:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5 text-left">
                            Contraseña
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                <Lock size={16} />
                            </div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={6}
                                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                                className="w-full bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white placeholder:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Alerts */}
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl flex items-start gap-2.5 text-left">
                            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-600 dark:text-red-300 leading-relaxed">{error}</p>
                        </div>
                    )}

                    {message && (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-start gap-2.5 text-left">
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">{message}</p>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl py-2.5 px-4 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
                    >
                        {loading ? (
                            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>{isSignUp ? 'Crear cuenta' : 'Entrar'}</span>
                                <ArrowRight size={15} />
                            </>
                        )}
                    </button>
                </form>

                {/* Divider */}
                <div className="relative my-5">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200 dark:border-slate-700/80" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                        <span className="px-3 bg-white dark:bg-[#1e293b] text-slate-400 uppercase tracking-wider font-medium">o</span>
                    </div>
                </div>

                {/* Google Sign In */}
                <button
                    onClick={handleGoogleLogin}
                    disabled={googleLoading}
                    type="button"
                    className="w-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-xl py-2.5 px-4 text-sm transition-all flex items-center justify-center gap-2.5 disabled:opacity-60"
                >
                    {googleLoading ? (
                        <span className="inline-block w-4 h-4 border-2 border-slate-400 border-t-slate-700 dark:border-t-slate-200 rounded-full animate-spin" />
                    ) : (
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                    )}
                    <span>Continuar con Google</span>
                </button>

                {/* Supabase Provider Guide Collapsible */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                        type="button"
                        onClick={() => setShowConfigHelp(!showConfigHelp)}
                        className="w-full flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 py-1 transition-colors"
                    >
                        <span className="flex items-center gap-1.5 font-medium">
                            <HelpCircle size={13} />
                            ¿Cómo habilitar Google en Supabase?
                        </span>
                        {showConfigHelp ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>

                    {showConfigHelp && (
                        <div className="mt-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-700/60 text-left text-[11px] text-slate-600 dark:text-slate-300 space-y-2">
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                                Pasos para activar Google Auth:
                            </p>
                            <ol className="list-decimal list-inside space-y-1.5 text-slate-500 dark:text-slate-400">
                                <li>Ve a tu panel de <span className="font-medium text-slate-700 dark:text-slate-200">Supabase</span> $\rightarrow$ <strong>Authentication</strong> $\rightarrow$ <strong>Providers</strong> $\rightarrow$ <strong>Google</strong>.</li>
                                <li>Activa la casilla <strong>Enable Google provider</strong>.</li>
                                <li>Pega tu <strong>Client ID</strong> y <strong>Client Secret</strong> de Google Cloud Console.</li>
                                <li>En Google Cloud Console, añade esta URL de redirección:</li>
                            </ol>
                            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-mono break-all select-all">
                                <span className="flex-1 text-slate-700 dark:text-slate-300 truncate">{supabaseCallbackUrl}</span>
                                <button
                                    type="button"
                                    onClick={handleCopyUrl}
                                    className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white shrink-0"
                                    title="Copiar URL"
                                >
                                    {copiedUrl ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Switch between Sign In and Sign Up */}
                <div className="mt-5 text-center">
                    <button
                        type="button"
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setError(null);
                            setMessage(null);
                        }}
                        className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                    >
                        {isSignUp ? (
                            <>¿Ya tienes una cuenta? <span className="font-medium text-blue-600 dark:text-blue-400 underline underline-offset-2">Inicia sesión</span></>
                        ) : (
                            <>¿No tienes cuenta? <span className="font-medium text-blue-600 dark:text-blue-400 underline underline-offset-2">Regístrate gratis</span></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
