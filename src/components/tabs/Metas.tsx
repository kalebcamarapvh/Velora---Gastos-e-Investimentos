import React, { useState, useEffect, useCallback } from 'react';
import {
  Target, TrendingUp, DollarSign, Plus, MoreVertical,
  Pencil, Trash2, X, ChevronLeft, Building2, BarChart3, Coins,
  CheckCircle2, Circle
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type MetaTipo = 'patrimonio' | 'ativos' | 'proventos';

interface MetaFinanceira {
  id: number;
  tipo: MetaTipo;
  categoria: string | null;
  valorTotal: number | null;
  aporteMensal: number | null;
  variacaoAnual: number | null;
  valorFinalMeta: number | null;
  tiposAtivos: string | null; // JSON array
  mediaProventosDesejada: number | null;
  criadoEm: string;
}

interface CarteiraItem {
  ativo: string;
  tipo: string;
  valorAtual: number;
  quantidade: number;
}

interface DividendoItem {
  ticker: string;
  tipo: string;
  dataPagamento: string | null;
  totalLiquido: number;
  status: string;
}

const TIPOS_ATIVOS_OPCOES = ['Ações', 'FIIs', 'Stocks', 'BDRs', 'ETF'];

const CATEGORIAS_PATRIMONIO = [
  'Total do Patrimônio',
  'Renda Variável',
  'Renda Fixa',
  'Imóveis',
  'Reserva de Emergência',
  'Outro',
];

const CATEGORIAS_ATIVOS = ['Ações', 'FIIs', 'ETF', 'CDB', 'Tesouro Direto', 'BDRs', 'Stocks', 'Outro'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const fmtK = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}K`;
  return fmt(v);
};

/** Estimate completion date given current, aporte, faltam, taxa */
function estimateConclusao(
  valorAtual: number,
  valorObjetivo: number,
  aporte: number,
  taxaAnual: number
): string {
  if (valorAtual >= valorObjetivo) return 'Concluída';
  if (!aporte || aporte <= 0) return '—';
  const taxaMensal = Math.pow(1 + (taxaAnual || 0) / 100, 1 / 12) - 1;
  let total = valorAtual;
  let meses = 0;
  while (total < valorObjetivo && meses < 600) {
    total = total * (1 + taxaMensal) + aporte;
    meses++;
  }
  if (meses >= 600) return '> 50 anos';
  const data = new Date();
  data.setMonth(data.getMonth() + meses);
  return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function calcMediaMensal12m(dividendos: DividendoItem[], tiposPermitidos: string[]): number {
  const hoje = new Date();
  const limite = new Date(hoje);
  limite.setMonth(limite.getMonth() - 12);

  const pagos = dividendos.filter(d => {
    if (d.status !== 'pago') return false;
    if (!d.dataPagamento) return false;
    const dt = new Date(d.dataPagamento);
    return dt >= limite && dt <= hoje;
  });

  // Normalize tipo names to match checkboxes
  const tiposMap: Record<string, string[]> = {
    'Ações': ['DIVIDENDO', 'JCP'],
    'FIIs': ['RENDIMENTO', 'DIVIDENDO'],
    'Stocks': ['DIVIDENDO'],
    'BDRs': ['DIVIDENDO', 'JCP'],
    'ETF': ['DIVIDENDO', 'RENDIMENTO'],
  };
  const permitidos = new Set(tiposPermitidos);

  const filtrados = pagos.filter(d => {
    for (const [cat, tipos] of Object.entries(tiposMap)) {
      if (permitidos.has(cat) && tipos.includes(d.tipo)) return true;
    }
    // If no tipo filter makes sense, include all if all types are selected
    return tiposPermitidos.length >= 4;
  });

  const total = filtrados.reduce((s, d) => s + (d.totalLiquido || 0), 0);
  return total / 12;
}

// ─── Empty form state ─────────────────────────────────────────────────────────
const emptyForm = () => ({
  tipo: 'patrimonio' as MetaTipo,
  categoria: '',
  valorTotal: '',
  aporteMensal: '',
  variacaoAnual: '',
  valorFinalMeta: '',
  tiposAtivos: ['Ações', 'FIIs', 'Stocks', 'BDRs', 'ETF'] as string[],
  mediaProventosDesejada: '',
});

// ─── Modal Step 1: Choose type ────────────────────────────────────────────────
const TIPO_CARDS = [
  {
    tipo: 'patrimonio' as MetaTipo,
    label: 'Meta de Patrimônio',
    desc: 'Acompanhe o crescimento do seu patrimônio total ou por categoria',
    icon: Building2,
    color: 'from-blue-500 to-blue-700',
    bg: 'bg-blue-50 dark:bg-slate-800',
    border: 'border-blue-200 dark:border-blue-600',
    iconBg: 'bg-blue-100 dark:bg-slate-700',
    iconColor: 'text-blue-600 dark:text-white',
    labelColor: 'text-blue-700 dark:text-white',
  },
  {
    tipo: 'ativos' as MetaTipo,
    label: 'Meta de Ativos',
    desc: 'Defina o valor que deseja acumular em uma categoria de investimentos',
    icon: BarChart3,
    color: 'from-violet-500 to-violet-700',
    bg: 'bg-violet-50 dark:bg-slate-800',
    border: 'border-violet-200 dark:border-violet-500',
    iconBg: 'bg-violet-100 dark:bg-slate-700',
    iconColor: 'text-violet-600 dark:text-white',
    labelColor: 'text-violet-700 dark:text-white',
  },
  {
    tipo: 'proventos' as MetaTipo,
    label: 'Meta de Proventos',
    desc: 'Estabeleça a média mensal de dividendos que deseja receber',
    icon: Coins,
    color: 'from-amber-500 to-amber-600',
    bg: 'bg-amber-50 dark:bg-slate-800',
    border: 'border-amber-200 dark:border-amber-500',
    iconBg: 'bg-amber-100 dark:bg-slate-700',
    iconColor: 'text-amber-600 dark:text-white',
    labelColor: 'text-amber-700 dark:text-white',
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export const Metas = () => {
  const [metas, setMetas] = useState<MetaFinanceira[]>([]);
  const [carteira, setCarteira] = useState<CarteiraItem[]>([]);
  const [dividendos, setDividendos] = useState<DividendoItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Per-card menu
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [metasRes, carteiraRes, divRes] = await Promise.all([
        fetch('/api/metas-financeiras'),
        fetch('/api/carteira'),
        fetch('/api/dividendos'),
      ]);
      setMetas(metasRes.ok ? await metasRes.json() : []);
      setCarteira(carteiraRes.ok ? await carteiraRes.json() : []);
      setDividendos(divRes.ok ? await divRes.json() : []);
    } catch {
      // keep empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Compute "current value" for each meta ────────────────────────────────────
  function getValorAtual(meta: MetaFinanceira): number {
    if (meta.tipo === 'patrimonio') {
      if (!meta.categoria || meta.categoria === 'Total do Patrimônio') {
        return carteira.reduce((s, c) => s + (c.valorAtual || 0), 0);
      }
      // By category
      return carteira
        .filter(c => c.tipo.toLowerCase() === meta.categoria!.toLowerCase() ||
          (meta.categoria === 'Renda Variável' && ['Ações', 'FIIs', 'ETF', 'BDRs', 'Stocks'].includes(c.tipo)) ||
          (meta.categoria === 'Renda Fixa' && ['CDB', 'Tesouro Direto', 'LCI', 'LCA'].includes(c.tipo)))
        .reduce((s, c) => s + (c.valorAtual || 0), 0);
    }

    if (meta.tipo === 'ativos') {
      // Match by tipo in carteira
      return carteira
        .filter(c => c.tipo.toLowerCase() === (meta.categoria || '').toLowerCase())
        .reduce((s, c) => s + (c.valorAtual || 0), 0);
    }

    if (meta.tipo === 'proventos') {
      const tipos = meta.tiposAtivos ? JSON.parse(meta.tiposAtivos) : TIPOS_ATIVOS_OPCOES;
      return calcMediaMensal12m(dividendos, tipos);
    }

    return 0;
  }

  function getValorObjetivo(meta: MetaFinanceira): number {
    if (meta.tipo === 'proventos') return meta.mediaProventosDesejada ?? 0;
    if (meta.tipo === 'ativos') return meta.valorFinalMeta ?? meta.valorTotal ?? 0;
    return meta.valorTotal ?? 0;
  }

  // ── Open create modal ────────────────────────────────────────────────────────
  function openCreate() {
    setForm(emptyForm());
    setEditingId(null);
    setStep(1);
    setShowModal(true);
  }

  // ── Open edit modal ──────────────────────────────────────────────────────────
  function openEdit(meta: MetaFinanceira) {
    setOpenMenu(null);
    setForm({
      tipo: meta.tipo,
      categoria: meta.categoria ?? '',
      valorTotal: meta.valorTotal?.toString() ?? '',
      aporteMensal: meta.aporteMensal?.toString() ?? '',
      variacaoAnual: meta.variacaoAnual?.toString() ?? '',
      valorFinalMeta: meta.valorFinalMeta?.toString() ?? '',
      tiposAtivos: meta.tiposAtivos ? JSON.parse(meta.tiposAtivos) : TIPOS_ATIVOS_OPCOES,
      mediaProventosDesejada: meta.mediaProventosDesejada?.toString() ?? '',
    });
    setEditingId(meta.id);
    setStep(2);
    setShowModal(true);
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  function requestDelete(id: number) {
    setOpenMenu(null);
    setDeleteConfirmId(id);
  }

  async function confirmDelete() {
    if (deleteConfirmId === null) return;
    try {
      await fetch(`/api/metas-financeiras/${deleteConfirmId}`, { method: 'DELETE' });
      setMetas(prev => prev.filter(m => m.id !== deleteConfirmId));
    } catch { /* ignore */ } finally {
      setDeleteConfirmId(null);
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    const body = {
      tipo: form.tipo,
      categoria: form.categoria || null,
      valorTotal: form.valorTotal ? parseFloat(form.valorTotal) : null,
      aporteMensal: form.aporteMensal ? parseFloat(form.aporteMensal) : null,
      variacaoAnual: form.variacaoAnual ? parseFloat(form.variacaoAnual) : null,
      valorFinalMeta: form.valorFinalMeta ? parseFloat(form.valorFinalMeta) : null,
      tiposAtivos: form.tipo === 'proventos' ? form.tiposAtivos : null,
      mediaProventosDesejada: form.mediaProventosDesejada ? parseFloat(form.mediaProventosDesejada) : null,
    };

    try {
      let ok = false;
      if (editingId !== null) {
        const r = await fetch(`/api/metas-financeiras/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        ok = r.ok;
        if (ok) await fetchAll();
      } else {
        const r = await fetch('/api/metas-financeiras', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        ok = r.ok;
        if (ok) await fetchAll();
      }
      if (ok) {
        setShowModal(false);
      } else {
        alert('Erro ao salvar meta. Verifique se o servidor está rodando (npm run server).');
      }
    } catch {
      alert('Erro de conexão. Inicie o servidor backend com: npm run server');
    } finally {
      setSaving(false);
    }
  }

  // ── Toggle tipo ativo ────────────────────────────────────────────────────────
  function toggleTipoAtivo(t: string) {
    setForm(prev => ({
      ...prev,
      tiposAtivos: prev.tiposAtivos.includes(t)
        ? prev.tiposAtivos.filter(x => x !== t)
        : [...prev.tiposAtivos, t],
    }));
  }

  // ── Input helper ─────────────────────────────────────────────────────────────
  const inp = (field: keyof ReturnType<typeof emptyForm>, placeholder: string, label: string, required = false, type = 'number') => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {label}{required && <span className="text-rose-400 ml-1">*</span>}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={form[field] as string}
        onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
      />
    </div>
  );

  const sel = (field: keyof ReturnType<typeof emptyForm>, label: string, options: string[], required = false) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {label}{required && <span className="text-rose-400 ml-1">*</span>}
      </label>
      <select
        value={form[field] as string}
        onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
      >
        <option value="">Selecione...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  // ── Card rendering ────────────────────────────────────────────────────────────
  const renderCard = (meta: MetaFinanceira) => {
    const valorAtual = getValorAtual(meta);
    const valorObjetivo = getValorObjetivo(meta);
    const pct = valorObjetivo > 0 ? Math.min(100, (valorAtual / valorObjetivo) * 100) : 0;
    const faltam = Math.max(0, valorObjetivo - valorAtual);
    const conclusao = estimateConclusao(valorAtual, valorObjetivo, meta.aporteMensal ?? 0, meta.variacaoAnual ?? 0);
    const isProventos = meta.tipo === 'proventos';
    const isMenuOpen = openMenu === meta.id;

    const tipoMeta = TIPO_CARDS.find(t => t.tipo === meta.tipo)!;
    const Icon = tipoMeta.icon;

    // gradient for progress bar by type
    const barColor = {
      patrimonio: 'from-blue-500 to-blue-600',
      ativos: 'from-violet-500 to-violet-600',
      proventos: 'from-amber-400 to-amber-500',
    }[meta.tipo];

    const labelAtual = { patrimonio: 'Atual', ativos: 'Aplicado', proventos: 'Média mensal atual' }[meta.tipo];
    const labelObjetivo = { patrimonio: 'Objetivo', ativos: 'Objetivo', proventos: 'Objetivo mensal' }[meta.tipo];

    // Title of the card
    let titulo = '';
    if (meta.tipo === 'proventos') {
      const tipos = meta.tiposAtivos ? JSON.parse(meta.tiposAtivos) : TIPOS_ATIVOS_OPCOES;
      titulo = `Proventos mensais em ${tipos.join(', ')}`;
    } else {
      titulo = `${meta.tipo === 'patrimonio' ? 'Patrimônio' : 'Ativos'} — ${meta.categoria || 'Total'}`;
    }

    return (
      <div
        key={meta.id}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4 hover:shadow-md transition-shadow"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2 rounded-xl ${tipoMeta.bg} flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${tipoMeta.iconColor}`} />
            </div>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2">
              {titulo}
            </span>
          </div>
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setOpenMenu(isMenuOpen ? null : meta.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 top-8 z-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 w-36">
                <button
                  onClick={() => openEdit(meta)}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
                <button
                  onClick={() => requestDelete(meta.id)}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Progresso</span>
            <span className={`text-sm font-bold ${pct >= 100 ? 'text-emerald-500' : 'text-slate-800 dark:text-slate-100'}`}>
              {pct.toFixed(2)}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <StatPill label={labelAtual} value={fmtK(valorAtual)} />
          {!isProventos && meta.aporteMensal ? (
            <StatPill label="Aporte mensal" value={fmtK(meta.aporteMensal)} />
          ) : null}
          <StatPill label="Faltam" value={fmtK(faltam)} />
          {!isProventos && (
            <StatPill label="Conclusão estimada" value={conclusao} mono={false} />
          )}
          <StatPill label={labelObjetivo} value={fmtK(valorObjetivo)} highlight />
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6" onClick={() => openMenu !== null && setOpenMenu(null)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Metas Financeiras</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Acompanhe o progresso das suas metas de forma visual</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-sm shadow-sm hover:from-emerald-600 hover:to-emerald-700 transition-all hover:shadow-md active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Nova Meta
        </button>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 animate-pulse h-48" />
          ))}
        </div>
      ) : metas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-6 mb-5">
            <Target className="w-12 h-12 text-slate-400 dark:text-slate-600" />
          </div>
          <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Nenhuma meta criada ainda</h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs">
            Clique em "Nova Meta" para definir seus objetivos financeiros e acompanhar o progresso em tempo real.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {metas.map(renderCard)}
        </div>
      )}

      {/* ── Modal ───────────────────────────────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                {step === 2 && (
                  <button
                    onClick={() => { if (editingId === null) setStep(1); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    {editingId === null && <ChevronLeft className="w-5 h-5" />}
                  </button>
                )}
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  {step === 1 ? 'Escolha o tipo de meta' : editingId !== null ? 'Editar Meta' : `Nova Meta — ${TIPO_CARDS.find(t => t.tipo === form.tipo)?.label}`}
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 overflow-y-auto max-h-[75vh] space-y-4">
              {/* Step 1: choose type */}
              {step === 1 && (
                <div className="space-y-3">
                  {TIPO_CARDS.map(tc => (
                    <button
                      key={tc.tipo}
                      onClick={() => { setForm(prev => ({ ...prev, tipo: tc.tipo })); setStep(2); }}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all hover:shadow-sm ${tc.bg} ${tc.border} hover:scale-[1.01] active:scale-100`}
                    >
                      <div className={`p-3 rounded-xl ${tc.iconBg}`}>
                        <tc.icon className={`w-6 h-6 ${tc.iconColor}`} />
                      </div>
                      <div>
                        <div className={`font-semibold text-sm ${tc.labelColor}`}>{tc.label}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">{tc.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Step 2: form */}
              {step === 2 && form.tipo === 'patrimonio' && (
                <div className="space-y-4">
                  {sel('categoria', 'Categoria da meta', CATEGORIAS_PATRIMONIO, true)}
                  {inp('valorTotal', 'Ex: 200000', 'Valor Total Objetivo (R$)', true)}
                  {inp('aporteMensal', 'Ex: 2000', 'Aporte Mensal (R$)', true)}
                  {inp('variacaoAnual', 'Ex: 8', 'Estimativa de Variação Anual (%)', false)}
                </div>
              )}

              {step === 2 && form.tipo === 'ativos' && (
                <div className="space-y-4">
                  {sel('categoria', 'Categoria de ativos', CATEGORIAS_ATIVOS, true)}
                  {inp('valorTotal', 'Ex: 100000', 'Valor Total (R$)', true)}
                  {inp('aporteMensal', 'Ex: 1500', 'Aporte Mensal (R$)', true)}
                  {inp('variacaoAnual', 'Ex: 12', 'Estimativa de Variação Anual (%)', false)}
                  {inp('valorFinalMeta', 'Ex: 150000', 'Valor Final da Meta (R$)', true)}
                </div>
              )}

              {step === 2 && form.tipo === 'proventos' && (
                <div className="space-y-5">
                  {/* Tipos de ativos */}
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-2">
                      Tipos de Ativos
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {TIPOS_ATIVOS_OPCOES.map(t => {
                        const sel = form.tiposAtivos.includes(t);
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => toggleTipoAtivo(t)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${sel
                              ? 'bg-amber-500 border-amber-500 text-white'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-400'
                              }`}
                          >
                            {sel ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Current real dividends */}
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                    <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">
                      Seus proventos reais (últimos 12 meses)
                    </div>
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 privacy-blur">
                      {fmt(calcMediaMensal12m(dividendos, form.tiposAtivos))}
                      <span className="text-sm font-normal text-amber-500 ml-1">/mês (média)</span>
                    </div>
                  </div>

                  {inp('mediaProventosDesejada', 'Ex: 500', 'Média de Proventos Mensais Desejada (R$)', true)}
                </div>
              )}
            </div>

            {/* Modal footer */}
            {step === 2 && (
              <div className="flex gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all disabled:opacity-50 shadow-sm"
                >
                  {saving ? 'Salvando...' : editingId !== null ? 'Salvar Alterações' : 'Criar Meta'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ──────────────────────────────────────────────── */}
      {deleteConfirmId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 p-6 w-full max-w-sm flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/40">
                <Trash2 className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Excluir meta?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold transition-colors shadow-sm"
              >
                Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── StatPill helper component ────────────────────────────────────────────────
const StatPill = ({ label, value, highlight = false, mono = true }: {
  label: string; value: string; highlight?: boolean; mono?: boolean;
}) => (
  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2.5">
    <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{label}</div>
    <div className={`text-sm font-bold privacy-blur ${highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'} ${mono ? 'font-mono' : ''}`}>
      {value}
    </div>
  </div>
);
