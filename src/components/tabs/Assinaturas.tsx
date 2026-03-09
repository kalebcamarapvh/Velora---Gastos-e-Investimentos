import React, { useState, useEffect } from 'react';
import { Plus, Repeat, Trash2 } from 'lucide-react';
import { Modal } from '../Modal';
import { CurrencyInput } from '../CurrencyInput';
import { getAssinaturas, createAssinatura, deleteAssinatura, type Assinatura } from '../../services/api';

const CATEGORIAS = ['Lazer', 'Moradia', 'Saúde', 'Educação', 'Trabalho', 'Outros'];
const PERIODICIDADES = ['Mensal', 'Anual', 'Trimestral', 'Semestral'];

const emptyForm = {
  servico: '',
  categoria: CATEGORIAS[0],
  periodicidade: PERIODICIDADES[0],
  dataCobranca: '',
  valor: '',
};

export const Assinaturas = () => {
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const load = () =>
    getAssinaturas().then(setAssinaturas).catch(console.error);

  useEffect(() => { load(); }, []);

  const totalMensal = assinaturas.reduce((acc, curr) => acc + curr.valor, 0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleCurrencyChange = (value: number) => {
    setForm(f => ({ ...f, valor: value.toString() }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createAssinatura({ ...form, valor: Number(form.valor) });
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
      await deleteAssinatura(deleteId);
      setDeleteId(null);
      await load();
    } catch (e) {
      console.error('Failed to delete', e);
      alert('Erro ao excluir assinatura');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <Repeat className="w-6 h-6" />
          </div>
          <div>
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-500 block mb-1">Total Mensal</span>
            <div className="text-2xl font-bold text-slate-800 privacy-blur">{formatCurrency(totalMensal)}</div>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nova Assinatura
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="p-4">Serviço</th>
                <th className="p-4">Categoria</th>
                <th className="p-4">Periodicidade</th>
                <th className="p-4">Data Cobrança</th>
                <th className="p-4 text-right">Valor</th>
                <th className="p-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="">
              {assinaturas.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors text-sm text-slate-700">
                  <td className="p-4 font-medium text-slate-900">{item.servico}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center text-xs font-semibold text-slate-700">
                      {item.categoria}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500">{item.periodicidade}</td>
                  <td className="p-4 text-slate-500">{item.dataCobranca}</td>
                  <td className="p-4 text-right font-semibold text-slate-800 privacy-blur">{formatCurrency(item.valor)}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => confirmDelete(item.id)} className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors" title="Excluir Assinatura">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {assinaturas.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 text-sm">
                    Nenhuma assinatura registrada. Clique em "Nova Assinatura" para adicionar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Modal title="Nova Assinatura" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Serviço / Nome *</label>
              <input
                type="text" name="servico" value={form.servico} onChange={handleChange} required placeholder="Ex: Netflix, Spotify, Academia..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Categoria *</label>
                <select name="categoria" value={form.categoria} onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                >
                  {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Periodicidade *</label>
                <select name="periodicidade" value={form.periodicidade} onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                >
                  {PERIODICIDADES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Data de Cobrança</label>
                <input
                  type="text" name="dataCobranca" value={form.dataCobranca} onChange={handleChange} placeholder="Ex: Dia 05"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Valor (R$) *</label>
                <CurrencyInput
                  name="valor"
                  value={Number(form.valor) || 0}
                  onChange={handleCurrencyChange}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-60"
              >
                {loading ? 'Salvando...' : 'Salvar Assinatura'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Confirmação Exclusão */}
      {deleteId && (
        <Modal title="Confirmar Exclusão" onClose={() => setDeleteId(null)}>
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center mx-auto mb-4 border border-purple-100">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Excluir assinatura</h3>
            <p className="text-slate-500 font-medium">Tem certeza que deseja apagar essa assinatura registrada?</p>
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
              className="flex-1 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
            >
              Sim, apagar assinatura
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
