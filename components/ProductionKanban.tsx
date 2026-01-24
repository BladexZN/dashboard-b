import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RequestData, RequestStatus, BoardNumber, VideoType, VIDEO_TYPE_LABELS, BOARD_NAMES } from '../types';
import { springConfig } from '../lib/animations';

interface ProductionKanbanProps {
  requests: RequestData[];
  onStatusChange: (id: string, status: RequestStatus) => void;
  onViewDetail: (request: RequestData) => void;
  onDuplicate: (request: RequestData) => void;
  selectedBoard: BoardNumber | null;
}

const COLUMNS: RequestStatus[] = ['Pendiente', 'En Producción', 'Corrección', 'Entregado'];

// --- HELPERS ---

const getVideoTypeBadgeStyles = (videoType: VideoType) => {
  switch (videoType) {
    case 'Original': return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
    case 'Hibrido': return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
    case 'Stock': return 'bg-gray-500/20 text-gray-400 border-gray-500/40';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/40';
  }
};

const getRequestTypeBadgeStyles = (type: string) => {
  switch (type) {
    case 'Video completo': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40';
    case 'Variante': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40';
    case 'Agregado': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    case 'Corrección': return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/40';
  }
};

const getStatusColumnColor = (status: RequestStatus) => {
  switch (status) {
    case 'Pendiente': return 'bg-yellow-500';
    case 'En Producción': return 'bg-purple-500';
    case 'Corrección': return 'bg-orange-500';
    case 'Entregado': return 'bg-green-500';
    default: return 'bg-gray-400';
  }
};

// Colores de fondo para toda la columna (estilo Apple minimalista)
const getStatusColumnStyles = (status: RequestStatus) => {
  switch (status) {
    case 'Pendiente':
      return {
        bg: 'bg-yellow-500/8',
        border: 'border-yellow-500/20',
        header: 'bg-yellow-500/15',
        headerBorder: 'border-yellow-500/25',
        text: 'text-yellow-300'
      };
    case 'En Producción':
      return {
        bg: 'bg-purple-500/8',
        border: 'border-purple-500/20',
        header: 'bg-purple-500/15',
        headerBorder: 'border-purple-500/25',
        text: 'text-purple-300'
      };
    case 'Corrección':
      return {
        bg: 'bg-orange-500/8',
        border: 'border-orange-500/20',
        header: 'bg-orange-500/15',
        headerBorder: 'border-orange-500/25',
        text: 'text-orange-300'
      };
    case 'Entregado':
      return {
        bg: 'bg-green-500/8',
        border: 'border-green-500/20',
        header: 'bg-green-500/15',
        headerBorder: 'border-green-500/25',
        text: 'text-green-300'
      };
    default:
      return {
        bg: 'bg-gray-500/8',
        border: 'border-gray-500/20',
        header: 'bg-gray-500/15',
        headerBorder: 'border-gray-500/25',
        text: 'text-gray-300'
      };
  }
};

// --- SUB-COMPONENTS ---

interface KanbanCardProps {
  req: RequestData;
  columnId: string;
  onClick: (r: RequestData) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  isDragging: boolean;
}

const KanbanCard = React.memo<KanbanCardProps>(({ req, columnId, onClick, onDragStart, isDragging }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={springConfig.snappy}
      className={`
        relative p-3 rounded-xl border select-none cursor-grab active:cursor-grabbing
        ${isDragging
          ? 'opacity-60 scale-[1.02] border-primary shadow-apple-glow bg-white/5 z-50 ring-1 ring-primary'
          : 'glass border-white/10 hover:border-primary/40 hover:shadow-apple'
        }
      `}
      onClick={() => onClick(req)}
      draggable
      onDragStart={(e) => onDragStart(e, req.id)}
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
        {/* Request Type Badge (Video completo, Variante, Agregado, Corrección) */}
        {req.type && (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getRequestTypeBadgeStyles(req.type)}`}>
            {req.type}
          </span>
        )}
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
}, (prevProps, nextProps) => {
  return prevProps.req.id === nextProps.req.id
    && prevProps.req.status === nextProps.req.status
    && prevProps.req.type === nextProps.req.type
    && prevProps.columnId === nextProps.columnId
    && prevProps.isDragging === nextProps.isDragging;
});

const ProductionKanban: React.FC<ProductionKanbanProps> = ({
  requests,
  onStatusChange,
  onViewDetail,
  onDuplicate,
  selectedBoard
}) => {
  const [localSearch, setLocalSearch] = useState('');

  // Drag & Drop State
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [targetCol, setTargetCol] = useState<string | null>(null);

  // Auto Scroll Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollSpeed = useRef(0);
  const animationFrameId = useRef<number | null>(null);

  // Filter requests
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
        const client = r.client.toLowerCase();
        const product = r.product.toLowerCase();
        return folio.includes(query) || folioNumber.includes(query) || client.includes(query) || product.includes(query);
      });
    }

    return filtered;
  }, [requests, localSearch, selectedBoard]);

  // --- AUTO SCROLL LOGIC ---
  const autoScroll = () => {
    if (scrollContainerRef.current && scrollSpeed.current !== 0) {
      scrollContainerRef.current.scrollLeft += scrollSpeed.current;
    }
    animationFrameId.current = requestAnimationFrame(autoScroll);
  };

  useEffect(() => {
    if (draggingId) {
      animationFrameId.current = requestAnimationFrame(autoScroll);
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      scrollSpeed.current = 0;
    }
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [draggingId]);

  const handleDragOverContainer = (e: React.DragEvent) => {
    e.preventDefault();
    if (!scrollContainerRef.current) return;

    const { left, right } = scrollContainerRef.current.getBoundingClientRect();
    const x = e.clientX;
    const edgeZone = 100;
    const maxSpeed = 15;

    if (x < left + edgeZone) {
      const intensity = 1 - Math.max(0, x - left) / edgeZone;
      scrollSpeed.current = -(maxSpeed * intensity);
    } else if (x > right - edgeZone) {
      const intensity = 1 - Math.max(0, right - x) / edgeZone;
      scrollSpeed.current = maxSpeed * intensity;
    } else {
      scrollSpeed.current = 0;
    }
  };

  // Drag Handlers
  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.setData("id", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOverColumn = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (targetCol !== colId) {
      setTargetCol(colId);
    }
  };

  const onDrop = (e: React.DragEvent, status: RequestStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("id");
    if (id) {
      onStatusChange(id, status);
    }
    setDraggingId(null);
    setTargetCol(null);
    scrollSpeed.current = 0;
  };

  const onDragEnd = () => {
    setDraggingId(null);
    setTargetCol(null);
    scrollSpeed.current = 0;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      {/* Filters Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springConfig.snappy}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 glass p-4 rounded-2xl shadow-apple"
      >
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
          </p>
        </div>

        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-icons-round text-muted-dark text-lg">search</span>
          </span>
          <input
            type="text"
            placeholder="Buscar por folio, cliente o producto..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder-gray-500 apple-transition"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>
      </motion.div>

      {/* Kanban Columns Container */}
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
          className="flex-1 overflow-x-auto overflow-y-hidden"
          onDragOver={handleDragOverContainer}
        >
          <div className="flex h-full gap-5 min-w-[1200px] pb-4 px-1">
            {COLUMNS.map((column) => {
              const tasksInCol = processedRequests.filter(r => r.status === column);
              const isOver = targetCol === column && draggingId !== null;
              const isDraggingAnything = draggingId !== null;
              const colStyles = getStatusColumnStyles(column);

              return (
                <motion.div
                  key={column}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springConfig.snappy, delay: COLUMNS.indexOf(column) * 0.05 }}
                  className={`
                    flex flex-col h-full w-full min-w-[280px] rounded-2xl apple-transition relative backdrop-blur-sm
                    ${isOver
                      ? `${colStyles.bg} border-2 ${colStyles.border} shadow-lg scale-[1.005]`
                      : isDraggingAnything
                        ? `${colStyles.bg} border-2 border-dashed ${colStyles.border}`
                        : `${colStyles.bg} border ${colStyles.border}`
                    }
                  `}
                  onDragOver={(e) => onDragOverColumn(e, column)}
                  onDrop={(e) => onDrop(e, column)}
                  onDragEnd={onDragEnd}
                >
                  {/* Column Header */}
                  <div className={`p-4 border-b ${colStyles.headerBorder} flex items-center justify-between rounded-t-2xl sticky top-0 z-10 ${colStyles.header} backdrop-blur-md`}>
                    <div className="flex items-center space-x-2.5">
                      <div className={`w-3 h-3 rounded-full ${getStatusColumnColor(column)} shadow-sm`} />
                      <h3 className={`font-semibold text-[12px] ${colStyles.text} tracking-wide uppercase leading-tight`}>
                        {column}
                      </h3>
                    </div>
                    <motion.span
                      animate={{ scale: isOver ? 1.1 : 1 }}
                      className={`text-xs font-bold px-2.5 py-1 rounded-full apple-transition ${colStyles.header} ${colStyles.text} border ${colStyles.border}`}
                    >
                      {tasksInCol.length}
                    </motion.span>
                  </div>

                  {/* Column Content */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                    <AnimatePresence mode="popLayout">
                      {tasksInCol.map(req => (
                        <KanbanCard
                          key={req.id}
                          req={req}
                          columnId={column}
                          onClick={onViewDetail}
                          onDragStart={onDragStart}
                          isDragging={draggingId === req.id}
                        />
                      ))}
                    </AnimatePresence>

                    {/* Drop Placeholder Hint */}
                    <AnimatePresence>
                      {isOver && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="h-20 rounded-xl border-2 border-dashed border-primary/50 bg-primary/10 flex flex-col items-center justify-center text-primary pointer-events-none"
                        >
                          <motion.span
                            animate={{ y: [0, 5, 0] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="material-icons-round text-3xl mb-1"
                          >
                            arrow_downward
                          </motion.span>
                          <span className="text-xs font-bold uppercase tracking-wider">Soltar aquí</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Empty State */}
                    {tasksInCol.length === 0 && !isOver && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.6 }}
                        className="py-8 flex items-center justify-center border-2 border-dashed border-white/10 rounded-2xl min-h-[120px]"
                      >
                        <p className="text-xs text-muted-dark pointer-events-none">Arrastra tarjetas aquí</p>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionKanban;
