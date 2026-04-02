import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Lock } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (password: string) => void;
  isAuthorized: boolean;
  onLogout: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ 
  isOpen, 
  onClose, 
  onLogin, 
  isAuthorized, 
  onLogout 
}) => {
  const [password, setPassword] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(password);
    setPassword('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-trust-navy/60 backdrop-blur-sm flex items-center justify-center p-6"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-trust-gold via-trust-navy to-trust-gold" />
            
            {!isAuthorized ? (
              <div className="space-y-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-trust-navy/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Lock className="w-8 h-8 text-trust-navy" />
                  </div>
                  <h3 className="text-3xl font-black text-trust-navy tracking-tight mb-2">Admin Login</h3>
                  <p className="text-slate-500 text-sm font-medium">Enter the secure password to manage temple data.</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter Password"
                      autoFocus
                      className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:border-trust-gold focus:ring-4 focus:ring-trust-gold/10 outline-none transition-all text-sm font-bold text-trust-navy placeholder:text-slate-300"
                    />
                  </div>
                  <div className="flex gap-3">
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
                      Login
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <ShieldCheck className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-3xl font-black text-trust-navy tracking-tight mb-2">Admin Dashboard</h3>
                  <p className="text-slate-500 text-sm font-medium">Select a temple from the list to edit its details.</p>
                </div>
                
                <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl">
                  <p className="text-xs text-emerald-700 font-bold text-center leading-relaxed">
                    Authorized: You can now edit temple data directly from the cards.
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={onClose}
                    className="flex-1 py-4 rounded-2xl bg-slate-100 text-trust-navy text-sm font-bold hover:bg-slate-200 transition-colors"
                  >
                    Close Dashboard
                  </button>
                  <button 
                    onClick={() => { onLogout(); onClose(); }}
                    className="flex-1 py-4 rounded-2xl bg-rose-50 text-rose-600 text-sm font-bold border border-rose-100 hover:bg-rose-100 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
