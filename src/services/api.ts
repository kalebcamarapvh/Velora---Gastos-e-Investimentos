// API service — all requests go through the Vite proxy to http://localhost:3001
export interface Gasto {
    id: number;
    data: string;
    descricao: string;
    categoria: string;
    subcategoria: string;
    pagamento: string;
    conta: string;
    valor: number;
}

export interface Receita {
    id: number;
    data: string;
    descricao: string;
    categoria: string;
    origem: string;
    conta: string;
    valor: number;
}

export interface Assinatura {
    id: number;
    servico: string;
    categoria: string;
    periodicidade: string;
    dataCobranca: string;
    valor: number;
}

export interface Divida {
    id: number;
    tipo: string;
    valorTotal: number;
    taxaJuros: number;
    parcela: number;
    saldoRestante: number;
    prazo: string;
}

const BASE = '/api';

// ---- Gastos ----
export const getGastos = (): Promise<Gasto[]> =>
    fetch(`${BASE}/gastos`).then(r => r.json());

export const createGasto = (data: Omit<Gasto, 'id'>): Promise<Gasto> =>
    fetch(`${BASE}/gastos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    }).then(r => r.json());

export const deleteGasto = (id: number): Promise<void> =>
    fetch(`${BASE}/gastos/${id}`, { method: 'DELETE' }).then(() => { });

// ---- Receitas ----
export const getReceitas = (): Promise<Receita[]> =>
    fetch(`${BASE}/receitas`).then(r => r.json());

export const createReceita = (data: Omit<Receita, 'id'>): Promise<Receita> =>
    fetch(`${BASE}/receitas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    }).then(r => r.json());

export const deleteReceita = (id: number): Promise<void> =>
    fetch(`${BASE}/receitas/${id}`, { method: 'DELETE' }).then(() => { });

// ---- Assinaturas ----
export const getAssinaturas = (): Promise<Assinatura[]> =>
    fetch(`${BASE}/assinaturas`).then(r => r.json());

export const createAssinatura = (data: Omit<Assinatura, 'id'>): Promise<Assinatura> =>
    fetch(`${BASE}/assinaturas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    }).then(r => r.json());

export const deleteAssinatura = (id: number): Promise<void> =>
    fetch(`${BASE}/assinaturas/${id}`, { method: 'DELETE' }).then(() => { });

// ---- Dívidas ----
export const getDividas = (): Promise<Divida[]> =>
    fetch(`${BASE}/dividas`).then(r => r.json());

export const createDivida = (data: Omit<Divida, 'id'>): Promise<Divida> =>
    fetch(`${BASE}/dividas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    }).then(r => r.json());

export const deleteDivida = (id: number): Promise<void> =>
    fetch(`${BASE}/dividas/${id}`, { method: 'DELETE' }).then(() => { });

// ---- Carteira ----
export interface CarteiraItem {
    id: number;
    ativo: string;
    tipo: string;
    quantidade: number;
    precoMedio: number;
    precoAtual: number;
    valorInvestido: number;
    valorAtual: number;
    moeda: string;
}

export const getCarteira = (): Promise<CarteiraItem[]> =>
    fetch(`${BASE}/carteira`).then(r => r.json());


export interface MetaPlanejamento {
    id: number | null;
    ano: number;
    mes: number;
    receitaPrevista: number;
    gastoPrevisto: number;
    metaInvestimento: number;
    dividendosEsperados: number;
}

export const getMetasPlanejamento = (ano: number): Promise<MetaPlanejamento[]> =>
    fetch(`${BASE}/metas-planejamento/${ano}`).then(r => r.json());

export const updateMetaPlanejamento = (ano: number, mes: number, data: Omit<MetaPlanejamento, 'id' | 'ano' | 'mes'>): Promise<MetaPlanejamento> =>
    fetch(`${BASE}/metas-planejamento/${ano}/${mes}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    }).then(r => r.json());

// ---- Lançamentos de Investimentos ----
export interface LancamentoInvestimento {
    id: number;
    tipo: string;
    operacao: 'compra' | 'venda';
    ativo: string;
    data: string;
    quantidade: number;
    preco: number;
    moeda: 'BRL' | 'USD';
    valorTotal: number;
}

export const getLancamentosInvestimentos = (): Promise<LancamentoInvestimento[]> =>
    fetch(`${BASE}/lancamentos-investimentos`).then(r => r.json());

export const createLancamentoInvestimento = (data: Omit<LancamentoInvestimento, 'id'>): Promise<LancamentoInvestimento> =>
    fetch(`${BASE}/lancamentos-investimentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    }).then(r => r.json());

export const deleteLancamentoInvestimento = (id: number): Promise<void> =>
    fetch(`${BASE}/lancamentos-investimentos/${id}`, { method: 'DELETE' }).then(() => { });
