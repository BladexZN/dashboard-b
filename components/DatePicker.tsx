import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { springConfig, buttonTap, buttonHover } from '../lib/animations';

interface DatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string | null;
  onSelect: (date: string) => void;
}

const DatePicker: React.FC<DatePickerProps> = ({ isOpen, onClose, selectedDate, onSelect }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (selectedDate && !['Hoy', 'Este Mes', 'Año'].includes(selectedDate)) {
        const parts = selectedDate.split('-');
        if (parts.length === 3) {
          setViewDate(new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
        } else {
          setViewDate(new Date());
        }
      } else {
        setViewDate(new Date());
      }
    }
  }, [isOpen, selectedDate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
  const firstDay = getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const year = viewDate.getFullYear();
    const month = (viewDate.getMonth() + 1).toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    const isoDate = `${year}-${month}-${dayStr}`;
    onSelect(isoDate);
    onClose();
  };

  const isSelected = (day: number) => {
    if (!selectedDate || ['Hoy', 'Este Mes', 'Año'].includes(selectedDate)) return false;
    const parts = selectedDate.split('-');
    if (parts.length !== 3) return false;
    const sYear = parseInt(parts[0]);
    const sMonth = parseInt(parts[1]);
    const sDay = parseInt(parts[2]);

    return sYear === viewDate.getFullYear() && sMonth === viewDate.getMonth() + 1 && sDay === day;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getFullYear() === viewDate.getFullYear() &&
           today.getMonth() === viewDate.getMonth() &&
           today.getDate() === day;
  };

  const MONTHS = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={popupRef}
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={springConfig.snappy}
          className="absolute top-full mt-2 right-0 z-50 glass-darker border border-white/10 rounded-2xl shadow-apple-lg p-4 w-72"
        >
          <div className="flex justify-between items-center mb-4">
            <motion.button
              whileHover={buttonHover}
              whileTap={buttonTap}
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white/10 rounded-xl text-muted-dark hover:text-white apple-transition"
            >
              <span className="material-icons-round text-sm">chevron_left</span>
            </motion.button>
            <span className="text-sm font-bold text-white capitalize">
              {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <motion.button
              whileHover={buttonHover}
              whileTap={buttonTap}
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white/10 rounded-xl text-muted-dark hover:text-white apple-transition"
            >
              <span className="material-icons-round text-sm">chevron_right</span>
            </motion.button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, idx) => (
              <div key={idx} className="text-center text-[10px] font-bold text-muted-dark uppercase">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {blanks.map((_, i) => <div key={`blank-${i}`} />)}
            {days.map((day, idx) => (
              <motion.button
                key={day}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.01 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={() => handleDayClick(day)}
                className={`
                  h-8 w-8 rounded-full text-xs font-bold flex items-center justify-center apple-transition
                  ${isSelected(day)
                    ? 'bg-primary text-white shadow-apple-glow'
                    : isToday(day)
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-gray-300 hover:bg-white/10'
                  }
                `}
              >
                {day}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DatePicker;
