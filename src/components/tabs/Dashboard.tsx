import React from 'react';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, DollarSign, Wallet, TrendingUp, PiggyBank, BarChart2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

// ─── Privacy-aware Y-axis tick (<text> in SVG) ────────────────────────────
const PrivacyYTick = ({ x, y, payload, formatTick }: any) => (
  <text
    x={x}
    y={y}
    dy={4}
    textAnchor="end"
    fill="#64748b"
    fontSize={12}
    className="recharts-text recharts-yaxis-tick-value privacy-chart-value"
  >
    {formatTick(payload.value)}
  </text>
);

// ─── Smart Privacy Tooltip ────────────────────────────────────────────────────
// Shows label normally but blurs only the monetary value.
const PrivacyTooltip = ({ active, payload, label, formatCurrency }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="recharts-default-tooltip" style={{
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 13,
    }}>
      {label && <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>}
      {payload.map((entry: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: entry.color || entry.fill, fontWeight: 500 }}>{entry.name ?? entry.dataKey}:</span>
          <span className="privacy-blur" style={{ fontWeight: 600 }}>{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

// Pie-specific tooltip (no label, just name: value)
const PiePrivacyTooltip = ({ active, payload, formatCurrency }: any) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="recharts-default-tooltip" style={{
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 13,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontWeight: 500 }}>{entry.name}:</span>
        <span className="privacy-blur" style={{ fontWeight: 600 }}>{formatCurrency(entry.value)}</span>
      </div>
    </div>
  );
};

export const Dashboard = () => {
  const { isDark: dark } = useTheme();

  const today = new Date();
  const initialMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = React.useState<string>(initialMonth);
  const [mesesDisponiveis, setMesesDisponiveis] = React.useState<string[]>([initialMonth]);
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [isSyncing, setIsSyncing] = React.useState(false);

  const fetchDashboard = async (mes: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?mes=${mes}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.mesesDisponiveis) {
          setMesesDisponiveis(json.mesesDisponiveis);
        }
      }
    } catch (e) {
      console.error('Failed to fetch dashboard data', e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchDashboard(selectedMonth);
  }, [selectedMonth]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleSyncQuotes = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/quotes');
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao sincronizar cotações');
      } else {
        const msg = data.message || 'Sincronizado';
        const updated = data.updatedCount !== undefined ? `\nAtivos atualizados: ${data.updatedCount}` : '';
        const usd = data.usdRate ? `\nDólar (USD): R$ ${Number(data.usdRate).toFixed(2)}` : '';
        alert(`${msg}${updated}${usd}`);
        fetchDashboard(selectedMonth); // Refresh dashboard data after sync
      }
    } catch (e) {
      alert('Erro de conexão com o servidor local.');
    } finally {
      setIsSyncing(false);
    }
  };

  if (!data && loading) {
    return <div className="flex h-64 items-center justify-center text-slate-500">Carregando dashboard...</div>;
  }

  if (!data) return null;

  const { dashboard, distribuicaoGastos, gastosPorCategoria, evolucaoPatrimonio, evolucaoDividendos, evolucaoInvestimentos } = data;

  const chartColor = dark ? '#10b981' : '#8b5cf6';

  const StatCard = ({ title, value, subText, icon: Icon, trend, trendValue, colorClass, description }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col relative group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${colorClass}`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-medium ${trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
            {trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {trendValue}
          </div>
        )}
      </div>
      <h3 className="text-slate-500 text-sm font-medium mb-1 flex items-center gap-1.5">
        {title}
        {description && (
          <div className="relative flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 cursor-help"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 text-center font-normal shadow-lg pointer-events-none">
              {description}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800" />
            </div>
          </div>
        )}
      </h3>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-bold text-slate-800 privacy-blur">{value}</div>
        {subText && <span className="text-xs text-slate-400 font-medium privacy-blur">{subText}</span>}
      </div>
    </div>
  );

  const navigationOptions = [...mesesDisponiveis, 'geral'];
  const currentIndex = navigationOptions.indexOf(selectedMonth);

  const handlePrev = () => {
    if (currentIndex > 0) setSelectedMonth(navigationOptions[currentIndex - 1]);
  };

  const handleNext = () => {
    if (currentIndex < navigationOptions.length - 1) setSelectedMonth(navigationOptions[currentIndex + 1]);
  };

  const formatMonthLabel = (val: string) => {
    if (val === 'geral') return 'Geral';
    const [y, m] = val.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    const monthName = date.toLocaleDateString('pt-BR', { month: 'long' });
    const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    // Check if it's the current month
    const currentDate = new Date();
    const isCurrent = currentDate.getFullYear() === parseInt(y) && (currentDate.getMonth() + 1) === parseInt(m);

    return `${capitalized} ${y}${isCurrent ? ' (Atual)' : ''}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between w-full sm:w-auto bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
          <button
            onClick={handlePrev}
            disabled={currentIndex <= 0}
            className="flex items-center justify-center p-2 rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="w-48 text-center text-sm font-semibold text-slate-800">
            {formatMonthLabel(selectedMonth)}
          </div>

          <button
            onClick={handleNext}
            disabled={currentIndex === -1 || currentIndex >= navigationOptions.length - 1}
            className="flex items-center justify-center p-2 rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={handleSyncQuotes}
          disabled={isSyncing}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 text-sm font-medium w-full sm:w-auto justify-center"
        >
          {isSyncing ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 21v-5h5" /></svg>
          )}
          {isSyncing ? 'Atualizando...' : 'Atualizar Cotações (Brapi)'}
        </button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Patrimônio Total"
          value={formatCurrency(dashboard.patrimonioTotal)}
          subText={dashboard.usdRate ? `US$ ${(dashboard.patrimonioTotal / dashboard.usdRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : undefined}
          icon={Wallet}
          trend="up"
          trendValue="+5.2%"
          colorClass="bg-blue-50 text-blue-600"
          description="Soma de todos os Investimentos descontando suas Dívidas e Financiamentos."
        />
        <StatCard
          title="Receita do Período"
          value={formatCurrency(dashboard.receitaMensal)}
          icon={DollarSign}
          trend="up"
          trendValue="+12.5%"
          colorClass="bg-emerald-50 text-emerald-600"
          description="Soma de tudo o que entrou na sua conta bancária e outras categorias de receitas."
        />
        <StatCard
          title="Gastos do Período"
          value={formatCurrency(dashboard.gastosMensais)}
          icon={ArrowDownRight}
          trend="down"
          trendValue="-2.4%"
          colorClass="bg-rose-50 text-rose-600"
          description="Total de despesas com cartão de crédito, boletos e assinaturas computados no período."
        />
        <StatCard
          title="Taxa de Poupança"
          value={`${Number(dashboard.taxaPoupanca).toFixed(2)}%`}
          icon={PiggyBank}
          trend="up"
          trendValue="+1.2%"
          colorClass="bg-indigo-50 text-indigo-600"
          description="Porcentagem de quanto da sua Receita sobrou no mês após pagar os Gastos. Ideal > 20%."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Valor Investido"
          value={formatCurrency(dashboard.valorInvestido)}
          subText={dashboard.usdRate ? `US$ ${(dashboard.valorInvestido / dashboard.usdRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : undefined}
          icon={TrendingUp}
          colorClass="bg-violet-50 text-violet-600"
          description="O custo de aquisição (total que tirou do bolso) da sua carteira, sem o rendimento."
        />
        <StatCard
          title="Lucro & Rentabilidade"
          value={formatCurrency(dashboard.lucroReal || 0)}
          icon={BarChart2}
          trend={(dashboard.rentabilidadeCarteira >= 0) ? 'up' : 'down'}
          trendValue={`${dashboard.rentabilidadeCarteira > 0 ? '+' : ''}${Number(dashboard.rentabilidadeCarteira).toFixed(2)}%`}
          colorClass={(dashboard.rentabilidadeCarteira >= 0) ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}
          description="O Lucro/Prejuízo real baseado no preço médio de aquisição de cada ativo vs Preço atual."
        />
        <StatCard
          title="Dividendos no Período"
          value={formatCurrency(dashboard.dividendosMes)}
          icon={DollarSign}
          colorClass="bg-amber-50 text-amber-600"
          description="Total de proventos (Dividendos/JCP) depositados na sua corretora nas datas escolhidas."
        />
        <StatCard
          title="Dividend Yield Médio"
          value={`${dashboard.dividendYieldMedio}%`}
          icon={TrendingUp}
          colorClass="bg-slate-50 text-slate-600"
          description="Rendimento de Dividendos sobre o patrimônio atual, em formato de porcentagem."
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolução do Patrimônio */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Evolução do Patrimônio</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolucaoPatrimonio}>
                <defs>
                  <linearGradient id="colorPatrimonio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={dark ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tick={<PrivacyYTick formatTick={(v: number) => `${(v / 1000).toFixed(0)}k`} />}
                />
                <Tooltip
                  content={(props) => <PrivacyTooltip {...props} label={props.label} formatCurrency={formatCurrency} />}
                />
                <Area
                  type="monotone"
                  dataKey="valor"
                  name="Patrimônio"
                  stroke={chartColor}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorPatrimonio)"
                  dot={{ r: 4, fill: chartColor, strokeWidth: 2, stroke: dark ? '#0f172a' : '#fff' }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribuição de Gastos */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Distribuição de Gastos</h3>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribuicaoGastos}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {distribuicaoGastos.map((entry, index) => {
                    const monoColors = ['#e2e2e2', '#aaaaaa', '#777777', '#444444', '#222222'];
                    const fill = dark ? monoColors[index % monoColors.length] : entry.color;
                    return <Cell key={`cell-${index}`} fill={fill} />;
                  })}
                </Pie>
                <Tooltip content={(props) => <PiePrivacyTooltip {...props} formatCurrency={formatCurrency} />} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gastos por Categoria */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Gastos por Categoria</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gastosPorCategoria} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={(value) => `R$ ${value / 1000}k`} />
                <YAxis dataKey="categoria" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <Tooltip content={(props) => <PrivacyTooltip {...props} formatCurrency={formatCurrency} />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="valor" name="Valor" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Evolução dos Investimentos */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Evolução dos Investimentos</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolucaoInvestimentos}>
                <defs>
                  <linearGradient id="colorInvest" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={dark ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} width={48} tick={<PrivacyYTick formatTick={(v: number) => `${(v / 1000).toFixed(0)}k`} />} />
                <Tooltip content={(props) => <PrivacyTooltip {...props} formatCurrency={formatCurrency} />} />
                <Area
                  type="monotone"
                  dataKey="valor"
                  name="Investimentos"
                  stroke={chartColor}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorInvest)"
                  dot={{ r: 4, fill: chartColor, strokeWidth: 2, stroke: dark ? '#0f172a' : '#fff' }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Top 5 Maiores Gastos</h3>
          <div className="space-y-4">
            {dashboard.topGastos.map((gasto, index) => (
              <div key={gasto.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <span className="font-medium text-slate-700">{gasto.descricao}</span>
                </div>
                <span className="font-semibold text-rose-600 privacy-blur">-{formatCurrency(gasto.valor)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Top Maiores Fontes de Renda</h3>
          <div className="space-y-4">
            {dashboard.topReceitas.map((receita, index) => (
              <div key={receita.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <span className="font-medium text-slate-700">{receita.descricao}</span>
                </div>
                <span className="font-semibold text-emerald-600 privacy-blur">+{formatCurrency(receita.valor)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div >
  );
};
