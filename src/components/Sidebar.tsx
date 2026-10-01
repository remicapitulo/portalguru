import React from 'react';
import {
  Home,
  FileCheck2,
  CalendarDays,
  Lightbulb,
  BookOpenCheck,
  Users,
  Database,
  FileSpreadsheet,
  Globe,
  ExternalLink,
  LogOut,
  X,
  GraduationCap,
  ChevronLeft
} from 'lucide-react';
import { UserRole } from '../types';

export type NavItem =
  | 'beranda'
  | 'perangkat'
  | 'kaldik'
  | 'usulan'
  | 'jurnal'
  | 'data-guru'
  | 'db-manager';

interface SidebarProps {
  currentTab: NavItem;
  onSelectTab: (tab: NavItem) => void;
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  role?: string;
  onLogout: () => void;
  logoUrl?: string;
  schoolName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
  role = 'Guru',
  onLogout,
  logoUrl,
  schoolName,
}) => {
  const menuItems: {
    id: NavItem;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
    badge?: string;
    badgeColor?: string;
  }[] = [
    {
      id: 'beranda',
      label: 'Beranda Portal',
      shortLabel: 'Beranda',
      icon: <Home className="w-5 h-5 shrink-0" />,
    },
    {
      id: 'perangkat',
      label: 'Perangkat Pembelajaran',
      shortLabel: 'Perangkat',
      icon: <FileCheck2 className="w-5 h-5 text-pink-400 shrink-0" />,
      badge: '36 Berkas',
      badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    },
    {
      id: 'kaldik',
      label: 'Kalender Pendidikan',
      shortLabel: 'Kaldik',
      icon: <CalendarDays className="w-5 h-5 text-sky-400 shrink-0" />,
    },
    {
      id: 'usulan',
      label: 'Suara Guru & Aspirasi',
      shortLabel: 'Aspirasi',
      icon: <Lightbulb className="w-5 h-5 text-amber-400 shrink-0" />,
    },
    {
      id: 'jurnal',
      label: 'Jurnal Mengajar Harian',
      shortLabel: 'Jurnal',
      icon: <BookOpenCheck className="w-5 h-5 text-teal-400 shrink-0" />,
    },
    {
      id: 'data-guru',
      label: 'Data Guru & Rekap',
      shortLabel: 'Data Guru',
      icon: <Users className="w-5 h-5 text-indigo-400 shrink-0" />,
      badge: 'Admin',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
    {
      id: 'db-manager',
      label: 'Database Spreadsheet',
      shortLabel: 'Database',
      icon: <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />,
      badge: 'Sheets',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
  ];

  const isAdmin = Boolean(
    role &&
    (role.toLowerCase() === 'admin' ||
     role.toLowerCase() === 'administrator' ||
     role.toLowerCase().includes('admin'))
  );

  // Filter: Hide "Data Guru & Rekap" and "Database Spreadsheet" from Role: Guru
  const visibleMenuItems = menuItems.filter((item) => {
    if (item.id === 'data-guru' || item.id === 'db-manager') {
      return isAdmin;
    }
    return true;
  });

  const showCollapsed = isCollapsed && !isOpen;

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="no-print fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 lg:hidden transition-opacity print:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`no-print print:hidden fixed top-0 left-0 bottom-0 z-50 bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950 text-slate-100 flex flex-col transition-all duration-300 ease-in-out border-r border-white/10 shadow-2xl ${
          // Mobile: slide in/out
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          // Desktop: collapsed (80px) vs expanded width (260px)
          isCollapsed ? 'lg:w-20' : 'lg:w-64 w-72'
        }`}
      >
        {/* Brand Header */}
        <div
          className={`h-20 border-b border-white/10 flex items-center shrink-0 transition-all ${
            showCollapsed ? 'justify-center px-0' : 'justify-between px-4'
          }`}
        >
          {showCollapsed ? (
            /* Centered Logo in Minimize Mode (No squishing, no cut-off) */
            <button
              onClick={onToggleCollapse}
              className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-400 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25 hover:scale-105 active:scale-95 transition-all overflow-hidden p-1"
              title="Perlebar Menu Sidebar"
            >
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain rounded-xl bg-white p-0.5" />
              ) : (
                <GraduationCap className="w-5 h-5 shrink-0" />
              )}
            </button>
          ) : (
            /* Expanded Mode */
            <>
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-400 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25 shrink-0 overflow-hidden p-1">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain rounded-xl bg-white p-0.5" />
                  ) : (
                    <GraduationCap className="w-5 h-5" />
                  )}
                </div>

                <div className="flex flex-col truncate">
                  <span className="font-extrabold text-sm tracking-wide text-white truncate">
                    AdminGuru
                  </span>
                  <span className="text-[11px] text-sky-300/80 font-medium truncate">
                    {schoolName || 'SMPIT Pondok Duta'}
                  </span>
                </div>
              </div>

              {onToggleCollapse && (
                <button
                  onClick={onToggleCollapse}
                  className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                  title="Ciutkan Sidebar"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
            </>
          )}

          {/* Mobile Close Button */}
          {isOpen && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 lg:hidden transition"
              title="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Menu List */}
        <div className={`flex-1 overflow-y-auto py-4 space-y-1.5 custom-scrollbar ${showCollapsed ? 'px-2' : 'px-3'}`}>
          {!showCollapsed && (
            <div className="px-3 pt-1 pb-2 text-[10px] font-black text-slate-400/90 tracking-wider uppercase">
              Menu Utama
            </div>
          )}

          {visibleMenuItems.map((item) => {
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  if (window.innerWidth < 1024) onClose();
                }}
                title={showCollapsed ? item.label : undefined}
                className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all group relative ${
                  showCollapsed
                    ? 'justify-center w-11 h-11 mx-auto p-0'
                    : 'justify-between px-3.5 py-3 gap-2.5'
                } ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {/* Icon + Label */}
                <div className={`flex items-center ${showCollapsed ? 'justify-center w-full' : 'gap-3 min-w-0 flex-1 truncate'}`}>
                  <span className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'} transition-colors shrink-0`}>
                    {item.icon}
                  </span>

                  {!showCollapsed && (
                    <span className="truncate text-left">{item.label}</span>
                  )}
                </div>

                {/* Badge (Non-wrapping single line) */}
                {!showCollapsed && item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap shrink-0 border ${
                      isActive
                        ? 'bg-white/20 text-white border-white/30'
                        : item.badgeColor || 'bg-white/10 text-slate-300 border-white/10'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Tooltip for collapsed mode on desktop hover */}
                {showCollapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xl border border-white/10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 hidden lg:block">
                    {item.label}
                    {item.badge && <span className="ml-1.5 text-sky-400">({item.badge})</span>}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className={`p-3 border-t border-white/10 bg-black/30 space-y-1.5 shrink-0 ${showCollapsed ? 'flex flex-col items-center' : ''}`}>
          <a
            href="https://smpitpondokduta.sch.id"
            target="_blank"
            rel="noopener noreferrer"
            title="Website Resmi SMPIT Pondok Duta"
            className={`flex items-center rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition border border-white/5 ${
              showCollapsed ? 'justify-center w-11 h-11 p-0' : 'w-full justify-between px-3 py-2'
            }`}
          >
            <div className={`flex items-center ${showCollapsed ? 'justify-center' : 'gap-2.5 truncate'}`}>
              <Globe className="w-4 h-4 text-sky-400 shrink-0" />
              {!showCollapsed && <span className="truncate">Website Sekolah</span>}
            </div>
            {!showCollapsed && <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
          </a>

          <button
            onClick={onLogout}
            title="Keluar / Logout"
            className={`flex items-center rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 transition ${
              showCollapsed ? 'justify-center w-11 h-11 p-0' : 'w-full gap-2.5 px-3 py-2'
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!showCollapsed && <span>Keluar Akun</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
