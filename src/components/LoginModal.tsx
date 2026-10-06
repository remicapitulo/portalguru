import React, { useState } from 'react';
import { GraduationCap, Lock, IdCard, ArrowRight } from 'lucide-react';
import { User } from '../types';
import { spreadsheetService } from '../db/spreadsheetService';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  onAuthenticate: (nip: string, pass: string) => { success: boolean; user?: User; message: string };
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onAuthenticate,
}) => {
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const result = await spreadsheetService.loginViaSpreadsheet(nip, password);
      setLoading(false);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
        onClose();
      } else {
        setErrorMsg(result.message);
      }
    } catch (err: any) {
      setLoading(false);
      const res = onAuthenticate(nip, password);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
        onClose();
      } else {
        setErrorMsg(res.message);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white p-7 text-center relative">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center text-sky-400 border border-white/10 shadow-inner">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black tracking-tight">Portal Administrasi Guru</h2>
          <p className="text-xs text-sky-200/80 mt-1">SMPIT Pondok Duta • Sistem Mandiri & Terpadu</p>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                NIK (Username)
              </label>
              <div className="relative">
                <IdCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  placeholder="Masukkan NIK Anda"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm outline-none transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan Password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm outline-none transition"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-700/20 hover:shadow-lg transition flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Masuk Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
