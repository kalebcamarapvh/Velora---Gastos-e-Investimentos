/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { PrivacyProvider } from './contexts/PrivacyContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/tabs/Dashboard';
import { Receitas } from './components/tabs/Receitas';
import { Gastos } from './components/tabs/Gastos';
import { Planejamento } from './components/tabs/Planejamento';
import { Categorias } from './components/tabs/Categorias';
import { Investimentos } from './components/tabs/Investimentos';
import { CarteiraDividendos } from './components/tabs/CarteiraDividendos';
import { HistoricoDividendos } from './components/tabs/HistoricoDividendos';
import { Patrimonio } from './components/tabs/Patrimonio';
import { Metas } from './components/tabs/Metas';
import { Simulador } from './components/tabs/Simulador';
import { Assinaturas } from './components/tabs/Assinaturas';
import { Dividas } from './components/tabs/Dividas';
import { Configuracoes } from './components/tabs/Configuracoes';
import { Auth } from './components/Auth';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Validate session seamlessly silently
    fetch('/api/refresh', { method: 'POST', credentials: 'include' })
      .then(res => setIsAuthenticated(res.ok))
      .catch(() => setIsAuthenticated(false));

    // Global listener for Unauth (401 from interceptor)
    const handleLogout = () => setIsAuthenticated(false);
    window.addEventListener('auth-unauthorized', handleLogout);
    return () => window.removeEventListener('auth-unauthorized', handleLogout);
  }, []);

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'receitas': return <Receitas />;
      case 'gastos': return <Gastos />;
      case 'planejamento': return <Planejamento />;
      case 'categorias': return <Categorias />;
      case 'investimentos': return <Investimentos />;
      case 'carteira-dividendos': return <CarteiraDividendos />;
      case 'historico-dividendos': return <HistoricoDividendos />;
      case 'patrimonio': return <Patrimonio />;
      case 'metas': return <Metas />;
      case 'simulador': return <Simulador />;
      case 'assinaturas': return <Assinaturas />;
      case 'dividas': return <Dividas />;
      case 'configuracoes': return <Configuracoes />;
      default: return <Dashboard />;
    }
  };

  if (isAuthenticated === null) {
    return <div className="min-h-screen bg-[#121212] flex items-center justify-center text-gray-500">Validando sessão segura...</div>;
  }

  if (!isAuthenticated) {
    return <Auth onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <ThemeProvider>
      <PrivacyProvider>
        <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
          {renderTab()}
        </Layout>
      </PrivacyProvider>
    </ThemeProvider>
  );
}
