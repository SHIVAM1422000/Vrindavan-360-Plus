import React from 'react';
import { motion } from 'motion/react';
import { MapPin } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="relative pt-16 pb-24 px-6 overflow-hidden bg-trust-navy">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-trust-gold via-transparent to-transparent" />
      </div>
      
      <div className="max-w-7xl mx-auto relative z-10 text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-trust-gold/10 border border-trust-gold/20 mb-8"
        >
          <MapPin className="w-4 h-4 text-trust-gold" />
          <span className="text-xs font-black text-trust-gold uppercase tracking-[0.2em]">Vrindavan, Uttar Pradesh</span>
        </motion.div>
        
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-6xl md:text-8xl font-black text-white mb-6 tracking-tighter"
        >
          Vrindavan <span className="text-trust-gold">360</span> Plus
        </motion.h1>
        
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xl md:text-2xl text-slate-300 font-medium max-w-2xl mx-auto leading-relaxed"
        >
          The most trusted, real-time guide for your spiritual journey in the holy land of Brij.
        </motion.p>
      </div>
    </header>
  );
};
