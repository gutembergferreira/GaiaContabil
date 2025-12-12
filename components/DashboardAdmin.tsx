import React from 'react';
import { MOCK_ROUTINES } from '../services/mockData';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';

const DashboardAdmin: React.FC = () => {
  
  // Data processing for charts
  const statusCounts = MOCK_ROUTINES.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.keys(statusCounts).map(key => ({
    name: key,
    value: statusCounts[key]
  }));

  const COLORS = ['#F59E0B', '#10B981', '#EF4444', '#3B82F6']; // Pendente, Concluído, Atrasado, Em Análise

  const deptData = [
    { name: 'Pessoal', entregues: 120, pendentes: 45 },
    { name: 'Fiscal', entregues: 98, pendentes: 30 },
    { name: 'Contábil', entregues: 86, pendentes: 50 },
    { name: 'Legal', entregues: 15, pendentes: 5 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <h2 className="text-2xl font-bold text-slate-800">Visão Geral do Escritório</h2>
         <span className="text-sm text-slate-500">Última atualização: Hoje, 14:30</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 transform hover:-translate-y-1 transition-transform duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Entregas Pendentes</p>
              <h3 className="text-2xl font-bold text-slate-800">130</h3>
            </div>
            <div className="p-3 bg-amber-100 text-amber-600 rounded-full">
              <Clock size={24} />
            </div>
          </div>
          <div className="mt-2 text-xs text-amber-600 font-medium">+12 que semana passada</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 transform hover:-translate-y-1 transition-transform duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Entregues no Prazo</p>
              <h3 className="text-2xl font-bold text-slate-800">319</h3>
            </div>
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
              <CheckCircle size={24} />
            </div>
          </div>
          <div className="mt-2 text-xs text-emerald-600 font-medium">98% de eficiência</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 transform hover:-translate-y-1 transition-transform duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Guias em Atraso</p>
              <h3 className="text-2xl font-bold text-slate-800">12</h3>
            </div>
            <div className="p-3 bg-red-100 text-red-600 rounded-full">
              <AlertCircle size={24} />
            </div>
          </div>
          <div className="mt-2 text-xs text-red-500 font-medium">Ação necessária</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 transform hover:-translate-y-1 transition-transform duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Solicitações Extras</p>
              <h3 className="text-2xl font-bold text-slate-800">8</h3>
            </div>
            <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
              <TrendingUp size={24} />
            </div>
          </div>
          <div className="mt-2 text-xs text-blue-600 font-medium">Novos chamados</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-96">
          <h4 className="text-lg font-semibold text-slate-800 mb-4">Status Geral das Entregas</h4>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-96">
          <h4 className="text-lg font-semibold text-slate-800 mb-4">Performance por Departamento</h4>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={deptData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="entregues" stackId="a" fill="#10B981" name="Entregues" radius={[0, 0, 4, 4]} />
              <Bar dataKey="pendentes" stackId="a" fill="#F59E0B" name="Pendentes" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DashboardAdmin;
