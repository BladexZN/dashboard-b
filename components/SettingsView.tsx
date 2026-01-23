import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { DBNotificationLog, RequestData, AppSettings } from '../types';
import { springConfig, buttonTap, buttonHover } from '../lib/animations';

interface SettingsViewProps {
  requests?: RequestData[];
  settings: AppSettings;
  onToggle: (key: keyof AppSettings) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ requests = [], settings, onToggle }) => {
  const [notificationLogs, setNotificationLogs] = useState<DBNotificationLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoadingLogs(true);
      const { data, error } = await supabase
        .from('notificaciones_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(20);

      if (!error && data) {
        setNotificationLogs(data as any);
      }
      setLoadingLogs(false);
    };
    fetchLogs();
  }, []);

  const getRequestFolio = (uuid: string) => {
    const req = requests.find(r => r.uuid === uuid);
    return req ? req.id : '...';
  };

  const refreshLogs = () => {
    setLoadingLogs(true);
    supabase.from('notificaciones_logs').select('*').order('timestamp', {ascending: false}).limit(20)
      .then(({data}) => {
        if (data) setNotificationLogs(data as any);
        setLoadingLogs(false);
      });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={springConfig.gentle}
      className="max-w-4xl space-y-8"
    >

      {/* General Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springConfig.gentle, delay: 0 }}
        className="glass border border-white/10 rounded-2xl divide-y divide-white/10 shadow-apple overflow-hidden"
      >
        <div className="p-6">
           <h2 className="text-xl font-bold text-white mb-2">Preferencias</h2>
           <p className="text-sm text-muted-dark">Configura el comportamiento general del sistema.</p>
        </div>

        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...springConfig.snappy, delay: 0.05 }}
          className="p-6 flex items-center justify-between hover:bg-white/5 apple-transition"
        >
          <div>
            <h3 className="text-sm font-medium text-white">Notificar a Producción</h3>
            <p className="text-xs text-muted-dark mt-1">Enviar alerta al inbox cuando se cree una nueva solicitud.</p>
          </div>
          <motion.button
            whileHover={buttonHover}
            whileTap={buttonTap}
            onClick={() => onToggle('notifyProduction')}
            className={`w-12 h-7 rounded-full apple-transition relative ${settings.notifyProduction ? 'bg-primary shadow-apple-glow' : 'bg-gray-600'}`}
          >
            <motion.span
              animate={{ x: settings.notifyProduction ? 22 : 4 }}
              transition={springConfig.snappy}
              className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-apple-sm"
            />
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...springConfig.snappy, delay: 0.1 }}
          className="p-6 flex items-center justify-between hover:bg-white/5 apple-transition"
        >
          <div>
            <h3 className="text-sm font-medium text-white">Notificar a Asesor</h3>
            <p className="text-xs text-muted-dark mt-1">Enviar alerta al inbox del asesor cuando una solicitud pase a estado "Entregado".</p>
          </div>
          <motion.button
            whileHover={buttonHover}
            whileTap={buttonTap}
            onClick={() => onToggle('notifyAdvisor')}
            className={`w-12 h-7 rounded-full apple-transition relative ${settings.notifyAdvisor ? 'bg-primary shadow-apple-glow' : 'bg-gray-600'}`}
          >
            <motion.span
              animate={{ x: settings.notifyAdvisor ? 22 : 4 }}
              transition={springConfig.snappy}
              className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-apple-sm"
            />
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Notification Logs Viewer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springConfig.gentle, delay: 0.15 }}
        className="glass border border-white/10 rounded-2xl overflow-hidden shadow-apple"
      >
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
           <div>
             <h2 className="text-lg font-bold text-white flex items-center">
               <span className="material-icons-round text-primary mr-2 text-base">bug_report</span>
               Historial de Notificaciones (Debug)
             </h2>
             <p className="text-xs text-muted-dark mt-1">Registro de eventos de notificaciones enviados por el sistema.</p>
           </div>
           <motion.button
             whileHover={buttonHover}
             whileTap={buttonTap}
             onClick={refreshLogs}
             className="p-2.5 hover:bg-white/10 rounded-xl text-muted-dark hover:text-primary apple-transition"
             title="Recargar logs"
           >
             <span className={`material-icons-round ${loadingLogs ? 'animate-spin' : ''}`}>refresh</span>
           </motion.button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-black/20 border-b border-white/10 text-[10px] uppercase text-muted-dark font-bold tracking-wider">
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Evento</th>
                <th className="px-6 py-4">Folio</th>
                <th className="px-6 py-4">Destinatario</th>
                <th className="px-6 py-4">Canal</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
               {loadingLogs && notificationLogs.length === 0 ? (
                 <tr>
                   <td colSpan={6} className="p-12 text-center text-muted-dark">
                     <div className="flex flex-col items-center">
                       <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-3"></div>
                       <span className="text-xs">Cargando...</span>
                     </div>
                   </td>
                 </tr>
               ) : notificationLogs.length === 0 ? (
                 <tr>
                   <td colSpan={6} className="p-12 text-center text-muted-dark">
                     <span className="material-icons-round text-3xl mb-2 block opacity-50">notifications_off</span>
                     Sin registros recientes.
                   </td>
                 </tr>
               ) : (
                 notificationLogs.map((log, idx) => (
                   <motion.tr
                     key={log.id}
                     initial={{ opacity: 0, x: -10 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ ...springConfig.snappy, delay: idx * 0.02 }}
                     className="hover:bg-white/5 apple-transition"
                   >
                     <td className="px-6 py-4 text-xs  text-muted-dark">
                       {new Date(log.timestamp).toLocaleString()}
                     </td>
                     <td className="px-6 py-4 text-white font-medium">{log.tipo}</td>
                     <td className="px-6 py-4 text-primary text-xs  font-bold">{getRequestFolio(log.solicitud_id)}</td>
                     <td className="px-6 py-4 text-gray-300">{log.destinatario}</td>
                     <td className="px-6 py-4 text-xs uppercase text-muted-dark">{log.canal}</td>
                     <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border
                           ${log.status === 'sent' ? 'bg-primary/10 text-primary border-primary/20' :
                             log.status === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}
                        `}>
                          {log.status}
                        </span>
                     </td>
                   </motion.tr>
                 ))
               )}
            </tbody>
          </table>
        </div>
      </motion.div>

    </motion.div>
  );
};

export default SettingsView;
