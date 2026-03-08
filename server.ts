import 'dotenv/config';
import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// --- SECURE HEADERS (HELMET) ---
app.use(helmet({
  contentSecurityPolicy: false, // Allows inline scripts from Vite
}));

// --- SERVE STATIC FILES (DOCKER PROD) ---
app.use(express.static(path.join(__dirname, 'dist')));

app.use(express.json());

// --- GLOBAL API RATE LIMITING ---
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Muitas requisições. Tente novamente mais tarde.' }
}));

// --- BEARER TOKEN AUTH (VPN PROTECTION) ---
app.use('/api', (req, res, next) => {
  const secret = process.env.API_SECRET_TOKEN;
  if (secret) {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${secret}`) {
      return res.status(401).json({ error: 'Unauthorized. Bearer token inválido ou ausente.' });
    }
  }
  next();
});

app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// ===================== DATABASE SETUP =====================
const dbPath = process.env.DB_PATH || path.join(__dirname, 'finance.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS gastos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL,
    descricao TEXT NOT NULL,
    categoria TEXT NOT NULL,
    subcategoria TEXT,
    pagamento TEXT,
    conta TEXT,
    valor REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS receitas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL,
    descricao TEXT NOT NULL,
    categoria TEXT NOT NULL,
    origem TEXT,
    conta TEXT,
    valor REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS assinaturas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    servico TEXT NOT NULL,
    categoria TEXT NOT NULL,
    periodicidade TEXT NOT NULL,
    dataCobranca TEXT,
    valor REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS dividas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,
    valorTotal REAL NOT NULL,
    taxaJuros REAL NOT NULL,
    parcela REAL NOT NULL,
    saldoRestante REAL NOT NULL,
    prazo TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS metas_planejamento (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ano INTEGER NOT NULL,
    mes INTEGER NOT NULL,
    receitaPrevista REAL NOT NULL DEFAULT 0,
    gastoPrevisto REAL NOT NULL DEFAULT 0,
    metaInvestimento REAL NOT NULL DEFAULT 0,
    dividendosEsperados REAL NOT NULL DEFAULT 0,
    UNIQUE(ano, mes)
  );

  CREATE TABLE IF NOT EXISTS carteira (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ativo TEXT NOT NULL UNIQUE,
    tipo TEXT NOT NULL,
    quantidade REAL NOT NULL DEFAULT 0,
    precoMedio REAL NOT NULL DEFAULT 0,
    precoAtual REAL NOT NULL DEFAULT 0,
    valorInvestido REAL NOT NULL DEFAULT 0,
    valorAtual REAL NOT NULL DEFAULT 0,
    moeda TEXT NOT NULL DEFAULT 'BRL',
    taxaCambio REAL NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS lancamentos_investimentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,
    operacao TEXT NOT NULL CHECK(operacao IN ('compra','venda')),
    ativo TEXT NOT NULL,
    data TEXT NOT NULL,
    quantidade REAL NOT NULL,
    preco REAL NOT NULL,
    moeda TEXT NOT NULL DEFAULT 'BRL',
    valorTotal REAL NOT NULL,
    taxaCambio REAL NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS dividend_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticker TEXT NOT NULL,
    ano_mes TEXT NOT NULL,
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(ticker, ano_mes)
  );

  CREATE TABLE IF NOT EXISTS metas_financeiras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL CHECK(tipo IN ('patrimonio','ativos','proventos')),
    categoria TEXT,
    valorTotal REAL,
    aporteMensal REAL,
    variacaoAnual REAL,
    valorFinalMeta REAL,
    tiposAtivos TEXT,
    mediaProventosDesejada REAL,
    criadoEm TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Safe migrations for columns added after initial creation
const migrate = (sql: string) => { try { db.exec(sql); } catch { } };
migrate("ALTER TABLE carteira ADD COLUMN taxaCambio REAL NOT NULL DEFAULT 1");
migrate("ALTER TABLE lancamentos_investimentos ADD COLUMN taxaCambio REAL NOT NULL DEFAULT 1");
migrate("ALTER TABLE metas_financeiras ADD COLUMN variacaoAnual REAL");
migrate("ALTER TABLE metas_financeiras ADD COLUMN valorFinalMeta REAL");

// ===================== SEED =====================
// Seeds removidos a pedido do usuário para iniciar o app 100% limpo.

// ===================== ROUTES =====================

// --- Gastos ---
app.get('/api/gastos', (_req, res) => {
  res.json(db.prepare('SELECT * FROM gastos ORDER BY data DESC').all());
});
app.post('/api/gastos', (req, res) => {
  const { data, descricao, categoria, subcategoria, pagamento, conta, valor } = req.body;
  const r = db.prepare('INSERT INTO gastos (data,descricao,categoria,subcategoria,pagamento,conta,valor) VALUES (?,?,?,?,?,?,?)').run(data, descricao, categoria, subcategoria, pagamento, conta, valor);
  res.status(201).json({ id: r.lastInsertRowid, data, descricao, categoria, subcategoria, pagamento, conta, valor });
});
app.delete('/api/gastos/:id', (req, res) => {
  db.prepare('DELETE FROM gastos WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// --- Receitas ---
app.get('/api/receitas', (_req, res) => {
  res.json(db.prepare('SELECT * FROM receitas ORDER BY data DESC').all());
});
app.post('/api/receitas', (req, res) => {
  const { data, descricao, categoria, origem, conta, valor } = req.body;
  const r = db.prepare('INSERT INTO receitas (data,descricao,categoria,origem,conta,valor) VALUES (?,?,?,?,?,?)').run(data, descricao, categoria, origem, conta, valor);
  res.status(201).json({ id: r.lastInsertRowid, data, descricao, categoria, origem, conta, valor });
});
app.delete('/api/receitas/:id', (req, res) => {
  db.prepare('DELETE FROM receitas WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// --- Assinaturas ---
app.get('/api/assinaturas', (_req, res) => {
  res.json(db.prepare('SELECT * FROM assinaturas ORDER BY id ASC').all());
});
app.post('/api/assinaturas', (req, res) => {
  const { servico, categoria, periodicidade, dataCobranca, valor } = req.body;
  const r = db.prepare('INSERT INTO assinaturas (servico,categoria,periodicidade,dataCobranca,valor) VALUES (?,?,?,?,?)').run(servico, categoria, periodicidade, dataCobranca, valor);
  res.status(201).json({ id: r.lastInsertRowid, servico, categoria, periodicidade, dataCobranca, valor });
});
app.delete('/api/assinaturas/:id', (req, res) => {
  db.prepare('DELETE FROM assinaturas WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// --- Dívidas ---
app.get('/api/dividas', (_req, res) => {
  res.json(db.prepare('SELECT * FROM dividas ORDER BY id ASC').all());
});
app.post('/api/dividas', (req, res) => {
  const { tipo, valorTotal, taxaJuros, parcela, saldoRestante, prazo } = req.body;
  const r = db.prepare('INSERT INTO dividas (tipo,valorTotal,taxaJuros,parcela,saldoRestante,prazo) VALUES (?,?,?,?,?,?)').run(tipo, valorTotal, taxaJuros, parcela, saldoRestante, prazo);
  res.status(201).json({ id: r.lastInsertRowid, tipo, valorTotal, taxaJuros, parcela, saldoRestante, prazo });
});
app.delete('/api/dividas/:id', (req, res) => {
  db.prepare('DELETE FROM dividas WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// --- Metas Planejamento ---
app.get('/api/metas-planejamento/:ano', (req, res) => {
  const ano = Number(req.params.ano);
  const saved = db.prepare('SELECT * FROM metas_planejamento WHERE ano = ?').all(ano) as any[];
  const meses = Array.from({ length: 12 }, (_, i) => {
    const found = saved.find((r: any) => r.mes === i + 1);
    return found || { id: null, ano, mes: i + 1, receitaPrevista: 0, gastoPrevisto: 0, metaInvestimento: 0, dividendosEsperados: 0 };
  });
  res.json(meses);
});
app.put('/api/metas-planejamento/:ano/:mes', (req, res) => {
  const ano = Number(req.params.ano);
  const mes = Number(req.params.mes);
  const { receitaPrevista, gastoPrevisto, metaInvestimento, dividendosEsperados } = req.body;
  db.prepare(`
    INSERT INTO metas_planejamento (ano,mes,receitaPrevista,gastoPrevisto,metaInvestimento,dividendosEsperados)
    VALUES (?,?,?,?,?,?)
    ON CONFLICT(ano,mes) DO UPDATE SET
      receitaPrevista=excluded.receitaPrevista,
      gastoPrevisto=excluded.gastoPrevisto,
      metaInvestimento=excluded.metaInvestimento,
      dividendosEsperados=excluded.dividendosEsperados
  `).run(ano, mes, receitaPrevista, gastoPrevisto, metaInvestimento, dividendosEsperados);
  res.json({ ano, mes, receitaPrevista, gastoPrevisto, metaInvestimento, dividendosEsperados });
});

// --- Carteira ---
app.get('/api/carteira', (_req, res) => {
  // Only return assets with quantity > 0
  res.json(db.prepare('SELECT * FROM carteira WHERE quantidade > 0 ORDER BY tipo, ativo').all());
});

// --- Lançamentos de Investimentos ---
app.get('/api/lancamentos-investimentos', (_req, res) => {
  res.json(db.prepare('SELECT * FROM lancamentos_investimentos ORDER BY data DESC, id DESC').all());
});

app.post('/api/lancamentos-investimentos', (req, res) => {
  const { tipo, operacao, ativo, data, quantidade: qty, preco, moeda, valorTotal, taxaCambio: tc } = req.body;
  const ativoUpper = String(ativo).toUpperCase();
  const qtd = Number(qty);
  const prc = Number(preco);       // price in native currency (USD or BRL)
  const vt = Number(valorTotal);   // total in native currency
  const taxaCambio = Number(tc) || 1; // USD/BRL rate
  const isUSD = moeda === 'USD';

  // BRL-equivalent values for DB storage
  const prcBRL = isUSD ? prc * taxaCambio : prc;
  const vtBRL = isUSD ? vt * taxaCambio : vt;

  // 1. Insert lancamento
  const result = db.prepare(
    'INSERT INTO lancamentos_investimentos (tipo,operacao,ativo,data,quantidade,preco,moeda,valorTotal,taxaCambio) VALUES (?,?,?,?,?,?,?,?,?)'
  ).run(tipo, operacao, ativoUpper, data, qtd, prc, moeda, vt, taxaCambio);

  // 2. Update carteira
  const existing = db.prepare('SELECT * FROM carteira WHERE ativo = ?').get(ativoUpper) as any;

  if (operacao === 'compra') {
    if (!existing) {
      db.prepare(
        'INSERT INTO carteira (ativo,tipo,quantidade,precoMedio,precoAtual,valorInvestido,valorAtual,moeda,taxaCambio) VALUES (?,?,?,?,?,?,?,?,?)'
      ).run(ativoUpper, tipo, qtd, prc, prc, vtBRL, vtBRL, moeda, taxaCambio);
    } else {
      const novaQtd = existing.quantidade + qtd;
      // precoMedio in native currency (weighted average)
      const novoPrecoMedio = (existing.quantidade * existing.precoMedio + qtd * prc) / novaQtd;
      const novoValorInvestido = novaQtd * novoPrecoMedio * (isUSD ? taxaCambio : 1);
      const novoValorAtual = novaQtd * prc * (isUSD ? taxaCambio : 1);
      db.prepare(
        'UPDATE carteira SET quantidade=?,precoMedio=?,precoAtual=?,valorInvestido=?,valorAtual=?,taxaCambio=? WHERE ativo=?'
      ).run(novaQtd, novoPrecoMedio, prc, novoValorInvestido, novoValorAtual, taxaCambio, ativoUpper);
    }
  } else if (operacao === 'venda') {
    if (!existing) {
      return res.status(400).json({ error: 'Ativo não encontrado na carteira' });
    }
    if (qtd > existing.quantidade + 0.000001) {
      return res.status(400).json({ error: `Quantidade insuficiente. Disponível: ${existing.quantidade}` });
    }
    const novaQtd = existing.quantidade - qtd;
    if (novaQtd <= 0.000001) {
      // Sold everything — remove from carteira
      db.prepare('DELETE FROM carteira WHERE ativo = ?').run(ativoUpper);
    } else {
      const existingIsUSD = existing.moeda === 'USD';
      const rate = existing.taxaCambio || 1;
      const novoValorInvestido = novaQtd * existing.precoMedio * (existingIsUSD ? rate : 1);
      const novoValorAtual = novaQtd * existing.precoAtual * (existingIsUSD ? rate : 1);
      db.prepare(
        'UPDATE carteira SET quantidade=?,valorInvestido=?,valorAtual=? WHERE ativo=?'
      ).run(novaQtd, novoValorInvestido, novoValorAtual, ativoUpper);
    }
  }

  res.status(201).json({
    id: result.lastInsertRowid, tipo, operacao, ativo: ativoUpper,
    data, quantidade: qtd, preco: prc, moeda, valorTotal: vt, taxaCambio,
  });
});

app.delete('/api/lancamentos-investimentos/:id', (req, res) => {
  const { id } = req.params;
  const target = db.prepare('SELECT * FROM lancamentos_investimentos WHERE id = ?').get(id) as any;

  if (!target) {
    return res.status(404).json({ error: 'Lançamento não encontrado' });
  }

  // Reverse the operation in carteira
  const existing = db.prepare('SELECT * FROM carteira WHERE ativo = ?').get(target.ativo) as any;
  const isUSD = target.moeda === 'USD';
  const taxaCambio = target.taxaCambio || 1;
  const vtBRL = isUSD ? target.valorTotal * taxaCambio : target.valorTotal;

  if (existing) {
    let novaQtd = existing.quantidade;
    let novoValorInvestido = existing.valorInvestido;

    if (target.operacao === 'compra') {
      novaQtd -= target.quantidade;
      novoValorInvestido -= vtBRL;
    } else if (target.operacao === 'venda') {
      novaQtd += target.quantidade;
      // Reverse sale doesn't perfectly restore original invested value easily, 
      // but we add back what was theoretically removed or just use avg price. 
      // For simplicity, we add back corresponding `precoMedio * quantidade`:
      novoValorInvestido += (existing.precoMedio * target.quantidade * (isUSD ? taxaCambio : 1));
    }

    if (novaQtd <= 0.000001) {
      db.prepare('DELETE FROM carteira WHERE ativo = ?').run(target.ativo);
    } else {
      const novoPrecoMedio = target.operacao === 'compra'
        ? Math.max(0, novoValorInvestido / novaQtd / (isUSD ? taxaCambio : 1))
        : existing.precoMedio; // Reverting a sale doesn't change avg price

      const novoValorAtual = novaQtd * existing.precoAtual * (isUSD ? taxaCambio : 1);

      db.prepare(
        'UPDATE carteira SET quantidade=?, precoMedio=?, valorInvestido=?, valorAtual=? WHERE ativo=?'
      ).run(novaQtd, novoPrecoMedio, Math.max(0, novoValorInvestido), novoValorAtual, target.ativo);
    }
  }

  // Delete the actual lancamento
  db.prepare('DELETE FROM lancamentos_investimentos WHERE id = ?').run(id);
  res.status(204).send();
});

// --- Dividendos (brapi.dev, cached 1x/month) ---
const BRAPI_TOKEN = process.env.BRAPI_TOKEN || '';
const BRAPI_BASE = 'https://brapi.dev/api';

app.get('/api/dividendos', async (req, res) => {
  // Get all unique ativos from carteira where qty > 0
  const carteiraAtivos = (db.prepare('SELECT DISTINCT ativo FROM carteira WHERE quantidade > 0').all() as any[])
    .map((r: any) => r.ativo)
    .filter(Boolean);

  if (carteiraAtivos.length === 0) {
    return res.json([]);
  }

  const anoMes = new Date().toISOString().slice(0, 7); // e.g. '2026-03'
  const today = new Date();
  const results: any[] = [];

  for (const ticker of carteiraAtivos) {
    // Check cache
    const cached = db.prepare('SELECT payload FROM dividend_cache WHERE ticker = ? AND ano_mes = ?').get(ticker, anoMes) as any;
    let cashDividends: any[];

    if (cached) {
      cashDividends = JSON.parse(cached.payload);
    } else {
      try {
        const tokenParam = BRAPI_TOKEN ? `&token=${BRAPI_TOKEN}` : '';
        const url = `${BRAPI_BASE}/quote/${ticker}?dividends=true${tokenParam}`;
        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`brapi: ${ticker} → HTTP ${response.status}`);
          cashDividends = [];
        } else {
          const data = await response.json();
          cashDividends = data?.results?.[0]?.dividendsData?.cashDividends ?? [];
        }
        // Store in cache
        db.prepare(
          'INSERT INTO dividend_cache (ticker, ano_mes, payload) VALUES (?,?,?) ON CONFLICT(ticker,ano_mes) DO UPDATE SET payload=excluded.payload, updated_at=datetime(\'now\')'
        ).run(ticker, anoMes, JSON.stringify(cashDividends));
      } catch (err) {
        console.error(`brapi fetch error for ${ticker}:`, err);
        cashDividends = [];
      }
    }

    // Get this ticker's position from carteira
    const position = db.prepare('SELECT quantidade FROM carteira WHERE ativo = ?').get(ticker) as any;
    const quantidade = position?.quantidade ?? 0;

    // Map dividends to response — include all that have paymentDate or lastDatePrior
    for (const d of cashDividends) {
      const payDate = d.paymentDate ? new Date(d.paymentDate) : null;

      // Filter out very old dividends (older than 2 years ago) to avoid clutter like 1992 entries
      if (payDate) {
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        if (payDate < twoYearsAgo) continue;
      }

      const isFuture = payDate ? payDate > today : false;
      const valorPorCota = d.rate ?? 0;
      const valorTotal = valorPorCota * quantidade;
      const irAliquota = 0.15; // 15% IR on JCP
      const totalLiquido = d.label === 'JCP' || d.label === 'JSCP' ? valorTotal * (1 - irAliquota) : valorTotal;

      results.push({
        ticker,
        tipo: d.label ?? 'DIVIDENDO',   // JCP, DIVIDENDO, RENDIMENTO...
        dataCom: d.lastDatePrior ?? null,
        dataPagamento: d.paymentDate ?? null,
        quantidade,
        valorPorCota,
        valorTotal,
        totalLiquido,
        status: isFuture ? 'a_receber' : 'pago',
        approvedOn: d.approvedOn ?? null,
      });
    }
  }

  // Sort: future first (by paymentDate asc), then past (by paymentDate desc)
  results.sort((a, b) => {
    const da = a.dataPagamento ? new Date(a.dataPagamento).getTime() : 0;
    const db2 = b.dataPagamento ? new Date(b.dataPagamento).getTime() : 0;
    if (a.status === 'a_receber' && b.status === 'a_receber') return da - db2;
    if (a.status === 'a_receber') return -1;
    if (b.status === 'a_receber') return 1;
    return db2 - da; // past: newest first
  });

  res.json(results);
});

const quotesLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Limite excedido. Tente novamente mais tarde.' }
});

// --- Cotações em Tempo Real (brapi.dev) ---
app.get('/api/quotes', quotesLimiter, async (req, res) => {
  if (!BRAPI_TOKEN) {
    return res.status(400).json({ error: 'Token BRAPI não configurado no .env' });
  }

  try {
    // 1. Get USD/BRL Exchange Rate (Free Unauthenticated API)
    let usdRate = 5.0; // fallback
    try {
      const curRes = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
      if (curRes.ok) {
        const curData = await curRes.json();
        usdRate = Number(curData.USDBRL.ask);
      }
    } catch (e) {
      console.error('Failed to fetch USD rate:', e);
    }

    // 2. Get all distinct active tickers (Ações, FIIs, BDRs, ETFs, etc.)
    const ativos = db.prepare(`
      SELECT DISTINCT ativo 
      FROM carteira 
      WHERE quantidade > 0 AND tipo IN ('Ações', 'FIIs', 'BDRs', 'ETF', 'Stocks', 'REITs')
    `).all() as any[];

    if (ativos.length === 0) {
      return res.json({ message: 'Nenhum ativo variável na carteira', usdRate });
    }

    let updatedCount = 0;
    const tickers = ativos.map(a => a.ativo);

    const updateStmt = db.prepare(`
      UPDATE carteira 
      SET precoAtual = ?, valorAtual = ?, taxaCambio = ?
      WHERE ativo = ?
    `);

    // Fetch one by one because Brapi FREE tier limits to 1 quote per request
    for (const ticker of tickers) {
      if (!/^[A-Z0-9.\-]+$/i.test(ticker)) continue; // SSRF Protection
      const url = `${BRAPI_BASE}/quote/${encodeURIComponent(ticker)}?token=${BRAPI_TOKEN}`;

      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`brapi quotes fetch failed for ${ticker}: HTTP ${response.status}`);
          continue;
        }

        const data = await response.json();
        if (!data.results || !data.results[0]) continue;

        const result = data.results[0];
        const symbol = result.symbol;
        const currentPrice = Number(result.regularMarketPrice) || 0;

        if (currentPrice > 0) {
          const positions = db.prepare('SELECT id, quantidade, moeda FROM carteira WHERE ativo = ?').all(symbol) as any[];

          for (const pos of positions) {
            const isUSD = pos.moeda === 'USD';
            const rate = isUSD ? usdRate : 1;
            const newValorAtual = pos.quantidade * currentPrice * rate;

            updateStmt.run(currentPrice, newValorAtual, rate, symbol);
            updatedCount++;
          }
        }
      } catch (e) {
        console.error(`Error fetching quotes for ${ticker}:`, e);
      }
    }

    res.json({ message: 'Cotações atualizadas com sucesso', updatedCount, usdRate });
  } catch (error) {
    console.error('Error in /api/quotes:', error);
    res.status(500).json({ error: 'Falha ao atualizar cotações' });
  }
});

// ===================== DASHBOARD SUMMARY =====================
app.get('/api/dashboard', async (req, res) => {
  const mesParam = req.query.mes as string; // e.g. '2026-03' or 'geral'

  let usdRate = 5.0; // fallback
  try {
    const curRes = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
    if (curRes.ok) {
      const curData = await curRes.json();
      usdRate = Number(curData.USDBRL.ask);
    }
  } catch (e) {
    console.error('Failed to fetch USD rate in dashboard:', e);
  }

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const currentMonthPrefix = `${year}-${month}`; // e.g., '2026-03'

  // Determine available months from databases
  const dateSources = db.prepare(`
    SELECT DISTINCT substr(data, 1, 7) as mes FROM gastos
    UNION
    SELECT DISTINCT substr(data, 1, 7) as mes FROM receitas
    UNION
    SELECT DISTINCT substr(data, 1, 7) as mes FROM lancamentos_investimentos
  `).all() as { mes: string }[];

  let mesesDisponiveis = dateSources.map(r => r.mes).filter(Boolean).sort();
  if (!mesesDisponiveis.includes(currentMonthPrefix)) {
    mesesDisponiveis.push(currentMonthPrefix);
    mesesDisponiveis.sort();
  }

  let whereClause = '';
  let params: string[] = [];

  if (mesParam && mesParam !== 'geral') {
    whereClause = 'WHERE data LIKE ?';
    params = [`${mesParam}%`];
  } else if (!mesParam) {
    // Default to current month if no param is provided
    whereClause = 'WHERE data LIKE ?';
    params = [`${currentMonthPrefix}%`];
  } // if 'geral', variables are empty

  // 1. Receitas do Período
  const receitasRef = db.prepare(`SELECT SUM(valor) as total FROM receitas ${whereClause}`).get(...params) as any;
  const receitaMensal = receitasRef?.total || 0;

  // 2. Gastos do Período
  const gastosRef = db.prepare(`SELECT SUM(valor) as total FROM gastos ${whereClause}`).get(...params) as any;
  const gastosMensais = gastosRef?.total || 0;

  // 3. Valor Investido & Rentabilidade (Balances are typically absolute, not period-dependent)
  const invRef = db.prepare(`SELECT SUM(valorInvestido) as investido, SUM(valorAtual) as atual FROM carteira WHERE quantidade > 0`).get() as any;
  const valorInvestido = invRef?.investido || 0;
  const valorAtual = invRef?.atual || 0;

  // O Lucro Real/Rentabilidade da Carteira baseada no preço médio
  const lucroReal = valorAtual - valorInvestido;
  const rentabilidadeCarteira = valorInvestido > 0 ? (lucroReal / valorInvestido) * 100 : 0;

  // 4. Dívidas Totais (Absolute)
  const divRef = db.prepare(`SELECT SUM(saldoRestante) as total FROM dividas`).get() as any;
  const dividasTotais = divRef?.total || 0;

  // 5. Caixa Total (All time Receitas - Gastos - Compras Investimentos + Vendas Investimentos)
  const totalReceitasAllTime = (db.prepare(`SELECT SUM(valor) as total FROM receitas`).get() as any)?.total || 0;
  const totalGastosAllTime = (db.prepare(`SELECT SUM(valor) as total FROM gastos`).get() as any)?.total || 0;
  const totalAportesAllTime = (db.prepare(`SELECT SUM(valorTotal) as total FROM lancamentos_investimentos WHERE operacao='compra'`).get() as any)?.total || 0;
  const totalSaquesAllTime = (db.prepare(`SELECT SUM(valorTotal) as total FROM lancamentos_investimentos WHERE operacao='venda'`).get() as any)?.total || 0;

  const caixaTotal = totalReceitasAllTime - totalGastosAllTime - totalAportesAllTime + totalSaquesAllTime;

  // Patrimônio Total (Caixa + Investimentos - Dívidas)
  const patrimonioTotal = caixaTotal + valorAtual - dividasTotais;

  // Taxa de Poupança
  const taxaPoupanca = receitaMensal > 0 ? ((receitaMensal - gastosMensais) / receitaMensal) * 100 : 0;

  // Top Gastos & Receitas
  const topGastos = db.prepare(`SELECT id, descricao, valor FROM gastos ${whereClause} ORDER BY valor DESC LIMIT 5`).all(...params);
  const topReceitas = db.prepare(`SELECT id, descricao, valor FROM receitas ${whereClause} ORDER BY valor DESC LIMIT 5`).all(...params);

  // Distribuição de Gastos & Categoria
  const gastosPorCategoriaRaw = db.prepare(`SELECT categoria, SUM(valor) as valor FROM gastos ${whereClause} GROUP BY categoria ORDER BY valor DESC LIMIT 6`).all(...params) as any[];

  // Recharts needs 'name', 'value' for PieChart
  const distribuicaoGastos = gastosPorCategoriaRaw.map((g, i) => {
    const colors = ['#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#e0f2fe'];
    return { name: g.categoria, value: g.valor, color: colors[i % colors.length] || '#ccc' };
  });

  // Categorias de Patrimonio (Ações, FIIs, etc)
  const categoriasRaw = db.prepare(`SELECT tipo, SUM(valorAtual) as valor FROM carteira WHERE quantidade > 0 GROUP BY tipo`).all() as any[];
  const colorsCat = ['bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-blue-500', 'bg-rose-500', 'bg-indigo-500'];
  const categoriasPatrimonio = categoriasRaw.map((c, i) => ({
    id: i + 1,
    nome: c.tipo,
    valor: c.valor,
    cor: colorsCat[i % colorsCat.length]
  }));

  const patrimonioBruto = categoriasPatrimonio.reduce((acc, curr) => acc + curr.valor, 0);

  // Recharts needs 'categoria', 'valor' for BarChart
  const gastosPorCategoria = gastosPorCategoriaRaw;

  // Evolução do Patrimônio e Investimentos (Últimos 6 meses com dados ou o mês atual)
  const evolucaoPatrimonioData = [];
  const evolucaoInvestimentosData = [];
  const lastMonths = mesesDisponiveis.slice(-6);
  if (lastMonths.length === 0) lastMonths.push(currentMonthPrefix);

  for (const m of lastMonths) {
    const recHist = (db.prepare(`SELECT SUM(valor) as total FROM receitas WHERE substr(data, 1, 7) <= ?`).get(m) as any)?.total || 0;
    const gasHist = (db.prepare(`SELECT SUM(valor) as total FROM gastos WHERE substr(data, 1, 7) <= ?`).get(m) as any)?.total || 0;

    // For Investimentos History
    const comprasHist = (db.prepare(`SELECT SUM(valorTotal) as total FROM lancamentos_investimentos WHERE operacao='compra' AND substr(data, 1, 7) <= ?`).get(m) as any)?.total || 0;
    const vendasHist = (db.prepare(`SELECT SUM(valorTotal) as total FROM lancamentos_investimentos WHERE operacao='venda' AND substr(data, 1, 7) <= ?`).get(m) as any)?.total || 0;

    // Convert YYYY-MM -> Nome do Mes Ex: Mar/26
    const [y, mm] = m.split('-');
    const dateObj = new Date(parseInt(y), parseInt(mm) - 1, 1);
    const mLabel = dateObj.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    const mesNome = mLabel.charAt(0).toUpperCase() + mLabel.slice(1) + '/' + y.slice(2);

    let valPatrimonio = 0;
    let valInv = 0;
    if (m === currentMonthPrefix) {
      valPatrimonio = patrimonioTotal; // Today's actual math
      valInv = valorAtual; // Current actual MTM value
    } else {
      // Historical approximation (Receitas - Gastos - Dividas)
      // We assume Investimentos roughly cancel out (what left the bank became an asset). 
      // This is a common reasonable approximation without full historical asset MTM pricing snapshots.
      valPatrimonio = recHist - gasHist - dividasTotais;

      // Investimentos historical at cost basis
      valInv = comprasHist - vendasHist;
    }

    evolucaoPatrimonioData.push({
      mes: mesNome,
      valor: Math.max(0, valPatrimonio)
    });

    evolucaoInvestimentosData.push({
      mes: mesNome,
      valor: Math.max(0, valInv)
    });
  }

  // Send everything to mimic what `mockData` had
  res.json({
    mesesDisponiveis,
    dashboard: {
      patrimonioTotal,
      receitaMensal,
      gastosMensais,
      taxaPoupanca,
      dividendosMes: 0, // Mock for now, will be updated by /api/dividendos
      dividendosAno: 0,
      valorInvestido,
      rentabilidadeCarteira,
      lucroReal, // MTM Profit
      topGastos,
      topReceitas,
      dividendYieldMedio: 0,
      usdRate
    },
    patrimonio: {
      patrimonioBruto,
      totalDividas: dividasTotais,
      categoriasPatrimonio
    },
    distribuicaoGastos,
    gastosPorCategoria,
    evolucaoPatrimonio: evolucaoPatrimonioData,
    evolucaoDividendos: [],
    evolucaoInvestimentos: evolucaoInvestimentosData
  });
});

// ===================== METAS FINANCEIRAS =====================
app.get('/api/metas-financeiras', (_req, res) => {
  res.json(db.prepare('SELECT * FROM metas_financeiras ORDER BY id DESC').all());
});

app.post('/api/metas-financeiras', (req, res) => {
  const { tipo, categoria, valorTotal, aporteMensal, variacaoAnual, valorFinalMeta, tiposAtivos, mediaProventosDesejada } = req.body;
  const r = db.prepare(
    `INSERT INTO metas_financeiras (tipo,categoria,valorTotal,aporteMensal,variacaoAnual,valorFinalMeta,tiposAtivos,mediaProventosDesejada)
     VALUES (?,?,?,?,?,?,?,?)`
  ).run(
    tipo,
    categoria ?? null,
    valorTotal ?? null,
    aporteMensal ?? null,
    variacaoAnual ?? null,
    valorFinalMeta ?? null,
    tiposAtivos ? JSON.stringify(tiposAtivos) : null,
    mediaProventosDesejada ?? null
  );
  res.status(201).json({ id: r.lastInsertRowid, ...req.body });
});

app.put('/api/metas-financeiras/:id', (req, res) => {
  const { tipo, categoria, valorTotal, aporteMensal, variacaoAnual, valorFinalMeta, tiposAtivos, mediaProventosDesejada } = req.body;
  db.prepare(
    `UPDATE metas_financeiras SET tipo=?,categoria=?,valorTotal=?,aporteMensal=?,variacaoAnual=?,valorFinalMeta=?,tiposAtivos=?,mediaProventosDesejada=? WHERE id=?`
  ).run(
    tipo,
    categoria ?? null,
    valorTotal ?? null,
    aporteMensal ?? null,
    variacaoAnual ?? null,
    valorFinalMeta ?? null,
    tiposAtivos ? JSON.stringify(tiposAtivos) : null,
    mediaProventosDesejada ?? null,
    Number(req.params.id)
  );
  res.json({ id: Number(req.params.id), ...req.body });
});

app.delete('/api/metas-financeiras/:id', (req, res) => {
  db.prepare('DELETE FROM metas_financeiras WHERE id = ?').run(Number(req.params.id));
  res.status(204).end();
});

// ===================== SPA FALLBACK =====================
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    res.status(404).json({ error: 'Route not found' });
  }
});

// ===================== START =====================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ API server running at http://localhost:${PORT}`);
});
