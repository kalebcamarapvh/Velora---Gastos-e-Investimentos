import React, { useState } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Calendar,
  Tags,
  PieChart,
  DollarSign,
  History,
  Wallet,
  Target,
  Calculator,
  Repeat,
  CreditCard,
  Settings,
  Menu,
  X,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Terminal
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { usePrivacy } from '../contexts/PrivacyContext';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { isDark: dark, toggle } = useTheme();
  const { hidden, togglePrivacy } = usePrivacy();

  React.useEffect(() => {
    fetch('/api/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setIsAdmin(data.isAdmin))
      .catch(console.error);
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard Financeiro', icon: LayoutDashboard },
    { id: 'receitas', label: 'Controle de Receitas', icon: TrendingUp },
    { id: 'gastos', label: 'Controle de Gastos', icon: TrendingDown },
    { id: 'planejamento', label: 'Planejamento Anual', icon: Calendar },
    { id: 'categorias', label: 'Categorias de Gastos', icon: Tags },
    { id: 'investimentos', label: 'Controle de Investimentos', icon: PieChart },
    { id: 'carteira-dividendos', label: 'Carteira de Dividendos', icon: DollarSign },
    { id: 'historico-dividendos', label: 'Histórico de Dividendos', icon: History },
    { id: 'patrimonio', label: 'Patrimônio Total', icon: Wallet },
    { id: 'metas', label: 'Metas Financeiras', icon: Target },
    { id: 'simulador', label: 'Simulador de Juros', icon: Calculator },
    { id: 'assinaturas', label: 'Controle de Assinaturas', icon: Repeat },
    { id: 'dividas', label: 'Controle de Dívidas', icon: CreditCard },
    { id: 'configuracoes', label: 'Configurações', icon: Settings },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin / Logs', icon: Terminal }] : []),
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans" style={dark ? { backgroundColor: '#0d0d0f', color: '#f0f0f1' } : {}}>
      {/* Mobile Sidebar Overlay */}
      {!isSidebarOpen && (
        <button
          className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-slate-800 rounded-md shadow-md"
          style={dark ? { backgroundColor: '#141416' } : {}}
          onClick={() => setIsSidebarOpen(true)}
        >
          <Menu className="w-6 h-6 text-slate-700 dark:text-slate-200" />
        </button>
      )}

      {/* Sidebar */}
      <div
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 transition-transform duration-300 ease-in-out flex flex-col border-r border-slate-200 dark:border-slate-800 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={dark ? { backgroundColor: '#141416', borderColor: '#080808ff', color: '#82918d' } : {}}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800" style={dark ? { borderColor: '#080808ff' } : {}}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Velora</span>
          </div>
          <button
            className="md:hidden p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
          <nav className="space-y-1 px-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
                    }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 text-center" style={dark ? { borderColor: '#080808ff', color: '#82918d' } : {}}>
          Velora v1.0
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-16 flex items-center px-6 justify-between shrink-0" style={dark ? { backgroundColor: '#141416', borderColor: '#080808ff' } : {}}>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            {menuItems.find(m => m.id === activeTab)?.label}
          </h1>
          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
              Atualizado em: {new Date().toLocaleDateString('pt-BR')}
            </div>

            {/* Privacy toggle — Eye */}
            <button
              onClick={togglePrivacy}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 group"
              title={hidden ? 'Mostrar valores' : 'Ocultar valores'}
            >
              {hidden ? (
                <EyeOff className="w-[18px] h-[18px] text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
              ) : (
                <Eye className="w-[18px] h-[18px] text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
              )}
            </button>

            {/* Dark mode toggle */}
            <button
              onClick={(e) => toggle(e)}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group"
              style={{
                background: dark
                  ? 'radial-gradient(circle at 30% 30%, #1e293bff 0%, #0f172a 100%)'
                  : 'radial-gradient(circle at 70% 30%, #fef3c7 0%, #fde68a 100%)',
              }}
              title={dark ? 'Modo claro' : 'Modo escuro'}
            >
              {dark ? (
                <Moon className="w-[18px] h-[18px] text-blue-300 opacity-80 group-hover:opacity-100 transition-opacity" />
              ) : (
                <Sun className="w-[18px] h-[18px] text-amber-600 opacity-80 group-hover:opacity-100 transition-opacity" />
              )}
            </button>

            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 font-medium text-sm">
              AU
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950" style={dark ? { backgroundColor: '#0d0d0f' } : {}}>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
