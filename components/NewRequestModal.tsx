import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { RequestData, RequestType, User, UserProfile, VideoType, BoardNumber, LogoFile, BOARD_NAMES } from '../types';
import { springConfig, buttonTap, buttonHover } from '../lib/animations';
import CustomSelect from './CustomSelect';

interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<RequestData>) => void;
  initialData?: RequestData | null;
  advisors?: User[];
  currentUser?: UserProfile | null;
}

const NewRequestModal: React.FC<NewRequestModalProps> = ({ isOpen, onClose, onSave, initialData, advisors = [], currentUser }) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [formData, setFormData] = useState({
    client: '',
    product: '',
    type: 'Video completo' as RequestType,
    advisorId: '',
    advisorName: '',
    description: '',
    escaleta: '',
    video_type: '' as VideoType | '',
    board_number: 1 as BoardNumber,
    downloadable_links: [''],
    logos: [] as LogoFile[]
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        client: initialData.client || '',
        product: initialData.product || '',
        type: initialData.type || 'Video completo',
        advisorId: initialData.advisorId || '',
        advisorName: initialData.advisor || '',
        description: initialData.description || '',
        escaleta: initialData.escaleta || '',
        video_type: initialData.video_type || '',
        board_number: initialData.board_number || 1,
        downloadable_links: initialData.downloadable_links && initialData.downloadable_links.length > 0
          ? [...initialData.downloadable_links]
          : [''],
        logos: initialData.logos || []
      });
    } else {
      setFormData({
        client: '',
        product: '',
        type: 'Video completo',
        advisorId: currentUser?.id || '',
        advisorName: currentUser?.nombre || '',
        description: '',
        escaleta: '',
        video_type: '',
        board_number: 1,
        downloadable_links: [''],
        logos: []
      });
    }
  }, [initialData, isOpen, currentUser]);

  const handleLinkChange = (index: number, value: string) => {
    const newLinks = [...formData.downloadable_links];
    newLinks[index] = value;
    setFormData({ ...formData, downloadable_links: newLinks });
  };

  const addLinkField = () => {
    setFormData({
      ...formData,
      downloadable_links: [...formData.downloadable_links, '']
    });
  };

  const removeLinkField = (index: number) => {
    if (formData.downloadable_links.length <= 1) {
      handleLinkChange(0, '');
      return;
    }
    const newLinks = formData.downloadable_links.filter((_, i) => i !== index);
    setFormData({ ...formData, downloadable_links: newLinks });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingLogo(true);
    const newLogos: LogoFile[] = [];

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
          console.error('Logo upload error:', error);
          alert(`Error al subir ${file.name}: ${error.message}`);
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
      } catch (err) {
        console.error('Logo upload error:', err);
      }
    }

    setFormData({
      ...formData,
      logos: [...formData.logos, ...newLogos]
    });

    setUploadingLogo(false);
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async (logo: LogoFile) => {
    const urlParts = logo.url.split('/');
    const filePath = `logos/${urlParts[urlParts.length - 1]}`;

    try {
      await supabase.storage.from('request-logos').remove([filePath]);
    } catch (err) {
      console.error('Error deleting logo:', err);
    }

    setFormData({
      ...formData,
      logos: formData.logos.filter(l => l.id !== logo.id)
    });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!initialData && currentUser?.estado !== 'Activo') {
      alert('Tu usuario no está activo. No puedes crear solicitudes.');
      return;
    }

    const finalLinks = formData.downloadable_links.filter(link => link.trim() !== '');

    onSave({
      ...formData,
      advisor: formData.advisorName,
      advisorId: formData.advisorId,
      video_type: formData.video_type || undefined,
      board_number: formData.board_number,
      downloadable_links: finalLinks,
      logos: formData.logos
    });
  };

  const isValidUrl = (url: string) => {
    if (!url) return true;
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  const isCreationBlocked = !initialData && (!currentUser || currentUser.estado !== 'Activo');

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={springConfig.snappy}
            className="relative glass-darker border border-white/10 rounded-2xl shadow-apple-lg w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-white/10 flex justify-between items-center glass">
              <motion.h2
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xl font-bold text-white"
              >
                {initialData ? 'Editar Solicitud' : 'Nueva Solicitud'}
              </motion.h2>
              <motion.button
                whileHover={buttonHover}
                whileTap={buttonTap}
                onClick={onClose}
                className="p-2 rounded-xl text-muted-dark hover:text-white hover:bg-white/10 apple-transition"
              >
                <span className="material-icons-round">close</span>
              </motion.button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
              >
                <label className="block text-[10px] font-bold text-muted-dark mb-1.5 uppercase tracking-wider">Cliente</label>
                <input
                  required
                  type="text"
                  className="w-full glass border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-primary/50 focus:outline-none placeholder-muted-dark apple-transition"
                  placeholder="Nombre del cliente"
                  value={formData.client}
                  onChange={e => setFormData({...formData, client: e.target.value})}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <label className="block text-[10px] font-bold text-muted-dark mb-1.5 uppercase tracking-wider">Servicio / Tratamiento</label>
                <input
                  required
                  type="text"
                  className="w-full glass border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-primary/50 focus:outline-none placeholder-muted-dark apple-transition"
                  placeholder="Ej: Rejuvenecimiento facial, Limpieza profunda..."
                  value={formData.product}
                  onChange={e => setFormData({...formData, product: e.target.value})}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="grid grid-cols-2 gap-4"
              >
                <div>
                  <label className="block text-[10px] font-bold text-muted-dark mb-1.5 uppercase tracking-wider">Tipo</label>
                  <CustomSelect
                    value={formData.type}
                    onChange={(val) => setFormData({...formData, type: val as RequestType})}
                    options={[
                      { value: 'Video completo', label: 'Video completo' },
                      { value: 'Agregado', label: 'Agregado' },
                      { value: 'Variante', label: 'Variante' },
                      { value: 'Corrección', label: 'Corrección' }
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-muted-dark mb-1.5 uppercase tracking-wider">Asesor</label>
                  {initialData ? (
                    <CustomSelect
                      value={formData.advisorId}
                      onChange={(selectedId) => {
                        const selectedUser = advisors.find(u => u.id === selectedId);
                        setFormData({
                          ...formData,
                          advisorId: selectedId,
                          advisorName: selectedUser ? selectedUser.name : ''
                        });
                      }}
                      options={advisors.length > 0
                        ? advisors.map(user => ({ value: user.id, label: user.name }))
                        : [{ value: '', label: 'Cargando asesores...' }]
                      }
                      placeholder="Seleccionar Asesor"
                    />
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        disabled
                        value={formData.advisorName || 'Cargando...'}
                        className="w-full glass border border-white/10 rounded-xl px-3 py-2.5 text-sm text-muted-dark cursor-not-allowed"
                      />
                      <p className="text-[10px] text-muted-dark mt-1">Asignado automáticamente al usuario actual</p>
                    </div>
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-2 gap-4"
              >
                <div>
                  <label className="block text-[10px] font-bold text-muted-dark mb-1.5 uppercase tracking-wider">Tipo de Video <span className="text-red-400">*</span></label>
                  <CustomSelect
                    value={formData.video_type}
                    onChange={(val) => setFormData({...formData, video_type: val as VideoType})}
                    options={[
                      { value: 'Stock', label: 'Stock' },
                      { value: 'Hibrido', label: 'Híbrido' },
                      { value: 'Original', label: 'Original' }
                    ]}
                    placeholder="Seleccionar..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-dark mb-1.5 uppercase tracking-wider">Tablero de Producción</label>
                  <CustomSelect
                    value={String(formData.board_number)}
                    onChange={(val) => setFormData({...formData, board_number: parseInt(val) as BoardNumber})}
                    options={[
                      { value: '1', label: BOARD_NAMES[1] },
                      { value: '2', label: BOARD_NAMES[2] },
                      { value: '3', label: BOARD_NAMES[3] },
                      { value: '4', label: BOARD_NAMES[4] }
                    ]}
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <label className="block text-[10px] font-bold text-muted-dark mb-1.5 uppercase tracking-wider">Descripción / Notas</label>
                <textarea
                  rows={2}
                  className="w-full glass border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-primary/50 focus:outline-none resize-none placeholder-muted-dark apple-transition"
                  placeholder="Detalles adicionales..."
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                ></textarea>
              </motion.div>

              {/* Section: Subir Logo del cliente */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="border-t border-white/10 pt-4 mt-2"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-[10px] font-bold text-white uppercase tracking-wider">Subir Logo del Cliente</h3>
                    <p className="text-[10px] text-muted-dark mt-0.5">Formatos: PNG, JPG, SVG, AI, EPS (max 10MB)</p>
                  </div>
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
                </div>

                {/* Logos Grid */}
                {formData.logos.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {formData.logos.map((logo, idx) => (
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
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                            <span className="material-icons-round text-muted-dark hidden">image</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white font-medium truncate">{logo.name}</p>
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
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {formData.logos.length === 0 && !uploadingLogo && (
                  <motion.div
                    whileHover={{ borderColor: 'rgba(0, 122, 255, 0.5)' }}
                    onClick={() => logoInputRef.current?.click()}
                    className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer apple-transition"
                  >
                    <span className="material-icons-round text-3xl text-muted-dark mb-2">add_photo_alternate</span>
                    <p className="text-xs text-muted-dark">Haz clic para subir logos del cliente</p>
                  </motion.div>
                )}
              </motion.div>

              {/* Section: Escaleta de Video */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="border-t border-white/10 pt-4 mt-2"
              >
                <h3 className="text-[10px] font-bold text-white uppercase tracking-wider mb-3">Escaleta de Video</h3>
                <div>
                  <label className="block text-[10px] font-bold text-muted-dark mb-1.5 uppercase tracking-wider">Contenido de la Escaleta</label>
                  <textarea
                    rows={4}
                    className="w-full glass border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-primary/50 focus:outline-none resize-none placeholder-muted-dark apple-transition"
                    placeholder="Escribe aquí la escaleta del video..."
                    value={formData.escaleta}
                    onChange={e => setFormData({...formData, escaleta: e.target.value})}
                  ></textarea>
                </div>
              </motion.div>

              {/* Section: Material Descargable */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="border-t border-white/10 pt-4 mt-2"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[10px] font-bold text-white uppercase tracking-wider">Material Descargable</h3>
                  <motion.button
                    whileHover={buttonHover}
                    whileTap={buttonTap}
                    type="button"
                    onClick={addLinkField}
                    className="flex items-center justify-center w-6 h-6 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white apple-transition"
                  >
                    <span className="material-icons-round text-sm">add</span>
                  </motion.button>
                </div>

                <div className="space-y-3">
                  {formData.downloadable_links.map((link, index) => {
                    const isValid = isValidUrl(link);
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="space-y-1"
                      >
                        <label className="block text-[10px] font-bold text-muted-dark ml-1 uppercase tracking-wider">Link {index + 1}</label>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              className={`w-full glass border rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-primary/50 focus:outline-none apple-transition ${!isValid && link ? 'border-red-500/50 ring-red-500/10' : 'border-white/10'}`}
                              placeholder="Pega aquí el link del material"
                              value={link}
                              onChange={e => handleLinkChange(index, e.target.value)}
                            />
                            {!isValid && link && (
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 material-icons-round text-red-500 text-sm" title="URL inválida">error_outline</span>
                            )}
                          </div>
                          <motion.button
                            whileHover={buttonHover}
                            whileTap={buttonTap}
                            type="button"
                            onClick={() => removeLinkField(index)}
                            className="p-2 text-muted-dark hover:text-red-400 apple-transition"
                          >
                            <span className="material-icons-round text-base">delete_outline</span>
                          </motion.button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="pt-4 flex justify-end space-x-3"
              >
                <motion.button
                  whileHover={buttonHover}
                  whileTap={buttonTap}
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-sm font-bold text-muted-dark hover:text-white hover:bg-white/10 rounded-full apple-transition"
                >
                  Cancelar
                </motion.button>
                <motion.button
                  whileHover={!isCreationBlocked ? buttonHover : {}}
                  whileTap={!isCreationBlocked ? buttonTap : {}}
                  type="submit"
                  disabled={isCreationBlocked}
                  className="px-5 py-2.5 text-sm font-bold bg-primary hover:bg-primary-dark text-white rounded-full shadow-apple-glow apple-transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {initialData ? 'Guardar Cambios' : 'Guardar Solicitud'}
                </motion.button>
              </motion.div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default NewRequestModal;
