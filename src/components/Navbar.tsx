import React from 'react';
import {
  Menu,
  LogOut,
  GraduationCap,
  FileSpreadsheet,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { User, SchoolConfig } from '../types';
import { NavItem } from './Sidebar';

interface NavbarProps {
  currentUser: User | null;
  config: SchoolConfig;
  currentTab: NavItem | 'report-print';
  onToggleMobileSidebar: () => void;
  isDesktopCollapsed?: boolean;
  onToggleDesktopCollapse?: () => void;
  onLogout: () => void;
  onOpenLogin: () => void;
  onOpenDbManager?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  config,
  currentTab,
  onToggleMobileSidebar,
  isDesktopCollapsed = false,
  onToggleDesktopCollapse,
  onLogout,
  onOpenLogin,
  onOpenDbManager,
}) => {

  // Tab label helper for breadcrumb
  const tabTitles: Record<string, string> = {
    beranda: 'Beranda Portal',
    perangkat: 'Perangkat Pembelajaran',
    kaldik: 'Kalender Pendidikan',
    usulan: 'Suara Guru & Aspirasi',
    jurnal: 'Jurnal Mengajar Harian',
    eflayer: 'Update Eflayer',
    penilaian: 'Penilaian Kinerja',
    'data-guru': 'Data Guru & Rekap',
    'db-manager': 'Database Spreadsheet & Sinkronisasi',
    'report-print': 'Unduh Laporan PDF',
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between transition-all">
      {/* Left: Navigation Toggles & Page Identity */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 sm:p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center justify-center shrink-0"
          title="Buka Menu"
          aria-label="Toggle Mobile Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Sidebar Collapse Button */}
        {onToggleDesktopCollapse && (
          <button
            onClick={onToggleDesktopCollapse}
            className="hidden lg:flex p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition items-center justify-center shrink-0"
            title={isDesktopCollapsed ? 'Buka Penuh Sidebar' : 'Ciutkan Sidebar'}
          >
            {isDesktopCollapsed ? (
              <PanelLeftOpen className="w-5 h-5 text-blue-700" />
            ) : (
              <PanelLeftClose className="w-5 h-5 text-slate-600" />
            )}
          </button>
        )}

        {/* Title & Academic Year */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {config.school_logo_url ? (
            <img
              src={config.school_logo_url}
              alt="Logo Sekolah"
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-xl shrink-0 border border-slate-200/60 p-0.5 bg-white shadow-2xs"
            />
          ) : null}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="font-black text-sm sm:text-base lg:text-lg text-slate-900 tracking-tight truncate font-sans">
                {config.school_name.toUpperCase()}
              </span>
              <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                TA {config.academic_year}
              </span>
            </div>

            <p className="text-xs text-slate-500 hidden sm:block truncate mt-0.5">
              {tabTitles[currentTab] || 'Portal Administrasi Guru Terpadu'}
            </p>
          </div>
        </div>
      </div>

      {/* Right: Quick DB Status Pill & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Google Sheets Live Status Pill (Khusus Admin) */}
        {currentUser &&
          (currentUser.role.toLowerCase() === 'admin' ||
           currentUser.role.toLowerCase() === 'administrator' ||
           currentUser.role.toLowerCase().includes('admin')) &&
          onOpenDbManager && (
          <button
            onClick={onOpenDbManager}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition shrink-0 cursor-pointer"
            title="Google Spreadsheet Terhubung (Klik untuk melihat status & sinkronisasi)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sheets: <strong className="text-emerald-700">Tersambung</strong></span>
          </button>
        )}

        {currentUser ? (
          <div className="flex items-center gap-2 bg-slate-100/90 hover:bg-slate-200/70 p-1.5 sm:pr-3 rounded-full border border-slate-200 transition">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
              {currentUser.avatar || currentUser.nama.charAt(0).toUpperCase()}
            </div>

            <div className="hidden sm:flex flex-col text-left pr-1 max-w-[180px] lg:max-w-[260px]">
              <span className="text-xs font-bold text-slate-900 leading-tight truncate" title={currentUser.nama}>
                {currentUser.nama}
              </span>
              <span className="text-[10px] text-slate-500 font-medium truncate">
                {currentUser.role} {currentUser.mapel ? `• ${currentUser.mapel}` : ''}
              </span>
            </div>

            <button
              onClick={onLogout}
              className="p-1.5 rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 transition shrink-0 ml-1"
              title="Keluar (Logout)"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition shrink-0"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Login Guru</span>
          </button>
        )}
      </div>
    </header>
  );
};
