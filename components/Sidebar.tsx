import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Page, BoardNumber, BOARD_NAMES } from '../types';
import { springConfig, buttonTap, buttonHover } from '../lib/animations';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  selectedBoard: BoardNumber | null;
  onSelectBoard: (board: BoardNumber | null) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, selectedBoard, onSelectBoard }) => {
  const [isBoardsExpanded, setIsBoardsExpanded] = useState(true);

  const isActive = (page: Page) => currentPage === page;

  return (
    <aside className="w-72 glass-darker border-r border-white/10 flex flex-col flex-shrink-0 h-full">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={springConfig.gentle}
        className="p-6 flex items-center space-x-3 cursor-pointer"
        onClick={() => onNavigate('dashboard')}
      >
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-10 h-10 flex-shrink-0 glass rounded-xl flex items-center justify-center border border-white/10 overflow-hidden shadow-apple"
        >
          <img src="https://i.imgur.com/fJgCqFA.png" alt="DC Digital Logo" className="w-full h-full object-contain p-1" />
        </motion.div>
        <span className="text-sm font-bold tracking-tight text-white leading-tight">
          Digital DC<br/>Dashboard Production
        </span>
      </motion.div>

      <div className="px-4 mb-4">
        <div className="relative group">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-icons-round text-muted-dark text-lg group-focus-within:text-primary apple-transition">search</span>
          </span>
          <input
            className="w-full glass border border-white/10 text-sm text-white rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 placeholder-muted-dark apple-transition"
            placeholder="Buscar..."
            type="text"
          />
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        <motion.div
          whileHover={buttonHover}
          whileTap={buttonTap}
          onClick={() => onNavigate('dashboard')}
          className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl apple-transition cursor-pointer ${
            isActive('dashboard')
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'text-muted-dark hover:bg-white/5 hover:text-white border border-transparent'
          }`}
        >
          <span className="material-icons-round mr-3 text-lg">dashboard</span>
          Dashboard
        </motion.div>

        <motion.div
          whileHover={buttonHover}
          whileTap={buttonTap}
          onClick={() => onNavigate('solicitudes')}
          className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl apple-transition cursor-pointer ${
            isActive('solicitudes')
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'text-muted-dark hover:bg-white/5 hover:text-white border border-transparent'
          }`}
        >
          <span className="material-icons-round mr-3 text-lg">assignment</span>
          Solicitudes
        </motion.div>

        {/* Expandable Production Boards Section */}
        <div className="space-y-1">
          <motion.button
            whileHover={buttonHover}
            whileTap={buttonTap}
            onClick={() => setIsBoardsExpanded(!isBoardsExpanded)}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-xl apple-transition ${
              isActive('produccion')
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-muted-dark hover:bg-white/5 hover:text-white border border-transparent'
            }`}
          >
            <div className="flex items-center">
              <span className="material-icons-round mr-3 text-lg">movie_creation</span>
              Producción
            </div>
            <motion.span
              animate={{ rotate: isBoardsExpanded ? 180 : 0 }}
              transition={springConfig.snappy}
              className="material-icons-round text-sm"
            >
              expand_more
            </motion.span>
          </motion.button>

          <AnimatePresence>
            {isBoardsExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={springConfig.snappy}
                className="ml-4 pl-3 border-l-2 border-white/10 space-y-0.5 overflow-hidden"
              >
                {/* All boards option */}
                <motion.button
                  whileHover={{ x: 4 }}
                  whileTap={buttonTap}
                  onClick={() => {
                    onSelectBoard(null);
                    onNavigate('produccion');
                  }}
                  className={`w-full flex items-center px-3 py-2 text-xs font-bold rounded-xl apple-transition ${
                    isActive('produccion') && selectedBoard === null
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-dark hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="material-icons-round mr-2 text-sm">grid_view</span>
                  Todos los Tableros
                </motion.button>

                {/* Individual boards */}
                {([1, 2, 3, 4] as BoardNumber[]).map((boardNum, idx) => (
                  <motion.button
                    key={boardNum}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...springConfig.snappy, delay: idx * 0.03 }}
                    whileHover={{ x: 4 }}
                    whileTap={buttonTap}
                    onClick={() => {
                      onSelectBoard(boardNum);
                      onNavigate('produccion');
                    }}
                    className={`w-full flex items-center px-3 py-2 text-xs font-bold rounded-xl apple-transition ${
                      isActive('produccion') && selectedBoard === boardNum
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-dark hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="material-icons-round mr-2 text-sm">dashboard</span>
                    {BOARD_NAMES[boardNum]}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div
          whileHover={buttonHover}
          whileTap={buttonTap}
          onClick={() => onNavigate('reportes')}
          className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl apple-transition cursor-pointer ${
            isActive('reportes')
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'text-muted-dark hover:bg-white/5 hover:text-white border border-transparent'
          }`}
        >
          <span className="material-icons-round mr-3 text-lg">bar_chart</span>
          Reportes
        </motion.div>

        <motion.div
          whileHover={buttonHover}
          whileTap={buttonTap}
          onClick={() => onNavigate('bitacora')}
          className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl apple-transition cursor-pointer ${
            isActive('bitacora')
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'text-muted-dark hover:bg-white/5 hover:text-white border border-transparent'
          }`}
        >
          <span className="material-icons-round mr-3 text-lg">history_edu</span>
          Bitácora
        </motion.div>

        <motion.div
          whileHover={buttonHover}
          whileTap={buttonTap}
          onClick={() => onNavigate('usuarios')}
          className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl apple-transition cursor-pointer ${
            isActive('usuarios')
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'text-muted-dark hover:bg-white/5 hover:text-white border border-transparent'
          }`}
        >
          <span className="material-icons-round mr-3 text-lg">people</span>
          Usuarios
        </motion.div>

        <motion.div
          whileHover={buttonHover}
          whileTap={buttonTap}
          onClick={() => onNavigate('ads-lab')}
          className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl apple-transition cursor-pointer ${
            isActive('ads-lab')
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'text-muted-dark hover:bg-white/5 hover:text-white border border-transparent'
          }`}
        >
          <span className="material-icons-round mr-3 text-lg">science</span>
          Ads Lab
        </motion.div>
      </nav>

      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        <motion.div
          whileHover={buttonHover}
          whileTap={buttonTap}
          onClick={() => onNavigate('configuracion')}
          className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl apple-transition cursor-pointer ${
            isActive('configuracion')
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'text-muted-dark hover:bg-white/5 hover:text-white border border-transparent'
          }`}
        >
          <span className="material-icons-round mr-3 text-lg">settings</span>
          Configuración
        </motion.div>
      </div>
    </aside>
  );
};

export default Sidebar;
