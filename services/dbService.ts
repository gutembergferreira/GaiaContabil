import { POSTGRES_SCHEMA } from './sqlSchema';

export interface DbConfig {
    host: string;
    port: string;
    user: string;
    pass: string;
    dbName: string;
    ssl: boolean;
}

const DB_INITIALIZED_KEY = 'maat_db_initialized';
const API_URL = 'http://localhost:3001/api';

export const getDbConfig = (): DbConfig | null => {
    const data = localStorage.getItem('maat_db_config'); // Recupera config salva para mostrar na UI
    return data ? JSON.parse(data) : null;
};

export const saveDbConfig = (config: DbConfig) => {
    localStorage.setItem('maat_db_config', JSON.stringify(config));
};

export const isDbInitialized = (): boolean => {
    return localStorage.getItem(DB_INITIALIZED_KEY) === 'true';
};

export const initializeDatabase = async (config: DbConfig): Promise<{success: boolean, message: string, logs: string[]}> => {
    // ESTA VERSÃO NÃO USA MOCK. ELA CHAMA O BACKEND REAL.
    try {
        const response = await fetch(`${API_URL}/setup-db`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem(DB_INITIALIZED_KEY, 'true');
            return { 
                success: true, 
                message: 'Banco de dados configurado com sucesso!', 
                logs: data.logs || ['Sucesso ao configurar banco via Backend.'] 
            };
        } else {
            return { 
                success: false, 
                message: data.message || 'Erro desconhecido no backend.', 
                logs: data.logs || [data.message] 
            };
        }
    } catch (error: any) {
        return { 
            success: false, 
            message: 'ERRO CRÍTICO: Não foi possível conectar ao servidor Backend (Porta 3001).', 
            logs: [
                'Falha ao tentar: POST http://localhost:3001/api/setup-db',
                `Erro técnico: ${error.message}`,
                'Certifique-se de que o terminal do backend (maatcontabil_webhook) está rodando e sem erros.'
            ] 
        };
    }
};

export const resetSystem = () => {
    localStorage.removeItem(DB_INITIALIZED_KEY);
    localStorage.removeItem('maat_db_config');
    window.location.reload();
};