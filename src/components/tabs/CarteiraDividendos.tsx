import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, TrendingUp, RefreshCw, AlertCircle, Info } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { TickerLogo } from '../shared/TickerLogo';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DividendEntry {
  ticker: string;
  tipo: string;
  dataCom: string | null;
  dataPagamento: string | null;
  quantidade: number;
  valorPorCota: number;
  valorTotal: number;
  totalLiquido: number;
  status: 'a_receber' | 'pago';
}

interface CarteiraItem {
  ativo: string;
  tipo: string;
  quantidade: number;
  precoAtual: number;
  valorAtual: number;
}

interface TickerSummary {
  ticker: string;
  quantidade: number;
  dy: number;                // Dividend Yield anual % baseado em preço atual
  dividendoMedioCota: number; // Média mensal por cota (últimos 12m)
  mensal: number;             // Estimativa mensal total (últimos 12m / 12)
  anual: number;              // Estimativa anual total (mensal * 12)
  pagamentosCount: number;    // Qtd de pagamentos nos últimos 12m
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const BAR_COLORS = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'];

// ─── Component ────────────────────────────────────────────────────────────────
export const CarteiraDividendos = () => {
  const [dividendos, setDividendos] = useState<DividendEntry[]>([]);
  const [carteira, setCarteira] = useState<CarteiraItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [divRes, carteiraRes] = await Promise.all([
        fetch('/api/dividendos'),
        fetch('/api/carteira'),
      ]);
      if (!divRes.ok) throw new Error(`Dividendos: HTTP ${divRes.status}`);
      if (!carteiraRes.ok) throw new Error(`Carteira: HTTP ${carteiraRes.status}`);

      const [divData, carteiraData] = await Promise.all([
        divRes.json(),
        carteiraRes.json(),
      ]);

      setDividendos(divData);
      setCarteira(carteiraData.filter((c: CarteiraItem) => c.quantidade > 0));
    } catch (e: any) {
      setError(e.message ?? 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ── Compute per-ticker summary from REAL data ─────────────────────────────
  const tickerSummaries = useMemo((): TickerSummary[] => {
    const hoje = new Date();
    const dozeM = new Date(hoje);
    dozeM.setFullYear(dozeM.getFullYear() - 1);

    // Build a map of precoAtual by ticker from carteira
    const precoMap: Record<string, number> = {};
    const qtdMap: Record<string, number> = {};
    carteira.forEach(c => {
      precoMap[c.ativo] = c.precoAtual ?? 0;
      qtdMap[c.ativo] = c.quantidade ?? 0;
    });

    // Group paid dividends by ticker (last 12 months only)
    const byTicker: Record<string, DividendEntry[]> = {};
    dividendos.forEach(d => {
      if (d.status !== 'pago') return;
      const payDate = d.dataPagamento ? new Date(d.dataPagamento) : null;
      if (!payDate || payDate < dozeM) return;

      if (!byTicker[d.ticker]) byTicker[d.ticker] = [];
      byTicker[d.ticker].push(d);
    });

    // Also include tickers that are in carteira but haven't paid dividends recently
    carteira.forEach(c => {
      if (!byTicker[c.ativo]) byTicker[c.ativo] = [];
    });

    return Object.entries(byTicker).map(([ticker, entries]) => {
      const quantidade = qtdMap[ticker] ?? (entries[0]?.quantidade ?? 0);
      const precoAtual = precoMap[ticker] ?? 0;

      // Total recebido nos últimos 12 meses (valor líquido)
      const totalAnual12m = entries.reduce((sum, e) => sum + e.totalLiquido, 0);
      const mensal = totalAnual12m / 12;
      const anual = totalAnual12m;

      // Div médio por cota por mês
      const dividendoMedioCota = quantidade > 0 ? mensal / quantidade : 0;

      // DY = (total anual por cota / preço atual) * 100
      const totalAnualPorCota = quantidade > 0 ? totalAnual12m / quantidade : 0;
      const dy = precoAtual > 0 ? (totalAnualPorCota / precoAtual) * 100 : 0;

      return {
        ticker,
        quantidade,
        dy,
        dividendoMedioCota,
        mensal,
        anual,
        pagamentosCount: entries.length,
      };
    })
      .filter(s => s.quantidade > 0)
      .sort((a, b) => b.anual - a.anual);
  }, [dividendos, carteira]);

  // ── Totals ────────────────────────────────────────────────────────────────
  const rendaPassivaMensal = tickerSummaries.reduce((s, t) => s + t.mensal, 0);
  const rendaPassivaAnual = tickerSummaries.reduce((s, t) => s + t.anual, 0);

  // ── Chart data (top 5) ────────────────────────────────────────────────────
  const chartData = tickerSummaries.slice(0, 5).map(t => ({
    ticker: t.ticker,
    anual: parseFloat(t.anual.toFixed(2)),
  }));

  // ── Has any real dividend data ────────────────────────────────────────────
  const hasRealData = tickerSummaries.some(t => t.pagamentosCount > 0);

  return (
    <div className="space-y-6">
      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
          <button onClick={loadData} className="ml-auto text-xs underline">Tentar novamente</button>
        </div>
      )}

      {/* Info banner quando não há dados reais */}
      {!loading && !error && !hasRealData && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
          <Info className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Sem histórico de dividendos nos últimos 12 meses</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Os valores de estimativa são baseados nos pagamentos reais registrados pelo Brapi.
              Certifique-se de ter um token BRAPI configurado e que as cotações foram atualizadas.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-xl shrink-0">
            <DollarSign className="w-8 h-8" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Renda Passiva Mensal (Est.)
            </span>
            <div className="text-3xl font-bold text-slate-800 dark:text-slate-100 privacy-blur">
              {loading ? '—' : fmtBRL(rendaPassivaMensal)}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Média dos últimos 12 meses (dados reais Brapi)</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl shrink-0">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Renda Passiva Anual (Est.)
            </span>
            <div className="text-3xl font-bold text-slate-800 dark:text-slate-100 privacy-blur">
              {loading ? '—' : fmtBRL(rendaPassivaAnual)}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Total acumulado nos últimos 12 meses</p>
          </div>
        </div>
      </div>

      {/* Table + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Ativos Pagadores</h3>
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="p-4">Ticker</th>
                  <th className="p-4 text-right">Qtd</th>
                  <th className="p-4 text-right">DY (%)</th>
                  <th className="p-4 text-right">Div. Médio/Cota</th>
                  <th className="p-4 text-right">Mensal Est.</th>
                  <th className="p-4 text-right">Anual Est.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="p-4">
                          <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded w-3/4 ml-auto" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : tickerSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 text-sm">
                      Nenhum ativo com histórico de dividendos encontrado.
                    </td>
                  </tr>
                ) : (
                  tickerSummaries.map((item) => (
                    <tr key={item.ticker} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors text-slate-700 dark:text-slate-300">
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <TickerLogo ticker={item.ticker} size={28} />
                          <span className="font-bold text-slate-900 dark:text-slate-100">{item.ticker}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right">{item.quantidade}</td>
                      <td className="p-4 text-right font-medium text-amber-600 privacy-blur">
                        {item.dy > 0 ? `${item.dy.toFixed(2)}%` : <span className="text-slate-400 font-normal text-xs">—</span>}
                      </td>
                      <td className="p-4 text-right privacy-blur">
                        {item.dividendoMedioCota > 0
                          ? fmtBRL(item.dividendoMedioCota)
                          : <span className="text-slate-400 text-xs">—</span>}
                      </td>
                      <td className="p-4 text-right font-medium text-emerald-600 privacy-blur">
                        {item.mensal > 0
                          ? fmtBRL(item.mensal)
                          : <span className="text-slate-400 font-normal text-xs">Sem histórico</span>}
                      </td>
                      <td className="p-4 text-right font-bold text-emerald-600 privacy-blur">
                        {item.anual > 0
                          ? fmtBRL(item.anual)
                          : <span className="text-slate-400 font-normal text-xs">Sem histórico</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-6">Top 5 Pagadores (Anual)</h3>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm animate-pulse">
              Carregando...
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              Sem dados disponíveis
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickFormatter={(v) => `R$ ${v.toFixed(0)}`}
                  />
                  <YAxis
                    dataKey="ticker"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontWeight: 700, fontSize: 12 }}
                    width={52}
                  />
                  <Tooltip
                    formatter={(value: number) => [fmtBRL(value), 'Anual Est.']}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="anual" radius={[0, 6, 6, 0]} barSize={22}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};