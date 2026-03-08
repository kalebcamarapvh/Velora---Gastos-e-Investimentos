import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Filter, Download, X, ChevronDown, FileText, FileSpreadsheet, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Modal } from '../Modal';
import { getReceitas, createReceita, deleteReceita, type Receita } from '../../services/api';

const CATEGORIAS_RECEITA = ['Salário', 'Freelance', 'Dividendos', 'Aluguel', 'Renda Extra', 'Investimentos', 'Outros'];

type OrdemData = 'recente' | 'antigo';

interface Filtros {
  ordemData: OrdemData;
  categoria: string;
  conta: string;
  valorMin: string;
  valorMax: string;
}

const filtrosIniciais: Filtros = {
  ordemData: 'recente',
  categoria: '',
  conta: '',
  valorMin: '',
  valorMax: '',
};

const emptyForm = {
  data: new Date().toISOString().slice(0, 10),
  descricao: '',
  categoria: CATEGORIAS_RECEITA[0],
  origem: '',
  conta: '',
  valor: '',
};

export const Receitas = () => {
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showFiltros, setShowFiltros] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [filtros, setFiltros] = useState<Filtros>(filtrosIniciais);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const load = () => getReceitas().then(setReceitas).catch(console.error);
  useEffect(() => { load(); }, []);

  // ---------- derived: unique categories & accounts from data ----------
  const categoriasDisponiveis = useMemo(() =>
    ['', ...Array.from(new Set(receitas.map(r => r.categoria))).sort()],
    [receitas]);

  const contasDisponiveis = useMemo(() =>
    ['', ...Array.from(new Set(receitas.map(r => r.conta).filter(Boolean))).sort()],
    [receitas]);

  // ---------- apply filters ----------
  const receitasFiltradas = useMemo(() => {
    let lista = [...receitas];

    if (filtros.categoria) lista = lista.filter(r => r.categoria === filtros.categoria);
    if (filtros.conta) lista = lista.filter(r => r.conta === filtros.conta);
    if (filtros.valorMin !== '') lista = lista.filter(r => r.valor >= Number(filtros.valorMin));
    if (filtros.valorMax !== '') lista = lista.filter(r => r.valor <= Number(filtros.valorMax));

    lista.sort((a, b) => {
      const diff = new Date(a.data).getTime() - new Date(b.data).getTime();
      return filtros.ordemData === 'recente' ? -diff : diff;
    });

    return lista;
  }, [receitas, filtros]);

  const totalFiltrado = receitasFiltradas.reduce((acc, r) => acc + r.valor, 0);

  const filtrosAtivos = JSON.stringify(filtros) !== JSON.stringify(filtrosIniciais);

  // ---------- form ----------
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleFiltroChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFiltros(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createReceita({ ...form, valor: Number(form.valor) });
      await load();
      setShowModal(false);
      setForm(emptyForm);
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
      await deleteReceita(deleteId);
      setDeleteId(null);
      await load();
    } catch (e) {
      console.error('Failed to delete', e);
      alert('Erro ao excluir lançamento');
    }
  };

  // ---------- export ----------
  const dadosParaExportar = () =>
    receitasFiltradas.map(r => ({
      Data: new Date(r.data + 'T00:00:00').toLocaleDateString('pt-BR'),
      Descrição: r.descricao,
      Categoria: r.categoria,
      Origem: r.origem,
      Conta: r.conta,
      'Valor (R$)': r.valor,
    }));

  const exportarCSV = () => {
    const dados = dadosParaExportar();
    const cabecalho = Object.keys(dados[0]).join(';');
    const linhas = dados.map(row =>
      Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')
    );
    const csv = [cabecalho, ...linhas].join('\n');
    const bom = '\uFEFF'; // UTF-8 BOM para Excel reconhecer acentos
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receitas_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const exportarXLSX = () => {
    const dados = dadosParaExportar();
    const ws = XLSX.utils.json_to_sheet(dados);
    // Adjust column widths
    ws['!cols'] = [
      { wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 14 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Receitas');
    XLSX.writeFile(wb, `receitas_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setShowExportMenu(false);
  };

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <span className="text-sm font-semibold uppercase tracking-wider">Total</span>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 privacy-blur">{formatCurrency(totalFiltrado)}</div>
            {filtrosAtivos && (
              <div className="text-xs text-slate-400">{receitasFiltradas.length} de {receitas.length} registros</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setShowFiltros(f => !f); setShowExportMenu(false); }}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors text-sm font-medium ${filtrosAtivos
              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
            {filtrosAtivos && <span className="bg-emerald-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">!</span>}
            <ChevronDown className={`w-3 h-3 transition-transform ${showFiltros ? 'rotate-180' : ''}`} />
          </button>

          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowExportMenu(e => !e); setShowFiltros(false); }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" /> Exportar
              <ChevronDown className={`w-3 h-3 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 w-44 overflow-hidden">
                <button
                  onClick={exportarCSV}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <FileText className="w-4 h-4 text-slate-400" /> Exportar CSV
                </button>
                <button
                  onClick={exportarXLSX}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Exportar XLSX
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" /> Nova Receita
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFiltros && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-slate-700">Filtrar Receitas</span>
            {filtrosAtivos && (
              <button
                onClick={() => setFiltros(filtrosIniciais)}
                className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 transition-colors font-medium"
              >
                <X className="w-3 h-3" /> Limpar filtros
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Ordenar por Data</label>
              <select
                name="ordemData"
                value={filtros.ordemData}
                onChange={handleFiltroChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="recente">Mais recente primeiro</option>
                <option value="antigo">Mais antigo primeiro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Categoria</label>
              <select
                name="categoria"
                value={filtros.categoria}
                onChange={handleFiltroChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {categoriasDisponiveis.map(c => (
                  <option key={c} value={c}>{c || 'Todas as categorias'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Conta</label>
              <select
                name="conta"
                value={filtros.conta}
                onChange={handleFiltroChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {contasDisponiveis.map(c => (
                  <option key={c} value={c}>{c || 'Todas as contas'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Valor (R$)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  name="valorMin"
                  value={filtros.valorMin}
                  onChange={handleFiltroChange}
                  placeholder="Mín"
                  min="0"
                  className="w-1/2 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <input
                  type="number"
                  name="valorMax"
                  value={filtros.valorMax}
                  onChange={handleFiltroChange}
                  placeholder="Máx"
                  min="0"
                  className="w-1/2 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="p-4">Data</th>
                <th className="p-4">Descrição</th>
                <th className="p-4">Categoria</th>
                <th className="p-4">Origem</th>
                <th className="p-4">Conta</th>
                <th className="p-4 text-right">Valor</th>
                <th className="p-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receitasFiltradas.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors text-sm text-slate-700">
                  <td className="p-4 whitespace-nowrap">{new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                  <td className="p-4 font-medium text-slate-900">{item.descricao}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                      {item.categoria}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500">{item.origem}</td>
                  <td className="p-4 text-slate-500">{item.conta}</td>
                  <td className="p-4 text-right font-semibold text-emerald-600 privacy-blur">+{formatCurrency(item.valor)}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => confirmDelete(item.id)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors" title="Excluir Lançamento">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {receitasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 text-sm">
                    {receitas.length === 0
                      ? 'Nenhuma receita registrada. Clique em "Nova Receita" para adicionar.'
                      : 'Nenhuma receita encontrada com os filtros aplicados.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nova Receita */}
      {showModal && (
        <Modal title="Nova Receita" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Data *</label>
                <input type="date" name="data" value={form.data} onChange={handleChange} required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Valor (R$) *</label>
                <input type="number" name="valor" value={form.valor} onChange={handleChange} required min="0" step="0.01" placeholder="0,00"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Descrição *</label>
              <input type="text" name="descricao" value={form.descricao} onChange={handleChange} required placeholder="Ex: Salário, Projeto Freelance..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Categoria *</label>
                <select name="categoria" value={form.categoria} onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
                  {CATEGORIAS_RECEITA.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Origem</label>
                <input type="text" name="origem" value={form.origem} onChange={handleChange} placeholder="Ex: Empresa, Cliente..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Conta</label>
              <input type="text" name="conta" value={form.conta} onChange={handleChange} placeholder="Ex: Conta Corrente, Corretora..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium">
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-60">
                {loading ? 'Salvando...' : 'Salvar Receita'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Close export menu on outside click */}
      {showExportMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
      )}

      {/* Modal Confirmação Exclusão */}
      {deleteId && (
        <Modal title="Confirmar Exclusão" onClose={() => setDeleteId(null)}>
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Excluir lançamento</h3>
            <p className="text-slate-500 font-medium">Tem certeza que deseja apagar essa Receita?</p>
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
              className="flex-1 px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
            >
              Sim, apagar lançamento
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
