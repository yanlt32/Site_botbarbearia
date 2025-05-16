const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do PostgreSQL usando a variável de ambiente fornecida pelo Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Render fornece isso automaticamente
  ssl: { rejectUnauthorized: false }, // Necessário para conexões no Render
});

// Testar conexão com o banco
pool.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao PostgreSQL:', err.message);
  } else {
    console.log('Conectado ao PostgreSQL com sucesso');
  }
});

// Criar tabela de agendamentos, se não existir
pool.query(`
  CREATE TABLE IF NOT EXISTS agendamentos (
    id SERIAL PRIMARY KEY,
    nome TEXT,
    telefone TEXT,
    servico TEXT,
    barbeiro TEXT,
    data TEXT,
    horario TEXT,
    observacoes TEXT,
    status TEXT DEFAULT 'Pendente'
  )
`, (err) => {
  if (err) {
    console.error('Erro ao criar tabela agendamentos:', err.message);
  } else {
    console.log('Tabela agendamentos criada ou já existente.');
  }
});

// Middleware
app.use(cors({
  origin: "https://corte-and-estilo.onrender.com",
  methods: ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});
app.use((err, req, res, next) => {
  console.error('Erro no servidor:', err.stack);
  res.status(500).json({ success: false, message: 'Erro interno do servidor' });
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', message: 'Server and database running' });
  } catch (err) {
    console.error('Erro no health check:', err.message);
    res.status(500).json({ status: 'error', message: 'Database unavailable' });
  }
});

// Rota de teste
app.get('/api/test', (req, res) => {
  console.log('Rota /api/test acessada');
  res.json({ success: true, message: 'API funcionando no Render!' });
});

// Rota de login
app.post('/api/login', (req, res) => {
  const { usuario, senha } = req.body;
  const ADMIN_USER = process.env.ADMIN_USER || 'admin';
  const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';
  console.log('Tentativa de login:', { usuario });
  if (usuario === ADMIN_USER && senha === ADMIN_PASS) {
    res.json({ success: true, token: 'dummy-token' });
  } else {
    res.status(401).json({ success: false, message: 'Credenciais inválidas' });
  }
});

// Salvar agendamento
app.post('/api/agendamentos', async (req, res) => {
  const { nome, telefone, servico, barbeiro, data, horario, observacoes } = req.body;
  console.log('Salvando agendamento:', { nome, telefone, servico, barbeiro, data, horario });
  try {
    const result = await pool.query(
      `INSERT INTO agendamentos (nome, telefone, servico, barbeiro, data, horario, observacoes, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [nome, telefone, servico, barbeiro, data, horario, observacoes || null, 'Pendente']
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Erro ao salvar agendamento:', err.message);
    res.status(500).json({ success: false, message: 'Erro ao salvar agendamento' });
  }
});

// Buscar agendamentos
app.get('/api/agendamentos', async (req, res) => {
  const { data } = req.query;
  let query = 'SELECT * FROM agendamentos';
  let params = [];
  if (data) {
    query += ' WHERE date(data) = $1';
    params.push(data);
  }
  console.log('Buscando agendamentos:', { data });
  try {
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Erro ao buscar agendamentos:', err.message);
    res.status(500).json({ success: false, message: 'Erro ao buscar agendamentos' });
  }
});

// Buscar por telefone
app.get('/api/agendamentos/telefone/:telefone', async (req, res) => {
  const telefone = req.params.telefone;
  console.log('Buscando agendamento por telefone:', telefone);
  try {
    const result = await pool.query(`SELECT * FROM agendamentos WHERE telefone = $1`, [telefone]);
    if (result.rows.length > 0) {
      res.json({ success: true, data: result.rows[0] });
    } else {
      res.json({ success: false, message: 'Agendamento não encontrado' });
    }
  } catch (err) {
    console.error('Erro ao buscar por telefone:', err.message);
    res.status(500).json({ success: false, message: 'Erro ao buscar agendamento' });
  }
});

// Confirmar agendamento
app.patch('/api/agendamentos/:id/confirmar', async (req, res) => {
  const id = req.params.id;
  console.log('Confirmando agendamento ID:', id);
  try {
    const result = await pool.query(`UPDATE agendamentos SET status = 'Confirmado' WHERE id = $1 RETURNING *`, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Agendamento não encontrado' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao confirmar agendamento:', err.message);
    res.status(404).json({ success: false, message: 'Erro ao confirmar agendamento' });
  }
});

// Deletar agendamento
app.delete('/api/agendamentos/:id', async (req, res) => {
  const id = req.params.id;
  console.log('Deletando agendamento ID:', id);
  try {
    const result = await pool.query(`DELETE FROM agendamentos WHERE id = $1 RETURNING *`, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Agendamento não encontrado' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao deletar agendamento:', err.message);
    res.status(404).json({ success: false, message: 'Erro ao deletar agendamento' });
  }
});

// Deletar por telefone
app.delete('/api/agendamentos/telefone/:telefone', async (req, res) => {
  const telefone = req.params.telefone;
  console.log('Deletando agendamento por telefone:', telefone);
  try {
    const result = await pool.query(`DELETE FROM agendamentos WHERE telefone = $1 RETURNING *`, [telefone]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Agendamento não encontrado' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao deletar por telefone:', err.message);
    res.status(404).json({ success: false, message: 'Erro ao deletar agendamento' });
  }
});

// Remarcar agendamento
app.patch('/api/agendamentos/:id/remarcar', async (req, res) => {
  const id = req.params.id;
  const { data, horario } = req.body;
  console.log('Remarcando agendamento ID:', id, { data, horario });
  try {
    const result = await pool.query(
      `UPDATE agendamentos SET data = $1, horario = $2 WHERE id = $3 RETURNING *`,
      [data, horario, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Agendamento não encontrado' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao remarcar agendamento:', err.message);
    res.status(404).json({ success: false, message: 'Erro ao remarcar agendamento' });
  }
});

// Rotas HTML
app.get('/', (req, res) => {
  console.log('Servindo index.html');
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});