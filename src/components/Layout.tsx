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
  Terminal,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { usePrivacy } from '../contexts/PrivacyContext';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdmin?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, isAdmin = false }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { dark, toggle } = useTheme();
  const { hidden, togglePrivacy } = usePrivacy();

  const baseMenuItems = [
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
  ];

  // Admin tab only visible to admin users
  const menuItems = isAdmin
    ? [...baseMenuItems, { id: 'admin', label: 'Admin / Logs', icon: Terminal }]
    : baseMenuItems;

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
        <div
          className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800"
          style={dark ? { borderColor: '#080808ff' } : {}}
        >
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
              const isAdminItem = item.id === 'admin';
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                      ? isAdminItem
                        ? 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400'
                        : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
                    }`}
                >
                  <Icon className={`w-5 h-5 ${isActive
                      ? isAdminItem
                        ? 'text-violet-600 dark:text-violet-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-400 dark:text-slate-500'
                    }`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div
          className="p-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 text-center"
          style={dark ? { borderColor: '#080808ff', color: '#82918d' } : {}}
        >
          Velora v1.0
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header
          className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-16 flex items-center px-6 justify-between shrink-0"
          style={dark ? { backgroundColor: '#141416', borderColor: '#080808ff' } : {}}
        >
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              onClick={() => setIsSidebarOpen(s => !s)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              {menuItems.find(m => m.id === activeTab)?.label ?? 'Velora'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={togglePrivacy}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={hidden ? 'Mostrar valores' : 'Ocultar valores'}
            >
              {hidden ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
            <button
              onClick={toggle}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={dark ? 'Modo claro' : 'Modo escuro'}
            >
              {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
};