import React, { useState, useEffect, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    LineChart, Line, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';
import { Shield, Globe, Activity, AlertTriangle, RefreshCw, Trash2, Clock } from 'lucide-react';

interface RequestLog {
    ip: string;
    method: string;
    route: string;
    status: number;
    timestamp: string;
}

interface IpSummary {
    ip: string;
    totalRequests: number;
    blocked: number;
    lastSeen: string;
    routes: Record<string, number>;
}

interface AdminStats {
    totalRequests: number;
    uniqueIps: number;
    blockedRequests: number;
    topIps: IpSummary[];
    recentLogs: RequestLog[];
    requestsPerHour: { hour: string; count: number }[];
    routeBreakdown: { route: string; count: number }[];
    statusBreakdown: { status: string; count: number }[];
}

const STATUS_COLORS: Record<string, string> = {
    '2xx': '#10b981',
    '3xx': '#3b82f6',
    '4xx': '#f59e0b',
    '5xx': '#ef4444',
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
            <p className="text-slate-400 mb-1">{label}</p>
            {payload.map((p: any, i: number) => (
                <p key={i} style={{ color: p.color || '#10b981' }} className="font-semibold">
                    {p.value} requisições
                </p>
            ))}
        </div>
    );
};

export const Admin = () => {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [clearing, setClearing] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/stats', { credentials: 'include' });
            if (res.ok) {
                setStats(await res.json());
                setLastUpdated(new Date());
            }
        } catch (e) {
            console.error('Failed to fetch admin stats', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }, [autoRefresh, fetchStats]);

    const handleClearLogs = async () => {
        if (!confirm('Tem certeza que deseja limpar todos os logs?')) return;
        setClearing(true);
        try {
            await fetch('/api/admin/logs/clear', { method: 'DELETE', credentials: 'include' });
            await fetchStats();
        } finally {
            setClearing(false);
        }
    };

    const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
    const fmtTime = (iso: string) => {
        try {
            return new Date(iso).toLocaleTimeString('pt-BR', {
                hour: '2-digit', minute: '2-digit', second: '2-digit',
            });
        } catch { return iso; }
    };

    const statusColor = (code: number) => {
        if (code < 300) return 'text-emerald-500';
        if (code < 400) return 'text-blue-400';
        if (code < 500) return 'text-amber-400';
        return 'text-rose-500';
    };

    const methodColor = (m: string) => {
        const map: Record<string, string> = {
            GET: 'text-blue-400',
            POST: 'text-emerald-500',
            DELETE: 'text-rose-500',
            PUT: 'text-amber-400',
        };
        return map[m] || 'text-slate-400';
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3 text-slate-400">
                <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                <span className="text-sm">Carregando logs...</span>
            </div>
        </div>
    );

    if (!stats) return (
        <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
            Não foi possível carregar os dados do Admin.
        </div>
    );

    // Compute route chart height BEFORE JSX to avoid arithmetic in JSX (recharts v3 type)
    const routeChartHeight: number = Math.max(160, stats.routeBreakdown.length * 34);

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-violet-500/10 border border-violet-500/30 rounded-xl flex items-center justify-center">
                        <Shield className="w-5 h-5 text-violet-500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Painel Admin</h1>
                        {lastUpdated && (
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" />
                                Atualizado às {fmtTime(lastUpdated.toISOString())}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setAutoRefresh(a => !a)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${autoRefresh
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                            : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
                    >
                        <Activity className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-pulse' : ''}`} />
                        {autoRefresh ? 'Live (5s)' : 'Auto-refresh'}
                    </button>
                    <button
                        onClick={fetchStats}
                        title="Atualizar"
                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleClearLogs}
                        disabled={clearing}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-200 dark:border-rose-800/40 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors disabled:opacity-50"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Limpar logs
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Requisições', value: fmt(stats.totalRequests), icon: Activity, color: 'text-blue-500', border: 'border-blue-200 dark:border-blue-900/50', bg: 'bg-blue-50 dark:bg-blue-900/10' },
                    { label: 'IPs Únicos', value: fmt(stats.uniqueIps), icon: Globe, color: 'text-emerald-600', border: 'border-emerald-200 dark:border-emerald-900/50', bg: 'bg-emerald-50 dark:bg-emerald-900/10' },
                    { label: 'Erros (4xx/5xx)', value: fmt(stats.blockedRequests), icon: AlertTriangle, color: 'text-amber-500', border: 'border-amber-200 dark:border-amber-900/50', bg: 'bg-amber-50 dark:bg-amber-900/10' },
                    {
                        label: 'Taxa de Erro', icon: Shield, color: 'text-violet-600', border: 'border-violet-200 dark:border-violet-900/50', bg: 'bg-violet-50 dark:bg-violet-900/10',
                        value: stats.totalRequests > 0
                            ? `${((stats.blockedRequests / stats.totalRequests) * 100).toFixed(1)}%`
                            : '0%',
                    },
                ].map(card => (
                    <div key={card.label} className={`rounded-xl border p-4 ${card.bg} ${card.border}`}>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-slate-500 font-medium">{card.label}</span>
                            <card.icon className={`w-4 h-4 ${card.color}`} />
                        </div>
                        <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                    </div>
                ))}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Requests per hour */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Requisições por Hora (últimas 24h)</h3>
                    {stats.requestsPerHour.some(r => r.count > 0) ? (
                        <ResponsiveContainer width="100%" height={180}>
                            <LineChart data={stats.requestsPerHour}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={30} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2.5} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[180px] flex items-center justify-center text-slate-400 text-sm">Sem dados ainda</div>
                    )}
                </div>

                {/* Status breakdown */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Status HTTP</h3>
                    {stats.statusBreakdown.length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={140}>
                                <PieChart>
                                    <Pie
                                        data={stats.statusBreakdown}
                                        dataKey="count"
                                        nameKey="status"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={62}
                                        innerRadius={36}
                                    >
                                        {stats.statusBreakdown.map((entry, i) => (
                                            <Cell key={i} fill={STATUS_COLORS[entry.status] || '#64748b'} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            background: '#0f172a',
                                            border: '1px solid #1e293b',
                                            borderRadius: 8,
                                            fontSize: 12,
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="mt-3 space-y-1.5">
                                {stats.statusBreakdown.map((s, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[s.status] || '#64748b' }} />
                                            <span className="text-slate-500">{s.status}</span>
                                        </div>
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">{s.count}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="h-[180px] flex items-center justify-center text-slate-400 text-sm">Sem dados</div>
                    )}
                </div>
            </div>

            {/* Top routes */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Rotas Mais Acessadas</h3>
                {stats.routeBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={routeChartHeight}>
                        <BarChart data={stats.routeBreakdown} layout="vertical" margin={{ left: 8 }}>
                            <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                            <YAxis
                                type="category"
                                dataKey="route"
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                tickLine={false}
                                axisLine={false}
                                width={170}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="count" fill="#6366f1" radius={[0, 5, 5, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-[160px] flex items-center justify-center text-slate-400 text-sm">Sem dados ainda</div>
                )}
            </div>

            {/* Top IPs */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">IPs com Mais Requisições</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                                {['IP', 'Total', 'Erros (4xx/5xx)', 'Última atividade', 'Rota + acessada'].map(h => (
                                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {stats.topIps.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-8 text-center text-slate-400 text-sm">Nenhum log registrado ainda.</td>
                                </tr>
                            ) : stats.topIps.map((ip, i) => {
                                const topRoute = Object.entries(ip.routes).sort((a, b) => (b[1] as number) - (a[1] as number))[0];
                                return (
                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-5 py-3 font-mono text-xs font-semibold text-violet-600 dark:text-violet-400">{ip.ip}</td>
                                        <td className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">{ip.totalRequests}</td>
                                        <td className="px-5 py-3">
                                            {ip.blocked > 0
                                                ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">{ip.blocked}</span>
                                                : <span className="text-slate-400 text-xs">—</span>}
                                        </td>
                                        <td className="px-5 py-3 text-xs text-slate-500">{fmtTime(ip.lastSeen)}</td>
                                        <td className="px-5 py-3 font-mono text-xs text-slate-500">
                                            {topRoute ? `${topRoute[0]} (${topRoute[1]}×)` : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recent logs */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Log em Tempo Real (últimas 100)</h3>
                </div>
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                    <table className="w-full">
                        <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10">
                            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                                {['Hora', 'IP', 'Método', 'Rota', 'Status'].map(h => (
                                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50 font-mono text-xs">
                            {stats.recentLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">Nenhum log registrado.</td>
                                </tr>
                            ) : [...stats.recentLogs].reverse().map((log, i) => (
                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-4 py-2 text-slate-400">{fmtTime(log.timestamp)}</td>
                                    <td className="px-4 py-2 text-violet-600 dark:text-violet-400">{log.ip}</td>
                                    <td className={`px-4 py-2 font-bold ${methodColor(log.method)}`}>{log.method}</td>
                                    <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{log.route}</td>
                                    <td className={`px-4 py-2 font-bold ${statusColor(log.status)}`}>{log.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};