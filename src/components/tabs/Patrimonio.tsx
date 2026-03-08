import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Wallet, TrendingUp } from 'lucide-react';

export const Patrimonio = () => {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(json => setData(json))
      .catch(e => console.error('Error fetching patrimonio data', e))
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (loading || !data) {
    return <div className="flex h-64 items-center justify-center text-slate-500">Carregando patrimônio...</div>;
  }

  const { patrimonioBruto, totalDividas, categoriasPatrimonio } = data.patrimonio;
  const patrimonioLiquido = data.dashboard.patrimonioTotal;
  const evolucaoPatrimonio = data.evolucaoPatrimonio || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
            <Wallet className="w-8 h-8" />
          </div>
          <div>
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-500 block mb-1">Patrimônio Bruto</span>
            <div className="text-3xl font-bold text-slate-800 privacy-blur">{formatCurrency(patrimonioBruto)}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-4 bg-rose-50 text-rose-600 rounded-xl">
            <TrendingUp className="w-8 h-8 transform rotate-180" />
          </div>
          <div>
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-500 block mb-1">Passivos (Dívidas)</span>
            <div className="text-3xl font-bold text-rose-600 privacy-blur">-{formatCurrency(totalDividas)}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div>
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-500 block mb-1">Patrimônio Líquido</span>
            <div className="text-3xl font-bold text-emerald-600 privacy-blur">{formatCurrency(patrimonioLiquido)}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Evolução do Patrimônio Líquido</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolucaoPatrimonio}>
                <defs>
                  <linearGradient id="colorPatrimonio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={(value) => `R$ ${value / 1000}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Area type="monotone" dataKey="valor" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPatrimonio)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Composição do Patrimônio</h3>
          <div className="space-y-6">
            {categoriasPatrimonio.length > 0 ? categoriasPatrimonio.map((cat: any) => {
              const percentual = patrimonioBruto > 0 ? (cat.valor / patrimonioBruto) * 100 : 0;
              return (
                <div key={cat.id}>
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-medium text-slate-700">{cat.nome}</span>
                    <div className="text-right">
                      <div className="font-bold text-slate-800 privacy-blur">{formatCurrency(cat.valor)}</div>
                      <div className="text-xs text-slate-500 privacy-blur">{percentual.toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className={`${cat.cor} h-2 rounded-full`} style={{ width: `${percentual}%` }}></div>
                  </div>
                </div>
              );
            }) : <p className="text-sm text-slate-500">Nenhum ativo na carteira</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
