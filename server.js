const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve o index.html e outros arquivos estáticos

// Simulação de banco de dados (em memória)
let agendamentos = [];

// Configuração do Nodemailer (Gmail)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'ladeiatortelli8@gmail.com', // Seu e-mail
        pass: 'kzgnposgzlwuharl' // Senha de app do Gmail
    }
});

// Rota para testar o envio de e-mail
app.get('/api/test-email', async (req, res) => {
    try {
        await transporter.sendMail({
            from: '"Corte & Estilo" <ladeiatortelli8@gmail.com>',
            to: 'ladeiatortelli8@gmail.com',
            subject: 'Teste de Envio de E-mail',
            text: 'Este é um e-mail de teste do sistema Corte & Estilo.'
        });
        console.log('E-mail de teste enviado com sucesso');
        res.json({ success: true, message: 'E-mail de teste enviado' });
    } catch (error) {
        console.error('Erro ao enviar e-mail de teste:', error);
        res.json({ success: false, error: error.message });
    }
});

// Rota para salvar agendamento e enviar e-mail
app.post('/api/agendamentos', async (req, res) => {
    console.log('Recebido agendamento:', req.body);
    const agendamento = req.body;
    agendamento.id = agendamentos.length + 1;
    agendamentos.push(agendamento);

    const emailContent = `
    Novo Agendamento - Corte & Estilo
    Nome: ${agendamento.nome}
    Telefone: ${agendamento.telefone}
    Serviço: ${agendamento.servico}
    Barbeiro: ${agendamento.barbeiro}
    Data: ${new Date(agendamento.data).toLocaleDateString('pt-BR')}
    Horário: ${agendamento.horario}
    Observações: ${agendamento.observacoes || 'Nenhuma'}
    `.trim();

    try {
        await transporter.sendMail({
            from: '"Corte & Estilo" <ladeiatortelli8@gmail.com>',
            to: 'ladeiatortelli8@gmail.com',
            subject: 'Novo Agendamento Recebido',
            text: emailContent
        });
        console.log('E-mail enviado com sucesso para:', 'ladeiatortelli8@gmail.com');
    } catch (error) {
        console.error('Erro ao enviar e-mail:', error);
    }

    res.json({ success: true, data: agendamento });
});

// Rota para obter agendamentos
app.get('/api/agendamentos', (req, res) => {
    const { data } = req.query;
    console.log('Buscando agendamentos para data:', data);
    const filtered = data ? agendamentos.filter(ag => ag.data === data) : agendamentos;
    res.json({ success: true, data: filtered });
});

// Rota final para redirecionar qualquer acesso para o index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Porta dinâmica para Render ou local
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
