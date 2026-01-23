import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { RequestData, RequestType, VideoType, BoardNumber, VIDEO_TYPE_LABELS, LogoFile, BOARD_NAMES } from '../types';
import { springConfig, buttonTap, buttonHover } from '../lib/animations';

interface RequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: RequestData | null;
  onUpdate?: () => void;
}

interface DetailState {
  id: string;
  folio: string;
  cliente: string;
  producto: string;
  tipo: RequestType;
  asesor_id: string;
  asesor_nombre: string;
  fecha_creacion: string;
  descripcion: string;
  escaleta_video: string;
  material_descargable: string[];
  wetransfer_link: string;
  video_type: VideoType | '';
  board_number: BoardNumber | null;
  logos: LogoFile[];
  status: string;
  clientColor?: string;
  clientInitials?: string;
}

interface HistoryEvent {
  id: string;
  estado: string;
  timestamp: string;
  usuario_nombre: string;
  nota?: string;
}

const RequestDetailModal: React.FC<RequestDetailModalProps> = ({ isOpen, onClose, request, onUpdate }) => {
  const [details, setDetails] = useState<DetailState | null>(null);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const detailsRef = useRef<DetailState | null>(null);

  // Keep ref in sync with state for auto-save
  useEffect(() => {
    detailsRef.current = details;
  }, [details]);

  useEffect(() => {
    if (isOpen && request?.uuid) {
      fetchDetails(request.uuid);
      setEditMode(false);
      setHasChanges(false);
    } else {
      setDetails(null);
      setHistory([]);
      setEditMode(false);
      setHasChanges(false);
    }
  }, [isOpen, request]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const fetchDetails = async (uuid: string) => {
    setLoading(true);
    try {
      const { data: solData, error: solError } = await supabase
        .from('solicitudes')
        .select(`
          *,
          asesor:usuarios!asesor_id(id, nombre)
        `)
        .eq('id', uuid)
        .single();

      if (solError) throw solError;

      const { data: histData, error: histError } = await supabase
        .from('estados_solicitud')
        .select(`
          *,
          usuario:usuarios!usuario_id(nombre)
        `)
        .eq('solicitud_id', uuid)
        .order('timestamp', { ascending: true });

      if (histError) throw histError;

      if (solData) {
        const initials = solData.cliente ? solData.cliente.substring(0, 1).toUpperCase() : 'C';
        const clientColor = request?.clientColor || 'bg-blue-900 text-blue-300';

        setDetails({
          id: solData.id,
          folio: solData.folio ? `#REQ-${solData.folio}` : 'PENDING',
          cliente: solData.cliente,
          producto: solData.producto,
          tipo: solData.tipo as RequestType,
          asesor_id: solData.asesor?.id || '',
          asesor_nombre: solData.asesor?.nombre || 'Sin Asignar',
          fecha_creacion: new Date(solData.fecha_creacion).toLocaleDateString('es-ES', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
          }),
          descripcion: solData.descripcion || '',
          escaleta_video: solData.escaleta_video || '',
          material_descargable: solData.material_descargable || [],
          wetransfer_link: solData.wetransfer_link || '',
          video_type: solData.video_type || '',
          board_number: solData.board_number || null,
          logos: solData.logos || [],
          status: histData && histData.length > 0 ? histData[histData.length - 1].estado : 'Pendiente',
          clientColor,
          clientInitials: initials
        });
      }

      if (histData) {
        setHistory(histData.map((h: any) => ({
          id: h.id,
          estado: h.estado,
          timestamp: h.timestamp,
          usuario_nombre: h.usuario?.nombre || 'Sistema',
          nota: h.nota
        })));
      }

    } catch (err) {
      console.error("Error fetching details:", err);
    } finally {
      setLoading(false);
    }
  };

  const triggerAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveChanges();
    }, 1500);
  }, [details]);

  const saveChanges = async () => {
    // Use ref for latest details to avoid stale closure
    const currentDetails = detailsRef.current;
    if (!currentDetails || !hasChanges) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('solicitudes')
        .update({
          cliente: currentDetails.cliente,
          producto: currentDetails.producto,
          tipo: currentDetails.tipo,
          descripcion: currentDetails.descripcion,
          escaleta_video: currentDetails.escaleta_video,
          material_descargable: currentDetails.material_descargable.filter(l => l.trim() !== ''),
          wetransfer_link: currentDetails.wetransfer_link || null,
          video_type: currentDetails.video_type || null,
          board_number: currentDetails.board_number || null,
          logos: currentDetails.logos
        })
        .eq('id', currentDetails.id);

      if (error) throw error;

      setHasChanges(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error("Error saving:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field: keyof DetailState, value: any) => {
    if (!details) return;
    setDetails({ ...details, [field]: value });
    setHasChanges(true);
    triggerAutoSave();
  };

  const handleLinkChange = (index: number, value: string) => {
    if (!details) return;
    const newLinks = [...details.material_descargable];
    newLinks[index] = value;
    handleFieldChange('material_descargable', newLinks);
  };

  const addLink = () => {
    if (!details) return;
    handleFieldChange('material_descargable', [...details.material_descargable, '']);
  };

  const removeLink = (index: number) => {
    if (!details) return;
    const newLinks = details.material_descargable.filter((_, i) => i !== index);
    handleFieldChange('material_descargable', newLinks.length > 0 ? newLinks : ['']);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!details) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingLogo(true);
    setUploadError(null);
    const newLogos: LogoFile[] = [];
    const failedUploads: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      try {
        const { error } = await supabase.storage
          .from('request-logos')
          .upload(filePath, file);

        if (error) {
          failedUploads.push(`${file.name}: ${error.message}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('request-logos')
          .getPublicUrl(filePath);

        newLogos.push({
          id: Date.now().toString() + i,
          name: file.name,
          url: urlData.publicUrl,
          size: file.size,
          uploadedAt: new Date().toISOString()
        });
      } catch (err: any) {
        failedUploads.push(`${file.name}: ${err.message || 'Error desconocido'}`);
      }
    }

    if (newLogos.length > 0) {
      handleFieldChange('logos', [...details.logos, ...newLogos]);
    }

    // Show error if any uploads failed
    if (failedUploads.length > 0) {
      setUploadError(`Error al subir: ${failedUploads.join(', ')}`);
      // Auto-clear error after 5 seconds
      setTimeout(() => setUploadError(null), 5000);
    }

    setUploadingLogo(false);
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async (logo: LogoFile) => {
    if (!details) return;

    const urlParts = logo.url.split('/');
    const filePath = `logos/${urlParts[urlParts.length - 1]}`;

    try {
      await supabase.storage.from('request-logos').remove([filePath]);
    } catch (err) {
      console.error('Error deleting logo:', err);
    }

    handleFieldChange('logos', details.logos.filter(l => l.id !== logo.id));
  };

  const handleDownloadLogo = (logo: LogoFile) => {
    const link = document.createElement('a');
    link.href = logo.url;
    link.download = logo.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pendiente': return 'bg-yellow-500 border-yellow-500';
      case 'En Producción': return 'bg-purple-500 border-purple-500';
      case 'Corrección': return 'bg-orange-500 border-orange-500';
      case 'Entregado': return 'bg-green-500 border-green-500';
      default: return 'bg-gray-500 border-gray-500';
    }
  };

  const getVideoTypeBadgeStyles = (videoType: VideoType | '') => {
    switch (videoType) {
      case 'Original': return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      case 'Hibrido': return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'Stock': return 'bg-gray-500/20 text-gray-400 border-gray-500/40';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/40';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={springConfig.snappy}
            className="relative w-full max-w-2xl glass-darker h-full border-l border-white/10 shadow-apple-lg flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex justify-between items-center glass shrink-0">
              <div className="flex-1">
                {loading ? (
                  <div className="h-4 w-24 bg-white/10 rounded-lg animate-pulse mb-2"></div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 mb-1"
                  >
                    <span className="text-xs  text-primary font-bold">{details?.folio}</span>
                    {details?.video_type && (
                      <span className={`px-1.5 py-0.5 rounded-lg text-[9px] font-bold border ${getVideoTypeBadgeStyles(details.video_type)}`}>
                        {VIDEO_TYPE_LABELS[details.video_type as VideoType] || details.video_type}
                      </span>
                    )}
                    {details?.board_number && (
                      <span className="px-1.5 py-0.5 rounded-lg text-[9px] font-bold bg-primary/10 text-primary border border-primary/30">
                        {BOARD_NAMES[details.board_number]}
                      </span>
                    )}
                  </motion.div>
                )}
                {loading ? (
                  <div className="h-6 w-48 bg-white/10 rounded-lg animate-pulse"></div>
                ) : (
                  <motion.h2
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-lg font-bold text-white leading-tight"
                  >
                    {details?.producto}
                  </motion.h2>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Save Status Indicator */}
                <AnimatePresence mode="wait">
                  {saving && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-1 text-xs text-muted-dark"
                    >
                      <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                      Guardando...
                    </motion.span>
                  )}
                  {hasChanges && !saving && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-1 text-xs text-yellow-400"
                    >
                      <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                      Sin guardar
                    </motion.span>
                  )}
                  {!hasChanges && !saving && editMode && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-1 text-xs text-green-400"
                    >
                      <span className="w-2 h-2 rounded-full bg-green-400"></span>
                      Guardado
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Edit Toggle */}
                <motion.button
                  whileHover={buttonHover}
                  whileTap={buttonTap}
                  disabled={saving}
                  onClick={async () => {
                    if (editMode && hasChanges) {
                      await saveChanges();
                    }
                    setEditMode(!editMode);
                  }}
                  className={`p-2 rounded-xl apple-transition ${
                    editMode
                      ? 'bg-primary text-white shadow-apple-glow'
                      : 'hover:bg-white/10 text-muted-dark'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={editMode ? 'Terminar edición' : 'Editar'}
                >
                  <span className="material-icons-round text-lg">{saving ? 'hourglass_empty' : (editMode ? 'check' : 'edit')}</span>
                </motion.button>

                <motion.button
                  whileHover={buttonHover}
                  whileTap={buttonTap}
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-white/10 text-muted-dark apple-transition"
                >
                  <span className="material-icons-round">close</span>
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {loading ? (
                <div className="space-y-6">
                  {[1, 2, 3].map(i => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="h-20 bg-white/5 rounded-2xl animate-pulse"
                    />
                  ))}
                </div>
              ) : details ? (
                <>
                  {/* Info Grid */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={springConfig.gentle}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div>
                      <span className="text-[10px] text-muted-dark block mb-1 font-bold uppercase tracking-wider">Cliente</span>
                      {editMode ? (
                        <input
                          type="text"
                          value={details.cliente}
                          onChange={(e) => handleFieldChange('cliente', e.target.value)}
                          className="w-full glass border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-primary/50 focus:outline-none apple-transition"
                        />
                      ) : (
                        <div className="flex items-center min-w-0">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] mr-2 font-bold flex-shrink-0 ${details.clientColor}`}>
                            {details.clientInitials}
                          </div>
                          <span className="text-sm font-medium text-white truncate" title={details.cliente}>{details.cliente}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-dark block mb-1 font-bold uppercase tracking-wider">Asesor</span>
                      <div className="flex items-center">
                        <div className="w-6 h-6 rounded-full bg-gray-700 text-[9px] flex items-center justify-center text-white mr-2 ring-1 ring-white/10 font-bold">
                          {details.asesor_nombre.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-white">{details.asesor_nombre}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-dark block mb-1 font-bold uppercase tracking-wider">Tipo de Solicitud</span>
                      {editMode ? (
                        <select
                          value={details.tipo}
                          onChange={(e) => handleFieldChange('tipo', e.target.value as RequestType)}
                          className="w-full glass border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-primary/50 focus:outline-none apple-transition"
                        >
                          <option value="Video completo">Video completo</option>
                          <option value="Agregado">Agregado</option>
                          <option value="Variante">Variante</option>
                          <option value="Corrección">Corrección</option>
                        </select>
                      ) : (
                        <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-white/5 text-white border border-white/10">
                          {details.tipo}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-dark block mb-1 font-bold uppercase tracking-wider">Creado el</span>
                      <span className="text-xs text-gray-300">{details.fecha_creacion}</span>
                    </div>
                  </motion.div>

                  {/* Video Type & Board - Editable */}
                  <AnimatePresence>
                    {editMode && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid grid-cols-2 gap-4 p-4 glass rounded-2xl border border-white/10 overflow-hidden"
                      >
                        <div>
                          <span className="text-[10px] text-muted-dark block mb-1 font-bold uppercase tracking-wider">Tipo de Video</span>
                          <select
                            value={details.video_type}
                            onChange={(e) => handleFieldChange('video_type', e.target.value as VideoType | '')}
                            className="w-full glass border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-primary/50 focus:outline-none apple-transition"
                          >
                            <option value="">Sin especificar</option>
                            <option value="Stock">Stock</option>
                            <option value="Hibrido">Híbrido</option>
                            <option value="Original">Original</option>
                          </select>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-dark block mb-1 font-bold uppercase tracking-wider">Tablero</span>
                          <select
                            value={details.board_number || ''}
                            onChange={(e) => handleFieldChange('board_number', e.target.value ? parseInt(e.target.value) as BoardNumber : null)}
                            className="w-full glass border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-primary/50 focus:outline-none apple-transition"
                          >
                            <option value="">Sin asignar</option>
                            <option value="1">{BOARD_NAMES[1]}</option>
                            <option value="2">{BOARD_NAMES[2]}</option>
                            <option value="3">{BOARD_NAMES[3]}</option>
                            <option value="4">{BOARD_NAMES[4]}</option>
                          </select>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Description */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...springConfig.gentle, delay: 0.1 }}
                    className="glass rounded-2xl p-4 border border-white/10"
                  >
                    <span className="text-[10px] text-muted-dark block mb-2 font-bold uppercase tracking-wider">Descripción / Notas</span>
                    {editMode ? (
                      <textarea
                        value={details.descripcion}
                        onChange={(e) => handleFieldChange('descripcion', e.target.value)}
                        rows={3}
                        className="w-full glass border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-primary/50 focus:outline-none resize-none apple-transition"
                        placeholder="Agregar descripción..."
                      />
                    ) : (
                      <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {details.descripcion || "Sin descripción."}
                      </p>
                    )}
                  </motion.div>

                  {/* Escaleta Section */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...springConfig.gentle, delay: 0.15 }}
                    className="glass rounded-2xl p-4 border border-white/10"
                  >
                    <span className="text-[10px] text-primary block mb-2 font-bold uppercase tracking-wider">Escaleta de Video</span>
                    {editMode ? (
                      <textarea
                        value={details.escaleta_video}
                        onChange={(e) => handleFieldChange('escaleta_video', e.target.value)}
                        rows={5}
                        className="w-full glass border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-primary/50 focus:outline-none resize-none  apple-transition"
                        placeholder="Escribir escaleta..."
                      />
                    ) : (
                      <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line  text-xs">
                        {details.escaleta_video || "Sin escaleta."}
                      </p>
                    )}
                  </motion.div>

                  {/* Logos Section */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...springConfig.gentle, delay: 0.2 }}
                    className="glass rounded-2xl p-4 border border-white/10"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] text-muted-dark font-bold uppercase tracking-wider">Logos del Cliente</span>
                      {uploadError && (
                        <motion.span
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          className="text-[10px] text-red-400 bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20"
                        >
                          {uploadError}
                        </motion.span>
                      )}
                      {editMode && (
                        <>
                          <input
                            ref={logoInputRef}
                            type="file"
                            multiple
                            accept="image/*,.svg,.ai,.eps,.psd"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                          <motion.button
                            whileHover={buttonHover}
                            whileTap={buttonTap}
                            type="button"
                            onClick={() => logoInputRef.current?.click()}
                            disabled={uploadingLogo}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white apple-transition text-xs font-bold disabled:opacity-50"
                          >
                            <span className="material-icons-round text-sm">{uploadingLogo ? 'hourglass_empty' : 'upload'}</span>
                            {uploadingLogo ? 'Subiendo...' : 'Subir Logo'}
                          </motion.button>
                        </>
                      )}
                    </div>

                    {details.logos && details.logos.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {details.logos.map((logo, idx) => (
                          <motion.div
                            key={logo.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            className="relative group glass border border-white/10 rounded-xl p-3 hover:border-primary/30 apple-transition"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                                <img
                                  src={logo.url}
                                  alt={logo.name}
                                  className="max-w-full max-h-full object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </div>
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <p className="text-xs text-white font-medium truncate" title={logo.name}>{logo.name}</p>
                                <p className="text-[10px] text-muted-dark">{formatFileSize(logo.size)}</p>
                              </div>
                            </div>

                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 apple-transition">
                              <motion.button
                                whileHover={buttonHover}
                                whileTap={buttonTap}
                                type="button"
                                onClick={() => handleDownloadLogo(logo)}
                                className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white apple-transition"
                                title="Descargar"
                              >
                                <span className="material-icons-round text-sm">download</span>
                              </motion.button>
                              {editMode && (
                                <motion.button
                                  whileHover={buttonHover}
                                  whileTap={buttonTap}
                                  type="button"
                                  onClick={() => handleRemoveLogo(logo)}
                                  className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white apple-transition"
                                  title="Eliminar"
                                >
                                  <span className="material-icons-round text-sm">delete</span>
                                </motion.button>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-dark text-xs">
                        {editMode ? (
                          <motion.div
                            whileHover={{ borderColor: 'rgba(0, 122, 255, 0.5)' }}
                            onClick={() => logoInputRef.current?.click()}
                            className="border-2 border-dashed border-white/10 rounded-xl p-4 cursor-pointer apple-transition"
                          >
                            <span className="material-icons-round text-2xl mb-1 text-muted-dark">add_photo_alternate</span>
                            <p>Haz clic para subir logos</p>
                          </motion.div>
                        ) : (
                          <p>No hay logos subidos.</p>
                        )}
                      </div>
                    )}
                  </motion.div>

                  {/* Material Descargable / Links */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...springConfig.gentle, delay: 0.25 }}
                    className="glass rounded-2xl p-4 border border-white/10"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] text-muted-dark font-bold uppercase tracking-wider">Links Externos / Material</span>
                      {editMode && (
                        <motion.button
                          whileHover={buttonHover}
                          whileTap={buttonTap}
                          type="button"
                          onClick={addLink}
                          className="flex items-center justify-center w-6 h-6 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white apple-transition"
                        >
                          <span className="material-icons-round text-sm">add</span>
                        </motion.button>
                      )}
                    </div>

                    {editMode ? (
                      <div className="space-y-2">
                        {details.material_descargable.map((link, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="flex items-center gap-2"
                          >
                            <input
                              type="text"
                              value={link}
                              onChange={(e) => handleLinkChange(idx, e.target.value)}
                              placeholder="https://..."
                              className="flex-1 glass border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-primary/50 focus:outline-none apple-transition"
                            />
                            <motion.button
                              whileHover={buttonHover}
                              whileTap={buttonTap}
                              type="button"
                              onClick={() => removeLink(idx)}
                              className="p-2 text-muted-dark hover:text-red-400 apple-transition"
                            >
                              <span className="material-icons-round text-base">delete_outline</span>
                            </motion.button>
                          </motion.div>
                        ))}
                        {details.material_descargable.length === 0 && (
                          <motion.button
                            whileHover={{ borderColor: 'rgba(0, 122, 255, 0.5)' }}
                            onClick={addLink}
                            className="w-full p-3 border-2 border-dashed border-white/10 rounded-xl text-muted-dark apple-transition text-xs"
                          >
                            + Agregar link
                          </motion.button>
                        )}
                      </div>
                    ) : (
                      <>
                        {details.material_descargable.filter(l => l.trim() !== '').length > 0 ? (
                          <div className="flex flex-col gap-2">
                            {details.material_descargable.filter(l => l.trim() !== '').map((link, idx) => (
                              <motion.a
                                key={idx}
                                whileHover={{ x: 4 }}
                                href={link.startsWith('http') ? link : `https://${link}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center p-2.5 rounded-xl glass border border-white/10 hover:border-primary/30 hover:text-primary apple-transition group"
                              >
                                <span className="material-icons-round text-lg mr-2 text-muted-dark group-hover:text-primary">link</span>
                                <span className="text-xs truncate flex-1 text-gray-300 group-hover:text-primary">{link}</span>
                                <span className="material-icons-round text-xs text-muted-dark group-hover:translate-x-1 apple-transition">open_in_new</span>
                              </motion.a>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-dark text-center py-2">No hay links agregados.</p>
                        )}
                      </>
                    )}
                  </motion.div>

                  {/* WeTransfer - Entrega Final */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...springConfig.gentle, delay: 0.28 }}
                    className="glass rounded-2xl p-4 border border-green-500/20 bg-green-500/5"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-icons-round text-green-400 text-lg">cloud_upload</span>
                      <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider">WeTransfer - Entrega Final</span>
                    </div>

                    {editMode ? (
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="material-icons-round text-muted-dark text-lg">link</span>
                        </span>
                        <input
                          type="url"
                          value={details.wetransfer_link}
                          onChange={(e) => handleFieldChange('wetransfer_link', e.target.value)}
                          placeholder="https://we.tl/..."
                          className="w-full glass border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-green-500/50 focus:outline-none apple-transition"
                        />
                      </div>
                    ) : (
                      <>
                        {details.wetransfer_link ? (
                          <motion.a
                            whileHover={{ x: 4, scale: 1.02 }}
                            href={details.wetransfer_link.startsWith('http') ? details.wetransfer_link : `https://${details.wetransfer_link}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center p-3 rounded-xl glass border border-green-500/30 hover:border-green-400 hover:bg-green-500/10 apple-transition group"
                          >
                            <span className="material-icons-round text-xl mr-3 text-green-400">download</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white group-hover:text-green-400 apple-transition">Descargar Video Final</p>
                              <p className="text-[10px] text-muted-dark truncate">{details.wetransfer_link}</p>
                            </div>
                            <span className="material-icons-round text-sm text-muted-dark group-hover:text-green-400 group-hover:translate-x-1 apple-transition">open_in_new</span>
                          </motion.a>
                        ) : (
                          <p className="text-xs text-muted-dark text-center py-2">No hay link de entrega disponible.</p>
                        )}
                      </>
                    )}
                  </motion.div>

                  {/* Timeline History */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...springConfig.gentle, delay: 0.3 }}
                  >
                    <h3 className="text-[10px] font-bold text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2">Historial de Estados</h3>
                    <div className="relative pl-2 space-y-6">
                      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/10"></div>

                      {history.length === 0 ? (
                        <p className="text-xs text-muted-dark pl-4">No hay historial disponible.</p>
                      ) : (
                        history.map((event, idx) => (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="relative flex items-start group"
                          >
                            <motion.div
                              whileHover={{ scale: 1.2 }}
                              className={`absolute left-0 mt-1 w-3.5 h-3.5 rounded-full border-2 ${getStatusColor(event.estado)} bg-surface-dark z-10 apple-transition`}
                            />
                            <div className="ml-6 w-full">
                              <div className="flex justify-between items-start">
                                <p className="text-sm font-bold text-white">{event.estado}</p>
                                <span className="text-[10px] text-muted-dark whitespace-nowrap ml-2">
                                  {new Date(event.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-xs text-muted-dark mt-0.5">
                                por <span className="text-gray-400">{event.usuario_nombre}</span>
                              </p>
                              {event.nota && (
                                <p className="text-xs text-gray-500 italic mt-1 glass p-2 rounded-lg border border-white/10">
                                  "{event.nota}"
                                </p>
                              )}
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </motion.div>
                </>
              ) : (
                <div className="text-center py-10 text-muted-dark">
                  <p>No se pudo cargar la información de la solicitud.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 flex justify-between items-center glass shrink-0">
              {editMode && hasChanges ? (
                <motion.button
                  whileHover={buttonHover}
                  whileTap={buttonTap}
                  onClick={saveChanges}
                  disabled={saving}
                  className="px-5 py-2.5 text-sm font-bold bg-primary text-white rounded-full hover:bg-primary-dark apple-transition shadow-apple-glow disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </motion.button>
              ) : (
                <div></div>
              )}
              <motion.button
                whileHover={buttonHover}
                whileTap={buttonTap}
                onClick={() => {
                  if (hasChanges) {
                    saveChanges();
                  }
                  onClose();
                }}
                className="px-5 py-2.5 text-sm font-bold text-white border border-white/20 rounded-full hover:bg-white/10 apple-transition"
              >
                Cerrar
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RequestDetailModal;
