
import React, { useState, useEffect } from 'react';
import { 
    getEmployees, getHRAdmissions, getHRRequests, getWorkSites, getFieldFeedback,
    addHRAdmission, updateHRAdmission, addHRRequest, updateHRRequest, addFieldFeedback,
    addWorkSite, addEmployee, resolveFieldFeedback
} from '../services/mockData';
import { 
    UserPlus, FolderOpen, AlertTriangle, UploadCloud, FileText, User, 
    ArrowLeft, Users, Calendar, Briefcase, Paperclip, ChevronRight, CheckCircle, 
    XCircle, Clock, Search, MapPin, DollarSign, Info, Trash2, FileCheck, UserMinus, Plus, Eye
} from 'lucide-react';
import { 
    Role, Employee, HRAdmission, HRRequest, WorkSite, HRAdmissionStatus, 
    HRRequestStatus, HRRequestType, HRFieldFeedback 
} from '../types';

interface HRManagementProps {
  role: Role;
}

const HRManagement: React.FC<HRManagementProps> = ({ role }) => {
  const [activeTab, setActiveTab] = useState<'employees' | 'admissions' | 'requests' | 'sites'>('employees');
  const [view, setView] = useState<'list' | 'admission_form' | 'employee_details' | 'request_form'>('list');
  
  // Data State (Mocking current company)
  const companyId = 'c1'; 
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [admissions, setAdmissions] = useState<HRAdmission[]>([]);
  const [hrRequests, setHrRequests] = useState<HRRequest[]>([]);
  const [sites, setSites] = useState<WorkSite[]>([]);
  
  // Selection
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<HRRequestType>('Férias');
  
  // Feedback System
  const [feedbackField, setFeedbackField] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Form State for Admission
  const [formAdmission, setFormAdmission] = useState<Partial<HRAdmission>>({});

  useEffect(() => {
    refreshData();
  }, [companyId]);

  const refreshData = async () => {
    setEmployees(getEmployees(companyId));
    setAdmissions(getHRAdmissions(companyId));
    setHrRequests(getHRRequests(companyId));
    setSites(getWorkSites(companyId));
  };

  const getStatusColor = (status: string) => {
    switch(status) {
        case 'Finalizado': case 'Validado': case 'Agendado': case 'Ativo': return 'bg-emerald-100 text-emerald-700';
        case 'Formulario com Erro': case 'Pendencia': return 'bg-red-100 text-red-700';
        case 'Novo': case 'Solicitado': return 'bg-blue-100 text-blue-700';
        case 'Validando': case 'Em Analise': return 'bg-amber-100 text-amber-700';
        default: return 'bg-slate-100 text-slate-600';
    }
  };

  // --- ACTIONS ---

  const handleCreateAdmission = async () => {
      const payload: HRAdmission = {
          ...formAdmission,
          id: Date.now().toString(),
          companyId,
          clientId: 'u2', // Demo
          status: 'Novo',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
      } as HRAdmission;

      await addHRAdmission(payload);
      alert('Solicitação de admissão enviada com sucesso!');
      setView('list');
      setActiveTab('admissions');
      refreshData();
  };

  const handleUpdateAdmission = async (updated: HRAdmission) => {
      await updateHRAdmission(updated);
      refreshData();
  };

  const handleFinalizeAdmission = async (adm: HRAdmission) => {
      // 1. Create Employee
      const newEmp: Employee = {
          id: Date.now().toString(),
          companyId: adm.companyId,
          workSiteId: adm.workSiteId,
          name: adm.fullName,
          role: adm.role,
          admissionDate: adm.expectedStartDate,
          status: 'Ativo',
          salary: adm.salary,
          cpf: adm.cpf,
          rg: adm.rg,
          pis: adm.pis,
          phone: '',
          email: '',
          vacationDue: new Date(new Date(adm.expectedStartDate).setFullYear(new Date(adm.expectedStartDate).getFullYear() + 1)).toISOString()
      };
      await addEmployee(newEmp);
      // 2. Finish Admission
      await updateHRAdmission({...adm, status: 'Finalizado'});
      alert('Funcionário registrado com sucesso!');
      setView('list');
      setActiveTab('employees');
      refreshData();
  };

  // --- RENDERS ---

  const renderEmployeeDetails = (emp: Employee) => (
    <div className="space-y-6 animate-fadeIn">
        <button onClick={() => setView('list')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600">
            <ArrowLeft size={16}/> Voltar
        </button>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl">
                    {emp.name.substring(0,2).toUpperCase()}
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">{emp.name}</h2>
                    <p className="text-slate-500 flex items-center gap-2">
                        <Briefcase size={14}/> {emp.role} • {sites.find(s => s.id === emp.workSiteId)?.name || 'Sem Posto'}
                    </p>
                </div>
            </div>
            <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(emp.status)}`}>{emp.status}</span>
                <p className="text-xs text-slate-400 mt-1">Admissão: {new Date(emp.admissionDate).toLocaleDateString()}</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Info size={18}/> Informações do Prontuário</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="p-3 bg-slate-50 rounded">
                            <span className="text-xs text-slate-400 block">CPF</span>
                            <span className="font-medium">{emp.cpf}</span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded">
                            <span className="text-xs text-slate-400 block">Salário</span>
                            <span className="font-medium text-emerald-600">R$ {emp.salary.toLocaleString('pt-BR')}</span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded">
                            <span className="text-xs text-slate-400 block">Próximas Férias</span>
                            <span className="font-medium">{new Date(emp.vacationDue).toLocaleDateString()}</span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded">
                            <span className="text-xs text-slate-400 block">E-mail</span>
                            <span className="font-medium">{emp.email || '-'}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><FolderOpen size={18}/> Histórico de Solicitações</h3>
                    <div className="space-y-3">
                        {hrRequests.filter(r => r.employeeId === emp.id).map(r => (
                            <div key={r.id} className="flex items-center justify-between p-3 border border-slate-100 rounded hover:bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-100 rounded text-slate-600">
                                        {r.type === 'Férias' && <Calendar size={16}/>}
                                        {r.type === 'Atestado' && <Paperclip size={16}/>}
                                        {r.type === 'Demissão' && <UserMinus size={16}/>}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{r.type}</p>
                                        <p className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusColor(r.status)}`}>{r.status}</span>
                            </div>
                        ))}
                        {hrRequests.filter(r => r.employeeId === emp.id).length === 0 && (
                            <p className="text-center text-slate-400 text-sm py-4">Nenhuma solicitação encontrada.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4">Ações do Gestor</h3>
                    <div className="space-y-2">
                        <button 
                            onClick={() => { setSelectedItem(emp); setSelectedType('Férias'); setView('request_form'); }}
                            className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-sm font-medium text-slate-700"
                        >
                            <Calendar size={18} className="text-blue-600"/> Solicitar Férias
                        </button>
                        <button 
                             onClick={() => { setSelectedItem(emp); setSelectedType('Atestado'); setView('request_form'); }}
                             className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-sm font-medium text-slate-700"
                        >
                            <Paperclip size={18} className="text-amber-600"/> Enviar Atestado
                        </button>
                        <button 
                             onClick={() => { setSelectedItem(emp); setSelectedType('Demissão'); setView('request_form'); }}
                             className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-bold text-red-600"
                        >
                            <UserMinus size={18}/> Solicitar Desligamento
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );

  const renderAdmissionForm = (adm?: HRAdmission) => {
    const isEditing = !!adm;
    const feedbacks = adm ? getFieldFeedback(adm.id) : [];

    const InputField = ({ label, name, type = "text", placeholder = "", required = true }) => {
        const hasError = feedbacks.find(f => f.fieldName === name && !f.resolved);
        return (
            <div className="relative">
                <label className={`block text-xs font-bold uppercase mb-1 ${hasError ? 'text-red-600' : 'text-slate-500'}`}>
                    {label} {required && <span className="text-red-500">*</span>} {hasError && <AlertTriangle size={12} className="inline ml-1"/>}
                </label>
                <input 
                    type={type} 
                    className={`w-full border rounded-lg p-2.5 text-sm transition-all outline-none 
                        ${hasError ? 'border-red-300 bg-red-50 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'}
                    `}
                    placeholder={placeholder}
                    defaultValue={adm ? (adm as any)[name] : (formAdmission as any)[name]}
                    onChange={e => setFormAdmission({...formAdmission, [name]: e.target.value})}
                    disabled={role === 'admin' && adm?.status !== 'Validando'}
                />
                {hasError && (
                    <p className="text-[10px] text-red-500 mt-1 font-medium">{hasError.message}</p>
                )}
                {role === 'admin' && adm?.status === 'Validando' && (
                    <button 
                        onClick={() => setFeedbackField(name)}
                        className="absolute right-2 top-8 text-red-400 hover:text-red-600"
                        title="Apontar Erro"
                    >
                        <AlertTriangle size={14}/>
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
             <button onClick={() => setView('list')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600">
                <ArrowLeft size={16}/> Voltar para Lista
            </button>

            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold">{isEditing ? `Admissão: ${adm.fullName}` : 'Nova Solicitação de Admissão'}</h2>
                        <p className="text-slate-400 text-xs mt-1">Siga o fluxo para o registro correto do novo colaborador.</p>
                    </div>
                    {adm && (
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${getStatusColor(adm.status)}`}>
                            {adm.status}
                        </span>
                    )}
                </div>

                <div className="p-8 space-y-8">
                    {/* Seção 1: Dados Pessoais */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-800 border-b pb-2 mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px]">1</span>
                            DADOS PESSOAIS
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <InputField label="Nome Completo" name="fullName" placeholder="Conforme documento oficial" />
                            </div>
                            <InputField label="CPF" name="cpf" placeholder="000.000.000-00" />
                            <InputField label="RG" name="rg" />
                            <InputField label="Data Nascimento" name="birthDate" type="date" />
                            <InputField label="Gênero" name="gender" />
                            <InputField label="Estado Civil" name="maritalStatus" />
                        </div>
                    </section>

                    {/* Seção 2: Documentação e Endereço */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-800 border-b pb-2 mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px]">2</span>
                            DOCUMENTAÇÃO E ENDEREÇO
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <InputField label="PIS" name="pis" required={false} />
                            <InputField label="Título Eleitor" name="tituloEleitor" required={false} />
                            <InputField label="Carteira de Trabalho (CTPS)" name="ctps" required={false} />
                            <div className="md:col-span-3">
                                <InputField label="Endereço Completo" name="address" placeholder="Rua, Número, Bairro, Cidade, UF, CEP" />
                            </div>
                        </div>
                    </section>

                    {/* Seção 3: Contratual */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-800 border-b pb-2 mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px]">3</span>
                            DADOS CONTRATUAIS
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <InputField label="Cargo" name="role" />
                            <InputField label="Salário Base (R$)" name="salary" type="number" />
                            <InputField label="Data Prevista de Início" name="expectedStartDate" type="date" />
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Posto de Trabalho / Setor</label>
                                <select 
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                    onChange={e => setFormAdmission({...formAdmission, workSiteId: e.target.value})}
                                    defaultValue={adm?.workSiteId}
                                    disabled={role === 'admin' && adm?.status !== 'Validando'}
                                >
                                    <option value="">Selecione um posto...</option>
                                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* Seção 4: Uploads */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-800 border-b pb-2 mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px]">4</span>
                            ARQUIVOS E COMPROVANTES
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 cursor-pointer transition-colors">
                                <UploadCloud size={32} className="mx-auto text-blue-500 mb-2"/>
                                <p className="text-xs font-bold text-slate-700">Digitalização de Documentos</p>
                                <p className="text-[10px] text-slate-400">RG, CPF, PIS, Título, Comprovante Residência</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-4">
                                <div className="bg-blue-100 p-2 rounded text-blue-600"><FileText size={24}/></div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-800 truncate">documentos_colaborador.pdf</p>
                                    <p className="text-[10px] text-slate-400">2.4 MB • Enviado em 24/05</p>
                                </div>
                                <button className="text-slate-400 hover:text-slate-600"><Search size={16}/></button>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="p-6 bg-slate-50 border-t flex justify-between gap-4">
                    <button onClick={() => setView('list')} className="px-6 py-2 border rounded-lg font-bold text-slate-600 hover:bg-white transition-colors">Cancelar</button>
                    
                    <div className="flex gap-2">
                        {role === 'admin' && adm?.status === 'Validando' && (
                            <>
                                <button 
                                    onClick={() => handleUpdateAdmission({...adm, status: 'Formulario com Erro'})}
                                    className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 flex items-center gap-2"
                                >
                                    <XCircle size={18}/> Apontar Erros
                                </button>
                                <button 
                                    onClick={() => handleUpdateAdmission({...adm, status: 'Validado'})}
                                    className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 flex items-center gap-2"
                                >
                                    <CheckCircle size={18}/> Validar Dados
                                </button>
                            </>
                        )}

                        {role === 'admin' && adm?.status === 'Validado' && (
                            <button 
                                onClick={() => handleFinalizeAdmission(adm)}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2"
                            >
                                <FileCheck size={18}/> Registrar e Finalizar
                            </button>
                        )}

                        {role === 'client' && (!adm || adm.status === 'Novo' || adm.status === 'Formulario com Erro') && (
                            <button 
                                onClick={isEditing ? () => handleUpdateAdmission({...adm, status: 'Validando'}) : handleCreateAdmission}
                                className="px-12 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg"
                            >
                                {adm?.status === 'Formulario com Erro' ? 'Re-enviar para Validação' : 'Enviar Solicitação'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* FEEDBACK OVERLAY (ADMIN ONLY) */}
            {feedbackField && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl animate-scaleIn">
                        <h4 className="font-bold text-red-600 mb-2 flex items-center gap-2">
                            <AlertTriangle size={20}/> Erro no campo: {feedbackField}
                        </h4>
                        <textarea 
                            className="w-full border rounded-lg p-2 text-sm h-24 mb-4" 
                            placeholder="Descreva o que está errado neste campo..."
                            value={feedbackMsg}
                            onChange={e => setFeedbackMsg(e.target.value)}
                        ></textarea>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setFeedbackField('')} className="px-4 py-2 text-slate-500">Cancelar</button>
                            <button 
                                onClick={async () => {
                                    await addFieldFeedback({
                                        id: Date.now().toString(),
                                        targetId: adm!.id,
                                        fieldName: feedbackField,
                                        message: feedbackMsg,
                                        resolved: false
                                    });
                                    setFeedbackField('');
                                    setFeedbackMsg('');
                                    refreshData();
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold"
                            >
                                Salvar Feedback
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
  };

  const renderWorkSites = () => (
      <div className="space-y-6">
          <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">Postos de Trabalho / Setores</h2>
              {role === 'admin' && (
                  <button 
                    onClick={async () => {
                        const name = prompt('Nome do Posto/Setor:');
                        if(name) {
                            await addWorkSite({ id: Date.now().toString(), companyId, name });
                            refreshData();
                        }
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
                  >
                      <Plus size={18}/> Novo Posto
                  </button>
              )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sites.map(s => (
                  <div key={s.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4 mb-4">
                          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><MapPin size={24}/></div>
                          <div>
                              <h3 className="font-bold text-slate-800">{s.name}</h3>
                              <p className="text-xs text-slate-400">{employees.filter(e => e.workSiteId === s.id).length} funcionários alocados</p>
                          </div>
                      </div>
                      <div className="flex -space-x-2">
                          {employees.filter(e => e.workSiteId === s.id).slice(0, 5).map(e => (
                              <div key={e.id} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold" title={e.name}>
                                  {e.name.substring(0,1)}
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
              {sites.length === 0 && (
                  <div className="col-span-3 py-12 text-center text-slate-400 border-2 border-dashed rounded-xl">
                      Nenhum posto cadastrado.
                  </div>
              )}
          </div>
      </div>
  );

  const renderRequestForm = () => {
      const emp = selectedItem as Employee;
      const [reqDetails, setReqDetails] = useState<any>({});
      
      return (
          <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
              <button onClick={() => setView('employee_details')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600">
                <ArrowLeft size={16}/> Voltar
              </button>

              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Solicitação de {selectedType}</h2>
                  <p className="text-slate-500 mb-6">Funcionário: <span className="font-bold text-slate-700">{emp.name}</span></p>

                  <div className="space-y-4">
                      {selectedType === 'Férias' && (
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Início</label>
                                  <input type="date" className="w-full border rounded-lg p-2.5" onChange={e => setReqDetails({...reqDetails, start: e.target.value})} />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dias</label>
                                  <input type="number" className="w-full border rounded-lg p-2.5" defaultValue={30} onChange={e => setReqDetails({...reqDetails, days: e.target.value})} />
                              </div>
                              <div className="col-span-2 flex items-center gap-2">
                                  <input type="checkbox" id="abono" className="w-4 h-4" onChange={e => setReqDetails({...reqDetails, abono: e.target.checked})} />
                                  <label htmlFor="abono" className="text-sm text-slate-700">Abono Pecuniário (venda de 10 dias)?</label>
                              </div>
                          </div>
                      )}

                      {selectedType === 'Atestado' && (
                          <div className="space-y-4">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data do Atestado</label>
                                  <input type="date" className="w-full border rounded-lg p-2.5" onChange={e => setReqDetails({...reqDetails, date: e.target.value})} />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantidade de Dias</label>
                                  <input type="number" className="w-full border rounded-lg p-2.5" onChange={e => setReqDetails({...reqDetails, days: e.target.value})} />
                              </div>
                              <div className="border-2 border-dashed p-8 rounded-xl text-center">
                                  <UploadCloud className="mx-auto text-slate-400 mb-2" />
                                  <p className="text-sm font-medium">Anexe a foto do atestado</p>
                              </div>
                          </div>
                      )}

                      {selectedType === 'Demissão' && (
                          <div className="space-y-4">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Último Dia de Trabalho</label>
                                  <input type="date" className="w-full border rounded-lg p-2.5" onChange={e => setReqDetails({...reqDetails, lastDay: e.target.value})} />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Desligamento</label>
                                  <select className="w-full border rounded-lg p-2.5" onChange={e => setReqDetails({...reqDetails, type: e.target.value})}>
                                      <option value="">Selecione...</option>
                                      <option>Pedido de Demissão</option>
                                      <option>Dispensa sem Justa Causa</option>
                                      <option>Dispensa com Justa Causa</option>
                                      <option>Acordo Comum</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Aviso Prévio</label>
                                  <select className="w-full border rounded-lg p-2.5" onChange={e => setReqDetails({...reqDetails, aviso: e.target.value})}>
                                      <option>Trabalhado</option>
                                      <option>Indenizado</option>
                                  </select>
                              </div>
                          </div>
                      )}

                      <div className="pt-6 flex justify-end gap-2">
                          <button onClick={() => setView('employee_details')} className="px-6 py-2 border rounded-lg font-bold">Cancelar</button>
                          <button 
                            onClick={async () => {
                                await addHRRequest({
                                    id: Date.now().toString(),
                                    employeeId: emp.id,
                                    companyId,
                                    type: selectedType,
                                    status: 'Solicitado',
                                    details: reqDetails,
                                    clientId: 'u2',
                                    createdAt: new Date().toISOString(),
                                    updatedAt: new Date().toISOString()
                                });
                                alert('Solicitação enviada!');
                                setView('list');
                                refreshData();
                            }}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold"
                          >
                              Enviar Solicitação
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderGeneralList = () => (
      <div className="space-y-8 animate-fadeIn">
          {/* TABS HEADER */}
          <div className="flex gap-4 border-b border-slate-200 overflow-x-auto">
              <button 
                onClick={() => setActiveTab('employees')} 
                className={`pb-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === 'employees' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                  <Users size={18}/> Funcionários Ativos
              </button>
              <button 
                onClick={() => setActiveTab('admissions')} 
                className={`pb-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === 'admissions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                  <UserPlus size={18}/> Processo Admissão
              </button>
              <button 
                onClick={() => setActiveTab('requests')} 
                className={`pb-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === 'requests' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                  <Clock size={18}/> Solicitações (Férias/Atestado/Demissão)
              </button>
              <button 
                onClick={() => setActiveTab('sites')} 
                className={`pb-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === 'sites' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
              >
                  <MapPin size={18}/> Postos/Setores
              </button>
          </div>

          {/* TAB CONTENT: EMPLOYEES */}
          {activeTab === 'employees' && (
              <div className="space-y-4">
                  <div className="flex justify-between items-center">
                      <div className="relative max-w-sm w-full">
                          <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                          <input type="text" placeholder="Buscar funcionário..." className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" />
                      </div>
                      {role === 'client' && (
                          <button onClick={() => { setView('admission_form'); setSelectedItem(null); setFormAdmission({}); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
                              <UserPlus size={18}/> Nova Admissão
                          </button>
                      )}
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                              <tr>
                                  <th className="px-6 py-4">Funcionário</th>
                                  <th className="px-6 py-4">Cargo / Posto</th>
                                  <th className="px-6 py-4">Status</th>
                                  <th className="px-6 py-4">Admissão</th>
                                  <th className="px-6 py-4 text-right">Ação</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {employees.map(emp => (
                                  <tr key={emp.id} className="hover:bg-slate-50 group">
                                      <td className="px-6 py-4">
                                          <div className="flex items-center gap-3">
                                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">{emp.name.substring(0,1)}</div>
                                              <div>
                                                  <p className="font-bold text-slate-800">{emp.name}</p>
                                                  <p className="text-[10px] text-slate-400">{emp.cpf}</p>
                                              </div>
                                          </div>
                                      </td>
                                      <td className="px-6 py-4">
                                          <p className="font-medium text-slate-700">{emp.role}</p>
                                          <p className="text-[10px] text-slate-400">{sites.find(s => s.id === emp.workSiteId)?.name || 'Sede'}</p>
                                      </td>
                                      <td className="px-6 py-4">
                                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(emp.status)}`}>{emp.status}</span>
                                      </td>
                                      <td className="px-6 py-4 text-slate-500 font-mono text-xs">{new Date(emp.admissionDate).toLocaleDateString()}</td>
                                      <td className="px-6 py-4 text-right">
                                          <button 
                                            onClick={() => { setSelectedItem(emp); setView('employee_details'); }}
                                            className="text-blue-600 hover:text-blue-800 font-bold flex items-center justify-end gap-1 ml-auto"
                                          >
                                              Prontuário <ChevronRight size={16}/>
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                              {employees.length === 0 && (
                                  <tr><td colSpan={5} className="py-12 text-center text-slate-400 italic">Nenhum funcionário ativo.</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

          {/* TAB CONTENT: ADMISSIONS */}
          {activeTab === 'admissions' && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                   <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                          <tr>
                              <th className="px-6 py-4">Candidato</th>
                              <th className="px-6 py-4">Cargo Pretendido</th>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4">Início Previsto</th>
                              <th className="px-6 py-4 text-right">Ação</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {admissions.map(adm => (
                              <tr key={adm.id} className="hover:bg-slate-50">
                                  <td className="px-6 py-4 font-bold text-slate-800">{adm.fullName}</td>
                                  <td className="px-6 py-4 text-slate-600">{adm.role}</td>
                                  <td className="px-6 py-4">
                                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${getStatusColor(adm.status)}`}>
                                          {adm.status}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-slate-500">{new Date(adm.expectedStartDate).toLocaleDateString()}</td>
                                  <td className="px-6 py-4 text-right">
                                      <button 
                                        onClick={async () => {
                                            if (role === 'admin' && adm.status === 'Novo') {
                                                await handleUpdateAdmission({...adm, status: 'Validando'});
                                            }
                                            setSelectedItem(adm); 
                                            setView('admission_form');
                                        }}
                                        className="bg-slate-900 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-800"
                                      >
                                          {role === 'admin' ? 'Validar Ficha' : 'Ver/Editar'}
                                      </button>
                                  </td>
                              </tr>
                          ))}
                          {admissions.length === 0 && (
                               <tr><td colSpan={5} className="py-12 text-center text-slate-400 italic">Nenhuma admissão em curso.</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          )}

          {/* TAB CONTENT: REQUESTS */}
          {activeTab === 'requests' && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                          <tr>
                              <th className="px-6 py-4">Funcionário</th>
                              <th className="px-6 py-4">Tipo</th>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4">Data Solicitação</th>
                              <th className="px-6 py-4 text-right">Ação</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {hrRequests.map(r => {
                              const emp = employees.find(e => e.id === r.employeeId);
                              return (
                                  <tr key={r.id} className="hover:bg-slate-50">
                                      <td className="px-6 py-4 font-bold text-slate-800">{emp?.name || 'Funcionário'}</td>
                                      <td className="px-6 py-4 font-medium text-slate-600">{r.type}</td>
                                      <td className="px-6 py-4">
                                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${getStatusColor(r.status)}`}>{r.status}</span>
                                      </td>
                                      <td className="px-6 py-4 text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</td>
                                      <td className="px-6 py-4 text-right">
                                          <div className="flex justify-end gap-2">
                                              {role === 'admin' && r.status === 'Solicitado' && (
                                                  <button 
                                                    onClick={() => handleUpdateRequest({...r, status: 'Em Analise'})}
                                                    className="bg-blue-600 text-white px-2 py-1 rounded text-[10px] font-bold"
                                                  >
                                                      Analisar
                                                  </button>
                                              )}
                                              {role === 'admin' && r.status === 'Em Analise' && (
                                                  <button 
                                                    onClick={() => handleUpdateRequest({...r, status: 'Finalizado'})}
                                                    className="bg-emerald-600 text-white px-2 py-1 rounded text-[10px] font-bold"
                                                  >
                                                      Finalizar
                                                  </button>
                                              )}
                                              {/* Fix: Added Eye icon to lucide-react imports to resolve Cannot find name 'Eye' error */}
                                              <button 
                                                onClick={() => alert(`Dados: ${JSON.stringify(r.details)}`)}
                                                className="text-slate-400 hover:text-blue-600"
                                              >
                                                  <Eye size={16}/>
                                              </button>
                                          </div>
                                      </td>
                                  </tr>
                              )
                          })}
                          {hrRequests.length === 0 && (
                               <tr><td colSpan={5} className="py-12 text-center text-slate-400 italic">Nenhuma solicitação pendente.</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          )}

          {/* TAB CONTENT: SITES */}
          {activeTab === 'sites' && renderWorkSites()}
      </div>
  );

  const handleUpdateRequest = async (req: HRRequest) => {
      await updateHRRequest(req);
      refreshData();
  };

  const renderContent = () => {
    switch (view) {
        case 'employee_details': return renderEmployeeDetails(selectedItem);
        case 'admission_form': return renderAdmissionForm(selectedItem);
        case 'request_form': return renderRequestForm();
        default: return renderGeneralList();
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <Users className="text-blue-600" size={32}/> Gestão de RH & Capital Humano
            </h1>
        </div>
        {renderContent()}
    </div>
  );
};

export default HRManagement;
