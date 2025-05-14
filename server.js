const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Inicializar banco de dados
const db = new sqlite3.Database('barbearia.db', (err) => {
  if (err) {
    console.error("Erro ao abrir banco:", err.message);
  } else {
    console.log("Banco de dados conectado/criado com sucesso.");
  }
});

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
  `);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve arquivos estáticos como .html, .css, .js

// Rota de teste
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'API funcionando no Render!' });
});

// Rota de login
app.post('/api/login', (req, res) => {
  const { usuario, senha } = req.body;
  if (usuario === 'admin' && senha === 'admin123') {
    res.json({ success: true, token: 'dummy-token' });
  } else {
    res.status(401).json({ success: false, message: 'Credenciais inválidas' });
  }
});

// Salvar agendamento
app.post('/api/agendamentos', (req, res) => {
  const { nome, telefone, servico, barbeiro, data, horario, observacoes } = req.body;
  db.run(
    `INSERT INTO agendamentos (nome, telefone, servico, barbeiro, data, horario, observacoes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [nome, telefone, servico, barbeiro, data, horario, observacoes || null, 'Pendente'],
    function (err) {
      if (err) return res.status(500).json({ success: false, message: 'Erro ao salvar' });
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
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Erro ao buscar' });
    res.json({ success: true, data: rows });
  });
});

// Buscar por telefone
app.get('/api/agendamentos/telefone/:telefone', (req, res) => {
  const telefone = req.params.telefone;
  db.get(`SELECT * FROM agendamentos WHERE telefone = ?`, [telefone], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: 'Erro ao buscar' });
    if (row) res.json({ success: true, data: row });
    else res.json({ success: false, message: 'Agendamento não encontrado' });
  });
});

// Confirmar agendamento
app.patch('/api/agendamentos/:id/confirmar', (req, res) => {
  const id = req.params.id;
  db.run(`UPDATE agendamentos SET status = 'Confirmado' WHERE id = ?`, [id], function (err) {
    if (err || this.changes === 0) return res.status(404).json({ success: false, message: 'Agendamento não encontrado' });
    res.json({ success: true });
  });
});

// Deletar agendamento
app.delete('/api/agendamentos/:id', (req, res) => {
  const id = req.params.id;
  db.run(`DELETE FROM agendamentos WHERE id = ?`, [id], function (err) {
    if (err || this.changes === 0) return res.status(404).json({ success: false, message: 'Agendamento não encontrado' });
    res.json({ success: true });
  });
});

// Deletar por telefone
app.delete('/api/agendamentos/telefone/:telefone', (req, res) => {
  const telefone = req.params.telefone;
  db.run(`DELETE FROM agendamentos WHERE telefone = ?`, [telefone], function (err) {
    if (err || this.changes === 0) return res.status(404).json({ success: false, message: 'Agendamento não encontrado' });
    res.json({ success: true });
  });
});

// Remarcar agendamento
app.patch('/api/agendamentos/:id/remarcar', (req, res) => {
  const id = req.params.id;
  const { data, horario } = req.body;
  db.run(
    `UPDATE agendamentos SET data = ?, horario = ? WHERE id = ?`,
    [data, horario, id],
    function (err) {
      if (err || this.changes === 0) return res.status(404).json({ success: false, message: 'Agendamento não encontrado' });
      res.json({ success: true });
    }
  );
});

// Rotas HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
