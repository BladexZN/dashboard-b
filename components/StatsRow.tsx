import React from 'react';
import { motion } from 'framer-motion';
import { springConfig } from '../lib/animations';

interface StatsRowProps {
  stats: {
    total: number;
    pending: number;
    production: number;
    completed: number;
  };
  loading?: boolean;
}

const StatsRow: React.FC<StatsRowProps> = ({ stats, loading }) => {
  const data = [
    {
      title: "Total Solicitudes",
      value: stats.total,
      icon: "folder_open",
      colorClass: "text-blue-400",
      bgClass: "bg-blue-500/10",
      hoverBg: "group-hover:bg-blue-500"
    },
    {
      title: "Pendientes",
      value: stats.pending,
      icon: "hourglass_empty",
      colorClass: "text-yellow-400",
      bgClass: "bg-yellow-500/10",
      hoverBg: "group-hover:bg-yellow-500"
    },
    {
      title: "En Producción",
      value: stats.production,
      icon: "precision_manufacturing",
      colorClass: "text-purple-400",
      bgClass: "bg-purple-500/10",
      hoverBg: "group-hover:bg-purple-500"
    },
    {
      title: "Listo / Entregado",
      value: stats.completed,
      icon: "check_circle",
      colorClass: "text-primary",
      bgClass: "bg-primary/10",
      hoverBg: "group-hover:bg-primary"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {data.map((stat, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springConfig.snappy, delay: index * 0.05 }}
          whileHover={{ scale: 1.02, y: -2 }}
          className="glass border border-white/10 rounded-2xl p-5 flex items-center space-x-4 hover:border-primary/30 apple-transition cursor-default group shadow-apple"
        >
          <motion.div
            whileHover={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.4 }}
            className={`w-12 h-12 rounded-xl flex items-center justify-center apple-transition ${stat.bgClass} ${stat.hoverBg} ${stat.colorClass} group-hover:text-white`}
          >
            <span className="material-icons-round text-2xl">{stat.icon}</span>
          </motion.div>
          <div className="flex-1">
            {loading ? (
              <div className="space-y-2">
                <div className="h-6 w-16 bg-white/5 rounded-lg animate-pulse"></div>
                <div className="h-3 w-24 bg-white/5 rounded-lg animate-pulse"></div>
              </div>
            ) : (
              <>
                <motion.p
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ ...springConfig.bouncy, delay: index * 0.05 + 0.2 }}
                  className="text-2xl font-bold text-white"
                >
                  {stat.value}
                </motion.p>
                <p className="text-[10px] font-bold text-muted-dark uppercase tracking-wider mt-0.5">{stat.title}</p>
              </>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default StatsRow;
