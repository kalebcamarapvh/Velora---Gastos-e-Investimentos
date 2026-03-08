import React, { useState } from 'react';
import { Lock, User, LogIn, UserPlus, AlertCircle } from 'lucide-react';

interface AuthProps {
    onLogin: () => void;
}

export function Auth({ onLogin }: AuthProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const endpoint = isLogin ? '/api/login' : '/api/register';
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Erro na autenticação');
            }

            if (isLogin) {
                onLogin();
            } else {
                // Switch to login on successful register
                setIsLogin(true);
                setError('Conta criada com sucesso! Faça login.');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
            <div className="bg-[#1e1e1e] border border-gray-800 rounded-2xl w-full max-w-md p-8 shadow-2xl relative overflow-hidden">

                {/* Decorative blur */}
                <div className="absolute -top-32 -left-32 w-64 h-64 bg-violet-600/20 blur-[100px] rounded-full pointer-events-none" />
                <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-blue-600/20 blur-[100px] rounded-full pointer-events-none" />

                <div className="relative z-10">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                            {isLogin ? 'Bem-vindo de volta' : 'Criar Conta'}
                        </h1>
                        <p className="text-gray-400">
                            {isLogin ? 'Faça login para acessar seu painel financeiro.' : 'Junte-se a nós e comece a controlar suas finanças.'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${error.includes('sucesso') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                <AlertCircle className="w-4 h-4" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Nome de Usuário</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-500" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="bg-[#252525] border border-gray-700 text-white text-sm rounded-lg focus:ring-violet-500 focus:border-violet-500 block w-full pl-10 p-2.5 outline-none transition-colors placeholder-gray-500"
                                    placeholder="Seu usuário"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Senha</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-500" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-[#252525] border border-gray-700 text-white text-sm rounded-lg focus:ring-violet-500 focus:border-violet-500 block w-full pl-10 p-2.5 outline-none transition-colors placeholder-gray-500"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 focus:ring-4 focus:outline-none focus:ring-violet-800 font-medium rounded-lg text-sm px-5 py-3 text-center flex justify-center items-center gap-2 transition-all disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : isLogin ? (
                                <>Entrar <LogIn className="w-4 h-4" /></>
                            ) : (
                                <>Cadastrar <UserPlus className="w-4 h-4" /></>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => { setIsLogin(!isLogin); setError(''); setUsername(''); setPassword(''); }}
                            className="text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já possui conta? Faça login'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
