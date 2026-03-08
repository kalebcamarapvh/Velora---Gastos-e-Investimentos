import 'dotenv/config';
import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { z } from 'zod';
import crypto from 'crypto';

interface LogEntry {
  ip: string;
  method: string;
  route: string;
  status: number;
  timestamp: string;
}

const requestLogs: LogEntry[] = [];
const MAX_LOGS = 5000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', 1); // Crucial for Vite proxy/nginx so req.ip is correct and rate limiter doesn't block everyone

// --- SECURE HEADERS (HELMET) ---
app.use(helmet({
  contentSecurityPolicy: false, // Allows inline scripts from Vite
}));

// --- SERVE STATIC FILES (DOCKER PROD) ---
app.use(express.static(path.join(__dirname, 'dist')));

app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';

  res.on('finish', () => {
    requestLogs.push({
      ip,
      method: req.method,
      route: req.path,
      status: res.statusCode,
      timestamp: new Date().toISOString(),
    });
    if (requestLogs.length > MAX_LOGS) {
      requestLogs.splice(0, requestLogs.length - MAX_LOGS);
    }
  });

  next();
});

const JWT_SECRET = process.env.API_SECRET_TOKEN || 'fallback-secret-123';
const REFRESH_SECRET = process.env.API_SECRET_TOKEN || 'fallback-secret-123'; // Opaque tokens can also just be random crypto strings, but we'll use a strong generator.

// --- GLOBAL API RATE LIMITING ---
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Increased to 1000 to prevent locking out legitimate rapid tab switching
  message: { error: 'Muitas requisições. Tente novamente mais tarde.' },
  handler: (req, res, next, options) => {
    console.warn(`[RATE LIMIT GLOBAL] IP Bloqueado temporariamente: ${req.ip} - Rota: ${req.originalUrl}`);
    res.status(options.statusCode).send(options.message);
  }
}));

// --- BEARER TOKEN AUTH (VPN PROTECTION) DEPRECATED IN V2 ---
// Replaced by HTTP-Only Cookie Session Middleware
// We leave CORS headers to accept credentials
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});



// ===================== DATABASE SETUP =====================
const dbPath = process.env.DB_PATH || path.join(__dirname, 'finance.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    refresh_token TEXT,
    is_admin BOOLEAN DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS gastos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL DEFAULT 1,
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
    usuario_id INTEGER NOT NULL DEFAULT 1,
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
    descricao TEXT NOT NULL,
    valor REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente'
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

// Migrate multi-tenant
migrate("ALTER TABLE gastos ADD COLUMN usuario_id INTEGER NOT NULL DEFAULT 1");
migrate("ALTER TABLE receitas ADD COLUMN usuario_id INTEGER NOT NULL DEFAULT 1");
migrate("ALTER TABLE assinaturas ADD COLUMN usuario_id INTEGER NOT NULL DEFAULT 1");
migrate("ALTER TABLE dividas ADD COLUMN usuario_id INTEGER NOT NULL DEFAULT 1");
migrate("ALTER TABLE metas_planejamento ADD COLUMN usuario_id INTEGER NOT NULL DEFAULT 1");
migrate("ALTER TABLE carteira ADD COLUMN usuario_id INTEGER NOT NULL DEFAULT 1");
migrate("ALTER TABLE lancamentos_investimentos ADD COLUMN usuario_id INTEGER NOT NULL DEFAULT 1");
migrate("ALTER TABLE metas_financeiras ADD COLUMN usuario_id INTEGER NOT NULL DEFAULT 1");
migrate("ALTER TABLE usuarios ADD COLUMN is_admin BOOLEAN DEFAULT 0");

// Fix UNIQUE constraints by recreating indexes or tables (if needed later)
// For now, assigning user 1 to old data makes it seamlessly compatible.

// ===================== MIDDLEWARES & AUTH =====================
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.cookies.accessToken;
  if (!token) return res.status(401).json({ error: 'Sessão expirada ou não autenticada.' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    (req as any).usuarioId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
};

// ===================== SEED =====================
// Seeds removidos a pedido do usuário para iniciar o app 100% limpo.

// ===================== AUTH ROUTES (OWASP V2) =====================
const authSchema = z.object({
  username: z.string().min(3, "Mínimo de 3 caracteres").max(50),
  password: z.string().min(6, "Senha muito curta. Mínimo de 6 caracteres.")
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Increased tolerance due to proxy/testing
  message: { error: 'Muitas tentativas de login. Sua conta foi temporariamente bloqueada. Tente novamente em 15 minutos.' },
  handler: (req, res, next, options) => {
    console.warn(`[RATE LIMIT LOGIN] ALERTA DE SEGURANÇA: IP Bloqueado por Força Bruta: ${req.ip} - Tentativas excedidas no /api/login`);
    res.status(options.statusCode).send(options.message);
  }
});

app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = authSchema.parse(req.body);
    const hash = await bcrypt.hash(password, 12); // OWASP Standard 12 rounds
    try {
      db.prepare('INSERT INTO usuarios (username, password_hash) VALUES (?, ?)').run(username, hash);
      res.status(201).json({ message: 'Usuário registrado com sucesso. Faça seu login.' });
    } catch {
      res.status(400).json({ error: 'Username já existe.' });
    }
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues[0].message });
    res.status(400).json({ error: 'Dados inválidos.' });
  }
});

app.post('/api/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = authSchema.parse(req.body);
    const user = db.prepare('SELECT * FROM usuarios WHERE username = ?').get(username) as any;

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    // Access Token (Curtíssimo, 15 min)
    const accessToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '15m' });
    // Refresh Token Opaco (7 dias)
    const refreshToken = crypto.randomBytes(40).toString('hex');

    db.prepare('UPDATE usuarios SET refresh_token = ? WHERE id = ?').run(refreshToken, user.id);

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('accessToken', accessToken, { httpOnly: true, secure: isProd, sameSite: 'strict', maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: isProd, sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/refresh' });

    res.json({ message: 'Login bem-sucedido', username: user.username });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues[0].message });
    res.status(400).json({ error: 'Dados inválidos.' });
  }
});

app.post('/api/refresh', (req, res) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) return res.status(401).json({ error: 'Não autorizado.' });

  const user = db.prepare('SELECT * FROM usuarios WHERE refresh_token = ?').get(refreshToken) as any;
  if (!user) return res.status(403).json({ error: 'Sessão expirada. Faça login novamente.' });

  // JWT e Opaco Tokens rotation
  const newAccessToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '15m' });
  const newRefreshToken = crypto.randomBytes(40).toString('hex');

  db.prepare('UPDATE usuarios SET refresh_token = ? WHERE id = ?').run(newRefreshToken, user.id);

  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('accessToken', newAccessToken, { httpOnly: true, secure: isProd, sameSite: 'strict', maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', newRefreshToken, { httpOnly: true, secure: isProd, sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/refresh' });

  res.json({ message: 'Token renovado' });
});

app.post('/api/logout', (req, res) => {
  const { refreshToken } = req.cookies;
  if (refreshToken) {
    db.prepare('UPDATE usuarios SET refresh_token = NULL WHERE refresh_token = ?').run(refreshToken);
  }
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken', { path: '/api/refresh' });
  res.json({ message: 'Logout efetuado com sucesso.' });
});

app.get('/api/me', requireAuth, (req: any, res) => {
  const user = db.prepare('SELECT id, username, is_admin, role FROM usuarios WHERE id = ?').get(req.usuarioId) as any;
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
  res.json({ id: user.id, username: user.username, isAdmin: user.is_admin === 1 || user.role === 'admin' || user.id === 1 });
});

app.get('/api/admin/stats', requireAuth, (req: any, res) => {
  const user = db.prepare('SELECT id, is_admin, role FROM usuarios WHERE id = ?').get(req.usuarioId) as any;
  if (!user || (user.is_admin !== 1 && user.role !== 'admin' && user.id !== 1)) {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }

  // Aggregate by IP
  const ipMap = new Map<string, { total: number; blocked: number; lastSeen: string; routes: Record<string, number> }>();

  for (const log of requestLogs) {
    if (!ipMap.has(log.ip)) {
      ipMap.set(log.ip, { total: 0, blocked: 0, lastSeen: log.timestamp, routes: {} });
    }
    const e = ipMap.get(log.ip)!;
    e.total++;
    if (log.status >= 400) e.blocked++;
    if (log.timestamp > e.lastSeen) e.lastSeen = log.timestamp;
    e.routes[log.route] = (e.routes[log.route] || 0) + 1;
  }

  const topIps = [...ipMap.entries()]
    .map(([ip, d]) => ({ ip, totalRequests: d.total, blocked: d.blocked, lastSeen: d.lastSeen, routes: d.routes }))
    .sort((a, b) => b.totalRequests - a.totalRequests)
    .slice(0, 20);

  // Requests per hour (last 24h)
  const now = new Date();
  const hourMap = new Map<string, number>();
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 3_600_000);
    hourMap.set(`${String(d.getHours()).padStart(2, '0')}h`, 0);
  }
  for (const log of requestLogs) {
    const d = new Date(log.timestamp);
    if ((now.getTime() - d.getTime()) / 3_600_000 <= 24) {
      const key = `${String(d.getHours()).padStart(2, '0')}h`;
      hourMap.set(key, (hourMap.get(key) || 0) + 1);
    }
  }

  // Route breakdown (top 10)
  const routeMap = new Map<string, number>();
  for (const log of requestLogs) {
    routeMap.set(log.route, (routeMap.get(log.route) || 0) + 1);
  }
  const routeBreakdown = [...routeMap.entries()]
    .map(([route, count]) => ({ route, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Status breakdown
  const statusMap: Record<string, number> = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
  for (const log of requestLogs) {
    const key = `${Math.floor(log.status / 100)}xx`;
    if (key in statusMap) statusMap[key]++;
  }

  res.json({
    totalRequests: requestLogs.length,
    uniqueIps: ipMap.size,
    blockedRequests: requestLogs.filter(l => l.status >= 400).length,
    topIps,
    recentLogs: requestLogs.slice(-100),
    requestsPerHour: [...hourMap.entries()].map(([hour, count]) => ({ hour, count })),
    routeBreakdown,
    statusBreakdown: Object.entries(statusMap).filter(([, c]) => c > 0).map(([status, count]) => ({ status, count })),
  });
});

app.delete('/api/admin/logs/clear', requireAuth, (req: any, res) => {
  const user = db.prepare('SELECT id, is_admin, role FROM usuarios WHERE id = ?').get(req.usuarioId) as any;
  if (!user || (user.is_admin !== 1 && user.role !== 'admin' && user.id !== 1)) {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }

  requestLogs.splice(0, requestLogs.length);
  res.json({ message: 'Logs limpos com sucesso.' });
});

// ===================== ROUTES =====================

// --- Gastos ---
app.get('/api/gastos', requireAuth, (req: any, res) => {
  res.json(db.prepare('SELECT * FROM gastos WHERE usuario_id = ? ORDER BY data DESC').all(req.usuarioId));
});
app.post('/api/gastos', requireAuth, (req: any, res) => {
  const { data, descricao, categoria, subcategoria, pagamento, conta, valor } = req.body;
  const r = db.prepare('INSERT INTO gastos (usuario_id, data,descricao,categoria,subcategoria,pagamento,conta,valor) VALUES (?,?,?,?,?,?,?,?)').run(req.usuarioId, data, descricao, categoria, subcategoria, pagamento, conta, valor);
  res.status(201).json({ id: r.lastInsertRowid, data, descricao, categoria, subcategoria, pagamento, conta, valor });
});
app.delete('/api/gastos/:id', requireAuth, (req: any, res) => {
  db.prepare('DELETE FROM gastos WHERE id = ? AND usuario_id = ?').run(req.params.id, req.usuarioId);
  res.status(204).send();
});

// --- Receitas ---
app.get('/api/receitas', requireAuth, (req: any, res) => {
  res.json(db.prepare('SELECT * FROM receitas WHERE usuario_id = ? ORDER BY data DESC').all(req.usuarioId));
});
app.post('/api/receitas', requireAuth, (req: any, res) => {
  const { data, descricao, categoria, origem, conta, valor } = req.body;
  const r = db.prepare('INSERT INTO receitas (usuario_id, data,descricao,categoria,origem,conta,valor) VALUES (?,?,?,?,?,?,?)').run(req.usuarioId, data, descricao, categoria, origem, conta, valor);
  res.status(201).json({ id: r.lastInsertRowid, data, descricao, categoria, origem, conta, valor });
});
app.delete('/api/receitas/:id', requireAuth, (req: any, res) => {
  db.prepare('DELETE FROM receitas WHERE id = ? AND usuario_id = ?').run(req.params.id, req.usuarioId);
  res.status(204).send();
});

// --- Assinaturas ---
app.get('/api/assinaturas', requireAuth, (req: any, res) => {
  res.json(db.prepare('SELECT * FROM assinaturas WHERE usuario_id = ? ORDER BY id ASC').all(req.usuarioId));
});
app.post('/api/assinaturas', requireAuth, (req: any, res) => {
  const { servico, categoria, periodicidade, dataCobranca, valor } = req.body;
  const r = db.prepare('INSERT INTO assinaturas (usuario_id, servico,categoria,periodicidade,dataCobranca,valor) VALUES (?,?,?,?,?,?)').run(req.usuarioId, servico, categoria, periodicidade, dataCobranca, valor);
  res.status(201).json({ id: r.lastInsertRowid, servico, categoria, periodicidade, dataCobranca, valor });
});
app.delete('/api/assinaturas/:id', requireAuth, (req: any, res) => {
  db.prepare('DELETE FROM assinaturas WHERE id = ? AND usuario_id = ?').run(req.params.id, req.usuarioId);
  res.status(204).send();
});

// --- Dívidas ---
app.get('/api/dividas', requireAuth, (req: any, res) => {
  res.json(db.prepare('SELECT * FROM dividas WHERE usuario_id = ? ORDER BY id ASC').all(req.usuarioId));
});
app.post('/api/dividas', requireAuth, (req: any, res) => {
  const { tipo, valorTotal, taxaJuros, parcela, saldoRestante, prazo } = req.body;
  const r = db.prepare('INSERT INTO dividas (usuario_id, tipo,valorTotal,taxaJuros,parcela,saldoRestante,prazo) VALUES (?,?,?,?,?,?,?)').run(req.usuarioId, tipo, valorTotal, taxaJuros, parcela, saldoRestante, prazo);
  res.status(201).json({ id: r.lastInsertRowid, tipo, valorTotal, taxaJuros, parcela, saldoRestante, prazo });
});
app.delete('/api/dividas/:id', requireAuth, (req: any, res) => {
  db.prepare('DELETE FROM dividas WHERE id = ? AND usuario_id = ?').run(req.params.id, req.usuarioId);
  res.status(204).send();
});

// --- Metas Planejamento ---
app.get('/api/metas-planejamento/:ano', requireAuth, (req: any, res) => {
  const ano = Number(req.params.ano);
  const saved = db.prepare('SELECT * FROM metas_planejamento WHERE ano = ? AND usuario_id = ?').all(ano, req.usuarioId) as any[];
  const meses = Array.from({ length: 12 }, (_, i) => {
    const found = saved.find((r: any) => r.mes === i + 1);
    return found || { id: null, ano, mes: i + 1, receitaPrevista: 0, gastoPrevisto: 0, metaInvestimento: 0, dividendosEsperados: 0 };
  });
  res.json(meses);
});
app.put('/api/metas-planejamento/:ano/:mes', requireAuth, (req: any, res) => {
  const ano = Number(req.params.ano);
  const mes = Number(req.params.mes);
  const { receitaPrevista, gastoPrevisto, metaInvestimento, dividendosEsperados } = req.body;

  // No conflito, nós deletamos e inserimos ou usamos UPDATE com usuario_id seguro 
  const existing = db.prepare('SELECT id FROM metas_planejamento WHERE ano=? AND mes=? AND usuario_id=?').get(ano, mes, req.usuarioId) as any;
  if (existing) {
    db.prepare('UPDATE metas_planejamento SET receitaPrevista=?, gastoPrevisto=?, metaInvestimento=?, dividendosEsperados=? WHERE id=?').run(receitaPrevista, gastoPrevisto, metaInvestimento, dividendosEsperados, existing.id);
  } else {
    db.prepare('INSERT INTO metas_planejamento (usuario_id,ano,mes,receitaPrevista,gastoPrevisto,metaInvestimento,dividendosEsperados) VALUES (?,?,?,?,?,?,?)').run(req.usuarioId, ano, mes, receitaPrevista, gastoPrevisto, metaInvestimento, dividendosEsperados);
  }

  res.json({ ano, mes, receitaPrevista, gastoPrevisto, metaInvestimento, dividendosEsperados });
});

// --- Carteira ---
app.get('/api/carteira', requireAuth, (req: any, res) => {
  // Only return assets with quantity > 0
  res.json(db.prepare('SELECT * FROM carteira WHERE quantidade > 0 AND usuario_id = ? ORDER BY tipo, ativo').all(req.usuarioId));
});

// --- Lançamentos de Investimentos ---
app.get('/api/lancamentos-investimentos', requireAuth, (req: any, res) => {
  res.json(db.prepare('SELECT * FROM lancamentos_investimentos WHERE usuario_id = ? ORDER BY data DESC, id DESC').all(req.usuarioId));
});

app.post('/api/lancamentos-investimentos', requireAuth, (req: any, res) => {
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
    'INSERT INTO lancamentos_investimentos (usuario_id,tipo,operacao,ativo,data,quantidade,preco,moeda,valorTotal,taxaCambio) VALUES (?,?,?,?,?,?,?,?,?,?)'
  ).run(req.usuarioId, tipo, operacao, ativoUpper, data, qtd, prc, moeda, vt, taxaCambio);

  // 2. Update carteira
  const existing = db.prepare('SELECT * FROM carteira WHERE ativo = ? AND usuario_id = ?').get(ativoUpper, req.usuarioId) as any;

  if (operacao === 'compra') {
    if (!existing) {
      db.prepare(
        'INSERT INTO carteira (usuario_id,ativo,tipo,quantidade,precoMedio,precoAtual,valorInvestido,valorAtual,moeda,taxaCambio) VALUES (?,?,?,?,?,?,?,?,?,?)'
      ).run(req.usuarioId, ativoUpper, tipo, qtd, prc, prc, vtBRL, vtBRL, moeda, taxaCambio);
    } else {
      const novaQtd = existing.quantidade + qtd;
      // precoMedio in native currency (weighted average)
      const novoPrecoMedio = (existing.quantidade * existing.precoMedio + qtd * prc) / novaQtd;
      const novoValorInvestido = novaQtd * novoPrecoMedio * (isUSD ? taxaCambio : 1);
      const novoValorAtual = novaQtd * prc * (isUSD ? taxaCambio : 1);
      db.prepare(
        'UPDATE carteira SET quantidade=?,precoMedio=?,precoAtual=?,valorInvestido=?,valorAtual=?,taxaCambio=? WHERE id=?'
      ).run(novaQtd, novoPrecoMedio, prc, novoValorInvestido, novoValorAtual, taxaCambio, existing.id);
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
      db.prepare('DELETE FROM carteira WHERE id = ?').run(existing.id);
    } else {
      const existingIsUSD = existing.moeda === 'USD';
      const rate = existing.taxaCambio || 1;
      const novoValorInvestido = novaQtd * existing.precoMedio * (existingIsUSD ? rate : 1);
      const novoValorAtual = novaQtd * existing.precoAtual * (existingIsUSD ? rate : 1);
      db.prepare(
        'UPDATE carteira SET quantidade=?,valorInvestido=?,valorAtual=? WHERE id=?'
      ).run(novaQtd, novoValorInvestido, novoValorAtual, existing.id);
    }
  }

  res.status(201).json({
    id: result.lastInsertRowid, tipo, operacao, ativo: ativoUpper,
    data, quantidade: qtd, preco: prc, moeda, valorTotal: vt, taxaCambio,
  });
});

app.delete('/api/lancamentos-investimentos/:id', requireAuth, (req: any, res) => {
  const { id } = req.params;
  const target = db.prepare('SELECT * FROM lancamentos_investimentos WHERE id = ? AND usuario_id = ?').get(id, req.usuarioId) as any;

  if (!target) {
    return res.status(404).json({ error: 'Lançamento não encontrado' });
  }

  // Reverse the operation in carteira
  const existing = db.prepare('SELECT * FROM carteira WHERE ativo = ? AND usuario_id = ?').get(target.ativo, req.usuarioId) as any;
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
      db.prepare('DELETE FROM carteira WHERE id = ?').run(existing.id);
    } else {
      const novoPrecoMedio = target.operacao === 'compra'
        ? Math.max(0, novoValorInvestido / novaQtd / (isUSD ? taxaCambio : 1))
        : existing.precoMedio; // Reverting a sale doesn't change avg price

      const novoValorAtual = novaQtd * existing.precoAtual * (isUSD ? taxaCambio : 1);

      db.prepare(
        'UPDATE carteira SET quantidade=?, precoMedio=?, valorInvestido=?, valorAtual=? WHERE id=?'
      ).run(novaQtd, novoPrecoMedio, Math.max(0, novoValorInvestido), novoValorAtual, existing.id);
    }
  }

  // Delete the actual lancamento
  db.prepare('DELETE FROM lancamentos_investimentos WHERE id = ?').run(id);
  res.status(204).send();
});

// --- Dividendos (brapi.dev, cached 1x/month) ---
const BRAPI_TOKEN = process.env.BRAPI_TOKEN || '';
const BRAPI_BASE = 'https://brapi.dev/api';

app.get('/api/dividendos', requireAuth, async (req: any, res) => {
  // Get all unique ativos from carteira where qty > 0
  const carteiraAtivos = (db.prepare('SELECT DISTINCT ativo FROM carteira WHERE quantidade > 0 AND usuario_id = ?').all(req.usuarioId) as any[])
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
    const position = db.prepare('SELECT quantidade FROM carteira WHERE ativo = ? AND usuario_id = ?').get(ticker, req.usuarioId) as any;
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
app.get('/api/quotes', requireAuth, quotesLimiter, async (req: any, res) => {
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
app.get('/api/dashboard', requireAuth, async (req: any, res) => {
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
    SELECT DISTINCT substr(data, 1, 7) as mes FROM gastos WHERE usuario_id = ?
    UNION
    SELECT DISTINCT substr(data, 1, 7) as mes FROM receitas WHERE usuario_id = ?
    UNION
    SELECT DISTINCT substr(data, 1, 7) as mes FROM lancamentos_investimentos WHERE usuario_id = ?
  `).all(req.usuarioId, req.usuarioId, req.usuarioId) as { mes: string }[];

  let mesesDisponiveis = dateSources.map(r => r.mes).filter(Boolean).sort();
  if (!mesesDisponiveis.includes(currentMonthPrefix)) {
    mesesDisponiveis.push(currentMonthPrefix);
    mesesDisponiveis.sort();
  }

  let whereClause = 'WHERE usuario_id = ?';
  let params: any[] = [req.usuarioId];

  if (mesParam && mesParam !== 'geral') {
    whereClause = 'WHERE data LIKE ? AND usuario_id = ?';
    params = [`${mesParam}%`, req.usuarioId];
  } else if (!mesParam) {
    // Default to current month if no param is provided
    whereClause = 'WHERE data LIKE ? AND usuario_id = ?';
    params = [`${currentMonthPrefix}%`, req.usuarioId];
  }

  // 1. Receitas do Período
  const receitasRef = db.prepare(`SELECT SUM(valor) as total FROM receitas ${whereClause}`).get(...params) as any;
  const receitaMensal = receitasRef?.total || 0;

  // 2. Gastos do Período
  const gastosRef = db.prepare(`SELECT SUM(valor) as total FROM gastos ${whereClause}`).get(...params) as any;
  const gastosMensais = gastosRef?.total || 0;

  // 3. Valor Investido & Rentabilidade (Balances are typically absolute, not period-dependent)
  const invRef = db.prepare(`SELECT SUM(valorInvestido) as investido, SUM(valorAtual) as atual FROM carteira WHERE quantidade > 0 AND usuario_id = ?`).get(req.usuarioId) as any;
  const valorInvestido = invRef?.investido || 0;
  const valorAtual = invRef?.atual || 0;

  // O Lucro Real/Rentabilidade da Carteira baseada no preço médio
  const lucroReal = valorAtual - valorInvestido;
  const rentabilidadeCarteira = valorInvestido > 0 ? (lucroReal / valorInvestido) * 100 : 0;

  // 4. Dívidas Totais (Absolute)
  const divRef = db.prepare(`SELECT SUM(saldoRestante) as total FROM dividas WHERE usuario_id = ?`).get(req.usuarioId) as any;
  const dividasTotais = divRef?.total || 0;

  // 5. Caixa Total (All time Receitas - Gastos - Compras Investimentos + Vendas Investimentos)
  const totalReceitasAllTime = (db.prepare(`SELECT SUM(valor) as total FROM receitas WHERE usuario_id = ?`).get(req.usuarioId) as any)?.total || 0;
  const totalGastosAllTime = (db.prepare(`SELECT SUM(valor) as total FROM gastos WHERE usuario_id = ?`).get(req.usuarioId) as any)?.total || 0;
  const totalAportesAllTime = (db.prepare(`SELECT SUM(valorTotal) as total FROM lancamentos_investimentos WHERE operacao='compra' AND usuario_id = ?`).get(req.usuarioId) as any)?.total || 0;
  const totalSaquesAllTime = (db.prepare(`SELECT SUM(valorTotal) as total FROM lancamentos_investimentos WHERE operacao='venda' AND usuario_id = ?`).get(req.usuarioId) as any)?.total || 0;

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
  const categoriasRaw = db.prepare(`SELECT tipo, SUM(valorAtual) as valor FROM carteira WHERE quantidade > 0 AND usuario_id = ? GROUP BY tipo`).all(req.usuarioId) as any[];
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
    const recHist = (db.prepare(`SELECT SUM(valor) as total FROM receitas WHERE substr(data, 1, 7) <= ? AND usuario_id = ?`).get(m, req.usuarioId) as any)?.total || 0;
    const gasHist = (db.prepare(`SELECT SUM(valor) as total FROM gastos WHERE substr(data, 1, 7) <= ? AND usuario_id = ?`).get(m, req.usuarioId) as any)?.total || 0;

    // For Investimentos History
    const comprasHist = (db.prepare(`SELECT SUM(valorTotal) as total FROM lancamentos_investimentos WHERE operacao='compra' AND substr(data, 1, 7) <= ? AND usuario_id = ?`).get(m, req.usuarioId) as any)?.total || 0;
    const vendasHist = (db.prepare(`SELECT SUM(valorTotal) as total FROM lancamentos_investimentos WHERE operacao='venda' AND substr(data, 1, 7) <= ? AND usuario_id = ?`).get(m, req.usuarioId) as any)?.total || 0;

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
app.get('/api/metas-financeiras', requireAuth, (req: any, res) => {
  res.json(db.prepare('SELECT * FROM metas_financeiras WHERE usuario_id = ? ORDER BY id DESC').all(req.usuarioId));
});

app.post('/api/metas-financeiras', requireAuth, (req: any, res) => {
  const { tipo, categoria, valorTotal, aporteMensal, variacaoAnual, valorFinalMeta, tiposAtivos, mediaProventosDesejada } = req.body;
  const r = db.prepare(
    `INSERT INTO metas_financeiras (usuario_id,tipo,categoria,valorTotal,aporteMensal,variacaoAnual,valorFinalMeta,tiposAtivos,mediaProventosDesejada)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).run(
    req.usuarioId,
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

app.put('/api/metas-financeiras/:id', requireAuth, (req: any, res) => {
  const { tipo, categoria, valorTotal, aporteMensal, variacaoAnual, valorFinalMeta, tiposAtivos, mediaProventosDesejada } = req.body;
  db.prepare(
    `UPDATE metas_financeiras SET tipo=?,categoria=?,valorTotal=?,aporteMensal=?,variacaoAnual=?,valorFinalMeta=?,tiposAtivos=?,mediaProventosDesejada=? WHERE id=? AND usuario_id=?`
  ).run(
    tipo,
    categoria ?? null,
    valorTotal ?? null,
    aporteMensal ?? null,
    variacaoAnual ?? null,
    valorFinalMeta ?? null,
    tiposAtivos ? JSON.stringify(tiposAtivos) : null,
    mediaProventosDesejada ?? null,
    Number(req.params.id),
    req.usuarioId
  );
  res.json({ id: Number(req.params.id), ...req.body });
});

app.delete('/api/metas-financeiras/:id', requireAuth, (req: any, res) => {
  db.prepare('DELETE FROM metas_financeiras WHERE id = ? AND usuario_id = ?').run(Number(req.params.id), req.usuarioId);
  res.status(204).end();
});

// ===================== EXPORTAÇÃO DE DADOS =====================
app.get('/api/export', requireAuth, (req: any, res) => {
  try {
    const data = {
      gastos: db.prepare('SELECT * FROM gastos WHERE usuario_id = ?').all(req.usuarioId),
      receitas: db.prepare('SELECT * FROM receitas WHERE usuario_id = ?').all(req.usuarioId),
      assinaturas: db.prepare('SELECT * FROM assinaturas WHERE usuario_id = ?').all(req.usuarioId),
      dividas: db.prepare('SELECT * FROM dividas WHERE usuario_id = ?').all(req.usuarioId),
      metas_planejamento: db.prepare('SELECT * FROM metas_planejamento WHERE usuario_id = ?').all(req.usuarioId),
      carteira: db.prepare('SELECT * FROM carteira WHERE usuario_id = ?').all(req.usuarioId),
      lancamentos_investimentos: db.prepare('SELECT * FROM lancamentos_investimentos WHERE usuario_id = ?').all(req.usuarioId),
      metas_financeiras: db.prepare('SELECT * FROM metas_financeiras WHERE usuario_id = ?').all(req.usuarioId),
    };
    res.json(data);
  } catch (error) {
    console.error('Erro ao exportar dados:', error);
    res.status(500).json({ error: 'Erro interno ao exportar dados.' });
  }
});

// ===================== IMPORTAÇÃO DE DADOS =====================
app.post('/api/import', requireAuth, (req: any, res) => {
  const data = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Formato de dados JSON inválido.' });
  }

  try {
    const importTransaction = db.transaction(() => {
      // 1. Limpar os dados atuais para evitar duplicidade ou conflitos
      const tables = ['gastos', 'receitas', 'assinaturas', 'dividas', 'metas_planejamento', 'carteira', 'lancamentos_investimentos', 'metas_financeiras'];
      for (const table of tables) {
        db.prepare(`DELETE FROM ${table} WHERE usuario_id = ?`).run(req.usuarioId);
      }

      // 2. Inserir Gastos
      if (Array.isArray(data.gastos)) {
        const stmt = db.prepare(`INSERT INTO gastos (usuario_id, data, descricao, categoria, subcategoria, pagamento, conta, valor) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
        for (const t of data.gastos) stmt.run(req.usuarioId, t.data, t.descricao, t.categoria, t.subcategoria, t.pagamento, t.conta, t.valor);
      }

      // 3. Inserir Receitas
      if (Array.isArray(data.receitas)) {
        const stmt = db.prepare(`INSERT INTO receitas (usuario_id, data, descricao, categoria, origem, conta, valor) VALUES (?, ?, ?, ?, ?, ?, ?)`);
        for (const t of data.receitas) stmt.run(req.usuarioId, t.data, t.descricao, t.categoria, t.origem, t.conta, t.valor);
      }

      // 4. Inserir Metas Financeiras
      if (Array.isArray(data.metas_financeiras)) {
        const stmt = db.prepare(`INSERT INTO metas_financeiras (usuario_id, tipo, categoria, valorTotal, aporteMensal, variacaoAnual, valorFinalMeta, tiposAtivos, mediaProventosDesejada) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        for (const m of data.metas_financeiras) stmt.run(req.usuarioId, m.tipo, m.categoria, m.valorTotal, m.aporteMensal, m.variacaoAnual, m.valorFinalMeta, m.tiposAtivos, m.mediaProventosDesejada);
      }

      // Outras tabelas podem ser inseridas aqui de forma similar se necessário
    });

    importTransaction();
    res.json({ message: 'Dados importados com sucesso.' });
  } catch (error) {
    console.error('Erro ao importar dados:', error);
    res.status(500).json({ error: 'Falha ao restaurar o backup.' });
  }
});

// ===================== EXCLUSÃO DE CONTA =====================
app.delete('/api/account', requireAuth, (req: any, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'A senha é obrigatória para excluir a conta.' });

  try {
    const user = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.usuarioId) as any;
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const match = bcrypt.compareSync(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Senha incorreta.' });

    // Excluir registros vinculados ao usuario_id no schema atual
    const tables = ['gastos', 'receitas', 'assinaturas', 'dividas', 'metas_planejamento', 'carteira', 'lancamentos_investimentos', 'metas_financeiras'];
    for (const table of tables) {
      db.prepare(`DELETE FROM ${table} WHERE usuario_id = ?`).run(req.usuarioId);
    }

    // Excluir o próprio usuário
    db.prepare('DELETE FROM usuarios WHERE id = ?').run(req.usuarioId);

    // Limpar os cookies da sessão
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.json({ message: 'Conta excluída com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir conta:', error);
    res.status(500).json({ error: 'Ocorreu um erro ao excluir a conta.' });
  }
});

// ===================== ZERAR DADOS DA CONTA =====================
app.delete('/api/account/reset', requireAuth, (req: any, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'A senha é obrigatória para zerar a conta.' });

  try {
    const user = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.usuarioId) as any;
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const match = bcrypt.compareSync(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Senha incorreta.' });

    // Excluir registros vinculados ao usuario_id no schema atual
    const tables = ['gastos', 'receitas', 'assinaturas', 'dividas', 'metas_planejamento', 'carteira', 'lancamentos_investimentos', 'metas_financeiras'];

    const resetTransaction = db.transaction(() => {
      for (const table of tables) {
        db.prepare(`DELETE FROM ${table} WHERE usuario_id = ?`).run(req.usuarioId);
      }
    });

    resetTransaction();

    res.json({ message: 'Dados da conta zerados com sucesso.' });
  } catch (error) {
    console.error('Erro ao zerar conta:', error);
    res.status(500).json({ error: 'Ocorreu um erro ao zerar os dados da conta.' });
  }
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