import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, Cell, PieChart, Pie
} from 'recharts';
import { RequestData, AuditLogEntry, DateFilter } from '../types';
import { springConfig, buttonTap, buttonHover } from '../lib/animations';

interface ReportsViewProps {
  requests: RequestData[];
  history: AuditLogEntry[];
  dateFilter: DateFilter;
  loading?: boolean;
}

const ReportsView: React.FC<ReportsViewProps> = ({ requests, history, dateFilter, loading }) => {
  const [filterAdvisor, setFilterAdvisor] = useState('Todos');
  const [filterType, setFilterType] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  const calculateDuration = (start: string, end: string) => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    if (diff < 0) return 0;
    const hours = diff / (1000 * 60 * 60);
    return hours;
  };

  const formatDuration = (hours: number) => {
    if (hours === 0) return '—';
    if (hours < 1) return '< 1h';
    if (hours < 24) return `${Math.round(hours)}h`;
    const days = Math.floor(hours / 24);
    const remHours = Math.round(hours % 24);
    return `${days}d ${remHours}h`;
  };

  const processedData = useMemo(() => {
    return requests.map(req => {
      const reqHistory = history
        .filter(h => h.solicitudId === req.uuid)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const createdTime = req.rawDate;
      const prodEvent = reqHistory.find(h => h.status === 'En Producción');
      const listoEvent = reqHistory.find(h => h.status === 'Listo');
      const deliveredEvent = reqHistory.find(h => h.status === 'Entregado');

      const timeToProd = prodEvent ? calculateDuration(createdTime, prodEvent.timestamp) : null;
      const timeToListo = listoEvent ? calculateDuration(createdTime, listoEvent.timestamp) : null;
      const timeToDeliver = deliveredEvent ? calculateDuration(createdTime, deliveredEvent.timestamp) : null;

      const correctionCount = reqHistory.filter(h => h.status === 'Corrección').length;
      const hasCorrection = correctionCount > 0;

      return {
        ...req,
        timeToProd,
        timeToListo,
        timeToDeliver,
        correctionCount,
        hasCorrection
      };
    });
  }, [requests, history]);

  const kpis = useMemo(() => {
    const total = processedData.length;
    if (total === 0) return null;

    const avg = (values: (number | null)[]) => {
      const valid = values.filter(v => v !== null) as number[];
      if (valid.length === 0) return 0;
      return valid.reduce((a, b) => a + b, 0) / valid.length;
    };

    const avgToProd = avg(processedData.map(r => r.timeToProd));
    const avgToListo = avg(processedData.map(r => r.timeToListo));
    const avgToDeliver = avg(processedData.map(r => r.timeToDeliver));

    const quickListoCount = processedData.filter(r => r.timeToListo !== null && r.timeToListo <= 24).length;
    const totalWithListo = processedData.filter(r => r.timeToListo !== null).length;
    const percentQuick = totalWithListo > 0 ? (quickListoCount / totalWithListo) * 100 : 0;

    const correctionCount = processedData.filter(r => r.hasCorrection).length;
    const percentCorrection = (correctionCount / total) * 100;

    return {
      total,
      avgToProd: formatDuration(avgToProd),
      avgToListo: formatDuration(avgToListo),
      avgToDeliver: formatDuration(avgToDeliver),
      percentQuick: Math.round(percentQuick) + '%',
      percentCorrection: Math.round(percentCorrection) + '%'
    };
  }, [processedData]);

  const statusDistData = useMemo(() => {
    const counts: Record<string, number> = {
      'Pendiente': 0, 'En Producción': 0, 'Corrección': 0, 'Listo': 0, 'Entregado': 0
    };
    processedData.forEach(r => {
      if (counts[r.status] !== undefined) counts[r.status]++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [processedData]);

  const STATUS_COLORS: Record<string, string> = {
    'Pendiente': '#EAB308',
    'En Producción': '#A855F7',
    'Corrección': '#F97316',
    'Listo': '#007AFF',
    'Entregado': '#5AC8FA'
  };

  const trendData = useMemo(() => {
    const dailyData: Record<string, { date: string; creadas: number; entregadas: number }> = {};

    // Pre-compute delivered events map for O(1) lookup instead of O(n) find
    const deliveredMap = new Map<string, AuditLogEntry>(
      history
        .filter(h => h.status === 'Entregado')
        .map(h => [h.solicitudId, h])
    );

    processedData.forEach(r => {
      const day = new Date(r.rawDate).toLocaleDateString('en-CA');
      if (!dailyData[day]) dailyData[day] = { date: day, creadas: 0, entregadas: 0 };
      dailyData[day].creadas++;
    });
    processedData.forEach(r => {
      const deliveredHistory = deliveredMap.get(r.uuid);
      if (deliveredHistory) {
        const day = new Date(deliveredHistory.timestamp).toLocaleDateString('en-CA');
        if (!dailyData[day]) dailyData[day] = { date: day, creadas: 0, entregadas: 0 };
        dailyData[day].entregadas++;
      }
    });
    return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
  }, [processedData, history]);

  const serviceStats = useMemo(() => {
    const groups: Record<string, { total: number, timeToListoSum: number, countToListo: number }> = {};
    processedData.forEach(r => {
      const prod = r.product || 'Sin servicio';
      if (!groups[prod]) groups[prod] = { total: 0, timeToListoSum: 0, countToListo: 0 };
      groups[prod].total++;
      if (r.timeToListo !== null) {
        groups[prod].timeToListoSum += r.timeToListo;
        groups[prod].countToListo++;
      }
    });
    return Object.entries(groups)
      .map(([name, stat]) => ({ name, total: stat.total, avgToListo: stat.countToListo > 0 ? stat.timeToListoSum / stat.countToListo : 0 }))
      .sort((a, b) => b.total - a.total).slice(0, 5);
  }, [processedData]);

  const advisorStats = useMemo(() => {
    const groups: Record<string, { total: number, corrections: number, timeToListoSum: number, countToListo: number }> = {};
    processedData.forEach(r => {
      const adv = r.advisor || 'Sin Asignar';
      if (!groups[adv]) groups[adv] = { total: 0, corrections: 0, timeToListoSum: 0, countToListo: 0 };
      groups[adv].total++;
      if (r.hasCorrection) groups[adv].corrections++;
      if (r.timeToListo !== null) {
        groups[adv].timeToListoSum += r.timeToListo;
        groups[adv].countToListo++;
      }
    });
    return Object.entries(groups)
      .map(([name, stat]) => ({ name, total: stat.total, percentCorrection: (stat.corrections / stat.total) * 100, avgToListo: stat.countToListo > 0 ? stat.timeToListoSum / stat.countToListo : 0 }))
      .sort((a, b) => b.total - a.total).slice(0, 5);
  }, [processedData]);

  const filteredDetailedData = useMemo(() => {
    return processedData.filter(r => {
      const matchAdvisor = filterAdvisor === 'Todos' || r.advisor === filterAdvisor;
      const matchType = filterType === 'Todos' || r.type === filterType;
      const matchStatus = filterStatus === 'Todos' || r.status === filterStatus;
      const matchSearch = r.client.toLowerCase().includes(searchQuery.toLowerCase()) || r.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchAdvisor && matchType && matchStatus && matchSearch;
    });
  }, [processedData, filterAdvisor, filterType, filterStatus, searchQuery]);

  const advisors = useMemo(() => ['Todos', ...Array.from(new Set(processedData.map(r => r.advisor)))], [processedData]);
  const types = useMemo(() => ['Todos', ...Array.from(new Set(processedData.map(r => r.type)))], [processedData]);
  const statuses = ['Todos', 'Pendiente', 'En Producción', 'Corrección', 'Listo', 'Entregado'];

  const handleExportCSV = () => {
    const headers = ["Folio", "Cliente", "Servicio", "Tipo", "Asesor", "Estado Actual", "Fecha Creación", "Tiempo a Listo (h)", "Correcciones"];
    const rows = filteredDetailedData.map(r => [r.id, r.client, r.product, r.type, r.advisor, r.status, r.date, r.timeToListo ? r.timeToListo.toFixed(1) : '', r.correctionCount]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_detallado_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={springConfig.gentle}
      className="space-y-8 pb-12"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Reportes y Métricas</h2>
          <p className="text-xs text-muted-dark mt-1">
            Datos basados en fecha de creación: <span className="font-bold text-primary">{dateFilter}</span>
          </p>
        </div>
        <motion.button
          whileHover={buttonHover}
          whileTap={buttonTap}
          onClick={handleExportCSV}
          disabled={loading || filteredDetailedData.length === 0}
          className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-full text-sm font-bold apple-transition shadow-apple-glow flex items-center w-fit disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-icons-round mr-2 text-sm">download</span>
          Exportar CSV Actual
        </motion.button>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {loading ? (
          Array.from({length: 6}).map((_, i) => (
            <div key={i} className="glass border border-white/10 p-4 rounded-2xl flex flex-col justify-between h-28">
              <div className="w-8 h-8 rounded-xl bg-white/5 animate-pulse mb-3"></div>
              <div className="space-y-2">
                <div className="h-6 w-12 bg-white/5 animate-pulse rounded-lg"></div>
                <div className="h-2 w-16 bg-white/5 animate-pulse rounded-lg"></div>
              </div>
            </div>
          ))
        ) : kpis ? (
          [
            { title: "Total Solicitudes", value: kpis.total, icon: "functions", color: "text-blue-400" },
            { title: "Tiempo a Prod.", value: kpis.avgToProd, icon: "timer", color: "text-purple-400" },
            { title: "Tiempo a Listo", value: kpis.avgToListo, icon: "check_circle", color: "text-green-400" },
            { title: "Tiempo a Entrega", value: kpis.avgToDeliver, icon: "local_shipping", color: "text-teal-400" },
            { title: "% Listo en 24h", value: kpis.percentQuick, icon: "bolt", color: "text-yellow-400" },
            { title: "% Con Corrección", value: kpis.percentCorrection, icon: "build", color: "text-orange-400" },
          ].map((kpi, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springConfig.snappy, delay: idx * 0.05 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="glass border border-white/10 p-4 rounded-2xl flex flex-col justify-between shadow-apple"
            >
              <div className={`w-8 h-8 rounded-xl ${kpi.color.replace('text-', 'bg-')}/10 flex items-center justify-center mb-3`}>
                <span className={`material-icons-round ${kpi.color} text-lg`}>{kpi.icon}</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{kpi.value}</p>
                <p className="text-[10px] uppercase font-bold text-muted-dark tracking-wider">{kpi.title}</p>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full text-center py-6 text-muted-dark">No hay datos disponibles</div>
        )}
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-80">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springConfig.gentle, delay: 0.1 }}
          className="glass border border-white/10 rounded-2xl p-5 flex flex-col shadow-apple"
        >
          <h3 className="text-sm font-bold text-white mb-4">Estado Actual</h3>
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <div className="w-32 h-32 rounded-full border-8 border-white/5 animate-pulse flex items-center justify-center">
                <div className="h-4 w-8 bg-white/5 rounded"></div>
              </div>
            </div>
          ) : (
            <div className="flex-1 w-full min-h-0 relative flex flex-col">
              <div className="flex-1 min-h-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie data={statusDistData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={0} startAngle={90} endAngle={-270} stroke="none">
                      {statusDistData.map((entry, index) => <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#666'} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1C1C1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none pb-2">
                  <span className="text-3xl font-bold text-white leading-none">{processedData.length}</span>
                  <span className="text-[10px] text-muted-dark font-bold uppercase mt-1">Total</span>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-4">
                {statusDistData.map((s, i) => (
                  <div key={i} className="flex items-center text-[10px]">
                    <span className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: STATUS_COLORS[s.name] }}></span>
                    <span className="text-muted-dark">{s.name} ({s.value})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springConfig.gentle, delay: 0.2 }}
          className="lg:col-span-2 glass border border-white/10 rounded-2xl p-5 flex flex-col shadow-apple"
        >
          <h3 className="text-sm font-bold text-white mb-4">Tendencia: Creadas vs Entregadas</h3>
          {loading ? (
            <div className="flex-1 flex items-end space-x-2 pb-4 pt-4">
              {Array.from({length: 12}).map((_, i) => (
                <div key={i} className="flex-1 bg-white/5 animate-pulse rounded-lg" style={{ height: `${Math.random() * 80 + 20}%` }}></div>
              ))}
            </div>
          ) : (
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="date" tick={{fontSize: 10, fill: '#98989D'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize: 10, fill: '#98989D'}} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1C1C1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} labelStyle={{ color: '#98989D' }} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}/>
                  <Line type="monotone" dataKey="creadas" name="Solicitudes Creadas" stroke="#007AFF" strokeWidth={2} dot={{r: 3}} activeDot={{r: 5}} />
                  <Line type="monotone" dataKey="entregadas" name="Entregadas" stroke="#5AC8FA" strokeWidth={2} dot={{r: 3}} activeDot={{r: 5}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>
      </div>

      {/* TOP TABLES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springConfig.gentle, delay: 0.3 }}
          className="glass border border-white/10 rounded-2xl overflow-hidden shadow-apple"
        >
          <div className="px-5 py-3 border-b border-white/10 bg-black/20">
            <h3 className="text-sm font-bold text-white">Top Servicios</h3>
          </div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-muted-dark border-b border-white/10">
                <th className="px-5 py-3 font-bold uppercase tracking-wider">Servicio</th>
                <th className="px-5 py-3 font-bold uppercase tracking-wider text-right">Total</th>
                <th className="px-5 py-3 font-bold uppercase tracking-wider text-right">Prom. a Listo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? Array.from({length: 5}).map((_, i) => (
                <tr key={i}><td colSpan={3} className="px-5 py-3"><div className="h-3 w-full bg-white/5 rounded-lg animate-pulse"></div></td></tr>
              )) : serviceStats.map((s, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="hover:bg-white/5 apple-transition"
                >
                  <td className="px-5 py-2.5 text-white font-medium truncate max-w-[100px] sm:max-w-[150px] lg:max-w-[200px]">{s.name}</td>
                  <td className="px-5 py-2.5 text-right text-gray-300">{s.total}</td>
                  <td className="px-5 py-2.5 text-right text-primary font-bold">{formatDuration(s.avgToListo)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springConfig.gentle, delay: 0.35 }}
          className="glass border border-white/10 rounded-2xl overflow-hidden shadow-apple"
        >
          <div className="px-5 py-3 border-b border-white/10 bg-black/20">
            <h3 className="text-sm font-bold text-white">Rendimiento Asesores</h3>
          </div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-muted-dark border-b border-white/10">
                <th className="px-5 py-3 font-bold uppercase tracking-wider">Asesor</th>
                <th className="px-5 py-3 font-bold uppercase tracking-wider text-right">Total</th>
                <th className="px-5 py-3 font-bold uppercase tracking-wider text-right">% Corr.</th>
                <th className="px-5 py-3 font-bold uppercase tracking-wider text-right">Prom. a Listo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? Array.from({length: 5}).map((_, i) => (
                <tr key={i}><td colSpan={4} className="px-5 py-3"><div className="h-3 w-full bg-white/5 rounded-lg animate-pulse"></div></td></tr>
              )) : advisorStats.map((s, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="hover:bg-white/5 apple-transition"
                >
                  <td className="px-5 py-2.5 text-white font-medium">{s.name}</td>
                  <td className="px-5 py-2.5 text-right text-gray-300">{s.total}</td>
                  <td className={`px-5 py-2.5 text-right font-bold ${s.percentCorrection > 20 ? 'text-orange-400' : 'text-green-400'}`}>{Math.round(s.percentCorrection)}%</td>
                  <td className="px-5 py-2.5 text-right text-gray-400">{formatDuration(s.avgToListo)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>

      {/* DETAILED TABLE */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springConfig.gentle, delay: 0.4 }}
        className="glass border border-white/10 rounded-2xl flex flex-col shadow-apple"
      >
        <div className="p-5 border-b border-white/10">
          <h3 className="text-sm font-bold text-white mb-4">Detalle de Solicitudes (Filtrado)</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              placeholder="Buscar folio o cliente..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="glass border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:ring-2 focus:ring-primary/50 focus:outline-none placeholder-muted-dark apple-transition"
            />
            <select
              value={filterAdvisor}
              onChange={e => setFilterAdvisor(e.target.value)}
              className="glass border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:ring-2 focus:ring-primary/50 focus:outline-none apple-transition"
            >
              {advisors.map(a => <option key={a} value={a}>Asesor: {a}</option>)}
            </select>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="glass border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:ring-2 focus:ring-primary/50 focus:outline-none apple-transition"
            >
              {types.map(t => <option key={t} value={t}>Tipo: {t}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="glass border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:ring-2 focus:ring-primary/50 focus:outline-none apple-transition"
            >
              {statuses.map(s => <option key={s} value={s}>Estado: {s}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-black/20 border-b border-white/10 text-muted-dark uppercase tracking-wider">
                <th className="px-5 py-3 font-bold">Folio</th>
                <th className="px-5 py-3 font-bold">Cliente</th>
                <th className="px-5 py-3 font-bold">Servicio</th>
                <th className="px-5 py-3 font-bold">Tipo</th>
                <th className="px-5 py-3 font-bold">Estado</th>
                <th className="px-5 py-3 font-bold">Asesor</th>
                <th className="px-5 py-3 font-bold text-right">Tiempo a Listo</th>
                <th className="px-5 py-3 font-bold text-center">Correcciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? Array.from({length: 5}).map((_, i) => (
                <tr key={i}><td colSpan={8} className="px-5 py-4"><div className="h-4 w-full bg-white/5 rounded-lg animate-pulse"></div></td></tr>
              )) : filteredDetailedData.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-muted-dark">No hay resultados con estos filtros.</td></tr>
              ) : (
                filteredDetailedData.map((r, idx) => (
                  <motion.tr
                    key={r.uuid}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="hover:bg-white/5 apple-transition"
                  >
                    <td className="px-5 py-3  text-primary font-bold">{r.id}</td>
                    <td className="px-5 py-3 text-white font-medium">{r.client}</td>
                    <td className="px-5 py-3 text-gray-300 truncate max-w-[100px] sm:max-w-[150px] lg:max-w-[200px]">{r.product}</td>
                    <td className="px-5 py-3 text-muted-dark">{r.type}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold border ${r.status === 'Listo' ? 'bg-primary/10 text-primary border-primary/20' : r.status === 'Corrección' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-white/5 text-gray-400 border-white/10'}`}>{r.status}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-300">{r.advisor}</td>
                    <td className="px-5 py-3 text-right  text-gray-400">{r.timeToListo !== null ? formatDuration(r.timeToListo) : '—'}</td>
                    <td className="px-5 py-3 text-center">{r.correctionCount > 0 ? <span className="text-orange-400 font-bold">{r.correctionCount}</span> : <span className="text-muted-dark/50">-</span>}</td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-white/10 bg-black/20 text-right">
          <span className="text-xs text-muted-dark">Mostrando {loading ? '...' : filteredDetailedData.length} registros</span>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ReportsView;
