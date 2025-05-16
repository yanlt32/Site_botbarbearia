const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Caminho para o banco de dados SQLite no disco persistente do Render
const DB_DIR = '/opt/render/project/src/data';
const DB_PATH = path.join(DB_DIR, 'barbearia.db');

// Criar diretório do banco de dados se não existir
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
  console.log('Diretório de banco de dados criado:', DB_DIR);
}

// Inicializar banco de dados
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Erro ao abrir banco:', err.message);
  } else {
    console.log('Banco de dados conectado/criado com sucesso em', DB_PATH);
  }
});

// Criar tabela de agendamentos, se não existir
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS agendamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
app.get('/health', (req, res) => {
  db.get('SELECT 1', (err) => {
    if (err) {
      console.error('Erro no health check:', err.message);
      return res.status(500).json({ status: 'error', message: 'Database unavailable' });
    }
    res.json({ status: 'ok', message: 'Server and database running' });
  });
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
app.post('/api/agendamentos', (req, res) => {
  const { nome, telefone, servico, barbeiro, data, horario, observacoes } = req.body;
  console.log('Salvando agendamento:', { nome, telefone, servico, barbeiro, data, horario });
  db.run(
    `INSERT INTO agendamentos (nome, telefone, servico, barbeiro, data, horario, observacoes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [nome, telefone, servico, barbeiro, data, horario, observacoes || null, 'Pendente'],
    function (err) {
      if (err) {
        console.error('Erro ao salvar agendamento:', err.message);
        return res.status(500).json({ success: false, message: 'Erro ao salvar agendamento' });
      }
      res.json({ success: true, data: { id: this.lastID, ...req.body, status: 'Pendente' } });
    }
  );
});

// Buscar agendamentos
app.get('/api/agendamentos', (req, res) => {
  const { data } = req.query;
  let query = 'SELECT * FROM agendamentos';
  let params = [];
  if (data) {
    query += ' WHERE date(data) = ?';
    params.push(data);
  }
  console.log('Buscando agendamentos:', { data });
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Erro ao buscar agendamentos:', err.message);
      return res.status(500).json({ success: false, message: 'Erro ao buscar agendamentos' });
    }
    res.json({ success: true, data: rows });
  });
});

// Buscar por telefone
app.get('/api/agendamentos/telefone/:telefone', (req, res) => {
  const telefone = req.params.telefone;
  console.log('Buscando agendamento por telefone:', telefone);
  db.get(`SELECT * FROM agendamentos WHERE telefone = ?`, [telefone], (err, row) => {
    if (err) {
      console.error('Erro ao buscar por telefone:', err.message);
      return res.status(500).json({ success: false, message: 'Erro ao buscar agendamento' });
    }
    if (row) {
      res.json({ success: true, data: row });
    } else {
      res.json({ success: false, message: 'Agendamento não encontrado' });
    }
  });
});

// Confirmar agendamento
app.patch('/api/agendamentos/:id/confirmar', (req, res) => {
  const id = req.params.id;
  console.log('Confirmando agendamento ID:', id);
  db.run(`UPDATE agendamentos SET status = 'Confirmado' WHERE id = ?`, [id], function (err) {
    if (err || this.changes === 0) {
      console.error('Erro ao confirmar agendamento:', err ? err.message : 'ID não encontrado');
      return res.status(404).json({ success: false, message: 'Agendamento não encontrado' });
    }
    res.json({ success: true });
  });
});

// Deletar agendamento
app.delete('/api/agendamentos/:id', (req, res) => {
  const id = req.params.id;
  console.log('Deletando agendamento ID:', id);
  db.run(`DELETE FROM agendamentos WHERE id = ?`, [id], function (err) {
    if (err || this.changes === 0) {
      console.error('Erro ao deletar agendamento:', err ? err.message : 'ID não encontrado');
      return res.status(404).json({ success: false, message: 'Agendamento não encontrado' });
    }
    res.json({ success: true });
  });
});

// Deletar por telefone
app.delete('/api/agendamentos/telefone/:telefone', (req, res) => {
  const telefone = req.params.telefone;
  console.log('Deletando agendamento por telefone:', telefone);
  db.run(`DELETE FROM agendamentos WHERE telefone = ?`, [telefone], function (err) {
    if (err || this.changes === 0) {
      console.error('Erro ao deletar por telefone:', err ? err.message : 'Telefone não encontrado');
      return res.status(404).json({ success: false, message: 'Agendamento não encontrado' });
    }
    res.json({ success: true });
  });
});

// Remarcar agendamento
app.patch('/api/agendamentos/:id/remarcar', (req, res) => {
  const id = req.params.id;
  const { data, horario } = req.body;
  console.log('Remarcando agendamento ID:', id, { data, horario });
  db.run(
    `UPDATE agendamentos SET data = ?, horario = ? WHERE id = ?`,
    [data, horario, id],
    function (err) {
      if (err || this.changes === 0) {
        console.error('Erro ao remarcar agendamento:', err ? err.message : 'ID não encontrado');
        return res.status(404).json({ success: false, message: 'Agendamento não encontrado' });
      }
      res.json({ success: true });
    }
  );
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