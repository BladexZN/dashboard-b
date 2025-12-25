import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { User } from '../types';
import { springConfig } from '../lib/animations';
import CustomSelect from './CustomSelect';

const UsersView: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [roleFilter, setRoleFilter] = useState('Todos');

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          const mappedUsers: User[] = data.map((u: any) => ({
            id: u.id,
            name: u.nombre || 'Sin nombre',
            email: u.email || 'No email',
            role: u.rol || 'Sin rol',
            status: (u.estado as 'Activo' | 'Inactivo') || 'Activo',
            avatar: u.avatar_url || ''
          }));
          setUsers(mappedUsers);
        }
      } catch (err: any) {
        console.error("Error fetching users:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchStatus = statusFilter === 'Todos' || user.status === statusFilter;
      const matchRole = roleFilter === 'Todos' || user.role === roleFilter;
      return matchStatus && matchRole;
    });
  }, [users, statusFilter, roleFilter]);

  const uniqueRoles = useMemo(() => {
    const roles = new Set(users.map(u => u.role));
    return ['Todos', ...Array.from(roles)];
  }, [users]);

  if (loading) {
     return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center h-64"
        >
           <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-3"></div>
           <span className="text-sm text-muted-dark">Cargando usuarios...</span>
        </motion.div>
     );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-6 text-center text-red-400 glass border border-red-500/20 rounded-2xl"
      >
        <span className="material-icons-round text-3xl mb-2 block">error_outline</span>
        <p>Error cargando usuarios: {error}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={springConfig.gentle}
      className="space-y-6"
    >
       <motion.div
         initial={{ opacity: 0, y: -10 }}
         animate={{ opacity: 1, y: 0 }}
         transition={springConfig.snappy}
         className="flex items-center justify-between"
       >
        <h2 className="text-xl font-bold text-white">Usuarios del Sistema</h2>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springConfig.snappy, delay: 0.05 }}
        className="flex flex-col sm:flex-row gap-4 glass p-5 rounded-2xl border border-white/10 shadow-apple"
      >
         <div className="flex items-center space-x-3">
            <label className="text-xs font-bold text-muted-dark uppercase tracking-wide">Estado:</label>
            <CustomSelect
               value={statusFilter}
               onChange={setStatusFilter}
               options={[
                  { value: 'Todos', label: 'Todos' },
                  { value: 'Activo', label: 'Activo' },
                  { value: 'Inactivo', label: 'Inactivo' }
               ]}
               className="min-w-[120px]"
            />
         </div>
         <div className="flex items-center space-x-3">
            <label className="text-xs font-bold text-muted-dark uppercase tracking-wide">Rol:</label>
            <CustomSelect
               value={roleFilter}
               onChange={setRoleFilter}
               options={uniqueRoles.map(role => ({ value: role, label: role }))}
               className="min-w-[140px]"
            />
         </div>
      </motion.div>

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springConfig.gentle, delay: 0.1 }}
        className="glass border border-white/10 rounded-2xl overflow-hidden shadow-apple"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-black/20 border-b border-white/10 text-[10px] uppercase text-muted-dark font-bold tracking-wider">
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Rol</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
               {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-muted-dark">
                      <span className="material-icons-round text-3xl mb-2 block opacity-50">person_off</span>
                      No se encontraron usuarios.
                    </td>
                  </tr>
               ) : (
                  filteredUsers.map((user, idx) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ ...springConfig.snappy, delay: idx * 0.02 }}
                      className="hover:bg-white/5 apple-transition group"
                    >
                       <td className="px-6 py-4">
                          <div className="flex items-center">
                             <motion.div
                               whileHover={{ scale: 1.1 }}
                               className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs mr-3 border-2 border-primary/30 overflow-hidden"
                             >
                                {user.avatar ? (
                                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    user.name.charAt(0).toUpperCase()
                                )}
                             </motion.div>
                             <span className="font-bold text-white group-hover:text-primary apple-transition">{user.name}</span>
                          </div>
                       </td>
                       <td className="px-6 py-4">
                         <span className="px-2.5 py-1 rounded-lg text-xs font-medium glass border border-white/10 text-gray-300">
                           {user.role}
                         </span>
                       </td>
                       <td className="px-6 py-4 text-muted-dark text-xs ">{user.email}</td>
                       <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border
                             ${user.status === 'Activo' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}
                          `}>
                             <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${user.status === 'Activo' ? 'bg-primary' : 'bg-red-400'}`}></span>
                             {user.status}
                          </span>
                       </td>
                    </motion.tr>
                  ))
               )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default UsersView;
