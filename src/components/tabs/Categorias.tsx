import React, { useState, useEffect } from 'react';
import { Plus, Tags, Check, X, Edit3, Trash2 } from 'lucide-react';
import { Modal } from '../Modal';
import { CurrencyInput } from '../CurrencyInput';
import { getContas, createConta, deleteConta, type Conta } from '../../services/api';

interface Subcategoria {
  nome: string;
}

interface Categoria {
  id: number;
  nome: string;
  subcategorias: string[];
  tipo: 'Fixo' | 'Variável';
  essencial: boolean;
}

export const DEFAULT_CATEGORIAS: Categoria[] = [
  { id: 1, nome: 'Moradia', subcategorias: ['Aluguel', 'Condomínio', 'Energia', 'Água', 'Internet'], tipo: 'Fixo', essencial: true },
  { id: 2, nome: 'Alimentação', subcategorias: ['Supermercado', 'Padaria', 'Açougue', 'Restaurante', 'Delivery'], tipo: 'Variável', essencial: true },
  { id: 3, nome: 'Transporte', subcategorias: ['Gasolina', 'Uber', 'Transporte Público', 'Manutenção', 'Seguro'], tipo: 'Variável', essencial: true },
  { id: 4, nome: 'Saúde', subcategorias: ['Plano de Saúde', 'Farmácia', 'Consultas', 'Exames'], tipo: 'Fixo', essencial: true },
  { id: 5, nome: 'Lazer', subcategorias: ['Cinema', 'Shows', 'Viagens', 'Hobbies'], tipo: 'Variável', essencial: false },
  { id: 6, nome: 'Educação', subcategorias: ['Faculdade', 'Cursos', 'Livros', 'Material'], tipo: 'Fixo', essencial: true },
  { id: 7, nome: 'Assinaturas', subcategorias: ['Streaming', 'Software', 'Clubes'], tipo: 'Fixo', essencial: false },
  { id: 8, nome: 'Investimentos', subcategorias: ['Ações', 'FIIs', 'Renda Fixa', 'Cripto'], tipo: 'Variável', essencial: true },
];

const emptyForm = { nome: '', tipo: 'Variável' as 'Fixo' | 'Variável', essencial: false, subcategorias: '' };

export const Categorias = () => {
  const [activeTab, setActiveTab] = useState<'categorias' | 'contas'>('categorias');

  const [categorias, setCategorias] = useState<Categoria[]>(DEFAULT_CATEGORIAS);
  const [contas, setContas] = useState<Conta[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [showContaModal, setShowContaModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [contaForm, setContaForm] = useState({ nome: '', saldoBase: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [contasRes, categoriasRes] = await Promise.all([
        getContas(),
        import('../../services/api').then(m => m.getCategoriasGastos())
      ]);
      setContas(contasRes);

      setCategorias(categoriasRes as any);
    } catch (e) {
      console.error(e);
    }
  };

  const loadContas = () => {
    getContas().then(setContas).catch(console.error);
  };

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (cat: Categoria) => {
    setEditId(cat.id);
    setForm({ nome: cat.nome, tipo: cat.tipo, essencial: cat.essencial, subcategorias: cat.subcategorias.join(', ') });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) return;
    const subs = form.subcategorias.split(',').map(s => s.trim()).filter(Boolean);

    try {
      const { createCategoriaGasto, updateCategoriaGasto } = await import('../../services/api');

      if (editId !== null) {
        await updateCategoriaGasto(editId, { nome: form.nome, tipo: form.tipo, essencial: form.essencial, subcategorias: subs });
        setCategorias(cats => cats.map(c => c.id === editId ? { ...c, nome: form.nome, tipo: form.tipo, essencial: form.essencial, subcategorias: subs } : c));
      } else {
        const result = await createCategoriaGasto({ nome: form.nome, tipo: form.tipo, essencial: form.essencial, subcategorias: subs });
        // The result has the DB assigned ID
        setCategorias(cats => [...cats, { id: result.id, nome: form.nome, tipo: form.tipo, essencial: form.essencial, subcategorias: subs }]);
      }
      setShowModal(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const { deleteCategoriaGasto } = await import('../../services/api');
      await deleteCategoriaGasto(id);
      setCategorias(cats => cats.filter(c => c.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveConta = async () => {
    if (!contaForm.nome.trim()) return;
    try {
      await createConta({ nome: contaForm.nome.trim(), saldoBase: Number(contaForm.saldoBase) || 0 });
      await loadContas();
      setShowContaModal(false);
      setContaForm({ nome: '', saldoBase: '' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteConta = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir esta conta? Os lançamentos vinculados manterão o nome em texto, mas a conta não aparecerá mais nas opções.')) {
      try {
        await deleteConta(id);
        await loadContas();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
            <Tags className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Categorias de Gastos</h2>
            <p className="text-xs text-slate-400">Gerencie Categorias de Gastos e Contas/Instituições</p>
          </div>
        </div>
        <button
          onClick={() => activeTab === 'categorias' ? openNew() : setShowContaModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm">
          <Plus className="w-4 h-4" /> Nova {activeTab === 'categorias' ? 'Categoria' : 'Conta'}
        </button>
      </div>

      <div className="flex space-x-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('categorias')}
          className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'categorias'
            ? 'border-emerald-500 text-emerald-600'
            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
        >
          Categorias
        </button>
        <button
          onClick={() => setActiveTab('contas')}
          className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'contas'
            ? 'border-emerald-500 text-emerald-600'
            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
        >
          Contas Reais / Instituições
        </button>
      </div>

      {activeTab === 'categorias' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="p-4">Categoria Principal</th>
                  <th className="p-4">Subcategorias</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4 text-center">Essencial</th>
                  <th className="p-4 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categorias.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors text-sm text-slate-700">
                    <td className="p-4 font-bold text-slate-900">{cat.nome}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {cat.subcategorias.map((sub, idx) => (
                          <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            {sub}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cat.tipo === 'Fixo' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                        {cat.tipo}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cat.essencial ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {cat.essencial ? 'Sim' : 'Não'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(cat.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'contas' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {contas.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">Nenhuma conta cadastrada. Adicione sua primeira instituição!</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    <th className="p-4">Instituição / Conta</th>
                    <th className="p-4 text-right">Saldo Inicial</th>
                    <th className="p-4 w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contas.map((conta) => (
                    <tr key={conta.id} className="hover:bg-slate-50/50 transition-colors text-sm text-slate-700">
                      <td className="p-4 font-bold text-slate-900">{conta.nome}</td>
                      <td className="p-4 text-right text-slate-600">{formatCurrency(conta.saldoBase)}</td>
                      <td className="p-4 text-right">
                        <button onClick={() => handleDeleteConta(conta.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal title={editId !== null ? 'Editar Categoria' : 'Nova Categoria'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nome da Categoria *</label>
              <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required
                placeholder="Ex: Alimentação, Moradia…"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Subcategorias <span className="font-normal text-slate-400">(separe por vírgula)</span></label>
              <input type="text" value={form.subcategorias} onChange={e => setForm(f => ({ ...f, subcategorias: e.target.value }))}
                placeholder="Ex: Aluguel, Energia, Água"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo</label>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as 'Fixo' | 'Variável' }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400">
                  <option>Fixo</option>
                  <option>Variável</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Essencial?</label>
                <div className="flex rounded-lg overflow-hidden border border-slate-200">
                  {([true, false] as const).map(v => (
                    <button key={String(v)} type="button" onClick={() => setForm(f => ({ ...f, essencial: v }))}
                      className={`flex-1 py-2 text-sm font-semibold transition-colors ${form.essencial === v ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                      {v ? 'Sim' : 'Não'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium">
                Cancelar
              </button>
              <button type="button" onClick={handleSave}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium">
                {editId !== null ? 'Salvar alterações' : 'Criar Categoria'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Nova Conta */}
      {showContaModal && (
        <Modal title="Nova Conta / Instituição" onClose={() => setShowContaModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nome da Instituição *</label>
              <input type="text" value={contaForm.nome} onChange={e => setContaForm(f => ({ ...f, nome: e.target.value }))} required
                placeholder="Ex: Itaú, Nubank, Dinheiro Físico"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Saldo Atual <span className="text-slate-400 font-normal">(Opcional)</span></label>
              <CurrencyInput
                value={Number(contaForm.saldoBase) || 0}
                onChange={(v) => setContaForm(f => ({ ...f, saldoBase: v.toString() }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setShowContaModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium">
                Cancelar
              </button>
              <button type="button" onClick={handleSaveConta}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium">
                Adicionar Conta
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
