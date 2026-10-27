import React, { useState, useEffect } from 'react';
import { Settings, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { WorkSession } from '../types';

interface AppHeaderProps {
  currentSession?: WorkSession | null;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ currentSession }) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-dark-bg/95 backdrop-blur-md border-b border-dark-border px-4 py-3">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        {/* Brand / Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-500 to-brand-400 flex items-center justify-center text-white shadow-md shadow-brand-500/30">
            <span className="font-black text-sm">PRO</span>
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white leading-none">دليفري برو مصر</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] text-dark-muted font-medium">محفوظ محلياً فقط</span>
            </div>
          </div>
        </Link>

        {/* Right side: Session status pill, Online/Offline badge, Settings */}
        <div className="flex items-center gap-2">
          {/* Online/Offline status pill */}
          {!isOnline ? (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-[11px] text-amber-300 font-semibold"
              title="يعمل دون اتصال بالإنترنت"
            >
              <WifiOff className="w-3 h-3" />
              <span>أوفلاين</span>
            </div>
          ) : (
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-[11px] text-emerald-400 font-medium"
              title="متصل بالإنترنت"
            >
              <Wifi className="w-3 h-3" />
            </div>
          )}

          {/* Active session pill if active */}
          {currentSession && (
            <Link
              to="/work-session"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition ${
                currentSession.status === 'active'
                  ? 'bg-profit-bg border-profit/30 text-profit-light animate-pulse'
                  : 'bg-warning-bg border-warning/30 text-warning-light'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current"></span>
              <span>{currentSession.status === 'active' ? 'وردية تعمل' : 'متوقف'}</span>
            </Link>
          )}

          {/* Settings link */}
          <Link
            to="/settings"
            className="p-2 rounded-xl text-dark-muted hover:text-white hover:bg-dark-card border border-transparent hover:border-dark-border transition min-h-touch min-w-touch flex items-center justify-center"
            aria-label="الإعدادات"
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </header>
  );
};
