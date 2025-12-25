import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Cell, Pie, PieChart, ResponsiveContainer, BarChart, Bar, Tooltip, XAxis, YAxis } from 'recharts';
import { RequestData } from '../types';
import { springConfig } from '../lib/animations';

interface WidgetsProps {
  requests: RequestData[];
  loading?: boolean;
}

const COLORS = ['#007AFF', '#5AC8FA', '#A855F7', '#F97316', '#EF4444', '#14B8A6'];

const Widgets: React.FC<WidgetsProps> = ({ requests, loading }) => {

  const advisorStats = useMemo(() => {
    const counts: Record<string, number> = {};
    requests.forEach(r => {
      counts[r.advisor] = (counts[r.advisor] || 0) + 1;
    });

    const total = requests.length || 1;
    return Object.entries(counts)
      .map(([name, count], index) => ({
        name,
        count,
        percent: Math.round((count / total) * 100),
        color: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [requests]);

  const productStats = useMemo(() => {
    const counts: Record<string, number> = {};
    requests.forEach(r => {
      const key = r.product;
      counts[key] = (counts[key] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value], index) => ({
        name,
        value,
        color: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [requests]);

  const volumeStats = useMemo(() => {
    const counts: Record<string, number> = {};
    requests.forEach(r => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });

    const typeColors: Record<string, string> = {
      'Video completo': '#007AFF',
      'Variante': '#5AC8FA',
      'Corrección': '#F97316',
      'Agregado': '#14B8A6'
    };

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: typeColors[name] || '#9CA3AF'
    }));
  }, [requests]);

  const totalRequests = requests.length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Advisor Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springConfig.gentle, delay: 0 }}
        className="glass border border-white/10 rounded-2xl p-6 flex flex-col h-full min-h-[280px] shadow-apple"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-white">Solicitudes por Asesor</h3>
        </div>
        <div className="space-y-4 flex-1">
          {loading ? (
            Array.from({length: 5}).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-3 w-20 bg-white/5 rounded-lg animate-pulse"></div>
                  <div className="h-3 w-8 bg-white/5 rounded-lg animate-pulse"></div>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full"></div>
              </div>
            ))
          ) : advisorStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8 opacity-60">
              <span className="material-icons-round text-3xl text-muted-dark mb-2">person_off</span>
              <p className="text-xs text-muted-dark">Sin registros para este periodo</p>
            </div>
          ) : (
            advisorStats.map((advisor, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">{advisor.name}</span>
                  <span className="text-white font-bold">{advisor.count}</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${advisor.percent}%` }}
                    transition={{ duration: 1, delay: index * 0.1 }}
                    className="h-2 rounded-full"
                    style={{ backgroundColor: advisor.color }}
                  />
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Product Stats - Donut Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springConfig.gentle, delay: 0.1 }}
        className="glass border border-white/10 rounded-2xl p-6 relative flex flex-col h-full min-h-[280px] shadow-apple"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-white">Solicitudes por Servicio</h3>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="w-32 h-32 rounded-full border-8 border-white/5 animate-pulse flex items-center justify-center">
              <div className="h-4 w-8 bg-white/5 rounded"></div>
            </div>
            <div className="space-y-2">
              {Array.from({length: 4}).map((_, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/5 animate-pulse"></div>
                  <div className="h-3 w-16 bg-white/5 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        ) : productStats.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8 opacity-60">
            <span className="material-icons-round text-3xl text-muted-dark mb-2">donut_small</span>
            <p className="text-xs text-muted-dark">Sin registros para este periodo</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 min-h-[160px]">
            <div className="relative w-40 h-40 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={productStats}
                    innerRadius={55}
                    outerRadius={70}
                    cx="50%"
                    cy="50%"
                    paddingAngle={0}
                    dataKey="value"
                    stroke="none"
                    strokeWidth={0}
                    startAngle={90}
                    endAngle={-270}
                  >
                    {productStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1C1C1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none pb-1">
                <span className="text-3xl font-bold text-white leading-none">{totalRequests}</span>
                <span className="text-[10px] text-muted-dark font-bold uppercase mt-1">Total</span>
              </div>
            </div>

            <div className="space-y-2 w-full sm:w-auto">
              {productStats.map((prod, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center text-xs"
                >
                  <span className="w-2.5 h-2.5 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: prod.color }}></span>
                  <span className="text-gray-400 truncate max-w-[120px]" title={prod.name}>{prod.name}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Volume Stats - Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springConfig.gentle, delay: 0.2 }}
        className="glass border border-white/10 rounded-2xl p-6 flex flex-col h-full min-h-[280px] shadow-apple"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Volumen por Tipo</h3>
        </div>
        <div className="flex-1 w-full min-h-[140px] flex items-center justify-center">
          {loading ? (
            <div className="flex items-end space-x-4 h-full pt-4">
              <div className="w-8 h-12 bg-white/5 rounded-lg animate-pulse"></div>
              <div className="w-8 h-20 bg-white/5 rounded-lg animate-pulse"></div>
              <div className="w-8 h-16 bg-white/5 rounded-lg animate-pulse"></div>
              <div className="w-8 h-8 bg-white/5 rounded-lg animate-pulse"></div>
            </div>
          ) : volumeStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center opacity-60">
              <span className="material-icons-round text-3xl text-muted-dark mb-2">bar_chart</span>
              <p className="text-xs text-muted-dark">Sin registros para este periodo</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#98989D' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#98989D' }} />
                <Tooltip
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{ backgroundColor: '#1C1C1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {volumeStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.9} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

    </div>
  );
};

export default Widgets;
