import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { CalendarClock, CheckCircle2, Clock, RefreshCw, AlertCircle, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DividendEntry {
  ticker: string;
  tipo: string;          // JCP | DIVIDENDO | RENDIMENTO | JSCP…
  dataCom: string | null;
  dataPagamento: string | null;
  quantidade: number;
  valorPorCota: number;
  valorTotal: number;
  totalLiquido: number;
  status: 'a_receber' | 'pago';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
};

const TIPO_COLORS: Record<string, string> = {
  JCP: 'bg-violet-50 text-violet-700',
  JSCP: 'bg-violet-50 text-violet-700',
  DIVIDENDO: 'bg-emerald-50 text-emerald-700',
  RENDIMENTO: 'bg-blue-50 text-blue-700',
  BONIFICACAO: 'bg-amber-50 text-amber-700',
};
const tipoClass = (t: string) =>
  TIPO_COLORS[t.toUpperCase()] ?? 'bg-slate-100 text-slate-700';

const tipoLabel = (t: string): string => {
  const up = t.toUpperCase();
  if (up === 'JCP' || up === 'JSCP') return 'JSCP';
  if (up === 'DIVIDENDO') return 'Dividendo';
  if (up === 'RENDIMENTO') return 'Rendimento';
  return t;
};

const StatusBadge = ({ status }: { status: 'a_receber' | 'pago' }) =>
  status === 'a_receber' ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
      <Clock className="w-3 h-3" /> A Receber
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
      <CheckCircle2 className="w-3 h-3" /> Pago
    </span>
  );

// ─── Component ────────────────────────────────────────────────────────────────
export const HistoricoDividendos = () => {
  const [entries, setEntries] = useState<DividendEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroTicker, setFiltroTicker] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'' | 'a_receber' | 'pago'>('');
  const [showOnlyYear, setShowOnlyYear] = useState(new Date().getFullYear());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadDividendos = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/dividendos');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEntries(await res.json());
    } catch (e: any) {
      setError(e.message ?? 'Erro ao carregar dividendos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDividendos(); }, []);

  // ── Tickers available for filter ──
  const tickers = useMemo(() => [...new Set(entries.map(e => e.ticker))].sort(), [entries]);
  const tipos = useMemo(() => [...new Set(entries.map(e => tipoLabel(e.tipo)))].sort(), [entries]);

  // ── Filtered list ──
  const filtered = useMemo(() => entries.filter(e => {
    if (filtroTicker && e.ticker !== filtroTicker) return false;
    if (filtroTipo && tipoLabel(e.tipo) !== filtroTipo) return false;
    if (filtroStatus && e.status !== filtroStatus) return false;
    return true;
  }), [entries, filtroTicker, filtroTipo, filtroStatus]);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [filtroTicker, filtroTipo, filtroStatus]);

  // ── Pagination ──
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  // ── KPIs ──
  const totalRecebido = entries.filter(e => e.status === 'pago').reduce((a, e) => a + e.totalLiquido, 0);
  const totalAReceber = entries.filter(e => e.status === 'a_receber').reduce((a, e) => a + e.totalLiquido, 0);
  const totalAno = entries
    .filter(e => {
      const d = e.dataPagamento ? new Date(e.dataPagamento).getFullYear() : 0;
      return d === showOnlyYear;
    })
    .reduce((a, e) => a + e.totalLiquido, 0);

  // ── Bar chart: group by month ──
  const chartData = useMemo(() => {
    const meses: Record<string, { mes: string; pago: number; aReceber: number }> = {};
    entries.forEach(e => {
      if (!e.dataPagamento) return;
      const d = new Date(e.dataPagamento);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      if (!meses[key]) meses[key] = { mes: label, pago: 0, aReceber: 0 };
      if (e.status === 'pago') meses[key].pago += e.totalLiquido;
      else meses[key].aReceber += e.totalLiquido;
    });
    return Object.entries(meses)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-18) // last 18 months
      .map(([, v]) => v);
  }, [entries]);

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Total Recebido (líq.)</p>
          <p className="text-2xl font-bold text-emerald-600 privacy-blur">{fmtBRL(totalRecebido)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">A Receber (líq.)</p>
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-blue-500" />
            <p className="text-2xl font-bold text-blue-600 privacy-blur">{fmtBRL(totalAReceber)}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total {showOnlyYear} (líq.)</p>
            <div className="flex gap-1">
              <button onClick={() => setShowOnlyYear(y => y - 1)}
                className="w-6 h-6 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-xs font-bold">‹</button>
              <button onClick={() => setShowOnlyYear(y => y + 1)}
                className="w-6 h-6 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-xs font-bold">›</button>
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600 privacy-blur">{fmtBRL(totalAno)}</p>
        </div>
      </div>

      {/* ── Bar Chart ── */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-base font-semibold text-slate-800 mb-4">Proventos por Mês (últimos 18 meses)</h3>
        {chartData.length > 0 ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={v => `R$${(v).toFixed(0)}`} />
                <Tooltip formatter={(v: number, name) => [fmtBRL(v), name === 'pago' ? 'Pago' : 'A Receber']} />
                <Bar dataKey="pago" name="pago" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="aReceber" name="aReceber" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          !loading && <p className="text-center text-slate-400 text-sm py-10">Sem dados para exibir no gráfico.</p>
        )}
      </div>

      {/* ── Lançamentos Table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Lançamentos de Proventos</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Agenda sincronizada com brapi.dev · Cache mensal ·{' '}
              <span className="font-semibold text-blue-600">{entries.filter(e => e.status === 'a_receber').length} futuros</span>
              {' · '}{entries.filter(e => e.status === 'pago').length} pagos
            </p>
          </div>
          <button onClick={loadDividendos} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors text-xs font-medium disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>

        {/* Filters */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-2 items-center">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {/* Status */}
          {([['', 'Todos'], ['a_receber', 'A Receber'], ['pago', 'Pago']] as [string, string][]).map(([v, l]) => (
            <button key={v} onClick={() => setFiltroStatus(v as any)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${filtroStatus === v ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}>{l}</button>
          ))}
          <div className="h-4 w-px bg-slate-200" />
          {/* Ticker */}
          <select value={filtroTicker} onChange={e => setFiltroTicker(e.target.value)}
            className="px-2 py-1 rounded-lg text-xs border border-slate-200 bg-white text-slate-700 focus:outline-none">
            <option value="">Todos os ativos</option>
            {tickers.map(t => <option key={t}>{t}</option>)}
          </select>
          {/* Tipo */}
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
            className="px-2 py-1 rounded-lg text-xs border border-slate-200 bg-white text-slate-700 focus:outline-none">
            <option value="">Todos os tipos</option>
            {tipos.map(t => <option key={t}>{t}</option>)}
          </select>
          {(filtroTicker || filtroTipo || filtroStatus) && (
            <button onClick={() => { setFiltroTicker(''); setFiltroTipo(''); setFiltroStatus(''); }}
              className="text-xs text-rose-500 hover:underline">Limpar filtros</button>
          )}
        </div>

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-3 p-5 text-rose-600 bg-rose-50 border-b border-rose-100">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Erro ao buscar dividendos</p>
              <p className="text-xs text-rose-500 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="p-4">Ativo</th>
                <th className="p-4">Status</th>
                <th className="p-4">Categoria</th>
                <th className="p-4 text-right">Data Com</th>
                <th className="p-4 text-right">Data Pagamento</th>
                <th className="p-4 text-right">Quantidade</th>
                <th className="p-4 text-right">Valor / Cota</th>
                <th className="p-4 text-right">Valor Total</th>
                <th className="p-4 text-right">Total Líquido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && entries.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="p-4"><div className="h-3 bg-slate-200 rounded w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-400 text-sm">
                    {entries.length === 0
                      ? 'Nenhum dado encontrado. Verifique se há ativos na carteira e se o BRAPI_TOKEN está configurado no .env para ativos além de ITUB4, PETR4, VALE3 e MGLU3.'
                      : 'Nenhum resultado para os filtros selecionados.'}
                  </td>
                </tr>
              ) : (
                currentItems.map((e, i) => (
                  <tr key={i}
                    className={`hover:bg-slate-50/50 transition-colors text-slate-700 ${e.status === 'a_receber' ? 'bg-blue-50/30' : ''
                      }`}
                  >
                    <td className="p-4 font-bold text-slate-900">{e.ticker}</td>
                    <td className="p-4"><StatusBadge status={e.status} /></td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${tipoClass(e.tipo)}`}>
                        {tipoLabel(e.tipo)}
                      </span>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">{fmtDate(e.dataCom)}</td>
                    <td className="p-4 text-right whitespace-nowrap font-medium">
                      {fmtDate(e.dataPagamento)}
                    </td>
                    <td className="p-4 text-right">{e.quantidade}</td>
                    <td className="p-4 text-right privacy-blur">{fmtBRL(e.valorPorCota)}</td>
                    <td className="p-4 text-right privacy-blur">{fmtBRL(e.valorTotal)}</td>
                    <td className={`p-4 text-right font-bold privacy-blur ${e.status === 'a_receber' ? 'text-blue-600' : 'text-emerald-600'
                      }`}>
                      {fmtBRL(e.totalLiquido)}
                      {e.tipo.toUpperCase().includes('JCP') && (
                        <span className="block text-xs font-normal text-slate-400">IR 15%</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filtered.length > itemsPerPage && (
          <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between sm:justify-end gap-4 text-sm bg-white">
            <span className="text-slate-500 font-medium hidden sm:inline-block">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center justify-center p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                title="Página Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex gap-1 sm:hidden items-center text-slate-500 font-medium px-2">
                {currentPage} / {totalPages}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center justify-center p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                title="Próxima Página"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-8 text-sm">
            <span className="text-slate-600">
              Valor Total: <span className="font-bold text-slate-800">{fmtBRL(filtered.reduce((a, e) => a + e.valorTotal, 0))}</span>
            </span>
            <span className="text-slate-600">
              Total Líquido: <span className="font-bold text-emerald-700">{fmtBRL(filtered.reduce((a, e) => a + e.totalLiquido, 0))}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
