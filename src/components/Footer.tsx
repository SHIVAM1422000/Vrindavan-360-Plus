import React from 'react';
import { motion } from 'motion/react';
import { Heart, ShieldCheck } from 'lucide-react';

interface FooterProps {
  onAdminClick: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onAdminClick }) => {
  return (
    <footer className="py-24 px-6 bg-trust-navy text-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <h2 className="text-4xl font-black tracking-tighter">Vrindavan <span className="text-trust-gold">360</span> Plus</h2>
            <p className="text-slate-400 text-lg leading-relaxed max-w-md">
              A dedicated initiative to provide accurate, real-time information to devotees visiting the holy city of Vrindavan.
            </p>
            <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10 w-fit">
              <ShieldCheck className="w-6 h-6 text-trust-gold" />
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Verified Data</p>
                <p className="text-sm font-bold text-white">Updated Daily by Local Brijwasis</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-8">
            <div className="text-center md:text-right">
              <p className="text-slate-400 text-sm font-medium mb-2">Made with devotion for Brijwasis & Devotees</p>
              <div className="flex items-center justify-center md:justify-end gap-2 text-trust-gold font-black text-xl">
                <span>Radhe Radhe</span>
                <Heart className="w-5 h-5 fill-trust-gold" />
              </div>
            </div>
            
            <div className="pt-8 border-t border-white/10 w-full md:w-auto text-center md:text-right">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">© 2026 Vrindavan 360 Plus • All Rights Reserved</p>
              <button 
                onClick={onAdminClick}
                className="text-[10px] font-bold text-slate-700 uppercase tracking-widest hover:text-trust-gold transition-colors"
              >
                Admin Access
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
