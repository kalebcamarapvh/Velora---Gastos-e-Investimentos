import React from 'react';
import { DollarSign, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const CarteiraDividendos = () => {
  const [investimentos, setInvestimentos] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('/api/carteira')
      .then(res => res.json())
      .then(data => {
        // Filter out items that are strictly NOT variable income, 
        // but for now we take all active ones from carteira.
        setInvestimentos(data.filter((d: any) => d.quantidade > 0 && ['Ações', 'FIIs', 'BDRs', 'ETF', 'Stocks', 'REITs'].includes(d.tipo)));
      })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const dividendosEstimados = investimentos.map(inv => ({
    ticker: inv.ativo,
    quantidade: inv.quantidade,
    dy: (Math.random() * 5 + 3).toFixed(2), // Mock DY (could be fetched from brapi in the future)
    dividendoMedio: (Math.random() * 2).toFixed(2), // Mock Dividendo Médio
    mensal: inv.quantidade * (Math.random() * 1.5),
    anual: inv.quantidade * (Math.random() * 1.5) * 12
  }));

  const rendaPassivaMensal = dividendosEstimados.reduce((acc, curr) => acc + curr.mensal, 0);
  const rendaPassivaAnual = dividendosEstimados.reduce((acc, curr) => acc + curr.anual, 0);

  const chartData = dividendosEstimados.map(d => ({
    ticker: d.ticker,
    anual: d.anual
  })).sort((a, b) => b.anual - a.anual).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-4 bg-amber-50 text-amber-600 rounded-xl">
            <DollarSign className="w-8 h-8" />
          </div>
          <div>
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-500 block mb-1">Renda Passiva Mensal (Est.)</span>
            <div className="text-3xl font-bold text-slate-800 privacy-blur">{formatCurrency(rendaPassivaMensal)}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div>
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-500 block mb-1">Renda Passiva Anual (Est.)</span>
            <div className="text-3xl font-bold text-slate-800 privacy-blur">{formatCurrency(rendaPassivaAnual)}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800">Ativos Pagadores</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="p-4">Ticker</th>
                  <th className="p-4 text-right">Qtd</th>
                  <th className="p-4 text-right">DY (%)</th>
                  <th className="p-4 text-right">Div. Médio/Cota</th>
                  <th className="p-4 text-right">Mensal Est.</th>
                  <th className="p-4 text-right">Anual Est.</th>
                </tr>
              </thead>
              <tbody className="">
                {dividendosEstimados.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors text-sm text-slate-700">
                    <td className="p-4 font-bold text-slate-900">{item.ticker}</td>
                    <td className="p-4 text-right">{item.quantidade}</td>
                    <td className="p-4 text-right font-medium text-amber-600 privacy-blur">{item.dy}%</td>
                    <td className="p-4 text-right privacy-blur">{formatCurrency(Number(item.dividendoMedio))}</td>
                    <td className="p-4 text-right font-medium text-emerald-600 privacy-blur">{formatCurrency(item.mensal)}</td>
                    <td className="p-4 text-right font-bold text-emerald-600 privacy-blur">{formatCurrency(item.anual)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Top 5 Pagadores (Anual)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={(value) => `R$ ${value}`} />
                <YAxis dataKey="ticker" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 'bold' }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="anual" fill="#10b981" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
