import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RequestData, RequestStatus, BoardNumber, VideoType, VIDEO_TYPE_LABELS, BOARD_NAMES } from '../types';
import { springConfig, buttonTap, buttonHover } from '../lib/animations';

interface ProductionKanbanProps {
  requests: RequestData[];
  onStatusChange: (id: string, status: RequestStatus) => void;
  onViewDetail: (request: RequestData) => void;
  selectedBoard: BoardNumber | null;
}

const SECTIONS: RequestStatus[] = ['Pendiente', 'En Producción', 'Corrección', 'Listo', 'Entregado'];

const getVideoTypeBadgeStyles = (videoType: VideoType) => {
  switch (videoType) {
    case 'Original': return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
    case 'Hibrido': return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
    case 'Stock': return 'bg-gray-500/20 text-gray-400 border-gray-500/40';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/40';
  }
};

const ProductionKanban: React.FC<ProductionKanbanProps> = ({ requests, onStatusChange, onViewDetail, selectedBoard }) => {
  const [localSearch, setLocalSearch] = useState('');
  const [draggedRequestId, setDraggedRequestId] = useState<string | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<RequestStatus | null>(null);

  const processedRequests = useMemo(() => {
    let filtered = requests;

    if (selectedBoard !== null) {
      filtered = filtered.filter(r => r.board_number === selectedBoard);
    }

    if (localSearch.trim()) {
      const query = localSearch.toLowerCase().trim();
      filtered = filtered.filter(r => {
        const folio = r.id.toLowerCase();
        const folioNumber = folio.replace('#req-', '').replace('#', '');
        return folio.includes(query) || folioNumber.includes(query);
      });
    }

    return filtered;
  }, [requests, localSearch, selectedBoard]);

  const getPriorityColor = (p: string) => {
    if (p === 'Alta' || p === 'Urgente') return 'bg-red-500';
    if (p === 'Media') return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedRequestId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragEnd = () => {
    setDraggedRequestId(null);
    setActiveDropZone(null);
  };

  const handleDragOver = (e: React.DragEvent, status: RequestStatus) => {
    e.preventDefault();
    if (activeDropZone !== status) {
      setActiveDropZone(status);
    }
  };

  const handleDrop = (e: React.DragEvent, status: RequestStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");

    if (id) {
      onStatusChange(id, status);
    }

    setDraggedRequestId(null);
    setActiveDropZone(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={springConfig.gentle}
      className="space-y-8 pb-12"
    >
      {/* Search Bar Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springConfig.snappy}
        className="glass border border-white/10 p-6 rounded-2xl shadow-apple"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Tablero de Producción
              {selectedBoard !== null && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="px-2 py-0.5 text-xs font-bold bg-primary/10 text-primary rounded-lg border border-primary/30"
                >
                  {BOARD_NAMES[selectedBoard]}
                </motion.span>
              )}
            </h2>
            <p className="text-sm text-muted-dark">Gestiona el flujo de trabajo arrastrando las tarjetas.</p>
          </div>
          <div className="relative w-full md:max-w-md group">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="material-icons-round text-muted-dark group-focus-within:text-primary apple-transition">search</span>
            </span>
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Buscar por folio (ej. #REQ-2094)"
              className="w-full glass border border-white/10 text-sm text-white rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 apple-transition placeholder-muted-dark"
            />
          </div>
        </div>
      </motion.div>

      {/* Content */}
      {processedRequests.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16 glass border border-white/10 border-dashed rounded-2xl"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
            <span className="material-icons-round text-muted-dark text-3xl">search_off</span>
          </div>
          <h3 className="text-lg font-bold text-white">No se encontró ese folio</h3>
          <p className="text-muted-dark mt-1">Intenta buscar con otro número o verifica el filtro.</p>
        </motion.div>
      ) : (
        <div className="space-y-10">
          {SECTIONS.map((status, sectionIdx) => {
            const sectionRequests = processedRequests.filter(r => r.status === status);
            const isDropZoneActive = activeDropZone === status;

            if (sectionRequests.length === 0 && localSearch && !draggedRequestId) return null;

            return (
              <motion.div
                key={status}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springConfig.gentle, delay: sectionIdx * 0.05 }}
                className={`
                  space-y-4 rounded-2xl apple-transition
                  ${isDropZoneActive ? 'bg-primary/5 ring-2 ring-primary border-transparent p-4 -m-4' : ''}
                `}
                onDragOver={(e) => handleDragOver(e, status)}
                onDrop={(e) => handleDrop(e, status)}
              >
                {/* Section Header */}
                <div className="flex items-center space-x-3 border-b border-white/10 pb-3">
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    className={`w-3 h-3 rounded-full ${status === 'Listo' ? 'bg-primary' : status === 'En Producción' ? 'bg-purple-500' : status === 'Corrección' ? 'bg-orange-500' : status === 'Entregado' ? 'bg-blue-500' : 'bg-yellow-500'}`}
                  />
                  <h3 className="text-xl font-bold text-white">{status}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold glass border border-white/10 text-muted-dark">
                    {sectionRequests.length}
                  </span>
                </div>

                {/* Grid */}
                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 min-h-[100px] ${isDropZoneActive ? 'opacity-80' : ''}`}>
                  <AnimatePresence>
                    {sectionRequests.map((req, idx) => {
                      const isExactMatch = localSearch && req.id.toLowerCase() === localSearch.toLowerCase();
                      const isDragging = draggedRequestId === req.id;

                      return (
                        <motion.div
                          key={req.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ ...springConfig.snappy, delay: idx * 0.02 }}
                          whileHover={{ y: -4, scale: 1.02 }}
                          draggable
                          onDragStart={(e) => handleDragStart(e as any, req.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => onViewDetail(req)}
                          className={`
                            glass p-5 rounded-2xl border flex flex-col relative overflow-hidden group
                            ${isDragging ? 'opacity-40 scale-95 ring-2 ring-primary/50' : 'opacity-100'}
                            ${isExactMatch
                              ? 'border-primary ring-2 ring-primary shadow-apple-glow z-10'
                              : 'border-white/10 hover:border-primary/50 shadow-apple'}
                            apple-transition cursor-grab active:cursor-grabbing
                          `}
                        >
                          {/* Accent Line */}
                          <div className={`absolute top-0 left-0 w-1 h-full ${getPriorityColor(req.priority)} opacity-80`}></div>

                          <div className="pl-3">
                            <div className="flex justify-between items-start mb-2">
                              <span className={`text-xs  font-bold ${isExactMatch ? 'text-primary' : 'text-muted-dark'}`}>{req.id}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-lg uppercase font-bold tracking-wider ${
                                req.priority === 'Urgente' ? 'text-red-400 bg-red-500/10 border border-red-500/20' : 'text-muted-dark bg-white/5 border border-white/10'
                              }`}>{req.priority}</span>
                            </div>

                            {/* Video Type and Board Badges */}
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {req.video_type && (
                                <span className={`px-1.5 py-0.5 rounded-lg text-[9px] font-bold border ${getVideoTypeBadgeStyles(req.video_type)}`}>
                                  {VIDEO_TYPE_LABELS[req.video_type] || req.video_type}
                                </span>
                              )}
                              {req.board_number && (
                                <span className="px-1.5 py-0.5 rounded-lg text-[9px] font-bold bg-primary/10 text-primary border border-primary/30">
                                  {BOARD_NAMES[req.board_number].split(' ')[1]}
                                </span>
                              )}
                            </div>

                            <h4 className="text-base font-bold text-white mb-1 leading-snug pr-2 select-none truncate" title={req.product}>{req.product}</h4>
                            <p className="text-sm text-muted-dark mb-5 truncate select-none" title={req.client}>{req.client}</p>

                            <div className="mt-auto pt-4 border-t border-white/10 flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="w-7 h-7 rounded-full bg-gray-700 text-[10px] flex items-center justify-center text-white mr-2 border-2 border-white/10 font-bold">
                                  {req.advisorInitials}
                                </div>
                                <span className="text-xs text-muted-dark select-none">{req.date}</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  {sectionRequests.length === 0 && !localSearch && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.6 }}
                      className="col-span-full py-6 flex items-center justify-center border-2 border-dashed border-white/10 rounded-2xl"
                    >
                      <p className="text-xs text-muted-dark pointer-events-none">Arrastra tarjetas aquí</p>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default ProductionKanban;
