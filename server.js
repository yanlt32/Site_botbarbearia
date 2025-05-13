const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Simulação de banco de dados
let agendamentos = [];

// Configuração do Nodemailer (Gmail)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'ladeiatortelli8@gmail.com', // Seu e-mail
        pass: 'kzgnposgzlwuharl' // Senha de app sem espaços
    }
});

// Rota para testar o envio de e-mail manualmente
app.get('/api/test-email', async (req, res) => {
    try {
        await transporter.sendMail({
            from: '"Corte & Estilo" <ladeiatortelli8@gmail.com>',
            to: 'ladeiatortelli8@gmail.com', // Substitua pelo e-mail do dono
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
    console.log('Recebido agendamento:', req.body); // Debug: verificar dados recebidos
    const agendamento = req.body;
    agendamento.id = agendamentos.length + 1;
    agendamentos.push(agendamento);

    // Formatar o conteúdo do e-mail
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
        // Enviar e-mail
        await transporter.sendMail({
            from: '"Corte & Estilo" <ladeiatortelli8@gmail.com>',
            to: 'ladeiatortelli8@gmail.com', // Substitua pelo e-mail do dono
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
    console.log('Buscando agendamentos para data:', data); // Debug
    const filtered = data ? agendamentos.filter(ag => ag.data === data) : agendamentos;
    res.json({ success: true, data: filtered });
});

// Iniciar o servidor
app.listen(3000, () => console.log('Servidor rodando na porta 3000'));