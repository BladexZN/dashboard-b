import React, { useState, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RequestData, RequestStatus, BoardNumber, VideoType, VIDEO_TYPE_LABELS, BOARD_NAMES } from '../types';
import { springConfig, buttonTap } from '../lib/animations';

interface ProductionKanbanProps {
  requests: RequestData[];
  onStatusChange: (id: string, status: RequestStatus) => void;
  onViewDetail: (request: RequestData) => void;
  onDuplicate: (request: RequestData) => void;
  selectedBoard: BoardNumber | null;
}

const SECTIONS: RequestStatus[] = ['Pendiente', 'En Producción', 'Corrección', 'Entregado'];

// Items to show per section initially, then load more
const ITEMS_PER_SECTION = 12;
const LOAD_MORE_INCREMENT = 12;

// Only animate first N items for performance
const MAX_ANIMATED_ITEMS = 8;

const getVideoTypeBadgeStyles = (videoType: VideoType) => {
  switch (videoType) {
    case 'Original': return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
    case 'Hibrido': return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
    case 'Stock': return 'bg-gray-500/20 text-gray-400 border-gray-500/40';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/40';
  }
};

const getPriorityColor = (p: string) => {
  if (p === 'Alta' || p === 'Urgente') return 'bg-red-500';
  if (p === 'Media') return 'bg-yellow-500';
  return 'bg-green-500';
};

// Memoized card component to prevent unnecessary re-renders
interface KanbanCardProps {
  req: RequestData;
  idx: number;
  isExactMatch: boolean;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onViewDetail: (request: RequestData) => void;
  onDuplicate: (request: RequestData) => void;
}

const KanbanCard = memo<KanbanCardProps>(({
  req,
  idx,
  isExactMatch,
  isDragging,
  onDragStart,
  onDragEnd,
  onViewDetail,
  onDuplicate
}) => {
  // Only animate first few items for performance
  const shouldAnimate = idx < MAX_ANIMATED_ITEMS;

  return (
    <motion.div
      key={req.id}
      layout
      initial={shouldAnimate ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={shouldAnimate ? { opacity: 0, scale: 0.95 } : undefined}
      transition={shouldAnimate ? springConfig.snappy : { duration: 0.1 }}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      draggable
      onDragStart={(e) => onDragStart(e as any, req.id)}
      onDragEnd={onDragEnd}
      onClick={() => onViewDetail(req)}
      className={`
        relative p-3 rounded-xl border select-none cursor-grab active:cursor-grabbing
        ${isDragging
          ? 'opacity-60 scale-[1.02] border-primary shadow-apple-glow bg-white/5 z-50 ring-1 ring-primary'
          : 'glass border-white/10 hover:border-primary/40 hover:shadow-apple'}
        ${isExactMatch ? 'border-primary ring-2 ring-primary shadow-apple-glow z-10' : ''}
      `}
    >
      {/* Top Row: Client Label */}
      <div className="flex justify-between items-start mb-2 relative z-10">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate max-w-[180px]">
          {req.client}
        </span>
        <span className="text-[10px] text-gray-600">
          {req.id.replace('#REQ-', '')}
        </span>
      </div>

      {/* Main Title */}
      <h4 className="text-sm font-bold text-white mb-2 leading-snug relative z-10 line-clamp-2" title={req.product}>
        {req.product}
      </h4>

      {/* Badges Row */}
      <div className="flex flex-wrap gap-1.5 mb-2 relative z-10">
        {/* Video Type Badge */}
        {req.video_type && (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getVideoTypeBadgeStyles(req.video_type)}`}>
            {VIDEO_TYPE_LABELS[req.video_type] || req.video_type}
          </span>
        )}
        {/* Board Badge */}
        {req.board_number && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/15 border border-primary/30 text-primary">
            {BOARD_NAMES[req.board_number].split(' ')[1]}
          </span>
        )}
        {/* Priority Badge - only show if high/urgent */}
        {(req.priority === 'Alta' || req.priority === 'Urgente') && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/15 border border-red-500/30 text-red-400">
            {req.priority}
          </span>
        )}
      </div>

      {/* Bottom Row: User & Date */}
      <div className="flex items-center justify-between border-t border-white/10 pt-2 relative z-10">
        <div className="flex items-center space-x-1.5">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 flex items-center justify-center text-[9px] text-primary font-bold shadow-sm">
            {req.advisorInitials}
          </div>
          <span className="text-[10px] font-bold text-gray-400 truncate max-w-[70px]">
            {req.advisor?.split(' ')[0] || ''}
          </span>
        </div>
        <div className="bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
          <span className="text-[9px] text-gray-400">
            {req.date}
          </span>
        </div>
      </div>
    </motion.div>
  );
});

KanbanCard.displayName = 'KanbanCard';

const ProductionKanban: React.FC<ProductionKanbanProps> = ({ requests, onStatusChange, onViewDetail, onDuplicate, selectedBoard }) => {
  const [localSearch, setLocalSearch] = useState('');
  const [draggedRequestId, setDraggedRequestId] = useState<string | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<RequestStatus | null>(null);

  // Track how many items to show per section
  const [sectionLimits, setSectionLimits] = useState<Record<RequestStatus, number>>({
    'Pendiente': ITEMS_PER_SECTION,
    'En Producción': ITEMS_PER_SECTION,
    'Corrección': ITEMS_PER_SECTION,
    'Entregado': ITEMS_PER_SECTION,
  });

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

  // Memoize handlers to prevent child re-renders
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedRequestId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedRequestId(null);
    setActiveDropZone(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, status: RequestStatus) => {
    e.preventDefault();
    setActiveDropZone(prev => prev !== status ? status : prev);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, status: RequestStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");

    if (id) {
      onStatusChange(id, status);
    }

    setDraggedRequestId(null);
    setActiveDropZone(null);
  }, [onStatusChange]);

  const handleLoadMore = useCallback((status: RequestStatus) => {
    setSectionLimits(prev => ({
      ...prev,
      [status]: prev[status] + LOAD_MORE_INCREMENT
    }));
  }, []);

  const handleViewDetail = useCallback((request: RequestData) => {
    onViewDetail(request);
  }, [onViewDetail]);

  const handleDuplicate = useCallback((request: RequestData) => {
    onDuplicate(request);
  }, [onDuplicate]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={springConfig.gentle}
      className="h-[calc(100vh-180px)] flex flex-col"
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
            <p className="text-sm text-muted-dark">
              Gestiona el flujo de trabajo arrastrando las tarjetas.
              {processedRequests.length > 50 && (
                <span className="ml-2 text-primary">({processedRequests.length} solicitudes)</span>
              )}
            </p>
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
        <div className="flex gap-5 overflow-x-auto flex-1 px-1 pb-4" style={{ minWidth: '1400px' }}>
          {SECTIONS.map((status, sectionIdx) => {
            const allSectionRequests = processedRequests.filter(r => r.status === status);
            const currentLimit = sectionLimits[status];
            const sectionRequests = allSectionRequests.slice(0, currentLimit);
            const hasMore = allSectionRequests.length > currentLimit;
            const remainingCount = allSectionRequests.length - currentLimit;
            const isDropZoneActive = activeDropZone === status;

            if (allSectionRequests.length === 0 && localSearch && !draggedRequestId) return null;

            return (
              <motion.div
                key={status}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springConfig.gentle, delay: sectionIdx * 0.05 }}
                className={`
                  flex flex-col min-w-[300px] max-w-[320px] flex-shrink-0 rounded-2xl glass border border-white/10 apple-transition h-full
                  ${isDropZoneActive ? 'bg-primary/5 ring-2 ring-primary border-primary' : ''}
                `}
                onDragOver={(e) => handleDragOver(e, status)}
                onDrop={(e) => handleDrop(e, status)}
              >
                {/* Section Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                  <div className="flex items-center space-x-2">
                    <motion.div
                      whileHover={{ scale: 1.2 }}
                      className={`w-2.5 h-2.5 rounded-full ${status === 'Entregado' ? 'bg-green-500' : status === 'En Producción' ? 'bg-purple-500' : status === 'Corrección' ? 'bg-orange-500' : 'bg-yellow-500'}`}
                    />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">{status}</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-white/5 text-primary border border-primary/20">
                    {allSectionRequests.length}
                  </span>
                </div>

                {/* Cards Container - Vertical Stack with Scroll */}
                <div className={`flex-1 overflow-y-auto space-y-3 p-3 ${isDropZoneActive ? 'opacity-80' : ''}`} style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                  <AnimatePresence mode="popLayout">
                    {sectionRequests.map((req, idx) => {
                      const isExactMatch = localSearch && req.id.toLowerCase() === localSearch.toLowerCase();
                      const isDragging = draggedRequestId === req.id;

                      return (
                        <KanbanCard
                          key={req.id}
                          req={req}
                          idx={idx}
                          isExactMatch={!!isExactMatch}
                          isDragging={isDragging}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          onViewDetail={handleViewDetail}
                          onDuplicate={handleDuplicate}
                        />
                      );
                    })}
                  </AnimatePresence>

                  {sectionRequests.length === 0 && !localSearch && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.6 }}
                      className="py-8 flex items-center justify-center border-2 border-dashed border-white/10 rounded-2xl min-h-[120px]"
                    >
                      <p className="text-xs text-muted-dark pointer-events-none">Arrastra tarjetas aquí</p>
                    </motion.div>
                  )}
                </div>

                {/* Load More Button */}
                {hasMore && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-center p-3 border-t border-white/10 flex-shrink-0"
                  >
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={buttonTap}
                      onClick={() => handleLoadMore(status)}
                      className="w-full py-2 glass border border-white/10 rounded-xl text-xs font-medium text-white hover:bg-white/5 hover:border-primary/30 apple-transition flex items-center justify-center gap-1"
                    >
                      <span className="material-icons-round text-sm">expand_more</span>
                      +{remainingCount} más
                    </motion.button>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default memo(ProductionKanban);
