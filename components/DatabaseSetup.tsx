import React, { useState } from 'react';
import { Database, Server, Play, CheckCircle, Terminal, LogIn, AlertTriangle } from 'lucide-react';
import { DbConfig, initializeDatabase, saveDbConfig } from '../services/dbService';
import { POSTGRES_SCHEMA } from '../services/sqlSchema';

interface DatabaseSetupProps {
    onComplete: () => void;
}

const DatabaseSetup: React.FC<DatabaseSetupProps> = ({ onComplete }) => {
    const [config, setConfig] = useState<DbConfig>({
        host: 'localhost',
        port: '5432',
        user: 'postgres',
        pass: '',
        dbName: 'maat_contabil',
        ssl: false
    });
    
    const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
    const [logs, setLogs] = useState<string[]>([]);
    const [showSchema, setShowSchema] = useState(false);

    const handleRunSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('running');
        setLogs(['Iniciando comunicação com Backend (Porta 3001)...']);
        
        saveDbConfig(config);
        
        const result = await initializeDatabase(config);
        
        setLogs(prev => [...prev, ...result.logs]);
        
        if (result.success) {
            setStatus('success');
            // NÃO redireciona automaticamente. Espera o usuário ler e clicar.
        } else {
            setStatus('error');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col md:flex-row h-[80vh]">
                
                {/* Left Panel: Config */}
                <div className="w-full md:w-5/12 p-8 border-r border-slate-100 overflow-y-auto">
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-2">
                             <div className="bg-blue-600 p-2 rounded-lg text-white">
                                 <Database size={24} />
                             </div>
                             <h1 className="text-2xl font-bold text-slate-800">Ma'at Setup</h1>
                        </div>
                        <p className="text-slate-500 text-sm">
                            Configure a conexão com o PostgreSQL local. O Backend (Node.js) deve estar rodando na porta 3001.
                        </p>
                    </div>

                    <form onSubmit={handleRunSetup} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Host</label>
                                <input required type="text" value={config.host} onChange={e => setConfig({...config, host: e.target.value})} className="w-full border border-slate-300 rounded p-2 text-sm" placeholder="localhost" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Porta</label>
                                <input required type="text" value={config.port} onChange={e => setConfig({...config, port: e.target.value})} className="w-full border border-slate-300 rounded p-2 text-sm" placeholder="5432" />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Usuário</label>
                                <input required type="text" value={config.user} onChange={e => setConfig({...config, user: e.target.value})} className="w-full border border-slate-300 rounded p-2 text-sm" placeholder="postgres" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Senha</label>
                                <input type="password" value={config.pass} onChange={e => setConfig({...config, pass: e.target.value})} className="w-full border border-slate-300 rounded p-2 text-sm" placeholder="******" />
                            </div>
                        </div>

                        <div>
                             <label className="block text-xs font-bold text-slate-500 mb-1">Database Name</label>
                             <input required type="text" value={config.dbName} onChange={e => setConfig({...config, dbName: e.target.value})} className="w-full border border-slate-300 rounded p-2 text-sm" placeholder="maat_contabil" />
                        </div>
                        
                        <div className="pt-4">
                            {status === 'success' ? (
                                <button 
                                    type="button"
                                    onClick={onComplete}
                                    className="w-full py-3 rounded-lg font-bold text-white bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2 shadow-lg animate-pulse"
                                >
                                    <LogIn size={18} /> Prosseguir para Login
                                </button>
                            ) : (
                                <button 
                                    type="submit" 
                                    disabled={status === 'running'}
                                    className={`w-full py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-all
                                        ${status === 'running' ? 'bg-slate-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'}
                                    `}
                                >
                                    {status === 'running' ? (
                                        <> <Server size={18} className="animate-bounce" /> Conectando... </>
                                    ) : (
                                        <> <Play size={18} /> Criar Banco de Dados </>
                                    )}
                                </button>
                            )}
                        </div>
                    </form>
                    
                    <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                        <button onClick={() => setShowSchema(!showSchema)} className="text-xs text-blue-600 hover:underline flex items-center justify-center gap-1 mx-auto">
                            <Terminal size={12} /> {showSchema ? 'Ocultar' : 'Ver'} Script SQL
                        </button>
                    </div>
                </div>

                {/* Right Panel: Logs/Console */}
                <div className="w-full md:w-7/12 bg-slate-950 p-6 flex flex-col font-mono text-xs">
                    <div className="flex items-center justify-between text-slate-400 mb-2 pb-2 border-b border-slate-800">
                        <span className="flex items-center gap-2"><Terminal size={16} /> Console de Instalação</span>
                        <span className="text-[10px] uppercase tracking-wider">{status}</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-2 p-2 bg-slate-900/50 rounded border border-slate-800/50">
                        {showSchema ? (
                            <pre className="text-blue-300 whitespace-pre-wrap text-[10px]">{POSTGRES_SCHEMA}</pre>
                        ) : logs.length === 0 ? (
                            <div className="text-slate-600 italic p-4 text-center">
                                Aguardando início... <br/>
                                Certifique-se que o backend está rodando:<br/>
                                <code className="bg-slate-800 px-1 py-0.5 rounded text-slate-400">cd maatcontabil_webhook &amp;&amp; npm start</code>
                            </div>
                        ) : (
                            logs.map((log, i) => (
                                <div key={i} className="text-green-400 border-l-2 border-slate-700 pl-2 py-0.5 break-words">
                                    <span className="text-slate-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
                                    {log}
                                </div>
                            ))
                        )}
                        {status === 'running' && <span className="text-green-400 animate-pulse">_</span>}
                        {status === 'error' && (
                            <div className="text-red-400 mt-4 p-2 bg-red-900/20 border border-red-800 rounded">
                                FALHA NA INSTALAÇÃO. Verifique se o PostgreSQL está rodando e se as credenciais estão corretas.
                            </div>
                        )}
                    </div>

                    {status === 'success' && (
                         <div className="mt-4 p-4 bg-green-900/30 border border-green-800 rounded flex items-center gap-3 text-green-400">
                            <CheckCircle size={24} />
                            <div>
                                <p className="font-bold text-sm">Banco de Dados Configurado com Sucesso!</p>
                                <p className="text-xs text-green-500/80">As tabelas foram criadas. Clique no botão à esquerda para entrar.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DatabaseSetup;