import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Filter, Download, X, ChevronDown, FileText, FileSpreadsheet, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Modal } from '../Modal';
import { CurrencyInput } from '../CurrencyInput';
import { getGastos, createGasto, deleteGasto, getContas, type Gasto, type Conta, getCategoriasGastos, type CategoriaGasto } from '../../services/api';
const PAGAMENTOS = ['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'Boleto', 'Transferência'];

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
  categoria: '',
  subcategoria: '',
  pagamento: PAGAMENTOS[0],
  conta: '',
  valor: '',
};

export const Gastos = () => {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [contasCadastradas, setContasCadastradas] = useState<Conta[]>([]);
  const [categoriasCadastradas, setCategoriasCadastradas] = useState<CategoriaGasto[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [showFiltros, setShowFiltros] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [filtros, setFiltros] = useState<Filtros>(filtrosIniciais);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const load = () => {
    getGastos().then(setGastos).catch(console.error);
    getContas().then(setContasCadastradas).catch(console.error);
    getCategoriasGastos().then(setCategoriasCadastradas).catch(console.error);
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (categoriasCadastradas.length > 0 && form.categoria === '') {
      setForm(f => ({ ...f, categoria: categoriasCadastradas[0].nome }));
    }
  }, [categoriasCadastradas, showModal]);

  // ---------- derived: unique categories & accounts ----------
  const categoriasDisponiveis = useMemo(() =>
    ['', ...Array.from(new Set(gastos.map(g => g.categoria))).sort()],
    [gastos]);

  const contasDisponiveis = useMemo(() => {
    const all = [
      ...contasCadastradas.map(c => c.nome),
      ...gastos.map(g => g.conta).filter(Boolean)
    ];
    return ['', ...Array.from(new Set(all)).sort()];
  }, [gastos, contasCadastradas]);

  // ---------- apply filters ----------
  const gastosFiltrados = useMemo(() => {
    let lista = [...gastos];

    if (filtros.categoria) lista = lista.filter(g => g.categoria === filtros.categoria);
    if (filtros.conta) lista = lista.filter(g => g.conta === filtros.conta);
    if (filtros.valorMin !== '') lista = lista.filter(g => g.valor >= Number(filtros.valorMin));
    if (filtros.valorMax !== '') lista = lista.filter(g => g.valor <= Number(filtros.valorMax));

    lista.sort((a, b) => {
      const diff = new Date(a.data).getTime() - new Date(b.data).getTime();
      return filtros.ordemData === 'recente' ? -diff : diff;
    });

    return lista;
  }, [gastos, filtros]);

  const totalFiltrado = gastosFiltrados.reduce((acc, g) => acc + g.valor, 0);
  const filtrosAtivos = JSON.stringify(filtros) !== JSON.stringify(filtrosIniciais);

  // ---------- form ----------
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleCurrencyChange = (value: number) =>
    setForm(f => ({ ...f, valor: value.toString() }));

  const handleFiltroChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFiltros(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createGasto({ ...form, valor: Number(form.valor) });
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
      await deleteGasto(deleteId);
      setDeleteId(null);
      await load();
    } catch (e) {
      console.error('Failed to delete', e);
      alert('Erro ao excluir lançamento');
    }
  };

  // ---------- export ----------
  const dadosParaExportar = () =>
    gastosFiltrados.map(g => ({
      Data: new Date(g.data + 'T00:00:00').toLocaleDateString('pt-BR'),
      Descrição: g.descricao,
      Categoria: g.categoria,
      Subcategoria: g.subcategoria,
      Pagamento: g.pagamento,
      Conta: g.conta,
      'Valor (R$)': g.valor,
    }));

  const exportarCSV = () => {
    const dados = dadosParaExportar();
    const cabecalho = Object.keys(dados[0]).join(';');
    const linhas = dados.map(row =>
      Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')
    );
    const csv = [cabecalho, ...linhas].join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gastos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const exportarXLSX = () => {
    const dados = dadosParaExportar();
    const ws = XLSX.utils.json_to_sheet(dados);
    ws['!cols'] = [
      { wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 20 }, { wch: 14 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Gastos');
    XLSX.writeFile(wb, `gastos_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setShowExportMenu(false);
  };

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
            <span className="text-sm font-semibold uppercase tracking-wider">Total</span>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 privacy-blur">{formatCurrency(totalFiltrado)}</div>
            {filtrosAtivos && (
              <div className="text-xs text-slate-400">{gastosFiltrados.length} de {gastos.length} registros</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setShowFiltros(f => !f); setShowExportMenu(false); }}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors text-sm font-medium ${filtrosAtivos
              ? 'bg-rose-50 border-rose-300 text-rose-700'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
            {filtrosAtivos && <span className="bg-rose-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">!</span>}
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
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors text-sm font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" /> Novo Gasto
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFiltros && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-slate-700">Filtrar Gastos</span>
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
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-400"
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
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-400"
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
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-400"
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
                  className="w-1/2 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
                <input
                  type="number"
                  name="valorMax"
                  value={filtros.valorMax}
                  onChange={handleFiltroChange}
                  placeholder="Máx"
                  min="0"
                  className="w-1/2 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
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
                <th className="p-4">Subcategoria</th>
                <th className="p-4">Pagamento</th>
                <th className="p-4">Conta</th>
                <th className="p-4 text-right">Valor</th>
                <th className="p-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="">
              {gastosFiltrados.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors text-sm text-slate-700">
                  <td className="p-4 whitespace-nowrap">{new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                  <td className="p-4 font-medium text-slate-900">{item.descricao}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center text-xs font-semibold text-rose-600">
                      {item.categoria}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500">{item.subcategoria}</td>
                  <td className="p-4 text-slate-500">{item.pagamento}</td>
                  <td className="p-4 text-slate-500">{item.conta}</td>
                  <td className="p-4 text-right font-semibold text-rose-600 privacy-blur">-{formatCurrency(item.valor)}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => confirmDelete(item.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors" title="Excluir Lançamento">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {gastosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-sm">
                    {gastos.length === 0
                      ? 'Nenhum gasto registrado. Clique em "Novo Gasto" para adicionar.'
                      : 'Nenhum gasto encontrado com os filtros aplicados.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo Gasto */}
      {showModal && (
        <Modal title="Novo Gasto" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Data *</label>
                <input type="date" name="data" value={form.data} onChange={handleChange} required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Valor (R$) *</label>
                <CurrencyInput
                  name="valor"
                  value={Number(form.valor) || 0}
                  onChange={handleCurrencyChange}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Descrição *</label>
              <input type="text" name="descricao" value={form.descricao} onChange={handleChange} required placeholder="Ex: Aluguel, Supermercado..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Categoria *</label>
                <select name="categoria" value={form.categoria} onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white">
                  {categoriasCadastradas.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Subcategoria</label>
                <input type="text" name="subcategoria" value={form.subcategoria} onChange={handleChange} placeholder="Ex: Aluguel, Gasolina..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Forma de Pagamento</label>
                <select name="pagamento" value={form.pagamento} onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white">
                  {PAGAMENTOS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Conta (Opcional)</label>
                <select name="conta" value={form.conta} onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-400">
                  <option value="">(Selecione ou deixe em branco)</option>
                  {contasCadastradas.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium">
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors text-sm font-medium disabled:opacity-60">
                {loading ? 'Salvando...' : 'Salvar Gasto'}
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
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Excluir lançamento</h3>
            <p className="text-slate-500 font-medium">Tem certeza que deseja apagar esse lançamento de Gasto?</p>
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
