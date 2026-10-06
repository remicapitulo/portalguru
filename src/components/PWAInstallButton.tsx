import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Monitor, Smartphone, CheckCircle2, X, Laptop, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'compact' | 'button' | 'banner';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'button',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  // If already installed, hide button
  if (isInstalled && !justInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setJustInstalled(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {variant === 'navbar' && (
        <button
          onClick={handleClick}
          type="button"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-xs hover:shadow transition-all shrink-0 cursor-pointer ${className}`}
          title="Instal aplikasi Portal Guru di Google Chrome (Desktop & Mobile)"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Instal di Chrome</span>
          <span className="sm:hidden">Instal</span>
        </button>
      )}

      {variant === 'banner' && (
        <div className="bg-gradient-to-r from-indigo-900 to-blue-900 text-white p-3.5 sm:p-4 rounded-2xl shadow-sm border border-indigo-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-amber-300">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs sm:text-sm">Buka Cepat di Google Chrome (PWA)</h4>
              <p className="text-[11px] text-indigo-200 mt-0.5">
                Instal sebagai aplikasi mandiri di HP Android, Tablet, atau Laptop tanpa perlu buka tab browser berulang kali.
              </p>
            </div>
          </div>
          <button
            onClick={handleClick}
            className="px-4 py-2 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 font-black text-xs shrink-0 transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Instal Sekarang</span>
          </button>
        </div>
      )}

      {variant === 'compact' && (
        <button
          onClick={handleClick}
          type="button"
          className={`p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition cursor-pointer ${className}`}
          title="Instal aplikasi di Chrome"
        >
          <Download className="w-4 h-4" />
        </button>
      )}

      {variant === 'button' && (
        <button
          onClick={handleClick}
          type="button"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs hover:shadow transition cursor-pointer ${className}`}
        >
          <Download className="w-4 h-4" />
          <span>Instal di Google Chrome</span>
        </button>
      )}

      {/* MODAL PANDUAN CARA INSTAL DI GOOGLE CHROME (MUNCUL DI LAYAR UTAMA, BUKAN DI MENU) */}
      {showGuideModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowGuideModal(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Instal Portal Guru di Google Chrome
                  </h3>
                  <p className="text-xs text-slate-500">
                    Aplikasi mandiri berkinerja cepat untuk HP Android, Tablet, dan Komputer
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content per Platform */}
            <div className="space-y-3.5 text-xs">
              {/* Panduan Android / Mobile Chrome */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-2 font-black text-slate-900 text-xs">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>1. Pada HP / Tablet Android (Google Chrome)</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
                  <li>
                    Buka menu titik tiga (<strong className="text-slate-900 font-mono">⋮</strong>) di pojok kanan atas browser Google Chrome.
                  </li>
                  <li>
                    Pilih menu <strong className="text-indigo-600">&ldquo;Instal aplikasi&rdquo;</strong> atau <strong className="text-indigo-600">&ldquo;Tambahkan ke Layar Utama&rdquo;</strong> (Add to Home screen).
                  </li>
                  <li>
                    Ketuk <strong>&ldquo;Instal&rdquo;</strong> pada pop-up konfirmasi. Ikon Portal Guru akan langsung muncul di beranda gadget Anda.
                  </li>
                </ol>
              </div>

              {/* Panduan Laptop / Desktop Chrome */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-2 font-black text-slate-900 text-xs">
                  <Laptop className="w-4 h-4 text-blue-600" />
                  <span>2. Pada Komputer / Laptop (Google Chrome Desktop)</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
                  <li>
                    Lihat bilah alamat URL (Address Bar) di kanan atas browser Chrome: klik ikon <strong className="text-indigo-600">Instal (panah ke bawah ⤓ di dalam layar)</strong>.
                  </li>
                  <li>
                    Atau klik menu titik tiga (<strong className="text-slate-900 font-mono">⋮</strong>) Chrome &gt; pilih <strong className="text-indigo-600">&ldquo;Simpan dan bagikan&rdquo;</strong> &gt; <strong className="text-indigo-600">&ldquo;Instal Portal Administrasi Guru...&rdquo;</strong>
                  </li>
                  <li>
                    Klik <strong>Instal</strong>. Aplikasi akan terbuka di jendela independen tanpa bilah browser.
                  </li>
                </ol>
              </div>

              {/* Panduan iPhone / iPad */}
              {isIOS && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-2 font-black text-slate-900 text-xs">
                    <Smartphone className="w-4 h-4 text-slate-700" />
                    <span>3. Pada iPhone / iPad (Safari)</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
                    <li>Tekan tombol <strong>Share</strong> (ikon kotak dengan panah ke atas).</li>
                    <li>Gulir ke bawah dan ketuk <strong>Add to Home Screen</strong> (Tambah ke Layar Utama).</li>
                    <li>Ketuk <strong>Add</strong> di pojok kanan atas.</li>
                  </ol>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
              {isInstallable ? (
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await install();
                    if (ok) {
                      setJustInstalled(true);
                      setShowGuideModal(false);
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Instal Langsung Sekarang</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-400">
                  Ikuti langkah Chrome di atas untuk memasang
                </span>
              )}

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Tutup Panduan
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
