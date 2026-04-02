import React from 'react';
import { motion } from 'motion/react';
import { Clock, Navigation, Users, ShieldCheck, Edit3 } from 'lucide-react';
import { Temple } from '../types';

interface TempleCardProps {
  temple: Temple;
  isAuthorized: boolean;
  onEdit: (temple: Temple) => void;
}

export const TempleCard: React.FC<TempleCardProps> = ({ temple, isAuthorized, onEdit }) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-100 flex flex-col h-full"
    >
      {/* Image Section */}
      <div className="relative h-64 overflow-hidden">
        <img 
          src={temple.image} 
          alt={temple.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
          <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/30">
            <p className="text-[10px] font-black text-white uppercase tracking-widest mb-1 opacity-80">Daily Visitors</p>
            <div className="flex items-center gap-2">
              <Users className="w-3 h-3 text-trust-gold" />
              <span className="text-sm font-bold text-white">{temple.visitor_count.toLocaleString()}+</span>
            </div>
          </div>
          {isAuthorized && (
            <button 
              onClick={() => onEdit(temple)}
              className="p-3 bg-white rounded-2xl shadow-lg text-trust-navy hover:bg-trust-gold hover:text-white transition-all transform hover:scale-110 active:scale-95"
            >
              <Edit3 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-8 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-2xl font-black text-trust-navy leading-tight group-hover:text-trust-gold transition-colors">{temple.name}</h3>
          <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 shrink-0">
            <ShieldCheck className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Live</span>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-trust-gold uppercase tracking-widest mb-1">Specialty</p>
            <p className="text-sm font-bold text-[#00416A] leading-relaxed italic">"{temple.specialty}"</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Summer Morning</p>
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="w-3 h-3 text-trust-gold" />
                <span className="text-xs font-bold">{temple.timings.summer.morning.open} - {temple.timings.summer.morning.close}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Summer Evening</p>
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="w-3 h-3 text-trust-gold" />
                <span className="text-xs font-bold">{temple.timings.summer.evening.open} - {temple.timings.summer.evening.close}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto space-y-4">
          <div className="flex items-center justify-between p-4 bg-trust-navy/5 rounded-2xl border border-trust-navy/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-trust-navy flex items-center justify-center text-white text-[10px] font-black">TIP</div>
              <p className="text-[11px] font-medium text-trust-navy leading-tight max-w-[180px]">{temple.pro_tip}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Status</span>
              <span className="text-[10px] font-black text-emerald-600">{temple.last_verified}</span>
            </div>
            <a 
              href={temple.maps_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-trust-navy text-white rounded-2xl text-xs font-bold hover:bg-trust-gold hover:shadow-xl transition-all active:scale-95"
            >
              <Navigation className="w-3 h-3" />
              {temple.id === 3 ? "Navigate to Soveri Kund" : "Navigate"}
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
