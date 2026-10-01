import React, { useState, useEffect } from 'react';
import { dbService } from './db/storage';
import { spreadsheetService } from './db/spreadsheetService';
import { AppDatabase, User } from './types';
import { Navbar } from './components/Navbar';
import { Sidebar, NavItem } from './components/Sidebar';
import { LoginModal } from './components/LoginModal';
import { BerandaView } from './components/BerandaView';
import { PerangkatView } from './components/PerangkatView';
import { KaldikView } from './components/KaldikView';
import { UsulanView } from './components/UsulanView';
import { JurnalView } from './components/JurnalView';
import { DataGuruView } from './components/DataGuruView';
import { DatabaseManagerView } from './components/DatabaseManagerView';
import { ReportPrintView } from './components/ReportPrintView';

export default function App() {
  const [db, setDb] = useState<AppDatabase>(dbService.getDatabase());
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return dbService.getLoggedInUser();
  });

  const [currentTab, setCurrentTab] = useState<NavItem | 'report-print'>('beranda');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(() => !dbService.getLoggedInUser());

  // Subscribe to database changes and auto-sync from spreadsheet
  useEffect(() => {
    const unsubscribe = dbService.subscribe((updatedDb) => {
      setDb({ ...updatedDb });
    });

    // Initial background sync from Google Spreadsheet
    spreadsheetService.syncAll().catch((err) => {
      console.warn('Initial spreadsheet sync warning:', err);
    });

    return unsubscribe;
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    dbService.setLoggedInUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    dbService.setLoggedInUser(null);
    setLoginModalOpen(true);
  };

  const handleAuthenticate = (nip: string, pass: string) => {
    return dbService.authenticate(nip, pass);
  };

  const teachers = dbService.getTeachers();

  const isAdmin = Boolean(
    currentUser?.role &&
    (currentUser.role.toLowerCase() === 'admin' ||
     currentUser.role.toLowerCase() === 'administrator' ||
     currentUser.role.toLowerCase().includes('admin'))
  );

  // Route-guard: Automatically redirect non-admin (Role: Guru) back to Beranda if attempting to open restricted menus
  useEffect(() => {
    if (!isAdmin && (currentTab === 'data-guru' || currentTab === 'db-manager' || currentTab === 'report-print')) {
      setCurrentTab('beranda');
    }
  }, [isAdmin, currentTab]);

  return (
    <div className="min-h-screen bg-slate-50 flex antialiased text-slate-900 selection:bg-blue-600 selection:text-white overflow-x-hidden">
      {/* Sidebar: Fixed on left with smooth collapse / expand and mobile drawer */}
      <Sidebar
        currentTab={currentTab === 'report-print' ? 'data-guru' : currentTab}
        onSelectTab={(tab) => {
          if (!isAdmin && (tab === 'data-guru' || tab === 'db-manager')) {
            setCurrentTab('beranda');
          } else {
            setCurrentTab(tab);
          }
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isDesktopCollapsed}
        onToggleCollapse={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
        role={currentUser?.role}
        onLogout={handleLogout}
        logoUrl={db.config.school_logo_url}
        schoolName={db.config.school_name}
      />

      {/* Main Right Column: Topbar + Dynamic Page Content + Footer */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 print:pl-0 overflow-x-hidden ${
          isDesktopCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Topbar: Indented alongside Sidebar so it's NEVER overlapped or clipped */}
        <div className="no-print">
          <Navbar
            currentUser={currentUser}
            config={db.config}
            currentTab={currentTab}
            onToggleMobileSidebar={() => setSidebarOpen(!sidebarOpen)}
            isDesktopCollapsed={isDesktopCollapsed}
            onToggleDesktopCollapse={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
            onLogout={handleLogout}
            onOpenLogin={() => setLoginModalOpen(true)}
            onOpenDbManager={isAdmin ? () => setCurrentTab('db-manager') : undefined}
          />
        </div>

        {/* Dynamic Page Body */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 print:p-0 min-w-0">
          {(currentTab === 'beranda' || (!isAdmin && (currentTab === 'data-guru' || currentTab === 'db-manager' || currentTab === 'report-print'))) && (
            <BerandaView
              currentUser={currentUser}
              config={db.config}
              events={db.events}
              db={db}
              onNavigate={(tab) => {
                if (!isAdmin && (tab === 'data-guru' || tab === 'db-manager')) {
                  setCurrentTab('beranda');
                } else {
                  setCurrentTab(tab);
                }
              }}
            />
          )}

          {currentTab === 'perangkat' && (
            <PerangkatView
              currentUser={currentUser}
              config={db.config}
              allTeachers={teachers}
              onOpenReportPrint={isAdmin ? () => setCurrentTab('report-print') : undefined}
            />
          )}

          {currentTab === 'kaldik' && (
            <KaldikView
              currentUser={currentUser}
              config={db.config}
              events={db.events}
            />
          )}

          {currentTab === 'usulan' && (
            <UsulanView
              currentUser={currentUser}
              usulanList={db.usulanList}
            />
          )}

          {currentTab === 'jurnal' && (
            <JurnalView
              currentUser={currentUser}
              jurnalList={db.jurnalList}
            />
          )}

          {currentTab === 'data-guru' && isAdmin && (
            <DataGuruView
              currentUser={currentUser}
              config={db.config}
              allTeachers={teachers}
              db={db}
              onOpenReportPrint={() => setCurrentTab('report-print')}
            />
          )}

          {currentTab === 'db-manager' && isAdmin && (
            <DatabaseManagerView
              db={db}
              config={db.config}
              onOpenReportPrint={() => setCurrentTab('report-print')}
            />
          )}

          {currentTab === 'report-print' && isAdmin && (
            <ReportPrintView
              db={db}
              config={db.config}
              onBack={() => setCurrentTab('data-guru')}
            />
          )}
        </main>

        {/* Global Footer */}
        <footer className="no-print mt-auto py-6 border-t border-slate-200/80 text-center text-xs text-slate-500 bg-white/60 space-y-1">
          <p>
            &copy; {new Date().getFullYear()} <strong>{db.config.school_name}</strong>. Seluruh Hak Cipta Dilindungi.
          </p>
          <p className="italic text-slate-400 text-[11px]">
            &ldquo;Mendidik dengan Hati, Mengajar dengan Inspirasi, Mengelola dengan Rapi.&rdquo;
          </p>
        </footer>
      </div>

      {/* Authentication Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onAuthenticate={handleAuthenticate}
      />
    </div>
  );
}
