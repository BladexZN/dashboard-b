import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { springConfig, buttonTap, buttonHover } from '../lib/animations';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background-dark flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={springConfig.gentle}
        className="glass-darker w-full max-w-md rounded-2xl shadow-apple-lg p-8"
      >
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springConfig.snappy, delay: 0.1 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...springConfig.bouncy, delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 glass border border-white/10 rounded-2xl mb-6 shadow-apple-glow p-2"
          >
            <img src="https://i.imgur.com/fJgCqFA.png" alt="DC Digital Logo" className="w-full h-full object-contain" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Digital DC Dashboard Production</h1>
          <p className="text-muted-dark text-sm mt-2">Sistema de gestión de producción digital</p>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10, height: 0 }}
              animate={{ opacity: 1, x: 0, height: 'auto' }}
              exit={{ opacity: 0, x: -10, height: 0 }}
              className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl mb-6 flex items-center overflow-hidden"
            >
              <span className="material-icons-round mr-2 text-base">error_outline</span>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleLogin} className="space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springConfig.snappy, delay: 0.15 }}
          >
            <label className="block text-[10px] font-bold text-muted-dark mb-1.5 uppercase tracking-widest ml-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full glass border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 apple-transition outline-none placeholder-gray-600"
              placeholder="nombre@empresa.com"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springConfig.snappy, delay: 0.2 }}
          >
            <label className="block text-[10px] font-bold text-muted-dark mb-1.5 uppercase tracking-widest ml-1">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full glass border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 apple-transition outline-none placeholder-gray-600"
              placeholder="••••••••"
            />
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springConfig.snappy, delay: 0.25 }}
            whileHover={!loading ? buttonHover : undefined}
            whileTap={!loading ? buttonTap : undefined}
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-full apple-transition shadow-apple-glow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full inline-block"
              />
            ) : (
              'Ingresar al Sistema'
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
