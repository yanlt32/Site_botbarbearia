const express = require('express');
const sgMail = require('@sendgrid/mail'); // Using SendGrid instead of Nodemailer
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve index.html and other static files

// Simulação de banco de dados (em memória)
let agendamentos = [];

// Configuração do SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Rota para testar o envio de e-mail
app.get('/api/test-email', async (req, res) => {
    const msg = {
        to: process.env.EMAIL_USER || 'ladeiatortelli8@gmail.com',
        from: process.env.EMAIL_USER || 'ladeiatortelli8@gmail.com',
        subject: 'Teste de Envio de E-mail',
        text: 'Este é um e-mail de teste do sistema Corte & Estilo.'
    };

    try {
        await sgMail.send(msg);
        console.log('E-mail de teste enviado com sucesso');
        res.json({ success: true, message: 'E-mail de teste enviado' });
    } catch (error) {
        console.error('Erro ao enviar e-mail de teste:', error);
        res.status(500).json({ success: false, error: error.message });
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

    const msg = {
        to: process.env.EMAIL_USER || 'ladeiatortelli8@gmail.com',
        from: process.env.EMAIL_USER || 'ladeiatortelli8@gmail.com',
        subject: 'Novo Agendamento Recebido',
        text: emailContent
    };

    try {
        await sgMail.send(msg);
        console.log('E-mail enviado com sucesso para:', msg.to);
        res.json({ success: true, data: agendamento });
    } catch (error) {
        console.error('Erro ao enviar e-mail:', error);
        res.status(500).json({ success: true, data: agendamento, emailError: error.message });
    }
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