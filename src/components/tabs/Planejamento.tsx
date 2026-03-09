import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar, Target, TrendingUp, TrendingDown, Edit3, Check, X, DollarSign, Plus, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { getMetasPlanejamento, updateMetaPlanejamento, type MetaPlanejamento } from '../../services/api';
import { Modal } from '../Modal';
import { CurrencyInput } from '../CurrencyInput';

const NOMES_MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const NOMES_MESES_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const anoAtual = new Date().getFullYear();
const mesAtual = new Date().getMonth(); // 0-indexed

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

interface EditForm {
  receitaPrevista: string;
  gastoPrevisto: string;
  metaInvestimento: string;
  dividendosEsperados: string;
}

// ─── Tooltip card on hover ────────────────────────────────────────────────────
const MetaTooltip = () => {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <Info className="w-3.5 h-3.5 text-slate-400 cursor-help hover:text-violet-500 transition-colors" />
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 pointer-events-none">
          <div className="bg-slate-800/90 backdrop-blur-sm text-white text-xs rounded-xl p-3 shadow-xl border border-white/10 leading-relaxed">
            <p className="font-semibold text-violet-300 mb-1">Meta Total de Investimento</p>
            <p>Soma das suas metas mensais de aporte para o ano. É o valor que você planeja investir ao longo dos 12 meses, independente da fonte (salário, bônus, dividendos etc.).</p>
            <p className="mt-1.5 text-slate-300">💡 Mantenha abaixo do Saldo Anual Projetado para garantir que a meta é viável.</p>
          </div>
          <div className="w-2.5 h-2.5 bg-slate-800/90 rotate-45 mx-auto -mt-1.5 border-r border-b border-white/10" />
        </div>
      )}
    </div>
  );
};

// ─── Modal de Definir Meta ────────────────────────────────────────────────────
interface MetaModalProps {
  ano: number;
  metas: MetaPlanejamento[];
  onClose: () => void;
  onSaved: () => void;
}

const MetaModal = ({ ano, metas, onClose, onSaved }: MetaModalProps) => {
  const [mesAtualModal, setMesAtualModal] = useState(mesAtual + 1); // 1-indexed
  const m = metas[mesAtualModal - 1];
  const [form, setForm] = useState<EditForm>({
    receitaPrevista: String(m?.receitaPrevista ?? 0),
    gastoPrevisto: String(m?.gastoPrevisto ?? 0),
    metaInvestimento: String(m?.metaInvestimento ?? 0),
    dividendosEsperados: String(m?.dividendosEsperados ?? 0),
  });
  const [saving, setSaving] = useState(false);

  const changeMes = (mes: number) => {
    const nm = metas[mes - 1];
    setForm({
      receitaPrevista: String(nm?.receitaPrevista ?? 0),
      gastoPrevisto: String(nm?.gastoPrevisto ?? 0),
      metaInvestimento: String(nm?.metaInvestimento ?? 0),
      dividendosEsperados: String(nm?.dividendosEsperados ?? 0),
    });
    setMesAtualModal(mes);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMetaPlanejamento(ano, mesAtualModal, {
        receitaPrevista: Number(form.receitaPrevista) || 0,
        gastoPrevisto: Number(form.gastoPrevisto) || 0,
        metaInvestimento: Number(form.metaInvestimento) || 0,
        dividendosEsperados: Number(form.dividendosEsperados) || 0,
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const saldoPreview = (Number(form.receitaPrevista) || 0) - (Number(form.gastoPrevisto) || 0);
  const metaViavel = (Number(form.metaInvestimento) || 0) <= saldoPreview;

  return (
    <Modal title={`Definir Metas — ${ano}`} onClose={onClose}>
      {/* Month tabs */}
      <div className="flex flex-wrap gap-1 mb-5">
        {NOMES_MESES_SHORT.map((nome, i) => (
          <button key={i} type="button" onClick={() => changeMes(i + 1)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${mesAtualModal === i + 1 ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}>
            {nome}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Receita Prevista (R$)</label>
            <CurrencyInput
              value={Number(form.receitaPrevista) || 0}
              onChange={(value) => setForm(f => ({ ...f, receitaPrevista: String(value) }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Gasto Previsto (R$)</label>
            <CurrencyInput
              value={Number(form.gastoPrevisto) || 0}
              onChange={(value) => setForm(f => ({ ...f, gastoPrevisto: String(value) }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Meta de Investimento (R$)</label>
            <CurrencyInput
              value={Number(form.metaInvestimento) || 0}
              onChange={(value) => setForm(f => ({ ...f, metaInvestimento: String(value) }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Dividendos Estimados (R$)</label>
            <CurrencyInput
              value={Number(form.dividendosEsperados) || 0}
              onChange={(value) => setForm(f => ({ ...f, dividendosEsperados: String(value) }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        {/* Live preview */}
        <div className={`rounded-xl p-4 border ${metaViavel ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-700">Saldo do mês:</span>
            <span className={`font-bold text-lg ${saldoPreview >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{fmt(saldoPreview)}</span>
          </div>
          <p className={`text-xs mt-1 font-medium ${metaViavel ? 'text-emerald-600' : 'text-rose-600'}`}>
            {metaViavel ? 'Meta viável — saldo cobre o investimento' : 'Meta acima do saldo — revisar valores'}
          </p>
        </div>
      </div>

      <div className="flex gap-3 mt-5">
        <button type="button" onClick={onClose}
          className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium">
          Cancelar
        </button>
        <button type="button" onClick={handleSave} disabled={saving}
          className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm font-medium disabled:opacity-50">
          {saving ? 'Salvando...' : `Salvar ${NOMES_MESES[mesAtualModal - 1]}`}
        </button>
      </div>
    </Modal>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const Planejamento = () => {
  const [ano, setAno] = useState(anoAtual);
  const [metas, setMetas] = useState<MetaPlanejamento[]>([]);
  const [editingMes, setEditingMes] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ receitaPrevista: '', gastoPrevisto: '', metaInvestimento: '', dividendosEsperados: '' });
  const [saving, setSaving] = useState(false);
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [dividendosReais, setDividendosReais] = useState<Record<number, number>>({});

  const load = () => getMetasPlanejamento(ano).then(setMetas).catch(console.error);

  useEffect(() => { load(); }, [ano]);

  // Fetch real dividend data and group by month
  useEffect(() => {
    fetch('/api/dividendos')
      .then(r => r.json())
      .then((data: any[]) => {
        const byMes: Record<number, number> = {};
        data.forEach(d => {
          if (!d.dataPagamento) return;
          const dp = new Date(d.dataPagamento);
          if (dp.getFullYear() !== ano) return;
          const mes = dp.getMonth() + 1;
          byMes[mes] = (byMes[mes] ?? 0) + d.totalLiquido;
        });
        setDividendosReais(byMes);
      })
      .catch(() => { });
  }, [ano]);

  const totais = useMemo(() => ({
    receita: metas.reduce((a, m) => a + m.receitaPrevista, 0),
    gasto: metas.reduce((a, m) => a + m.gastoPrevisto, 0),
    investimento: metas.reduce((a, m) => a + m.metaInvestimento, 0),
    dividendos: metas.reduce((a, m) => a + m.dividendosEsperados, 0),
    dividendosReaisTotal: Object.values(dividendosReais).reduce((a: number, v: number) => a + v, 0),
  }), [metas, dividendosReais]);

  const saldoAnual = totais.receita - totais.gasto;
  const txPoupanca = totais.receita > 0 ? (saldoAnual / totais.receita) * 100 : 0;

  const chartData = metas.map((m, i) => ({
    mes: NOMES_MESES_SHORT[i],
    'Receita Prevista': m.receitaPrevista,
    'Gasto Previsto': m.gastoPrevisto,
    'Meta Investimento': m.metaInvestimento,
  }));

  const progressData = metas.map((m, i) => ({
    mes: NOMES_MESES_SHORT[i],
    'Saldo Projetado': m.receitaPrevista - m.gastoPrevisto,
    'Meta Investimento': m.metaInvestimento,
    'Dividendos Reais': dividendosReais[i + 1] ?? 0,
  }));

  const startEdit = (mes: number) => {
    const m = metas[mes - 1];
    setEditForm({ receitaPrevista: String(m.receitaPrevista), gastoPrevisto: String(m.gastoPrevisto), metaInvestimento: String(m.metaInvestimento), dividendosEsperados: String(m.dividendosEsperados) });
    setEditingMes(mes);
  };

  const saveEdit = async () => {
    if (editingMes === null) return;
    setSaving(true);
    try {
      await updateMetaPlanejamento(ano, editingMes, {
        receitaPrevista: Number(editForm.receitaPrevista) || 0,
        gastoPrevisto: Number(editForm.gastoPrevisto) || 0,
        metaInvestimento: Number(editForm.metaInvestimento) || 0,
        dividendosEsperados: Number(editForm.dividendosEsperados) || 0,
      });
      await load();
      setEditingMes(null);
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setAno(a => a - 1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold">‹</button>
          <span className="text-2xl font-bold text-slate-800">{ano}</span>
          <button onClick={() => setAno(a => a + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold">›</button>
        </div>
        <button onClick={() => setShowMetaModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm font-medium shadow-sm">
          <Plus className="w-4 h-4" /> Definir Metas
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Receita */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0"><TrendingUp className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Receita Anual Prevista</p>
            <p className="text-xl font-bold text-slate-800 privacy-blur">{fmt(totais.receita)}</p>
          </div>
        </div>
        {/* Gasto */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl shrink-0"><TrendingDown className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Gasto Anual Previsto</p>
            <p className="text-xl font-bold text-slate-800 privacy-blur">{fmt(totais.gasto)}</p>
          </div>
        </div>
        {/* Meta Investimento com tooltip */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-violet-50 text-violet-600 rounded-xl shrink-0"><Target className="w-6 h-6" /></div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 truncate">Meta Total de Investimento</p>
              <MetaTooltip />
            </div>
            <p className="text-xl font-bold text-slate-800 privacy-blur">{fmt(totais.investimento)}</p>
          </div>
        </div>
        {/* Dividendos — planned vs real */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0"><DollarSign className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Dividendos Estimados</p>
            <p className="text-xl font-bold text-slate-800 privacy-blur">{fmt(totais.dividendos)}</p>
            {totais.dividendosReaisTotal > 0 && (
              <p className="text-xs text-amber-600 font-medium mt-0.5">
                Real: <span className="privacy-blur">{fmt(totais.dividendosReaisTotal)}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Extra KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Saldo Anual Projetado</p>
          <p className={`text-3xl font-bold privacy-blur ${saldoAnual >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmt(saldoAnual)}</p>
          <p className="text-sm text-slate-500 mt-1">Taxa de poupança projetada: <span className="font-semibold text-slate-700 privacy-blur">{txPoupanca.toFixed(1)}%</span></p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Meta de Investimento vs Saldo</p>
          <p className={`text-3xl font-bold ${totais.investimento <= saldoAnual ? 'text-emerald-600' : 'text-rose-600'}`}>
            {totais.investimento <= saldoAnual ? 'Meta viável' : '⚠️ Meta acima do saldo'}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Diferença: <span className="font-semibold text-slate-700 privacy-blur">{fmt(saldoAnual - totais.investimento)}</span>
          </p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-base font-semibold text-slate-800 mb-4">Evolução Mensal do Planejamento</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} cursor={{ fill: '#f8fafc' }} />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Bar dataKey="Receita Prevista" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Gasto Previsto" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Meta Investimento" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Line Chart — Saldo vs Meta vs Dividendos Reais */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-base font-semibold text-slate-800 mb-4">Saldo Projetado vs Meta de Investimento x Dividendos Reais</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={progressData} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Line type="monotone" dataKey="Saldo Projetado" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Meta Investimento" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Dividendos Reais" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Metas por Mês — {ano}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Clique no <span className="font-medium">lápis</span> para editar, ou use "Definir Metas" acima para um editor completo</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="p-4 w-28">Mês</th>
                <th className="p-4 text-right">Receita Prevista</th>
                <th className="p-4 text-right">Gasto Previsto</th>
                <th className="p-4 text-right">Meta Invest.</th>
                <th className="p-4 text-right">Div. Estimados</th>
                <th className="p-4 text-right">Div. Reais</th>
                <th className="p-4 text-right">Saldo</th>
                <th className="p-4 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metas.map((m, i) => {
                const saldo = m.receitaPrevista - m.gastoPrevisto;
                const divReal = dividendosReais[i + 1] ?? 0;
                const isEditing = editingMes === m.mes;
                return (
                  <tr key={m.mes} className="hover:bg-slate-50/50 transition-colors text-slate-700">
                    <td className="p-4 font-bold text-slate-900">{NOMES_MESES_SHORT[i]}</td>
                    {isEditing ? (
                      <>
                        {(['receitaPrevista', 'gastoPrevisto', 'metaInvestimento', 'dividendosEsperados'] as (keyof EditForm)[]).map(key => (
                          <td key={key} className="px-2 py-1">
                            <CurrencyInput
                              value={Number(editForm[key]) || 0}
                              onChange={(value) => setEditForm(f => ({ ...f, [key]: String(value) }))}
                              className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs text-right focus:outline-none focus:ring-2 focus:ring-violet-400"
                            />
                          </td>
                        ))}
                        <td className="p-4 text-right text-xs text-slate-400">—</td>
                        <td className={`p-4 text-right font-bold privacy-blur ${saldo >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmt(saldo)}</td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={saveEdit} disabled={saving} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setEditingMes(null)} className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"><X className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-4 text-right font-medium text-emerald-600 privacy-blur">{fmt(m.receitaPrevista)}</td>
                        <td className="p-4 text-right font-medium text-rose-600 privacy-blur">{fmt(m.gastoPrevisto)}</td>
                        <td className="p-4 text-right font-bold text-violet-600 privacy-blur">{fmt(m.metaInvestimento)}</td>
                        <td className="p-4 text-right font-medium text-amber-600 privacy-blur">{fmt(m.dividendosEsperados)}</td>
                        <td className="p-4 text-right font-medium text-amber-500 privacy-blur">
                          {divReal > 0 ? fmt(divReal) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className={`p-4 text-right font-bold privacy-blur ${saldo >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmt(saldo)}</td>
                        <td className="p-4 text-right">
                          <button onClick={() => startEdit(m.mes)} className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors">
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200 text-sm font-bold text-slate-800">
                <td className="p-4">Total</td>
                <td className="p-4 text-right text-emerald-700 privacy-blur">{fmt(totais.receita)}</td>
                <td className="p-4 text-right text-rose-700 privacy-blur">{fmt(totais.gasto)}</td>
                <td className="p-4 text-right text-violet-700 privacy-blur">{fmt(totais.investimento)}</td>
                <td className="p-4 text-right text-amber-700 privacy-blur">{fmt(totais.dividendos)}</td>
                <td className="p-4 text-right text-amber-600 privacy-blur">{fmt(totais.dividendosReaisTotal)}</td>
                <td className={`p-4 text-right privacy-blur ${saldoAnual >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{fmt(saldoAnual)}</td>
                <td className="p-4" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Meta Modal */}
      {showMetaModal && (
        <MetaModal ano={ano} metas={metas} onClose={() => setShowMetaModal(false)} onSaved={load} />
      )}
    </div>
  );
};
