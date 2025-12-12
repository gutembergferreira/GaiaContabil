import React, { useState, useEffect } from 'react';
import CompanyManager from './CompanyManager';
import UserManager from './UserManager';
import { getCategories, addCategory, deleteCategory } from '../services/mockData';
import { Trash2, Plus, Tag, Building2, Users } from 'lucide-react';

const SettingsManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'categories' | 'companies' | 'users'>('categories');
  const [categories, setCategories] = useState<string[]>([]);
  const [newCatName, setNewCatName] = useState('');

  useEffect(() => {
    setCategories(getCategories());
  }, []);

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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Configurações do Sistema</h2>

      <div className="flex overflow-x-auto gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 px-2 flex items-center gap-2 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'categories' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Tag size={18} /> Categorias de Arquivos
        </button>
        <button
          onClick={() => setActiveTab('companies')}
          className={`pb-3 px-2 flex items-center gap-2 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'companies' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Building2 size={18} /> Gestão de Empresas
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-2 flex items-center gap-2 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users size={18} /> Gestão de Usuários
        </button>
      </div>

      <div className="mt-6">
        {activeTab === 'categories' && (
          <div className="max-w-2xl">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-lg mb-4">Gerenciar Categorias</h3>
              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  placeholder="Nova Categoria..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 border border-slate-300 rounded-lg p-2"
                />
                <button
                  onClick={handleAddCategory}
                  disabled={!newCatName.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Plus size={20} />
                </button>
              </div>

              <div className="space-y-2">
                {categories.map((cat) => (
                  <div key={cat} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-700 font-medium">{cat}</span>
                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="text-slate-400 hover:text-red-600 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
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
