import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import https from 'https';
import axios from 'axios';
import multer from 'multer';
import pg from 'pg'; 
import { fileURLToPath } from 'url';
import { runMigration } from '../maatcontabil_dbtools/migrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// --- LOGGER MIDDLEWARE ---
// Isso vai mostrar no terminal cada requisição recebida
app.use((req, res, next) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    if (Object.keys(req.body).length > 0) {
       // Opcional: Mostra corpo da requisição (cuidado com senhas em produção)
       // console.log('Body:', JSON.stringify(req.body).substring(0, 200) + '...'); 
    }
    next();
});

app.use(cors());
app.use(bodyParser.json());

const upload = multer({ dest: 'certs/' });

// --- ROTA 1: Setup do Banco de Dados ---
app.post('/api/setup-db', async (req, res) => {
    console.log('--- INICIANDO SETUP DB ---');
    const config = req.body;
    try {
        // Log manual para debug do usuário
        console.log(`Tentando conectar ao Host: ${config.host} / DB: ${config.dbName}`);
        
        await runMigration(config, pg.Client);
        
        console.log('Migração finalizada com sucesso.');
        res.json({ 
            success: true, 
            message: 'Banco configurado com sucesso!',
            logs: ['Conexão OK', `Database ${config.dbName} verificado`, 'Tabelas criadas com sucesso']
        });
    } catch (error) {
        console.error('ERRO SETUP DB:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message, 
            logs: [error.toString(), 'Verifique se as credenciais do Postgres estão corretas.'] 
        });
    }
});

// --- ROTA 2: Upload de Certificados Inter ---
app.post('/api/upload-cert', upload.fields([{ name: 'crt' }, { name: 'key' }]), (req, res) => {
    try {
        if (!fs.existsSync(path.join(__dirname, 'certs'))) {
            fs.mkdirSync(path.join(__dirname, 'certs'));
        }

        if (req.files['crt']) {
            const oldPath = req.files['crt'][0].path;
            const newPath = path.join(__dirname, 'certs', 'certificado.crt');
            fs.renameSync(oldPath, newPath);
            console.log('Certificado .crt salvo em:', newPath);
        }
        if (req.files['key']) {
            const oldPath = req.files['key'][0].path;
            const newPath = path.join(__dirname, 'certs', 'chave.key');
            fs.renameSync(oldPath, newPath);
            console.log('Chave .key salva em:', newPath);
        }
        res.json({ success: true, message: 'Certificados salvos no servidor.' });
    } catch (err) {
        console.error('Erro upload:', err);
        res.status(500).json({ success: false, message: 'Erro ao salvar arquivos.' });
    }
});

// --- ROTA 3: Teste de Conexão Inter (NOVA) ---
app.post('/api/test-inter', async (req, res) => {
    const { clientId, clientSecret } = req.body;
    const crtPath = path.join(__dirname, 'certs', 'certificado.crt');
    const keyPath = path.join(__dirname, 'certs', 'chave.key');

    if (!fs.existsSync(crtPath) || !fs.existsSync(keyPath)) {
        return res.status(400).json({ success: false, message: 'Certificados não encontrados no servidor. Faça o upload.' });
    }

    try {
        const agent = new https.Agent({
            cert: fs.readFileSync(crtPath),
            key: fs.readFileSync(keyPath)
        });

        console.log('Testando autenticação com Inter...');
        const INTER_URL = 'https://cdpj.partners.bancointer.com.br';
        
        // Tenta pegar o token apenas com escopo de leitura para teste
        const auth = await axios.post(`${INTER_URL}/oauth/v2/token`, 
            new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                scope: 'boleto-cobranca.read', // Escopo mínimo para teste
                grant_type: 'client_credentials'
            }), { httpsAgent: agent }
        );

        console.log('Autenticação de Teste: SUCESSO');
        res.json({ 
            success: true, 
            message: 'Conexão bem sucedida! Token gerado.',
            logs: ['Certificados Válidos', 'Token OAuth Obtido']
        });

    } catch (error) {
        console.error('Erro Teste Inter:', error.response?.data || error.message);
        res.status(400).json({ 
            success: false, 
            message: error.response?.data?.error_description || error.message,
            logs: [JSON.stringify(error.response?.data || {})]
        });
    }
});

// --- ROTA 4: Gerar PIX (Real) ---
app.post('/api/pix', async (req, res) => {
    const { clientId, clientSecret, pixKey, amount, protocol, requestData } = req.body;
    
    const crtPath = path.join(__dirname, 'certs', 'certificado.crt');
    const keyPath = path.join(__dirname, 'certs', 'chave.key');

    if (!fs.existsSync(crtPath) || !fs.existsSync(keyPath)) {
        return res.status(400).json({ error: 'Certificados não encontrados.' });
    }

    try {
        const agent = new https.Agent({
            cert: fs.readFileSync(crtPath),
            key: fs.readFileSync(keyPath)
        });

        const INTER_URL = 'https://cdpj.partners.bancointer.com.br';

        // 1. Auth - CORREÇÃO DE ESCOPO
        // O erro "No registered scope" significa que sua APP no Inter não tem permissão para o escopo pedido.
        // Tentaremos o escopo mais comum para V2 Híbrido. Se falhar, verifique no portal do desenvolvedor.
        console.log('Autenticando para gerar Pix...');
        
        const auth = await axios.post(`${INTER_URL}/oauth/v2/token`, 
            new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                // Trocando para o escopo padrão de boleto-cobranca que inclui Pix na V2
                scope: 'boleto-cobranca.read boleto-cobranca.write', 
                grant_type: 'client_credentials'
            }), { httpsAgent: agent }
        );
        
        const token = auth.data.access_token;

        // 2. Create Charge
        console.log('Gerando Cobrança Pix...');
        const cob = await axios.post(`${INTER_URL}/pix/v2/cob`, {
            calendario: { expiracao: 3600 },
            devedor: {
                cpf: requestData.cpf || '123.456.789-00', 
                nome: requestData.name || 'Cliente Maat'
            },
            valor: { original: amount.toFixed(2) },
            chave: pixKey,
            solicitacaoPagador: `Servico ${protocol}`
        }, {
            httpsAgent: agent,
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Pix gerado! TxId:', cob.data.txid);

        res.json({
            txid: cob.data.txid,
            pixCopiaECola: cob.data.pixCopiaECola
        });

    } catch (error) {
        console.error('ERRO API INTER:', error.response?.data || error.message);
        
        // Retorna detalhe do erro para o frontend
        const errorMsg = error.response?.data?.error_description || error.response?.data?.title || error.message;
        res.status(500).json({ 
            error: `Falha Inter: ${errorMsg}`, 
            details: error.response?.data 
        });
    }
});

app.post('/webhook/pix', (req, res) => {
    console.log('--- WEBHOOK RECEBIDO ---');
    console.log(JSON.stringify(req.body, null, 2));
    res.status(200).send('OK');
});

// Start
if (!fs.existsSync(path.join(__dirname, 'certs'))){
    fs.mkdirSync(path.join(__dirname, 'certs'));
}

app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`SERVIDOR MAAT CONTÁBIL RODANDO NA PORTA ${PORT}`);
    console.log(`Logs de requisições aparecerão abaixo:`);
    console.log(`=================================================`);
});