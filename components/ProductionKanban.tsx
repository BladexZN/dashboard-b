import React, { useState, useMemo, useCallback, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RequestData, RequestStatus, BoardNumber, VideoType, VIDEO_TYPE_LABELS, BOARD_NAMES, RequestType } from '../types';
import { springConfig, buttonTap } from '../lib/animations';
import ActivityCountdown from './ActivityCountdown';

interface ProductionKanbanProps {
  requests: RequestData[];
  onStatusChange: (id: string, status: RequestStatus) => void;
  onViewDetail: (request: RequestData) => void;
  onDuplicate: (request: RequestData) => void;
  selectedBoard: BoardNumber | null;
  loading?: boolean;
}

const COLUMNS: RequestStatus[] = ['Pendiente', 'En Producción', 'Corrección', 'Listo', 'Entregado'];

// Items to show per column initially, then load more
const ITEMS_PER_COLUMN = 12;
const LOAD_MORE_INCREMENT = 12;

// Only animate first N items for performance
const MAX_ANIMATED_ITEMS = 8;

// Colores por tipo de solicitud (colorimetría del PDF)
const TYPE_COLORS: Record<RequestType, { bg: string; border: string; text: string; line: string }> = {
  'Corrección': { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-400', line: 'bg-red-500' },
  'Agregado': { bg: 'bg-yellow-500/20', border: 'border-yellow-500/40', text: 'text-yellow-400', line: 'bg-yellow-500' },
  'Variante': { bg: 'bg-orange-500/20', border: 'border-orange-500/40', text: 'text-orange-400', line: 'bg-orange-500' },
  'Video completo': { bg: 'bg-green-500/20', border: 'border-green-500/40', text: 'text-green-400', line: 'bg-green-500' },
};

// Estilos de columna por estado
const getColumnStyles = (status: RequestStatus) => {
  switch (status) {
    case 'Pendiente':
      return { bg: 'bg-yellow-500/5', border: 'border-yellow-500/20', header: 'bg-yellow-500/10', dot: 'bg-yellow-500' };
    case 'En Producción':
      return { bg: 'bg-purple-500/5', border: 'border-purple-500/20', header: 'bg-purple-500/10', dot: 'bg-purple-500' };
    case 'Corrección':
      return { bg: 'bg-orange-500/5', border: 'border-orange-500/20', header: 'bg-orange-500/10', dot: 'bg-orange-500' };
    case 'Listo':
      return { bg: 'bg-primary/5', border: 'border-primary/20', header: 'bg-primary/10', dot: 'bg-primary' };
    case 'Entregado':
      return { bg: 'bg-blue-500/5', border: 'border-blue-500/20', header: 'bg-blue-500/10', dot: 'bg-blue-500' };
    default:
      return { bg: 'bg-white/5', border: 'border-white/10', header: 'bg-white/5', dot: 'bg-gray-500' };
  }
};

const getVideoTypeBadgeStyles = (videoType: VideoType) => {
  switch (videoType) {
    case 'Original': return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
    case 'Hibrido': return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
    case 'Stock': return 'bg-gray-500/20 text-gray-400 border-gray-500/40';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/40';
  }
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

  // Obtener colores del tipo de solicitud
  const typeColors = TYPE_COLORS[req.type] || TYPE_COLORS['Video completo'];

  return (
    <motion.div
      layout
      key={req.id}
      initial={shouldAnimate ? { opacity: 0, scale: 0.9 } : false}
      animate={{ opacity: 1, scale: 1 }}
      exit={shouldAnimate ? { opacity: 0, scale: 0.9 } : undefined}
      transition={shouldAnimate ? { ...springConfig.snappy, delay: idx * 0.015 } : { duration: 0.1 }}
      whileHover={{ y: -4, scale: 1.02 }}
      draggable
      onDragStart={(e) => onDragStart(e as any, req.id)}
      onDragEnd={onDragEnd}
      onClick={() => onViewDetail(req)}
      className={`
        glass p-4 rounded-2xl border flex flex-col relative overflow-hidden group
        ${isDragging ? 'opacity-40 scale-95 ring-2 ring-primary/50' : 'opacity-100'}
        ${isExactMatch
          ? 'border-primary ring-2 ring-primary shadow-apple-glow z-10'
          : 'border-white/10 hover:border-primary/50 shadow-apple'}
        apple-transition cursor-grab active:cursor-grabbing
      `}
    >
      {/* Línea de color por TIPO DE SOLICITUD (colorimetría) */}
      <div className={`absolute top-0 left-0 w-1.5 h-full ${typeColors.line} opacity-90`}></div>

      <div className="pl-3">
        {/* Header con folio y prioridad */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold ${isExactMatch ? 'text-primary' : 'text-muted-dark'}`}>{req.id}</span>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => { e.stopPropagation(); onDuplicate(req); }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-muted-dark hover:text-blue-400 hover:bg-blue-500/10 apple-transition"
              title="Duplicar solicitud"
            >
              <span className="material-icons-round text-sm">content_copy</span>
            </motion.button>
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-lg uppercase font-bold tracking-wider ${
            req.priority === 'Urgente' ? 'text-red-400 bg-red-500/10 border border-red-500/20' : 'text-muted-dark bg-white/5 border border-white/10'
          }`}>{req.priority}</span>
        </div>

        {/* Badges: Tipo de solicitud + Video Type + Board */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {/* Badge de TIPO DE SOLICITUD (visible - colorimetría) */}
          <span className={`px-1.5 py-0.5 rounded-lg text-[9px] font-bold border ${typeColors.bg} ${typeColors.text} ${typeColors.border}`}>
            {req.type}
          </span>
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

        {/* Producto y Cliente */}
        <h4 className="text-base font-bold text-white mb-1 leading-snug pr-2 select-none line-clamp-2" title={req.product}>{req.product}</h4>
        <p className="text-sm text-muted-dark mb-3 truncate select-none" title={req.client}>{req.client}</p>

        {/* Cronómetro de tiempo transcurrido */}
        <div className="mb-3">
          <ActivityCountdown createdAt={req.rawDate} status={req.status} compact />
        </div>

        {/* Footer con asesor y fecha */}
        <div className="mt-auto pt-3 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-6 h-6 rounded-full bg-gray-700 text-[9px] flex items-center justify-center text-white mr-2 border-2 border-white/10 font-bold">
              {req.advisorInitials}
            </div>
            <span className="text-xs text-muted-dark select-none">{req.date}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

KanbanCard.displayName = 'KanbanCard';

const ProductionKanban: React.FC<ProductionKanbanProps> = ({ requests, onStatusChange, onViewDetail, onDuplicate, selectedBoard, loading = false }) => {
  // TODOS los hooks deben ir ANTES de cualquier return condicional
  const [localSearch, setLocalSearch] = useState('');
  const [draggedRequestId, setDraggedRequestId] = useState<string | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<RequestStatus | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Track how many items to show per column
  const [columnLimits, setColumnLimits] = useState<Record<RequestStatus, number>>({
    'Pendiente': ITEMS_PER_COLUMN,
    'En Producción': ITEMS_PER_COLUMN,
    'Corrección': ITEMS_PER_COLUMN,
    'Listo': ITEMS_PER_COLUMN,
    'Entregado': ITEMS_PER_COLUMN,
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
    setColumnLimits(prev => ({
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

  // Skeleton Loading Component - DESPUÉS de todos los hooks
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col h-full"
      >
        {/* Header Skeleton */}
        <div className="glass border border-white/10 p-5 rounded-2xl shadow-apple mb-6 animate-pulse">
          <div className="flex justify-between items-center">
            <div>
              <div className="h-6 w-40 bg-white/10 rounded-lg mb-2"></div>
              <div className="h-4 w-56 bg-white/5 rounded-lg"></div>
            </div>
            <div className="h-10 w-64 bg-white/10 rounded-xl"></div>
          </div>
        </div>

        {/* Columns Skeleton */}
        <div className="flex-1 overflow-hidden">
          <div className="flex h-full gap-5 px-1">
            {COLUMNS.map((status) => (
              <div key={status} className="min-w-[300px] max-w-[320px] rounded-2xl border border-white/10 bg-white/5 animate-pulse">
                {/* Column Header */}
                <div className="px-4 py-3 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-white/20"></div>
                      <div className="h-4 w-24 bg-white/10 rounded"></div>
                    </div>
                    <div className="h-5 w-8 bg-white/10 rounded-full"></div>
                  </div>
                </div>
                {/* Cards Skeleton */}
                <div className="p-3 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="glass p-4 rounded-2xl border border-white/10">
                      <div className="h-4 w-20 bg-white/10 rounded mb-3"></div>
                      <div className="flex gap-1.5 mb-3">
                        <div className="h-5 w-16 bg-white/10 rounded-lg"></div>
                        <div className="h-5 w-14 bg-white/10 rounded-lg"></div>
                      </div>
                      <div className="h-5 w-full bg-white/10 rounded mb-2"></div>
                      <div className="h-4 w-3/4 bg-white/5 rounded mb-4"></div>
                      <div className="pt-3 border-t border-white/10 flex items-center">
                        <div className="w-6 h-6 rounded-full bg-white/10 mr-2"></div>
                        <div className="h-3 w-20 bg-white/5 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={springConfig.gentle}
      className="flex flex-col h-full"
    >
      {/* Search Bar Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springConfig.snappy}
        className="glass border border-white/10 p-5 rounded-2xl shadow-apple mb-6 flex-shrink-0"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="material-icons-round text-primary">view_kanban</span>
              Tablero Kanban
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
              Gestión visual de tareas por estado.
              {processedRequests.length > 0 && (
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
              placeholder="Buscar cliente, actividad o ID..."
              className="w-full glass border border-white/10 text-sm text-white rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 apple-transition placeholder-muted-dark"
            />
          </div>
        </div>
      </motion.div>

      {/* Kanban Board - Layout Horizontal */}
      {processedRequests.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16 glass border border-white/10 border-dashed rounded-2xl"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
            <span className="material-icons-round text-muted-dark text-3xl">search_off</span>
          </div>
          <h3 className="text-lg font-bold text-white">No se encontraron solicitudes</h3>
          <p className="text-muted-dark mt-1">Intenta buscar con otro término o verifica el filtro.</p>
        </motion.div>
      ) : (
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-hidden pb-4"
        >
          {/* Contenedor horizontal de columnas */}
          <div className="flex h-full gap-5 min-w-[1500px] px-1">
            {COLUMNS.map((status, colIdx) => {
              const allColumnRequests = processedRequests.filter(r => r.status === status);
              const currentLimit = columnLimits[status];
              const columnRequests = allColumnRequests.slice(0, currentLimit);
              const hasMore = allColumnRequests.length > currentLimit;
              const remainingCount = allColumnRequests.length - currentLimit;
              const isDropZoneActive = activeDropZone === status;
              const colStyles = getColumnStyles(status);

              return (
                <motion.div
                  key={status}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springConfig.gentle, delay: colIdx * 0.05 }}
                  className={`
                    flex flex-col h-full w-full min-w-[300px] max-w-[320px] rounded-2xl border
                    ${isDropZoneActive
                      ? `${colStyles.bg} border-2 ${colStyles.border} ring-2 ring-primary/30`
                      : `${colStyles.bg} ${colStyles.border}`
                    }
                    apple-transition
                  `}
                  onDragOver={(e) => handleDragOver(e, status)}
                  onDrop={(e) => handleDrop(e, status)}
                >
                  {/* Column Header - Sticky */}
                  <div className={`sticky top-0 z-10 px-4 py-3 rounded-t-2xl ${colStyles.header} border-b ${colStyles.border} backdrop-blur-sm`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <motion.div
                          whileHover={{ scale: 1.2 }}
                          className={`w-2.5 h-2.5 rounded-full ${colStyles.dot}`}
                        />
                        <h3 className="text-sm font-bold text-white uppercase tracking-wide">{status}</h3>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold glass border border-white/10 text-white">
                        {allColumnRequests.length}
                      </span>
                    </div>
                  </div>

                  {/* Column Content - Scrollable */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    <AnimatePresence mode="popLayout">
                      {columnRequests.map((req, idx) => {
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

                    {columnRequests.length === 0 && !localSearch && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.6 }}
                        className="py-8 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl"
                      >
                        <span className="material-icons-round text-muted-dark text-2xl mb-2">drag_indicator</span>
                        <p className="text-xs text-muted-dark text-center">Arrastra tarjetas aquí</p>
                      </motion.div>
                    )}

                    {/* Load More Button */}
                    {hasMore && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="pt-2"
                      >
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={buttonTap}
                          onClick={() => handleLoadMore(status)}
                          className="w-full px-4 py-2 glass border border-white/10 rounded-xl text-xs font-medium text-white hover:bg-white/5 hover:border-primary/30 apple-transition flex items-center justify-center gap-1"
                        >
                          <span className="material-icons-round text-sm">expand_more</span>
                          Cargar más ({remainingCount})
                        </motion.button>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default memo(ProductionKanban);
