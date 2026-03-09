import React, { useState, useEffect } from 'react';
import { Plus, CreditCard, Trash2 } from 'lucide-react';
import { Modal } from '../Modal';
import { CurrencyInput } from '../CurrencyInput';
import { getDividas, createDivida, deleteDivida, type Divida } from '../../services/api';

const emptyForm = {
  tipo: '',
  valorTotal: '',
  taxaJuros: '',
  parcela: '',
  saldoRestante: '',
  prazo: '',
};

export const Dividas = () => {
  const [dividas, setDividas] = useState<Divida[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const load = () =>
    getDividas().then(setDividas).catch(console.error);

  useEffect(() => { load(); }, []);

  const totalDividas = dividas.reduce((acc, curr) => acc + curr.saldoRestante, 0);
  const totalParcelasMensais = dividas.reduce((acc, curr) => acc + curr.parcela, 0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleCurrencyChange = (name: string, value: number) => {
    setForm(f => ({ ...f, [name]: String(value) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createDivida({
        tipo: form.tipo,
        valorTotal: Number(form.valorTotal),
        taxaJuros: Number(form.taxaJuros),
        parcela: Number(form.parcela),
        saldoRestante: Number(form.saldoRestante),
        prazo: form.prazo,
      });
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
      await deleteDivida(deleteId);
      setDeleteId(null);
      await load();
    } catch (e) {
      console.error('Failed to delete', e);
      alert('Erro ao excluir dívida');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-4 bg-rose-50 text-rose-600 rounded-xl">
            <CreditCard className="w-8 h-8" />
          </div>
          <div>
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-500 block mb-1">Saldo Devedor Total</span>
            <div className="text-3xl font-bold text-slate-800 privacy-blur">{formatCurrency(totalDividas)}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-4 bg-orange-50 text-orange-600 rounded-xl">
            <CreditCard className="w-8 h-8" />
          </div>
          <div>
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-500 block mb-1">Comprometimento Mensal</span>
            <div className="text-3xl font-bold text-slate-800 privacy-blur">{formatCurrency(totalParcelasMensais)}</div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors text-sm font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nova Dívida
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="p-4">Tipo de Dívida</th>
                <th className="p-4 text-right">Valor Total</th>
                <th className="p-4 text-right">Taxa (a.m.)</th>
                <th className="p-4 text-right">Parcela</th>
                <th className="p-4 text-right">Saldo Restante</th>
                <th className="p-4 text-right">Prazo</th>
                <th className="p-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="">
              {dividas.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors text-sm text-slate-700">
                  <td className="p-4 font-medium text-slate-900">{item.tipo}</td>
                  <td className="p-4 text-right privacy-blur">{formatCurrency(item.valorTotal)}</td>
                  <td className="p-4 text-right privacy-blur">{item.taxaJuros}%</td>
                  <td className="p-4 text-right font-medium text-orange-600 privacy-blur">{formatCurrency(item.parcela)}</td>
                  <td className="p-4 text-right font-bold text-rose-600 privacy-blur">{formatCurrency(item.saldoRestante)}</td>
                  <td className="p-4 text-right text-slate-500">{item.prazo}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => confirmDelete(item.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors" title="Excluir Dívida">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {dividas.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 text-sm">
                    Nenhuma dívida registrada. Clique em "Nova Dívida" para adicionar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Modal title="Nova Dívida" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de Dívida *</label>
              <input
                type="text" name="tipo" value={form.tipo} onChange={handleChange} required
                placeholder="Ex: Financiamento Carro, Empréstimo Pessoal..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Valor Total (R$) *</label>
                <CurrencyInput
                  name="valorTotal"
                  value={Number(form.valorTotal) || 0}
                  onChange={(val) => handleCurrencyChange('valorTotal', val)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Taxa de Juros (% a.m.) *</label>
                <input
                  type="number" name="taxaJuros" value={form.taxaJuros} onChange={handleChange} required min="0" step="0.01"
                  placeholder="Ex: 1.5"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Parcela Mensal (R$) *</label>
                <CurrencyInput
                  name="parcela"
                  value={Number(form.parcela) || 0}
                  onChange={(val) => handleCurrencyChange('parcela', val)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Saldo Restante (R$) *</label>
                <CurrencyInput
                  name="saldoRestante"
                  value={Number(form.saldoRestante) || 0}
                  onChange={(val) => handleCurrencyChange('saldoRestante', val)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Prazo *</label>
              <input
                type="text" name="prazo" value={form.prazo} onChange={handleChange} required placeholder="Ex: 36 meses"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors text-sm font-medium disabled:opacity-60"
              >
                {loading ? 'Salvando...' : 'Salvar Dívida'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Confirmação Exclusão */}
      {deleteId && (
        <Modal title="Confirmar Exclusão" onClose={() => setDeleteId(null)}>
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Excluir dívida</h3>
            <p className="text-slate-500 font-medium">Tem certeza que deseja apagar essa dívida registrada?</p>
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
              Sim, apagar dívida
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
