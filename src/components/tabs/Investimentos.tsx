import React, { useState, useEffect, useMemo } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign, Filter, AlertCircle, Trash2 } from 'lucide-react';
import { TickerLogo } from '../shared/TickerLogo';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Modal } from '../Modal';
import { CurrencyInput } from '../CurrencyInput';
import {
  getCarteira,
  getLancamentosInvestimentos,
  createLancamentoInvestimento,
  deleteLancamentoInvestimento,
  type CarteiraItem,
  type LancamentoInvestimento,
} from '../../services/api';

const TIPOS_ATIVO = ['Ações', 'FIIs', 'ETF', 'Cripto', 'CDB'];
const MOEDAS = ['BRL', 'USD'] as const;
const FALLBACK_USD_RATE = 5.80;

const CORES_TIPO: Record<string, string> = {
  'Ações': '#3b82f6',
  'FIIs': '#8b5cf6',
  'ETF': '#ec4899',
  'Cripto': '#f59e0b',
  'CDB': '#10b981',
};
const CORES_ATIVOS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#06b6d4', '#ef4444', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e879f9', '#fb923c', '#a3e635', '#38bdf8',
];

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtUSD = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' }).format(v);
const fmtNative = (v: number, moeda: string) => (moeda === 'USD' ? fmtUSD(v) : fmtBRL(v));

const TipoBadge = ({ tipo }: { tipo: string }) => {
  const map: Record<string, string> = {
    Ações: 'bg-blue-50 text-blue-700',
    FIIs: 'bg-violet-50 text-violet-700',
    ETF: 'bg-pink-50 text-pink-700',
    Cripto: 'bg-amber-50 text-amber-700',
    CDB: 'bg-emerald-50 text-emerald-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[tipo] ?? 'bg-slate-100 text-slate-700'}`}>
      {tipo}
    </span>
  );
};

// Inline label showing % inside each slice
const renderInlineLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  return (
    <text x={cx + r * Math.cos(-midAngle * RADIAN)} y={cy + r * Math.sin(-midAngle * RADIAN)}
      fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700}>
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
};

type OperacaoTab = 'compra' | 'venda';

const emptyCompra = {
  tipo: TIPOS_ATIVO[0],
  ativo: '',
  data: new Date().toISOString().slice(0, 10),
  quantidade: '',
  preco: '',
  moeda: 'BRL' as 'BRL' | 'USD',
};

const emptyVenda = {
  ativo: '',
  tipo: '',
  data: new Date().toISOString().slice(0, 10),
  quantidade: '',
  preco: '',
};

export const Investimentos = () => {
  const [carteira, setCarteira] = useState<CarteiraItem[]>([]);
  const [lancamentos, setLancamentos] = useState<LancamentoInvestimento[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [aba, setAba] = useState<OperacaoTab>('compra');
  const [compraForm, setCompraForm] = useState(emptyCompra);
  const [vendaForm, setVendaForm] = useState(emptyVenda);
  const [loading, setLoading] = useState(false);
  const [vendaError, setVendaError] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [usdRate, setUsdRate] = useState(FALLBACK_USD_RATE);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Fetch live USD/BRL rate
  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(d => { if (d?.rates?.BRL) setUsdRate(d.rates.BRL); })
      .catch(() => { }); // keep fallback
  }, []);

  const loadAll = async () => {
    await Promise.all([
      getCarteira().then(setCarteira).catch(console.error),
      getLancamentosInvestimentos().then(setLancamentos).catch(console.error),
    ]);
  };
  useEffect(() => { loadAll(); }, []);

  // ── KPIs (full portfolio, unfiltered) ──
  const totalInvestido = carteira.reduce((a, c) => a + c.valorInvestido, 0);
  const totalAtual = carteira.reduce((a, c) => a + c.valorAtual, 0);
  const lucroTotal = totalAtual - totalInvestido;
  const rentTotal = totalInvestido > 0 ? (lucroTotal / totalInvestido) * 100 : 0;
  const totalAtualUSD = totalAtual / usdRate;

  // ── Filtered carteira ──
  const carteiraFiltrada = useMemo(
    () => (filtroTipo ? carteira.filter(c => c.tipo === filtroTipo) : carteira),
    [carteira, filtroTipo],
  );

  // ── Pie chart data ──
  // "Todos" (filtroTipo === '') → group by tipo
  // Filtered → individual ativos
  const pieData = useMemo(() => {
    if (!filtroTipo) {
      const byTipo: Record<string, number> = {};
      carteira.forEach(c => { byTipo[c.tipo] = (byTipo[c.tipo] ?? 0) + c.valorAtual; });
      return Object.entries(byTipo).map(([name, value]) => ({ name, value }));
    }
    return carteiraFiltrada.filter(c => c.valorAtual > 0).map(c => ({ name: c.ativo, value: c.valorAtual }));
  }, [carteira, carteiraFiltrada, filtroTipo]);

  const pieColors = !filtroTipo
    ? pieData.map(p => CORES_TIPO[p.name] ?? '#94a3b8')
    : pieData.map((_, i) => CORES_ATIVOS[i % CORES_ATIVOS.length]);

  // ── Venda helpers ──
  const ativosDisponiveis = carteira.filter(c => c.quantidade > 0);
  const selectedAtivo = carteira.find(c => c.ativo === vendaForm.ativo) ?? null;
  const maxQtdVenda = selectedAtivo?.quantidade ?? 0;
  const qtdVendaNum = Number(vendaForm.quantidade) || 0;
  const qtdVendaValida = qtdVendaNum > 0 && qtdVendaNum <= maxQtdVenda;

  const handleVendaAtivoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const found = carteira.find(c => c.ativo === e.target.value);
    setVendaForm(f => ({
      ...f,
      ativo: e.target.value,
      tipo: found?.tipo ?? '',
      preco: found ? String(found.precoAtual) : '',
      quantidade: '',
    }));
    setVendaError('');
  };

  // ── Compra handlers ──
  const compraQtd = Number(compraForm.quantidade) || 0;
  const compraPrc = Number(compraForm.preco) || 0;
  const compraTotalNative = compraQtd * compraPrc;
  const compraTotalBRL = compraForm.moeda === 'USD' ? compraTotalNative * usdRate : compraTotalNative;

  const handleCompraChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setCompraForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleCompraCurrencyChange = (value: number) =>
    setCompraForm(f => ({ ...f, preco: String(value) }));

  const handleVendaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVendaError('');
    setVendaForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleVendaCurrencyChange = (value: number) => {
    setVendaError('');
    setVendaForm(f => ({ ...f, preco: String(value) }));
  };

  // ── Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVendaError('');

    setLoading(true);
    try {
      if (aba === 'compra') {
        if (!compraForm.ativo.trim()) return;
        await createLancamentoInvestimento({
          tipo: compraForm.tipo,
          operacao: 'compra',
          ativo: compraForm.ativo.trim().toUpperCase(),
          data: compraForm.data,
          quantidade: compraQtd,
          preco: compraPrc,
          moeda: compraForm.moeda,
          valorTotal: compraTotalNative,
          taxaCambio: usdRate,
        } as any);
        setCompraForm(emptyCompra);
      } else {
        if (!vendaForm.ativo) return;
        const vendaQtd = Number(vendaForm.quantidade);
        const vendaPrc = Number(vendaForm.preco);
        if (vendaQtd > maxQtdVenda) {
          setVendaError(`Quantidade máxima disponível: ${maxQtdVenda}`);
          return;
        }
        const res = await (await fetch('/api/lancamentos-investimentos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: vendaForm.tipo,
            operacao: 'venda',
            ativo: vendaForm.ativo,
            data: vendaForm.data,
            quantidade: vendaQtd,
            preco: vendaPrc,
            moeda: selectedAtivo?.moeda ?? 'BRL',
            valorTotal: vendaQtd * vendaPrc,
            taxaCambio: selectedAtivo?.taxaCambio ?? 1,
          }),
        })).json();
        if (res.error) { setVendaError(res.error); return; }
        setVendaForm(emptyVenda);
      }
      await loadAll();
      setShowModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (id: number) => {
    setDeleteId(id);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteLancamentoInvestimento(deleteId);
      setDeleteId(null);
      await loadAll();
    } catch (e) {
      console.error('Failed to delete', e);
      alert('Erro ao excluir lançamento');
    }
  };

  const totalCompras = lancamentos.filter(l => l.operacao === 'compra').reduce((a, b) => a + b.valorTotal, 0);
  const totalVendas = lancamentos.filter(l => l.operacao === 'venda').reduce((a, b) => a + b.valorTotal, 0);

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Valor Investido</p>
          <p className="text-xl font-bold text-slate-800 privacy-blur">{fmtBRL(totalInvestido)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Saldo Atual</p>
          <p className="text-xl font-bold text-slate-800 privacy-blur">{fmtBRL(totalAtual)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Saldo Atual (USD)</p>
          <p className="text-xl font-bold text-blue-600 privacy-blur">{fmtUSD(totalAtualUSD)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Cotação: <span className="privacy-blur">{fmtBRL(usdRate)}</span></p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Lucro / Prejuízo</p>
          <p className={`text-xl font-bold privacy-blur ${lucroTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {lucroTotal >= 0 ? '+' : ''}{fmtBRL(lucroTotal)}
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Rentabilidade</p>
          <p className={`text-xl font-bold privacy-blur ${rentTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {rentTotal >= 0 ? '+' : ''}{rentTotal.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* ── Filter ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5" /> Filtrar por tipo:
        </span>
        {['', ...TIPOS_ATIVO].map(t => (
          <button key={t || 'todos'} onClick={() => setFiltroTipo(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${filtroTipo === t
              ? 'bg-slate-800 text-white border-slate-800'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
          >
            {t || 'Todos'}
          </button>
        ))}
      </div>

      {/* ── Carteira + Pie ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-800">
              Carteira de Ativos
              {filtroTipo && <span className="ml-2 text-sm font-normal text-slate-400">— {filtroTipo}</span>}
            </h3>
            {filtroTipo && (
              <span className="text-xs text-slate-400">
                Saldo: <span className="font-semibold text-slate-700 privacy-blur">
                  {fmtBRL(carteiraFiltrada.reduce((a, c) => a + c.valorAtual, 0))}
                </span>
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="p-4">Ativo</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4 text-right">Qtd</th>
                  <th className="p-4 text-right">Preço Médio</th>
                  <th className="p-4 text-right">Preço Atual</th>
                  <th className="p-4 text-right">Valor (BRL)</th>
                  <th className="p-4 text-right">Valor (USD)</th>
                  <th className="p-4 text-right">Rentab.</th>
                </tr>
              </thead>
              <tbody className="">
                {carteiraFiltrada.map((item) => {
                  const lucro = item.valorAtual - item.valorInvestido;
                  const rent = item.valorInvestido > 0 ? (lucro / item.valorInvestido) * 100 : 0;
                  const valorUSD = item.valorAtual / usdRate;
                  const isUSD = item.moeda === 'USD';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors text-slate-700">
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <TickerLogo ticker={item.ativo} size={28} />
                          <div>
                            <span className="font-bold text-slate-900">{item.ativo}</span>
                            {isUSD && <span className="ml-1.5 text-xs font-normal text-blue-500">USD</span>}
                          </div>
                        </div>
                      </td>
                      <td className="p-4"><TipoBadge tipo={item.tipo} /></td>
                      <td className="p-4 text-right">
                        {item.quantidade % 1 === 0 ? item.quantidade : item.quantidade.toFixed(6)}
                      </td>
                      <td className="p-4 text-right">
                        <div className="privacy-blur">{fmtNative(item.precoMedio, item.moeda)}</div>
                        {isUSD && <div className="text-xs text-slate-400 privacy-blur">{fmtBRL(item.precoMedio * (item.taxaCambio || usdRate))}</div>}
                      </td>
                      <td className="p-4 text-right">
                        <div className="privacy-blur">{fmtNative(item.precoAtual, item.moeda)}</div>
                        {isUSD && <div className="text-xs text-slate-400 privacy-blur">{fmtBRL(item.precoAtual * (item.taxaCambio || usdRate))}</div>}
                      </td>
                      <td className="p-4 text-right font-medium privacy-blur">{fmtBRL(item.valorAtual)}</td>
                      <td className="p-4 text-right text-blue-600 font-medium privacy-blur">{fmtUSD(valorUSD)}</td>
                      <td className={`p-4 text-right font-semibold privacy-blur ${rent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {rent >= 0 ? '+' : ''}{rent.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
                {carteiraFiltrada.length === 0 && (
                  <tr><td colSpan={8} className="p-8 text-center text-slate-400 text-sm">Nenhum ativo encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-base font-semibold text-slate-800 mb-0.5">
            {filtroTipo ? `Distribuição — ${filtroTipo}` : 'Distribuição por Tipo'}
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            {filtroTipo ? 'Percentual por ativo' : 'Percentual por categoria'}
          </p>
          {pieData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="45%"
                    innerRadius={45} outerRadius={80} paddingAngle={2}
                    dataKey="value" labelLine={false} label={renderInlineLabel}
                  >
                    {pieData.map((_, idx) => <Cell key={idx} fill={pieColors[idx]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number, _n, { payload }) => [
                    `${fmtBRL(v)} (${((v / pieData.reduce((a, d) => a + d.value, 0)) * 100).toFixed(1)}%)`,
                    payload.name,
                  ]} />
                  <Legend verticalAlign="bottom" height={48} iconType="circle" iconSize={8}
                    formatter={(v) => <span style={{ fontSize: 11, color: '#475569' }}>{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-300 text-sm">
              Nenhum ativo para exibir
            </div>
          )}
        </div>
      </div>

      {/* ── Lançamentos ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Lançamentos de Compra / Venda</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Total compras: <span className="font-semibold text-emerald-600 privacy-blur">{fmtBRL(totalCompras)}</span>
              {' · '}Total vendas: <span className="font-semibold text-rose-500 privacy-blur">{fmtBRL(totalVendas)}</span>
            </p>
          </div>
          <button onClick={() => { setCompraForm(emptyCompra); setVendaForm(emptyVenda); setVendaError(''); setAba('compra'); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm">
            <Plus className="w-4 h-4" /> Adicionar Lançamento
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="p-4">Data</th>
                <th className="p-4">Operação</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Ativo</th>
                <th className="p-4 text-right">Qtd</th>
                <th className="p-4 text-right">Preço</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="">
              {lancamentos.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/50 transition-colors text-slate-700">
                  <td className="p-4 whitespace-nowrap">{new Date(l.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${l.operacao === 'compra' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                      {l.operacao === 'compra' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {l.operacao === 'compra' ? 'Compra' : 'Venda'}
                    </span>
                  </td>
                  <td className="p-4"><TipoBadge tipo={l.tipo} /></td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <TickerLogo ticker={l.ativo} size={22} />
                      <span className="font-bold text-slate-900">{l.ativo}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right">{l.quantidade % 1 === 0 ? l.quantidade : l.quantidade.toFixed(6)}</td>
                  <td className="p-4 text-right privacy-blur">
                    {fmtNative(l.preco, l.moeda)}
                    {' '}<span className="text-xs text-slate-400">{l.moeda}</span>
                  </td>
                  <td className={`p-4 text-right font-bold privacy-blur ${l.operacao === 'compra' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {l.operacao === 'compra' ? '' : '-'}{fmtNative(l.valorTotal, l.moeda)}
                    {l.moeda === 'USD' && (
                      <div className="text-xs font-normal text-slate-400 privacy-blur">≈ {fmtBRL(l.valorTotal * ((l as any).taxaCambio || usdRate))}</div>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => confirmDelete(l.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors" title="Excluir Lançamento">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {lancamentos.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400 text-sm">Nenhum lançamento. Clique em "Adicionar Lançamento".</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <Modal title="Novo Lançamento de Investimento" onClose={() => setShowModal(false)}>
          {/* Tabs */}
          <div className="flex rounded-xl overflow-hidden border border-slate-200 mb-5">
            {(['compra', 'venda'] as OperacaoTab[]).map(tab => (
              <button key={tab} type="button" onClick={() => { setAba(tab); setVendaError(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors ${tab === 'venda' ? 'border-l border-slate-200' : ''
                  } ${aba === tab
                    ? tab === 'compra' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                    : 'bg-white text-slate-500 hover:bg-slate-50'
                  }`}>
                {tab === 'compra' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {tab === 'compra' ? 'Compra' : 'Venda'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {aba === 'compra' ? (
              /* ──── COMPRA FORM ──── */
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de Ativo *</label>
                    <select name="tipo" value={compraForm.tipo} onChange={handleCompraChange}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
                      {TIPOS_ATIVO.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Ativo / Ticker *</label>
                    <input type="text" name="ativo" value={compraForm.ativo} onChange={handleCompraChange} required
                      placeholder="Ex: ITUB4, BTC, HGLG11..." style={{ textTransform: 'uppercase' }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Data da Compra *</label>
                    <input type="date" name="data" value={compraForm.data} onChange={handleCompraChange} required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Moeda</label>
                    <div className="flex rounded-lg overflow-hidden border border-slate-200">
                      {MOEDAS.map(m => (
                        <button key={m} type="button" onClick={() => setCompraForm(f => ({ ...f, moeda: m }))}
                          className={`flex-1 py-2 text-sm font-semibold transition-colors ${compraForm.moeda === m ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                          {m === 'BRL' ? '🇧🇷 R$' : '🇺🇸 US$'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Quantidade *</label>
                    <input type="number" name="quantidade" value={compraForm.quantidade} onChange={handleCompraChange}
                      required min="0" step="any" placeholder="0"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Preço unitário ({compraForm.moeda}) *
                    </label>
                    <CurrencyInput
                      name="preco"
                      value={Number(compraForm.preco) || 0}
                      onChange={handleCompraCurrencyChange}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>
                </div>
                {/* Real-time total */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-semibold text-slate-700">Valor Total da Compra</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-emerald-600">
                        {fmtNative(compraTotalNative, compraForm.moeda)}
                      </div>
                      {compraForm.moeda === 'USD' && compraTotalNative > 0 && (
                        <div className="text-xs text-emerald-700 mt-0.5">
                          ≈ {fmtBRL(compraTotalBRL)} · Cotação: {fmtBRL(usdRate)}/USD
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* ──── VENDA FORM ──── */
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Ativo a Vender *</label>
                  {ativosDisponiveis.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-slate-400 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <AlertCircle className="w-4 h-4" /> Nenhum ativo disponível na carteira.
                    </div>
                  ) : (
                    <select value={vendaForm.ativo} onChange={handleVendaAtivoChange} required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white">
                      <option value="">Selecione o ativo...</option>
                      {ativosDisponiveis.map(a => (
                        <option key={a.ativo} value={a.ativo}>
                          {a.ativo} — {a.tipo} ({a.quantidade % 1 === 0 ? a.quantidade : a.quantidade.toFixed(6)} disponíveis)
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {selectedAtivo && (
                  <>
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-sm text-slate-600 flex gap-4">
                      <span>Tipo: <strong>{selectedAtivo.tipo}</strong></span>
                      <span>Disponível: <strong className="text-emerald-700">
                        {selectedAtivo.quantidade % 1 === 0 ? selectedAtivo.quantidade : selectedAtivo.quantidade.toFixed(6)} cotas
                      </strong></span>
                      <span>Preço atual: <strong>{fmtNative(selectedAtivo.precoAtual, selectedAtivo.moeda)}</strong></span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Data da Venda *</label>
                        <input type="date" name="data" value={vendaForm.data} onChange={handleVendaChange} required
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Quantidade * <span className="text-rose-500">(máx: {selectedAtivo.quantidade})</span>
                        </label>
                        <input type="number" name="quantidade" value={vendaForm.quantidade} onChange={handleVendaChange}
                          required min="0.000001" max={selectedAtivo.quantidade} step="any" placeholder="0"
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${vendaForm.quantidade && !qtdVendaValida
                            ? 'border-rose-400 focus:ring-rose-400'
                            : 'border-slate-200 focus:ring-rose-400'
                            }`} />
                        {vendaForm.quantidade && !qtdVendaValida && (
                          <p className="text-xs text-rose-500 mt-1">Quantidade maior que disponível</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Preço de Venda ({selectedAtivo.moeda}) *
                      </label>
                      <CurrencyInput
                        name="preco"
                        value={Number(vendaForm.preco) || 0}
                        onChange={handleVendaCurrencyChange}
                        required
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                      />
                    </div>

                    {/* Real-time total venda */}
                    {qtdVendaValida && Number(vendaForm.preco) > 0 && (
                      <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TrendingDown className="w-5 h-5 text-rose-600" />
                            <span className="text-sm font-semibold text-slate-700">Valor Total da Venda</span>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-rose-600">
                              {fmtNative(qtdVendaNum * Number(vendaForm.preco), selectedAtivo.moeda)}
                            </div>
                            {selectedAtivo.moeda === 'USD' && (
                              <div className="text-xs text-rose-700 mt-0.5">
                                ≈ {fmtBRL(qtdVendaNum * Number(vendaForm.preco) * usdRate)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {vendaError && (
                  <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-200">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {vendaError}
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium">
                Cancelar
              </button>
              <button type="submit"
                disabled={loading || (aba === 'venda' && (!vendaForm.ativo || !qtdVendaValida || !vendaForm.preco))}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 ${aba === 'compra' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}>
                {loading ? 'Salvando...' : aba === 'compra' ? 'Registrar Compra' : 'Registrar Venda'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal de Confirmação de Exclusão ── */}
      {deleteId && (
        <Modal title="Confirmar Exclusão" onClose={() => setDeleteId(null)}>
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Excluir lançamento</h3>
            <p className="text-slate-500 font-medium">Tem certeza que deseja apagar esse lançamento?</p>
            <p className="text-sm text-slate-400 mt-2">Isso reverterá os valores na sua carteira automaticamente.</p>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => setDeleteId(null)}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 px-4 py-2 bg-rose-600 text-white font-medium rounded-lg hover:bg-rose-700 transition-colors shadow-sm"
            >
              Sim, apagar lançamento
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
