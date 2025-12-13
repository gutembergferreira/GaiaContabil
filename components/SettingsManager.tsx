import React, { useState, useEffect } from 'react';
import CompanyManager from './CompanyManager';
import UserManager from './UserManager';
import { getCategories, addCategory, deleteCategory, getRequestTypes, addRequestType, deleteRequestType } from '../services/mockData';
import { Trash2, Plus, Tag, Building2, Users, MessageSquare } from 'lucide-react';
import { RequestTypeConfig } from '../types';

const SettingsManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'categories' | 'requestTypes' | 'companies' | 'users'>('categories');
  
  // Categories State
  const [categories, setCategories] = useState<string[]>([]);
  const [newCatName, setNewCatName] = useState('');

  // Request Types State
  const [requestTypes, setRequestTypes] = useState<RequestTypeConfig[]>([]);
  const [newReqType, setNewReqType] = useState('');
  const [newReqPrice, setNewReqPrice] = useState<number>(0);

  useEffect(() => {
    setCategories(getCategories());
    setRequestTypes(getRequestTypes());
  }, []);

  // Category Logic
  const handleAddCategory = () => {
    if (newCatName.trim()) {
      addCategory(newCatName.trim());
      setCategories(getCategories());
      setNewCatName('');
    }
  };
  const handleDeleteCategory = (cat: string) => {
    if (confirm(`Tem certeza que deseja excluir a categoria "${cat}"?`)) {
      deleteCategory(cat);
      setCategories(getCategories());
    }
  };

  // Request Type Logic
  const handleAddRequestType = () => {
    if (newReqType.trim()) {
      addRequestType({
          id: Date.now().toString(),
          name: newReqType.trim(),
          price: newReqPrice
      });
      setRequestTypes(getRequestTypes());
      setNewReqType('');
      setNewReqPrice(0);
    }
  };
  const handleDeleteRequestType = (id: string) => {
    if (confirm(`Tem certeza que deseja excluir este tipo de pedido?`)) {
      deleteRequestType(id);
      setRequestTypes(getRequestTypes());
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Configurações do Sistema</h2>

      <div className="flex overflow-x-auto gap-4 border-b border-slate-200">
        <button onClick={() => setActiveTab('categories')} className={`pb-3 px-2 flex items-center gap-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'categories' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          <Tag size={18} /> Categorias Arquivos
        </button>
        <button onClick={() => setActiveTab('requestTypes')} className={`pb-3 px-2 flex items-center gap-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'requestTypes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          <MessageSquare size={18} /> Tipos de Pedidos
        </button>
        <button onClick={() => setActiveTab('companies')} className={`pb-3 px-2 flex items-center gap-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'companies' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          <Building2 size={18} /> Empresas
        </button>
        <button onClick={() => setActiveTab('users')} className={`pb-3 px-2 flex items-center gap-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          <Users size={18} /> Usuários
        </button>
      </div>

      <div className="mt-6">
        {/* CATEGORIES TAB */}
        {activeTab === 'categories' && (
          <div className="max-w-2xl">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-lg mb-4">Gerenciar Categorias de Arquivos</h3>
              <div className="flex gap-2 mb-6">
                <input type="text" placeholder="Nova Categoria..." value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="flex-1 border border-slate-300 rounded-lg p-2" />
                <button onClick={handleAddCategory} disabled={!newCatName.trim()} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  <Plus size={20} />
                </button>
              </div>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div key={cat} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-700 font-medium">{cat}</span>
                    <button onClick={() => handleDeleteCategory(cat)} className="text-slate-400 hover:text-red-600 transition-colors" title="Excluir"><Trash2 size={18} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* REQUEST TYPES TAB */}
        {activeTab === 'requestTypes' && (
          <div className="max-w-3xl">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-lg mb-4">Gerenciar Tipos de Pedidos/Solicitações</h3>
              
              <div className="flex flex-col md:flex-row gap-2 mb-6 p-4 bg-slate-50 rounded-lg">
                <div className="flex-1">
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Nome do Serviço</label>
                    <input type="text" placeholder="Ex: 2ª Via de Boleto" value={newReqType} onChange={(e) => setNewReqType(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2" />
                </div>
                <div className="w-32">
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Preço (R$)</label>
                    <input type="number" step="0.01" min="0" placeholder="0.00" value={newReqPrice} onChange={(e) => setNewReqPrice(parseFloat(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2" />
                </div>
                <div className="flex items-end">
                    <button onClick={handleAddRequestType} disabled={!newReqType.trim()} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                    <Plus size={20} /> Adicionar
                    </button>
                </div>
              </div>

              <div className="space-y-2">
                {requestTypes.map((type) => (
                  <div key={type.id} className="flex justify-between items-center p-3 bg-white rounded-lg border border-slate-200">
                    <div>
                        <span className="text-slate-800 font-medium block">{type.name}</span>
                        <span className={`text-xs ${type.price > 0 ? 'text-green-600 font-bold' : 'text-slate-400'}`}>
                            {type.price > 0 ? `Custo: R$ ${type.price.toFixed(2)}` : 'Gratuito'}
                        </span>
                    </div>
                    <button onClick={() => handleDeleteRequestType(type.id)} className="text-slate-400 hover:text-red-600 transition-colors" title="Excluir"><Trash2 size={18} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'companies' && <CompanyManager />}
        {activeTab === 'users' && <UserManager />}
      </div>
    </div>
  );
};

export default SettingsManager;
