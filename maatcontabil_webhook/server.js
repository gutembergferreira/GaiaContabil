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

app.use(cors());
app.use(bodyParser.json());

const SQL_SCHEMA = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS companies ( 
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
    name VARCHAR(255) NOT NULL, 
    cnpj VARCHAR(20) UNIQUE NOT NULL, 
    address TEXT, 
    contact_info VARCHAR(100), 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
);

CREATE TABLE IF NOT EXISTS users ( 
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
    full_name VARCHAR(255) NOT NULL, 
    email VARCHAR(255) UNIQUE NOT NULL, 
    password_hash VARCHAR(255) NOT NULL, 
    role VARCHAR(20) NOT NULL, 
    company_id UUID REFERENCES companies(id), 
    cpf VARCHAR(14), 
    phone VARCHAR(50), 
    photo_url TEXT, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    last_login TIMESTAMP 
);

CREATE TABLE IF NOT EXISTS work_sites ( 
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
    company_id UUID REFERENCES companies(id), 
    name VARCHAR(100) NOT NULL, 
    description TEXT, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
);

CREATE TABLE IF NOT EXISTS employees ( 
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
    company_id UUID REFERENCES companies(id), 
    work_site_id UUID REFERENCES work_sites(id), 
    name VARCHAR(255) NOT NULL, 
    role VARCHAR(100) NOT NULL, 
    admission_date DATE NOT NULL, 
    status VARCHAR(20) DEFAULT 'Ativo', 
    salary DECIMAL(12, 2) NOT NULL, 
    cpf VARCHAR(14) NOT NULL, 
    rg VARCHAR(20), 
    pis VARCHAR(20), 
    email VARCHAR(255), 
    phone VARCHAR(50), 
    vacation_due DATE, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
);

CREATE TABLE IF NOT EXISTS hr_admissions ( 
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
    company_id UUID REFERENCES companies(id), 
    client_id UUID REFERENCES users(id), 
    status VARCHAR(30) DEFAULT 'Novo', 
    full_name VARCHAR(255) NOT NULL, 
    cpf VARCHAR(14) NOT NULL, 
    rg VARCHAR(20), 
    birth_date DATE, 
    gender VARCHAR(20), 
    marital_status VARCHAR(20), 
    role VARCHAR(100), 
    salary DECIMAL(12, 2), 
    work_site_id UUID REFERENCES work_sites(id), 
    expected_start_date DATE, 
    pis VARCHAR(20), 
    titulo_eleitor VARCHAR(20), 
    ctps VARCHAR(20), 
    address TEXT, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
);

CREATE TABLE IF NOT EXISTS hr_requests ( 
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
    employee_id UUID REFERENCES employees(id), 
    company_id UUID REFERENCES companies(id), 
    client_id UUID REFERENCES users(id), 
    type VARCHAR(20) NOT NULL, 
    status VARCHAR(30) DEFAULT 'Solicitado', 
    details JSONB, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
);

CREATE TABLE IF NOT EXISTS hr_field_feedback ( 
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
    target_id UUID NOT NULL, 
    field_name VARCHAR(100) NOT NULL, 
    message TEXT NOT NULL, 
    resolved BOOLEAN DEFAULT FALSE, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
);

CREATE TABLE IF NOT EXISTS request_types ( 
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
    name VARCHAR(100) NOT NULL, 
    base_price DECIMAL(10, 2) DEFAULT 0.00, 
    active BOOLEAN DEFAULT TRUE 
);

CREATE TABLE IF NOT EXISTS document_categories ( 
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
    name VARCHAR(100) UNIQUE NOT NULL, 
    active BOOLEAN DEFAULT TRUE 
);

CREATE TABLE IF NOT EXISTS service_requests ( 
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
    protocol VARCHAR(50) UNIQUE NOT NULL, 
    title VARCHAR(255) NOT NULL, 
    description TEXT, 
    request_type_id UUID REFERENCES request_types(id), 
    price DECIMAL(10, 2), 
    status VARCHAR(50), 
    payment_status VARCHAR(50) DEFAULT 'N/A', 
    txid VARCHAR(255), 
    pix_code TEXT, 
    pix_expiration TIMESTAMP, 
    client_id UUID REFERENCES users(id), 
    company_id UUID REFERENCES companies(id), 
    deleted_at TIMESTAMP, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
);

CREATE TABLE IF NOT EXISTS documents ( 
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
    title VARCHAR(255) NOT NULL, 
    category VARCHAR(100), 
    reference_date DATE, 
    file_url TEXT NOT NULL, 
    status VARCHAR(50) DEFAULT 'Enviado', 
    payment_status VARCHAR(50) DEFAULT 'N/A', 
    amount DECIMAL(10, 2), 
    competence VARCHAR(20), 
    company_id UUID REFERENCES companies(id), 
    request_id UUID REFERENCES service_requests(id), 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
);

CREATE TABLE IF NOT EXISTS request_attachments ( 
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
    entity_type VARCHAR(50), 
    entity_id UUID NOT NULL, 
    file_name VARCHAR(255) NOT NULL, 
    file_url TEXT NOT NULL, 
    uploaded_by UUID REFERENCES users(id), 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
);

CREATE TABLE IF NOT EXISTS chat_messages ( 
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
    entity_type VARCHAR(20), 
    entity_id UUID NOT NULL, 
    sender_id UUID REFERENCES users(id), 
    sender_name VARCHAR(255), 
    role VARCHAR(20), 
    message TEXT NOT NULL, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
);

CREATE TABLE IF NOT EXISTS notifications ( 
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
    user_id UUID REFERENCES users(id), 
    title VARCHAR(255) NOT NULL, 
    message TEXT, 
    is_read BOOLEAN DEFAULT FALSE, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
);
`;

const upload = multer({ dest: 'certs/' });
let dbPool = null;

const initDbConnection = (config) => {
    try {
        dbPool = new Pool({
            user: config.user, host: config.host, database: config.dbName, password: config.pass, port: config.port
        });
        dbPool.query('SELECT NOW()', (err) => {
            if (err) console.error('ERRO DB:', err.message);
            else console.log(`✅ Conectado ao banco: ${config.dbName}`);
        });
    } catch (e) { console.error('Pool Error:', e); }
};

if (fs.existsSync(DB_CONFIG_FILE)) {
    try { initDbConnection(JSON.parse(fs.readFileSync(DB_CONFIG_FILE, 'utf8'))); } catch (e) {}
}

app.post('/api/setup-db', async (req, res) => {
    const config = req.body;
    let logs = [];
    const log = (m) => { console.log(m); logs.push(m); };
    try {
        const rootClient = new Client({ user: config.user, host: config.host, database: 'postgres', password: config.pass, port: config.port });
        await rootClient.connect();
        const check = await rootClient.query(`SELECT 1 FROM pg_database WHERE datname = '${config.dbName}'`);
        if (check.rowCount === 0) { await rootClient.query(`CREATE DATABASE "${config.dbName}"`); log(`Banco ${config.dbName} criado.`); }
        await rootClient.end();
        const dbClient = new Client({ user: config.user, host: config.host, database: config.dbName, password: config.pass, port: config.port });
        await dbClient.connect();
        await dbClient.query(SQL_SCHEMA);
        log('Tabelas criadas/atualizadas.');
        const userCount = await dbClient.query('SELECT count(*) FROM users');
        if (userCount.rows[0].count === '0') {
            log('Populando dados iniciais...');
            const compRes = await dbClient.query(`INSERT INTO companies (name, cnpj, address, contact_info) VALUES ('Empresa Demo LTDA', '00.000.000/0001-00', 'Rua Demo, 100', '1199999999') RETURNING id`);
            const compId = compRes.rows[0].id;
            await dbClient.query(`INSERT INTO users (full_name, email, password_hash, role, cpf) VALUES ('Carlos Admin', 'admin@maat.com', 'admin', 'admin', '00000000000')`);
            await dbClient.query(`INSERT INTO users (full_name, email, password_hash, role, company_id, cpf) VALUES ('Ana Cliente', 'cliente@demo.com', '123', 'client', '${compId}', '00654321090')`);
            await dbClient.query(`INSERT INTO request_types (name, base_price) VALUES ('2ª Via de Boleto', 0), ('Alteração Contratual', 150.00), ('Certidão Negativa', 50.00)`);
            await dbClient.query(`INSERT INTO document_categories (name) VALUES ('Boletos'), ('Impostos'), ('Folha de Pagamento'), ('Contratos'), ('Documentos Solicitados')`);
            log('Dados iniciais inseridos.');
        }
        await dbClient.end();
        fs.writeFileSync(DB_CONFIG_FILE, JSON.stringify(config, null, 2));
        initDbConnection(config);
        res.json({ success: true, logs });
    } catch (e) { res.status(500).json({ success: false, message: e.message, logs }); }
});

app.get('/api/status', (req, res) => res.json({ configured: !!dbPool }));

async function safeQuery(query, params = []) {
    if (!dbPool) return { rows: [] };
    try {
        return await dbPool.query(query, params);
    } catch (e) {
        console.warn(`SafeQuery Warning: ${e.message}`);
        return { rows: [] };
    }
}

app.get('/api/sync', async (req, res) => {
    if (!dbPool) return res.status(500).json({ error: 'DB not connected' });
    try {
        const companies = await safeQuery('SELECT id, name, cnpj, address, contact_info as contact FROM companies');
        const users = await safeQuery('SELECT id, full_name as name, email, password_hash as password, role, company_id as "companyId", cpf, photo_url as "photoUrl" FROM users');
        const reqTypes = await safeQuery('SELECT id, name, base_price as price FROM request_types');
        const docCats = await safeQuery('SELECT name FROM document_categories WHERE active = true');
        const requests = await safeQuery('SELECT sr.*, rt.name as type FROM service_requests sr LEFT JOIN request_types rt ON sr.request_type_id = rt.id');
        const attachments = await safeQuery('SELECT id, entity_type as "entityType", entity_id as "entityId", file_name as name, file_url as url, uploaded_by as "uploadedBy", created_at as "createdAt" FROM request_attachments');
        const documents = await safeQuery('SELECT * FROM documents');
        const chat = await safeQuery('SELECT entity_id as "entityId", sender_name as sender, role, message as text, created_at as timestamp FROM chat_messages');
        const notifs = await safeQuery('SELECT id, user_id as "userId", title, message, is_read as read, created_at as timestamp FROM notifications');
        
        const workSites = await safeQuery('SELECT id, company_id as "companyId", name, description FROM work_sites');
        const employees = await safeQuery('SELECT id, company_id as "companyId", work_site_id as "workSiteId", name, role, admission_date as "admissionDate", status, salary, cpf, rg, pis, email, phone, vacation_due as "vacationDue" FROM employees');
        const hrAdmissions = await safeQuery('SELECT id, company_id as "companyId", client_id as "clientId", status, full_name as "fullName", cpf, rg, birth_date as "birthDate", gender, marital_status as "maritalStatus", role, salary, work_site_id as "workSiteId", expected_start_date as "expectedStartDate", pis, titulo_eleitor as "tituloEleitor", ctps, address, created_at as "createdAt", updated_at as "updatedAt" FROM hr_admissions');
        const hrRequests = await safeQuery('SELECT id, employee_id as "employeeId", company_id as "companyId", client_id as "clientId", type, status, details, created_at as "createdAt", updated_at as "updatedAt" FROM hr_requests');
        const fieldFeedback = await safeQuery('SELECT id, target_id as "targetId", field_name as "fieldName", message, resolved FROM hr_field_feedback');

        res.json({
            companies: companies.rows,
            users: users.rows,
            requestTypes: reqTypes.rows,
            categories: docCats.rows.map(r => r.name),
            requests: requests.rows,
            attachments: attachments.rows,
            documents: documents.rows,
            chat: chat.rows,
            notifications: notifs.rows,
            workSites: workSites.rows,
            employees: employees.rows,
            hrAdmissions: hrAdmissions.rows,
            hrRequests: hrRequests.rows,
            fieldFeedback: fieldFeedback.rows
        });
    } catch (e) { 
        console.error("Sync Error:", e);
        res.status(500).json({ error: e.message }); 
    }
});

app.post('/api/hr/admission', async (req, res) => {
    if (!dbPool) return res.status(500).json({ error: 'DB not connected' });
    const { id, companyId, clientId, status, fullName, cpf, rg, birthDate, gender, maritalStatus, role, salary, workSiteId, expectedStartDate, pis, tituloEleitor, ctps, address } = req.body;
    try {
        const query = `
            INSERT INTO hr_admissions (id, company_id, client_id, status, full_name, cpf, rg, birth_date, gender, marital_status, role, salary, work_site_id, expected_start_date, pis, titulo_eleitor, ctps, address)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status, full_name = EXCLUDED.full_name, cpf = EXCLUDED.cpf, rg = EXCLUDED.rg, birth_date = EXCLUDED.birth_date, gender = EXCLUDED.gender, marital_status = EXCLUDED.marital_status, role = EXCLUDED.role, salary = EXCLUDED.salary, work_site_id = EXCLUDED.work_site_id, expected_start_date = EXCLUDED.expected_start_date, pis = EXCLUDED.pis, titulo_eleitor = EXCLUDED.titulo_eleitor, ctps = EXCLUDED.ctps, address = EXCLUDED.address, updated_at = CURRENT_TIMESTAMP
        `;
        await dbPool.query(query, [id, companyId, clientId, status, fullName, cpf, rg, birthDate, gender, maritalStatus, role, salary, workSiteId, expectedStartDate, pis, tituloEleitor, ctps, address]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/hr/request', async (req, res) => {
    if (!dbPool) return res.status(500).json({ error: 'DB not connected' });
    const { id, employeeId, companyId, clientId, type, status, details } = req.body;
    try {
        const query = `
            INSERT INTO hr_requests (id, employee_id, company_id, client_id, type, status, details)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, details = EXCLUDED.details, updated_at = CURRENT_TIMESTAMP
        `;
        await dbPool.query(query, [id, employeeId, companyId, clientId, type, status, details]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/hr/feedback', async (req, res) => {
    if (!dbPool) return res.status(500).json({ error: 'DB not connected' });
    const { id, targetId, fieldName, message, resolved } = req.body;
    try {
        const query = `
            INSERT INTO hr_field_feedback (id, target_id, field_name, message, resolved)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (id) DO UPDATE SET resolved = EXCLUDED.resolved
        `;
        await dbPool.query(query, [id, targetId, fieldName, message, resolved]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/hr/worksite', async (req, res) => {
    if (!dbPool) return res.status(500).json({ error: 'DB not connected' });
    const { id, companyId, name, description } = req.body;
    try {
        await dbPool.query('INSERT INTO work_sites (id, company_id, name, description) VALUES ($1, $2, $3, $4)', [id, companyId, name, description]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/hr/employee', async (req, res) => {
    if (!dbPool) return res.status(500).json({ error: 'DB not connected' });
    const { id, companyId, workSiteId, name, role, admissionDate, status, salary, cpf, rg, pis, email, phone, vacationDue } = req.body;
    try {
        const query = `
            INSERT INTO employees (id, company_id, work_site_id, name, role, admission_date, status, salary, cpf, rg, pis, email, phone, vacation_due)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (id) DO UPDATE SET work_site_id = EXCLUDED.work_site_id, status = EXCLUDED.status, salary = EXCLUDED.salary, role = EXCLUDED.role, updated_at = CURRENT_TIMESTAMP
        `;
        await dbPool.query(query, [id, companyId, workSiteId, name, role, admissionDate, status, salary, cpf, rg, pis, email, phone, vacationDue]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/login', async (req, res) => {
    if (!dbPool) return res.status(500).json({ message: 'DB Disconnected' });
    const { email, password } = req.body;
    try {
        const result = await dbPool.query('SELECT id, full_name as name, email, role, company_id as "companyId", cpf FROM users WHERE email = $1 AND password_hash = $2', [email, password]);
        if (result.rows.length > 0) res.json({ success: true, user: result.rows[0] });
        else res.status(401).json({ success: false, message: 'Invalid credentials' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/pix', async (req, res) => {
    const { clientId, clientSecret, pixKey, amount, protocol, requestData } = req.body;
    const crtPath = path.join(__dirname, 'certs', 'certificado.crt');
    const keyPath = path.join(__dirname, 'certs', 'chave.key');
    if (!fs.existsSync(crtPath) || !fs.existsSync(keyPath)) return res.status(400).json({ error: 'Certificados não encontrados.' });
    try {
        const agent = new https.Agent({ cert: fs.readFileSync(crtPath), key: fs.readFileSync(keyPath) });
        const auth = await axios.post('https://cdpj.partners.bancointer.com.br/oauth/v2/token', new URLSearchParams({ client_id: clientId, client_secret: clientSecret, scope: 'cob.write', grant_type: 'client_credentials' }), { httpsAgent: agent });
        const cleanCpf = (requestData.cpf || '').replace(/\D/g, '');
        const cob = await axios.post('https://cdpj.partners.bancointer.com.br/pix/v2/cob', {
            calendario: { expiracao: 3600 },
            devedor: { cpf: cleanCpf, name: requestData.name },
            valor: { original: amount.toFixed(2) },
            chave: pixKey,
            solicitacaoPagador: `Servico ${protocol}`
        }, { httpsAgent: agent, headers: { Authorization: `Bearer ${auth.data.access_token}` } });
        res.json({ txid: cob.data.txid, pixCopiaECola: cob.data.pixCopiaECola });
    } catch (error) { res.status(500).json({ error: 'Falha Inter', details: error.response?.data }); }
});

app.post('/api/upload-cert', upload.fields([{ name: 'crt' }, { name: 'key' }]), (req, res) => {
    if (!fs.existsSync(path.join(__dirname, 'certs'))) fs.mkdirSync(path.join(__dirname, 'certs'));
    if (req.files['crt']) fs.renameSync(req.files['crt'][0].path, path.join(__dirname, 'certs', 'certificado.crt'));
    if (req.files['key']) fs.renameSync(req.files['key'][0].path, path.join(__dirname, 'certs', 'chave.key'));
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));