import React, { useState, useEffect, useRef } from 'react';
import {
    Bot,
    Send,
    AlertTriangle,
    TrendingUp,
    Loader2,
    RefreshCw,
    MessageCircle,
    ShieldAlert,
    ChevronRight,
    Sparkles,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Alerta {
    categoria: string;
    gastoAtual: number;
    mediaHistorica: number;
    percentualAcima: number;
    severidade: 'alta' | 'media';
}

interface AlertasData {
    mesAtual: string;
    totalGastosAtual: number;
    totalMesAnterior: number;
    alertas: Alerta[];
}

interface Mensagem {
    role: 'user' | 'assistant';
    content: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const SUGESTOES = [
    'Como posso reduzir meus gastos esse mês?',
    'Estou no caminho certo para poupar?',
    'Quais categorias devo cortar primeiro?',
    'Como organizar minhas dívidas?',
    'Me dê um plano financeiro para o próximo mês.',
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const AlertaCard = ({ alerta, key }: { alerta: Alerta, key?: React.Key }) => {
    const isAlta = alerta.severidade === 'alta';
    return (
        <div
            className={`flex items-start gap-3 p-4 rounded-xl border ${isAlta
                ? 'bg-rose-50 border-rose-200'
                : 'bg-amber-50 border-amber-200'
                }`}
        >
            <div
                className={`p-2 rounded-lg shrink-0 ${isAlta ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                    }`}
            >
                <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <p className={`font-semibold text-sm ${isAlta ? 'text-rose-700' : 'text-amber-700'}`}>
                        {alerta.categoria}
                    </p>
                    <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${isAlta ? 'bg-rose-200 text-rose-700' : 'bg-amber-200 text-amber-700'
                            }`}
                    >
                        +{alerta.percentualAcima}%
                    </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                    Atual: <strong>{fmt(alerta.gastoAtual)}</strong> · Média: {fmt(alerta.mediaHistorica)}
                </p>
                <p className={`text-xs mt-1 font-medium ${isAlta ? 'text-rose-600' : 'text-amber-600'}`}>
                    {isAlta
                        ? '⚠️ Gasto crítico — muito acima do padrão'
                        : '📊 Gasto acima do histórico — atenção'}
                </p>
            </div>
        </div>
    );
};

const BubbleIA = ({ msg, key }: { msg: Mensagem, key?: React.Key }) => {
    const isUser = msg.role === 'user';
    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}>
            {!isUser && (
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-white" />
                </div>
            )}
            <div
                className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${isUser
                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
                    }`}
            >
                {msg.content}
            </div>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const AssistenteIA = () => {
    // Alertas state
    const [alertas, setAlertas] = useState<AlertasData | null>(null);
    const [loadingAlertas, setLoadingAlertas] = useState(true);

    // Chat state
    const [historico, setHistorico] = useState<Mensagem[]>([]);
    const [input, setInput] = useState('');
    const [loadingChat, setLoadingChat] = useState(false);
    const [erroChat, setErroChat] = useState('');

    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // ── Fetch alertas ──
    const fetchAlertas = async () => {
        setLoadingAlertas(true);
        try {
            const res = await fetch('/api/alertas');
            if (res.ok) setAlertas(await res.json());
        } catch {
            /* silencioso */
        } finally {
            setLoadingAlertas(false);
        }
    };

    useEffect(() => {
        fetchAlertas();
        // Mensagem de boas-vindas
        setHistorico([
            {
                role: 'assistant',
                content:
                    'Olá! Sou o Velora AI 👋\n\nAnalisei seus dados financeiros e estou pronto para ajudar. Você pode me perguntar sobre seus gastos, como economizar, organizar dívidas ou traçar metas.\n\nO que gostaria de saber?',
            },
        ]);
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [historico, loadingChat]);

    // ── Enviar mensagem ──
    const enviar = async (texto?: string) => {
        const msg = (texto ?? input).trim();
        if (!msg || loadingChat) return;

        const novaMensagem: Mensagem = { role: 'user', content: msg };
        const novoHistorico = [...historico, novaMensagem];
        setHistorico(novoHistorico);
        setInput('');
        setErroChat('');
        setLoadingChat(true);

        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mensagem: msg,
                    historico: novoHistorico.slice(0, -1), // envia o histórico sem a msg atual
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setErroChat(data.error || 'Erro ao obter resposta da IA.');
                setHistorico(novoHistorico); // mantém a mensagem do usuário
                return;
            }

            setHistorico([...novoHistorico, { role: 'assistant', content: data.resposta }]);
        } catch {
            setErroChat('Erro de conexão. Verifique se o servidor está rodando.');
        } finally {
            setLoadingChat(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            enviar();
        }
    };

    const limparChat = () => {
        setHistorico([
            {
                role: 'assistant',
                content: 'Conversa reiniciada! Como posso te ajudar com suas finanças? 💬',
            },
        ]);
        setErroChat('');
    };

    // ── Render ──
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                    <Sparkles className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Assistente IA</h1>
                    <p className="text-sm text-slate-500">
                        Análise inteligente e chat com IA · Seus dados ficam protegidos no servidor
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* ── Painel de Alertas (coluna esquerda) ── */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Card de alertas */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5 text-rose-500" />
                                <h2 className="font-semibold text-slate-800">Alertas de Gastos</h2>
                            </div>
                            <button
                                onClick={fetchAlertas}
                                disabled={loadingAlertas}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Atualizar alertas"
                            >
                                <RefreshCw className={`w-4 h-4 ${loadingAlertas ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        <div className="p-4 space-y-3">
                            {loadingAlertas ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                                </div>
                            ) : !alertas ? (
                                <p className="text-sm text-slate-400 text-center py-6">
                                    Erro ao carregar alertas.
                                </p>
                            ) : alertas.alertas.length === 0 ? (
                                <div className="text-center py-6">
                                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <TrendingUp className="w-6 h-6 text-emerald-500" />
                                    </div>
                                    <p className="text-sm font-medium text-emerald-700">Tudo dentro do padrão!</p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Nenhuma categoria com gasto anômalo este mês.
                                    </p>
                                </div>
                            ) : (
                                alertas.alertas.map((a) => <AlertaCard key={a.categoria} alerta={a} />)
                            )}
                        </div>
                    </div>

                    {/* Resumo do mês */}
                    {alertas && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-3">
                            <h3 className="font-semibold text-slate-700 text-sm">Resumo do Mês</h3>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Gastos este mês</span>
                                <span className="font-bold text-rose-600">{fmt(alertas.totalGastosAtual)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Gastos mês anterior</span>
                                <span className="font-semibold text-slate-700">{fmt(alertas.totalMesAnterior)}</span>
                            </div>
                            {alertas.totalMesAnterior > 0 && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">Variação</span>
                                    <span
                                        className={`font-bold ${alertas.totalGastosAtual > alertas.totalMesAnterior
                                            ? 'text-rose-600'
                                            : 'text-emerald-600'
                                            }`}
                                    >
                                        {alertas.totalGastosAtual > alertas.totalMesAnterior ? '+' : ''}
                                        {(
                                            ((alertas.totalGastosAtual - alertas.totalMesAnterior) /
                                                alertas.totalMesAnterior) *
                                            100
                                        ).toFixed(1)}
                                        %
                                    </span>
                                </div>
                            )}

                            {/* Botão: pedir análise à IA */}
                            {alertas.alertas.length > 0 && (
                                <button
                                    onClick={() =>
                                        enviar(
                                            `Tenho ${alertas.alertas.length} alerta(s) de gasto acima do padrão: ${alertas.alertas
                                                .map((a) => `${a.categoria} (+${a.percentualAcima}%)`)
                                                .join(', ')}. O que você recomenda?`
                                        )
                                    }
                                    className="w-full flex items-center justify-center gap-2 mt-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
                                >
                                    <Bot className="w-4 h-4" />
                                    Pedir análise à IA
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Chat com IA (coluna direita) ── */}
                <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col" style={{ height: '600px' }}>
                    {/* Header do chat */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                                <Bot className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <p className="font-semibold text-slate-800 text-sm">Velora AI</p>
                                <p className="text-xs text-emerald-500 font-medium">● Online · DeepSeek</p>
                            </div>
                        </div>
                        <button
                            onClick={limparChat}
                            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Limpar
                        </button>
                    </div>

                    {/* Mensagens */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {historico.map((msg, i) => (
                            <BubbleIA key={i} msg={msg} />
                        ))}

                        {loadingChat && (
                            <div className="flex items-center gap-2 justify-start">
                                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                                    <Bot className="w-4 h-4 text-white" />
                                </div>
                                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {erroChat && (
                            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                {erroChat}
                            </div>
                        )}

                        <div ref={chatEndRef} />
                    </div>

                    {/* Sugestões rápidas */}
                    {historico.length <= 1 && (
                        <div className="px-4 pb-2 flex flex-wrap gap-2 shrink-0">
                            {SUGESTOES.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => enviar(s)}
                                    className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors font-medium"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <div className="p-4 border-t border-slate-100 shrink-0">
                        <div className="flex gap-2 items-end">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Pergunte sobre seus gastos, metas, dívidas..."
                                rows={2}
                                className="flex-1 resize-none px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                disabled={loadingChat}
                            />
                            <button
                                onClick={() => enviar()}
                                disabled={!input.trim() || loadingChat}
                                className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                            >
                                {loadingChat ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Send className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 text-center">
                            <MessageCircle className="w-3 h-3 inline mr-1" />
                            Apenas resumos agregados são enviados à IA · Seus dados ficam no servidor
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
