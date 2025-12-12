import React, { useState } from 'react';
import { MOCK_ROUTINES } from '../services/mockData';
import { Department } from '../types';
import { Filter, Search, Calendar, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const MonthlyRoutines: React.FC = () => {
  const [selectedDept, setSelectedDept] = useState<Department | 'Todos'>('Todos');
  const [filterText, setFilterText] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');

  const DEPARTMENTS: (Department | 'Todos')[] = ['Todos', 'Pessoal', 'Fiscal', 'Contábil', 'Legalização'];
  const STATUSES = ['Todos', 'Pendente', 'Concluído', 'Atrasado', 'Em Análise'];

  const filteredRoutines = MOCK_ROUTINES.filter(r => {
      const matchesDept = selectedDept === 'Todos' || r.department === selectedDept;
      const matchesStatus = filterStatus === 'Todos' || r.status === filterStatus;
      const matchesText = r.title.toLowerCase().includes(filterText.toLowerCase()) || 
                          r.clientName.toLowerCase().includes(filterText.toLowerCase());
      return matchesDept && matchesStatus && matchesText;
  });

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'Concluído': return 'bg-emerald-100 text-emerald-700';
          case 'Atrasado': return 'bg-red-100 text-red-700';
          case 'Pendente': return 'bg-amber-100 text-amber-700';
          default: return 'bg-blue-100 text-blue-700';
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-2xl font-bold text-slate-800">Rotinas Mensais</h2>
          <div className="flex gap-2 text-sm text-slate-500 bg-white p-2 rounded-lg shadow-sm border border-slate-100">
             <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Concluído</div>
             <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Pendente</div>
             <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Atrasado</div>
          </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
         <div className="flex flex-col md:flex-row gap-4 items-center">
             <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar por cliente ou obrigação..." 
                    value={filterText}
                    onChange={e => setFilterText(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
             </div>
             <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                 {DEPARTMENTS.map(dept => (
                     <button
                        key={dept}
                        onClick={() => setSelectedDept(dept)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                            selectedDept === dept 
                            ? 'bg-slate-800 text-white' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                     >
                        {dept}
                     </button>
                 ))}
             </div>
             <select 
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
             >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
             </select>
         </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Obrigação</th>
                <th className="px-6 py-4">Departamento</th>
                <th className="px-6 py-4">Competência</th>
                <th className="px-6 py-4">Prazo Limite</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRoutines.length === 0 ? (
                  <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                          Nenhuma rotina encontrada com os filtros selecionados.
                      </td>
                  </tr>
              ) : (
                  filteredRoutines.map((routine) => (
                    <tr key={routine.id} className="bg-white hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{routine.clientName}</td>
                      <td className="px-6 py-4 text-slate-700">{routine.title}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold
                          ${routine.department === 'Pessoal' ? 'bg-purple-100 text-purple-700' : 
                            routine.department === 'Fiscal' ? 'bg-blue-100 text-blue-700' :
                            routine.department === 'Contábil' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'
                          }
                        `}>
                          {routine.department}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{routine.competence}</td>
                      <td className="px-6 py-4 font-medium text-slate-700 flex items-center gap-2">
                          <Calendar size={14} className="text-slate-400"/>
                          {new Date(routine.deadline).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(routine.status)}`}>
                          {routine.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <button className="text-blue-600 hover:text-blue-800 font-medium text-xs hover:underline">
                            Detalhes
                         </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MonthlyRoutines;
