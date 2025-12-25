import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RequestData, RequestStatus } from '../types';
import { springConfig, buttonTap, buttonHover } from '../lib/animations';
import CustomSelect from './CustomSelect';

interface RequestsTableProps {
  requests: RequestData[];
  onStatusChange: (id: string, newStatus: RequestStatus) => void;
  onNewRequest: () => void;
  onEditRequest: (request: RequestData) => void;
  onRowClick: (request: RequestData) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  filterAdvisor: string;
  setFilterAdvisor: (advisor: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  advisors: string[];
  onDelete: (request: RequestData) => void;
}

const STATUS_OPTIONS: RequestStatus[] = ['Pendiente', 'En Producción', 'Listo', 'Entregado', 'Corrección'];

const RequestsTable: React.FC<RequestsTableProps> = ({
  requests,
  onStatusChange,
  onNewRequest,
  onEditRequest,
  onRowClick,
  filterStatus,
  setFilterStatus,
  filterAdvisor,
  setFilterAdvisor,
  searchQuery,
  setSearchQuery,
  advisors,
  onDelete
}) => {
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null);
  const [deleteArmedId, setDeleteArmedId] = useState<string | null>(null);

  const handleStatusClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setOpenStatusDropdown(openStatusDropdown === id ? null : id);
  };

  const handleStatusSelect = (e: React.MouseEvent, id: string, status: RequestStatus) => {
    e.stopPropagation();
    onStatusChange(id, status);
    setOpenStatusDropdown(null);
  };

  const handleDeleteClick = (e: React.MouseEvent, request: RequestData) => {
    e.stopPropagation();
    if (deleteArmedId === request.id) {
      onDelete(request);
      setDeleteArmedId(null);
    } else {
      setDeleteArmedId(request.id);
      setTimeout(() => {
        setDeleteArmedId((current) => current === request.id ? null : current);
      }, 3000);
    }
  };

  useEffect(() => {
    const handleClickOutside = () => {
        setOpenStatusDropdown(null);
        setDeleteArmedId(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springConfig.gentle}
      className="glass border border-white/10 rounded-2xl flex flex-col h-full shadow-apple"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Table Filters/Actions */}
      <div className="p-5 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <CustomSelect
            value={filterStatus}
            onChange={setFilterStatus}
            options={[
              { value: 'Todos', label: 'Todos los estados' },
              ...STATUS_OPTIONS.map(s => ({ value: s, label: s }))
            ]}
            icon="filter_list"
            className="min-w-[160px]"
          />
          <CustomSelect
            value={filterAdvisor}
            onChange={setFilterAdvisor}
            options={[
              { value: 'Todos', label: 'Asesor: Todos' },
              ...advisors.map(a => ({ value: a, label: a }))
            ]}
            className="min-w-[140px]"
          />
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative w-full md:w-64 group">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="material-icons-round text-muted-dark text-lg group-focus-within:text-primary apple-transition">search</span>
            </span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full glass border border-white/10 text-sm text-white rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 placeholder-muted-dark apple-transition"
              placeholder="Buscar por folio, cliente..."
              type="text"
            />
          </div>
          <motion.button
            whileHover={buttonHover}
            whileTap={buttonTap}
            onClick={onNewRequest}
            className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-full text-sm font-bold flex items-center apple-transition shadow-apple-glow"
          >
            <span className="material-icons-round text-lg mr-1.5">add</span>
            Nueva Solicitud
          </motion.button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-muted-dark bg-black/20">
              <th className="px-6 py-4 font-bold w-12">
                <input className="rounded border-white/20 bg-white/5 text-primary focus:ring-0 focus:ring-offset-0 cursor-pointer" type="checkbox"/>
              </th>
              <th className="px-6 py-4 font-bold">Folio</th>
              <th className="px-6 py-4 font-bold">Cliente</th>
              <th className="px-6 py-4 font-bold">Servicio / Tratamiento</th>
              <th className="px-6 py-4 font-bold">Tipo</th>
              <th className="px-6 py-4 font-bold">Estado</th>
              <th className="px-6 py-4 font-bold">Asesor</th>
              <th className="px-6 py-4 font-bold">Fecha</th>
              <th className="px-6 py-4 font-bold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-white/5">
            {requests.length === 0 ? (
               <tr>
                 <td colSpan={9} className="text-center py-12 text-muted-dark">
                   <span className="material-icons-round text-4xl text-gray-700 mb-2 block">inbox</span>
                   No se encontraron solicitudes
                 </td>
               </tr>
            ) : (
              requests.map((req, idx) => (
                <motion.tr
                  key={req.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...springConfig.snappy, delay: idx * 0.02 }}
                  className="hover:bg-white/5 apple-transition group cursor-pointer"
                  onClick={() => onRowClick(req)}
                >
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <input className="rounded border-white/20 bg-white/5 text-primary focus:ring-0 focus:ring-offset-0 cursor-pointer" type="checkbox"/>
                  </td>
                  <td className="px-6 py-4 font-bold text-white">{req.id}</td>
                  <td className="px-6 py-4 text-gray-300">
                    <div className="flex items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] mr-2.5 font-bold ${req.clientColor}`}>
                        {req.clientInitials}
                      </div>
                      {req.client}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-300">{req.product}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border
                      ${req.type === 'Variante' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : ''}
                      ${req.type === 'Video completo' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : ''}
                      ${req.type === 'Corrección' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : ''}
                      ${req.type === 'Agregado' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : ''}
                    `}>
                      {req.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 relative">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => handleStatusClick(e, req.id)}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold border apple-transition
                      ${req.status === 'Pendiente' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : ''}
                      ${req.status === 'En Producción' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : ''}
                      ${req.status === 'Corrección' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : ''}
                      ${req.status === 'Listo' ? 'bg-primary/10 text-primary border-primary/20' : ''}
                      ${req.status === 'Entregado' ? 'bg-gray-500/10 text-gray-400 border-gray-500/20' : ''}
                    `}>
                      {req.status === 'Pendiente' && <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full mr-1.5"></span>}
                      {req.status === 'En Producción' && <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mr-1.5 animate-pulse"></span>}
                      {req.status === 'Corrección' && <span className="material-icons-round text-[10px] mr-1">edit</span>}
                      {req.status === 'Listo' && <span className="material-icons-round text-[10px] mr-1">check</span>}
                      {req.status === 'Entregado' && <span className="material-icons-round text-[10px] mr-1">done_all</span>}
                      {req.status}
                    </motion.button>

                    {/* Status Dropdown */}
                    <AnimatePresence>
                      {openStatusDropdown === req.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -5 }}
                          transition={springConfig.snappy}
                          className="absolute z-10 top-full left-0 mt-1 w-40 glass-darker border border-white/10 rounded-xl shadow-apple-lg overflow-hidden"
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <motion.button
                              key={status}
                              whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.05)' }}
                              onClick={(e) => handleStatusSelect(e, req.id, status)}
                              className={`w-full text-left px-4 py-2.5 text-xs apple-transition ${req.status === status ? 'text-primary font-bold' : 'text-gray-300'}`}
                            >
                              {status}
                            </motion.button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-gray-700 text-[9px] flex items-center justify-center text-white mr-2 font-bold">{req.advisorInitials}</div>
                      {req.advisor}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-dark text-xs">{req.date}</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end space-x-1">

                      {/* 2-Click Delete Button */}
                      <div className="relative">
                        <motion.button
                          whileHover={!deleteArmedId ? buttonHover : {}}
                          whileTap={buttonTap}
                          onClick={(e) => handleDeleteClick(e, req)}
                          className={`p-2 rounded-xl apple-transition flex items-center
                            ${deleteArmedId === req.id
                               ? 'bg-red-500 text-white px-3 shadow-lg'
                               : 'text-muted-dark hover:text-red-400 hover:bg-red-500/10'
                            }
                          `}
                          title={deleteArmedId === req.id ? 'Click para confirmar eliminación' : 'Eliminar solicitud'}
                        >
                          <span className="material-icons-round text-lg">
                             {deleteArmedId === req.id ? 'delete_forever' : 'delete'}
                          </span>
                          <AnimatePresence>
                            {deleteArmedId === req.id && (
                              <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                className="text-xs font-bold ml-1 overflow-hidden"
                              >
                                Confirmar
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.button>
                        <AnimatePresence>
                          {deleteArmedId === req.id && (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className="absolute top-full right-0 mt-1 w-32 glass-darker text-white text-[10px] p-2 rounded-lg text-center shadow-apple z-20 pointer-events-none border border-white/10"
                            >
                              Click otra vez para borrar
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <motion.button
                        whileHover={buttonHover}
                        whileTap={buttonTap}
                        title="Editar"
                        onClick={(e) => { e.stopPropagation(); onEditRequest(req); }}
                        className="p-2 text-muted-dark hover:text-primary hover:bg-primary/10 rounded-xl apple-transition"
                      >
                        <span className="material-icons-round text-lg">edit</span>
                      </motion.button>
                      <motion.button
                        whileHover={buttonHover}
                        whileTap={buttonTap}
                        className="p-2 text-muted-dark hover:text-white hover:bg-white/10 rounded-xl apple-transition"
                        onClick={(e) => { e.stopPropagation(); onRowClick(req); }}
                      >
                        <span className="material-icons-round text-lg">more_vert</span>
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-white/10 flex items-center justify-between">
        <p className="text-xs text-muted-dark">Mostrando <span className="font-bold text-white">{requests.length > 0 ? 1 : 0}</span> a <span className="font-bold text-white">{Math.min(5, requests.length)}</span> de <span className="font-bold text-white">{requests.length}</span> resultados</p>
        <div className="flex items-center space-x-2">
          <motion.button
            whileHover={buttonHover}
            whileTap={buttonTap}
            className="p-2 rounded-xl hover:bg-white/5 text-muted-dark disabled:opacity-50 apple-transition"
          >
            <span className="material-icons-round text-sm">chevron_left</span>
          </motion.button>
          <motion.button
            whileHover={buttonHover}
            whileTap={buttonTap}
            className="px-3.5 py-1.5 text-xs rounded-xl bg-primary text-white font-bold shadow-apple-glow"
          >
            1
          </motion.button>
          <motion.button
            whileHover={buttonHover}
            whileTap={buttonTap}
            className="px-3.5 py-1.5 text-xs rounded-xl hover:bg-white/5 text-muted-dark apple-transition"
          >
            2
          </motion.button>
          <motion.button
            whileHover={buttonHover}
            whileTap={buttonTap}
            className="p-2 rounded-xl hover:bg-white/5 text-muted-dark apple-transition"
          >
            <span className="material-icons-round text-sm">chevron_right</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default RequestsTable;
