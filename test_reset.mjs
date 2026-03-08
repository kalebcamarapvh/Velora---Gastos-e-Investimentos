import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'finance.db');
const db = new Database(dbPath);

console.log('Testing Reset Data Transaction...');

try {
    const usuarioId = 1;

    const tables = ['gastos', 'receitas', 'assinaturas', 'dividas', 'metas_planejamento', 'carteira', 'lancamentos_investimentos', 'metas_financeiras'];

    // Check if tables exist
    for (const table of tables) {
        try {
            const result = db.prepare(`SELECT count(*) as c FROM ${table}`).get();
            console.log(`${table} exists, count:`, result.c);
        } catch (e) {
            console.log(`Table ${table} missing or error:`, e.message);
        }
    }

    const resetTransaction = db.transaction(() => {
        for (const table of tables) {
            console.log(`Executing DELETE FROM ${table}...`);
            db.prepare(`DELETE FROM ${table} WHERE usuario_id = ?`).run(usuarioId);
        }
    });

    resetTransaction();
    console.log('Transaction Success!');
} catch (error) {
    console.error('Transaction Failed:', error.message);
}
