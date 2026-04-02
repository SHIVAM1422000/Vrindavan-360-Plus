import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Temple } from '../types';

interface EditTempleModalProps {
  temple: Temple | null;
  onClose: () => void;
  onUpdate: (updatedTemple: Temple) => void;
}

export const EditTempleModal: React.FC<EditTempleModalProps> = ({ 
  temple, 
  onClose, 
  onUpdate 
}) => {
  const [editingTemple, setEditingTemple] = React.useState<Temple | null>(null);

  React.useEffect(() => {
    if (temple) {
      setEditingTemple(JSON.parse(JSON.stringify(temple)));
    }
  }, [temple]);

  if (!editingTemple) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(editingTemple);
  };

  return (
    <AnimatePresence>
      {temple && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] bg-trust-navy/60 backdrop-blur-sm flex items-center justify-center p-6 overflow-y-auto"
        >
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl my-8 border border-slate-100 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-trust-gold" />
            
            <h3 className="text-3xl font-black text-trust-navy mb-8 tracking-tight">Edit {editingTemple.name}</h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Temple Name</label>
                  <input 
                    type="text" 
                    value={editingTemple.name}
                    onChange={(e) => setEditingTemple({...editingTemple, name: e.target.value})}
                    className="w-full px-6 py-3 rounded-2xl border border-slate-200 focus:border-trust-gold focus:ring-4 focus:ring-trust-gold/10 outline-none transition-all text-sm font-bold text-trust-navy"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Specialty</label>
                  <input 
                    type="text" 
                    value={editingTemple.specialty}
                    onChange={(e) => setEditingTemple({...editingTemple, specialty: e.target.value})}
                    className="w-full px-6 py-3 rounded-2xl border border-slate-200 focus:border-trust-gold focus:ring-4 focus:ring-trust-gold/10 outline-none transition-all text-sm font-bold text-trust-navy"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Google Maps URL</label>
                <input 
                  type="text" 
                  value={editingTemple.maps_url}
                  onChange={(e) => setEditingTemple({...editingTemple, maps_url: e.target.value})}
                  className="w-full px-6 py-3 rounded-2xl border border-slate-200 focus:border-trust-gold focus:ring-4 focus:ring-trust-gold/10 outline-none transition-all text-sm font-bold text-trust-navy"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visitor Count (Avg)</label>
                  <input 
                    type="number" 
                    value={editingTemple.visitor_count}
                    onChange={(e) => setEditingTemple({...editingTemple, visitor_count: parseInt(e.target.value) || 0})}
                    className="w-full px-6 py-3 rounded-2xl border border-slate-200 focus:border-trust-gold focus:ring-4 focus:ring-trust-gold/10 outline-none transition-all text-sm font-bold text-trust-navy"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Verified Text</label>
                  <input 
                    type="text" 
                    value={editingTemple.last_verified}
                    onChange={(e) => setEditingTemple({...editingTemple, last_verified: e.target.value})}
                    className="w-full px-6 py-3 rounded-2xl border border-slate-200 focus:border-trust-gold focus:ring-4 focus:ring-trust-gold/10 outline-none transition-all text-sm font-bold text-trust-navy"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Brijwasi Tip</label>
                <textarea 
                  value={editingTemple.pro_tip}
                  onChange={(e) => setEditingTemple({...editingTemple, pro_tip: e.target.value})}
                  className="w-full px-6 py-3 rounded-2xl border border-slate-200 focus:border-trust-gold focus:ring-4 focus:ring-trust-gold/10 outline-none transition-all text-sm font-bold text-trust-navy h-24 resize-none"
                />
              </div>

              <div className="p-6 bg-slate-50 rounded-3xl space-y-6">
                <p className="text-[10px] font-black text-trust-navy uppercase tracking-widest border-b border-slate-200 pb-2">Summer Timings</p>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Morning Open</label>
                    <input 
                      type="text" 
                      value={editingTemple.timings.summer.morning.open}
                      onChange={(e) => setEditingTemple({...editingTemple, timings: {...editingTemple.timings, summer: {...editingTemple.timings.summer, morning: {...editingTemple.timings.summer.morning, open: e.target.value}}}})}
                      className="w-full px-4 py-2 rounded-xl border border-white text-sm font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Morning Close</label>
                    <input 
                      type="text" 
                      value={editingTemple.timings.summer.morning.close}
                      onChange={(e) => setEditingTemple({...editingTemple, timings: {...editingTemple.timings, summer: {...editingTemple.timings.summer, morning: {...editingTemple.timings.summer.morning, close: e.target.value}}}})}
                      className="w-full px-4 py-2 rounded-xl border border-white text-sm font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button 
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-4 rounded-2xl bg-slate-100 text-trust-navy text-sm font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 rounded-2xl bg-trust-navy text-white text-sm font-bold hover:bg-trust-gold transition-all shadow-lg hover:shadow-trust-gold/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
