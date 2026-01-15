import React, { useState, useEffect } from 'react';
import { RequestStatus } from '../types';

interface ActivityCountdownProps {
  createdAt: string;
  status: RequestStatus;
  compact?: boolean;
}

// Umbrales de tiempo (en milisegundos)
const WARNING_THRESHOLD_MS = 24 * 60 * 60 * 1000;  // 24 horas
const DEADLINE_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 horas

type TimeStatus = 'normal' | 'possible_delay' | 'delayed';

interface TimeDisplay {
  hours: number;
  minutes: number;
}

const ActivityCountdown: React.FC<ActivityCountdownProps> = ({ createdAt, status, compact = false }) => {
  const [timeStatus, setTimeStatus] = useState<TimeStatus>('normal');
  const [timeRemaining, setTimeRemaining] = useState<TimeDisplay | null>(null);
  const [delayDuration, setDelayDuration] = useState<TimeDisplay>({ hours: 0, minutes: 0 });

  useEffect(() => {
    // No mostrar cronómetro para tareas completadas
    if (status === 'Entregado' || status === 'Listo') {
      return;
    }

    const calculateTime = () => {
      if (!createdAt) return;

      const created = new Date(createdAt);
      const now = new Date();
      const elapsed = now.getTime() - created.getTime();

      if (elapsed >= DEADLINE_THRESHOLD_MS) {
        // RETRASADA: más de 48h desde creación
        const delayTime = elapsed - DEADLINE_THRESHOLD_MS;
        const delayHours = Math.floor(delayTime / (1000 * 60 * 60));
        const delayMinutes = Math.floor((delayTime % (1000 * 60 * 60)) / (1000 * 60));
        setTimeStatus('delayed');
        setDelayDuration({ hours: delayHours, minutes: delayMinutes });
        setTimeRemaining(null);
      } else if (elapsed >= WARNING_THRESHOLD_MS) {
        // POSIBLE RETRASO: entre 24-48h
        const remaining = DEADLINE_THRESHOLD_MS - elapsed;
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        setTimeStatus('possible_delay');
        setTimeRemaining({ hours, minutes });
      } else {
        // NORMAL: menos de 24h - mostrar tiempo transcurrido
        const hours = Math.floor(elapsed / (1000 * 60 * 60));
        const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
        setTimeStatus('normal');
        setTimeRemaining({ hours, minutes });
      }
    };

    // Calcular inmediatamente
    calculateTime();

    // Actualizar cada minuto
    const interval = setInterval(calculateTime, 60000);
    return () => clearInterval(interval);
  }, [createdAt, status]);

  // No mostrar para tareas completadas
  if (status === 'Entregado' || status === 'Listo') {
    return null;
  }

  // Estilos según estado
  const getStyles = (): string => {
    switch (timeStatus) {
      case 'delayed':
        return 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse';
      case 'possible_delay':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/40 animate-pulse';
      case 'normal':
      default:
        if (!timeRemaining) return 'bg-white/5 text-gray-400 border-white/10';
        // Colores según urgencia dentro de las primeras 24h
        if (timeRemaining.hours >= 18) {
          return 'bg-white/5 text-gray-400 border-white/10';
        }
        if (timeRemaining.hours >= 6) {
          return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
        }
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    }
  };

  // Texto dinámico
  const getText = (): string => {
    switch (timeStatus) {
      case 'delayed':
        return `RETRASADA · Lleva ${delayDuration.hours}h ${delayDuration.minutes}m`;
      case 'possible_delay':
        return `POSIBLE RETRASO · ${timeRemaining?.hours}h ${timeRemaining?.minutes}m`;
      case 'normal':
      default:
        if (!timeRemaining) return '';
        return `${timeRemaining.hours}h ${timeRemaining.minutes}m`;
    }
  };

  const text = getText();
  if (!text) return null;

  return (
    <div
      className={`
        inline-flex items-center gap-1 rounded-lg border
        ${compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]'}
        font-bold uppercase tracking-wider
        ${getStyles()}
      `}
    >
      <span className="material-icons-round" style={{ fontSize: compact ? '10px' : '12px' }}>
        schedule
      </span>
      {text}
    </div>
  );
};

export default ActivityCountdown;
