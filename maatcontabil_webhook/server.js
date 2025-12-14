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

const { Client, Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DB_CONFIG_FILE = path.join(__dirname, 'db-config.json');

// --- CONFIGURAÇÃO ---
app.use(cors());
app.use(bodyParser.json());

// --- LOGGER DE REQUISIÇÕES ---
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

const upload = multer({ dest: 'certs/' });
let dbPool = null; // Pool de conexão global

// --- FUNÇÃO PARA INICIAR CONEXÃO ---
const initDbConnection = (config) => {
    try {
        console.log('Tentando conectar ao pool de banco de dados...');
        dbPool = new Pool({
            user: config.user, 
            host: config.host, 
            database: config.dbName, 
            password: config.pass, 
            port: config.port
        });
        
        // Teste simples de conexão silencioso
        dbPool.query('SELECT NOW()', (err, res) => {
            if (err) {
                console.error('ERRO AO CONECTAR AO BANCO AUTOMATICAMENTE:', err.message);
                dbPool = null;
            } else {
                console.log(`✅ Banco de Dados conectado: ${config.dbName} em ${config.host}`);
            }
        });
    } catch (e) {
        console.error('Erro fatal ao criar pool:', e);
    }
};

// --- CARREGAR CONFIG AO INICIAR ---
if (fs.existsSync(DB_CONFIG_FILE)) {
    try {
        const savedConfig = JSON.parse(fs.readFileSync(DB_CONFIG_FILE, 'utf8'));
        initDbConnection(savedConfig);
    } catch (e) {
        console.error('Erro ao ler arquivo de configuração salvo:', e);
    }
}

// --- SCHEMA SQL ---
const SQL_SCHEMA = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(20) UNIQUE NOT NULL,
    address TEXT,
    contact VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    company_id UUID REFERENCES companies(id),
    photo_url TEXT
);

CREATE TABLE IF NOT EXISTS service_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    protocol VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50),
    payment_status VARCHAR(50),
    price DECIMAL(10, 2) DEFAULT 0,
    client_id UUID REFERENCES users(id),
    company_id UUID REFERENCES companies(id),
    txid VARCHAR(255),
    pix_code TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

// --- ROTA 1: SETUP DO BANCO (CRIAÇÃO REAL) ---
app.post('/api/setup-db', async (req, res) => {
    const config = req.body;
    let logs = [];
    const log = (msg) => { console.log(msg); logs.push(msg); };

    log(`Iniciando Setup do Banco: ${config.dbName} em ${config.host}`);

    try {
        // 1. Conectar ao 'postgres' para criar o DB se não existir
        const rootClient = new Client({
            user: config.user, host: config.host, database: 'postgres', password: config.pass, port: config.port
        });
        
        await rootClient.connect();
        log('Conectado ao Postgres Root.');
        
        const checkDb = await rootClient.query(`SELECT 1 FROM pg_database WHERE datname = '${config.dbName}'`);
        if (checkDb.rowCount === 0) {
            log(`Banco ${config.dbName} não existe. Criando...`);
            await rootClient.query(`CREATE DATABASE "${config.dbName}"`);
            log('Banco criado.');
        } else {
            log('Banco já existe.');
        }
        await rootClient.end();

        // 2. Conectar ao Novo Banco para criar tabelas
        const dbClient = new Client({
            user: config.user, host: config.host, database: config.dbName, password: config.pass, port: config.port
        });
        await dbClient.connect();
        log('Conectado ao Banco da Aplicação. Criando tabelas...');
        
        await dbClient.query(SQL_SCHEMA);
        log('Tabelas criadas com sucesso.');

        // 3. SEED
        const userCheck = await dbClient.query('SELECT count(*) FROM users');
        if (userCheck.rows[0].count === '0') {
            log('Inserindo dados iniciais (Seed)...');
            
            const compRes = await dbClient.query(`
                INSERT INTO companies (name, cnpj, address, contact) 
                VALUES ('Empresa Demo LTDA', '00.000.000/0001-00', 'Rua Exemplo, 100', '1199999999') 
                RETURNING id
            `);
            const compId = compRes.rows[0].id;

            await dbClient.query(`
                INSERT INTO users (name, email, password, role) 
                VALUES ('Administrador Maat', 'admin@maat.com', 'admin', 'admin')
            `);

            await dbClient.query(`
                INSERT INTO users (name, email, password, role, company_id) 
                VALUES ('Cliente Exemplo', 'cliente@demo.com', '123', 'client', '${compId}')
            `);
            log('Usuários Admin e Cliente criados.');
        }

        await dbClient.end();

        // 4. Salvar Config e Iniciar Pool
        fs.writeFileSync(DB_CONFIG_FILE, JSON.stringify(config, null, 2));
        log('Configuração salva em db-config.json');
        
        initDbConnection(config);

        res.json({ success: true, logs });

    } catch (e) {
        log(`ERRO FATAL: ${e.message}`);
        console.error(e);
        res.status(500).json({ success: false, message: e.message, logs });
    }
});

// --- ROTA 2: LOGIN REAL (DB) ---
app.post('/api/login', async (req, res) => {
    console.log('--- TENTATIVA DE LOGIN ---');
    const { email, password } = req.body;
    console.log(`Email recebido: ${email}`);
    
    // Verificação detalhada do Pool
    if (!dbPool) {
        console.error('ERRO CRÍTICO: dbPool é null. O servidor não está conectado ao banco.');
        return res.status(500).json({ 
            success: false, 
            message: 'O servidor backend não está conectado ao banco de dados. Rode o Setup novamente ou verifique os logs do servidor.' 
        });
    }

    try {
        console.log('Executando query no banco...');
        // Query simples sem hash por enquanto, conforme solicitado
        const result = await dbPool.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);
        
        if (result.rows.length > 0) {
            const user = result.rows[0];
            console.log(`Login SUCESSO para: ${user.name} (${user.role})`);
            delete user.password; 
            res.json({ success: true, user });
        } else {
            console.warn('Login FALHOU: Credenciais inválidas');
            res.status(401).json({ success: false, message: 'Usuário ou senha incorretos.' });
        }
    } catch (e) {
        console.error('ERRO SQL durante login:', e);
        res.status(500).json({ success: false, message: `Erro interno no banco: ${e.message}` });
    }
});

// --- ROTA 3: TESTE INTER (APENAS PIX) ---
app.post('/api/test-inter', async (req, res) => {
    const { clientId, clientSecret } = req.body;
    
    console.log('--- TESTE CONEXÃO INTER (PIX) ---');
    const crtPath = path.join(__dirname, 'certs', 'certificado.crt');
    const keyPath = path.join(__dirname, 'certs', 'chave.key');

    if (!fs.existsSync(crtPath) || !fs.existsSync(keyPath)) {
        return res.status(400).json({ success: false, message: 'Certificados .crt e .key não encontrados na pasta certs/.' });
    }

    try {
        const agent = new https.Agent({
            cert: fs.readFileSync(crtPath),
            key: fs.readFileSync(keyPath)
        });

        // ESCOPO PIX
        const scope = 'pix.read'; 
        
        console.log(`Tentando obter token com scope: '${scope}'...`);

        const auth = await axios.post('https://cdpj.partners.bancointer.com.br/oauth/v2/token', 
            new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                scope: scope,
                grant_type: 'client_credentials'
            }), 
            { httpsAgent: agent }
        );

        console.log('Sucesso! Token PIX obtido.');
        res.json({ success: true, message: 'Conexão PIX Estabelecida com Sucesso!', logs: ['Token OAuth V2 (Pix Read) Gerado'] });

    } catch (error) {
        const responseData = error.response?.data;
        console.error('ERRO INTER:', JSON.stringify(responseData, null, 2));
        
        let msg = responseData?.error_description || error.message;
        if (msg.includes('scope')) msg = "ERRO DE PERMISSÃO: Verifique se sua aplicação Inter tem o escopo 'Pix' ativado.";
        
        res.status(400).json({ success: false, message: msg, logs: [JSON.stringify(responseData)] });
    }
});

// --- ROTA 4: GERAR PIX (REAL) ---
app.post('/api/pix', async (req, res) => {
    const { clientId, clientSecret, pixKey, amount, protocol, requestData } = req.body;
    
    const crtPath = path.join(__dirname, 'certs', 'certificado.crt');
    const keyPath = path.join(__dirname, 'certs', 'chave.key');

    if (!fs.existsSync(crtPath) || !fs.existsSync(keyPath)) return res.status(400).json({ error: 'Certificados não encontrados.' });

    try {
        const agent = new https.Agent({ cert: fs.readFileSync(crtPath), key: fs.readFileSync(keyPath) });
        const INTER_URL = 'https://cdpj.partners.bancointer.com.br';

        console.log('Gerando Token Pix Write...');
        const auth = await axios.post(`${INTER_URL}/oauth/v2/token`, 
            new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                scope: 'pix.write',
                grant_type: 'client_credentials'
            }), { httpsAgent: agent }
        );
        
        console.log('Gerando Cobrança...');
        const cob = await axios.post(`${INTER_URL}/pix/v2/cob`, {
            calendario: { expiracao: 3600 },
            devedor: { cpf: requestData.cpf || '123.456.789-00', nome: requestData.name || 'Cliente Maat' },
            valor: { original: amount.toFixed(2) },
            chave: pixKey,
            solicitacaoPagador: `Servico ${protocol}`
        }, {
            httpsAgent: agent,
            headers: { Authorization: `Bearer ${auth.data.access_token}` }
        });

        console.log('Pix gerado! TxId:', cob.data.txid);
        res.json({ txid: cob.data.txid, pixCopiaECola: cob.data.pixCopiaECola });

    } catch (error) {
        console.error('ERRO PIX:', error.response?.data || error.message);
        res.status(500).json({ error: 'Falha Inter', details: error.response?.data });
    }
});

// --- ROTA 5: UPLOAD ---
app.post('/api/upload-cert', upload.fields([{ name: 'crt' }, { name: 'key' }]), (req, res) => {
    if (!fs.existsSync(path.join(__dirname, 'certs'))) fs.mkdirSync(path.join(__dirname, 'certs'));
    if (req.files['crt']) fs.renameSync(req.files['crt'][0].path, path.join(__dirname, 'certs', 'certificado.crt'));
    if (req.files['key']) fs.renameSync(req.files['key'][0].path, path.join(__dirname, 'certs', 'chave.key'));
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`SERVIDOR RODANDO NA PORTA ${PORT}`);
    if (!dbPool && !fs.existsSync(DB_CONFIG_FILE)) {
        console.log(`AVISO: Banco de dados ainda não configurado.`);
        console.log(`Acesse o Frontend e rode o Setup de Banco.`);
    } else {
        console.log(`Aguardando conexões...`);
    }
    console.log(`=========================================`);
});