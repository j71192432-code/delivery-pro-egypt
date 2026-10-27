import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  MapPin,
  Receipt,
  BarChart3,
} from 'lucide-react';

export const BottomNavigation: React.FC = () => {
  const navItems = [
    { to: '/', label: 'الرئيسية', icon: LayoutDashboard },
    { to: '/orders', label: 'الأوردرات', icon: Package },
    { to: '/map', label: 'الخريطة', icon: MapPin },
    { to: '/expenses', label: 'المصروفات', icon: Receipt },
    { to: '/reports', label: 'التقارير', icon: BarChart3 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-dark-bg/95 backdrop-blur-lg border-t border-dark-border px-2 py-1 safe-area-pb">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition min-w-[56px] min-h-touch ${
                  isActive
                    ? 'text-brand-400 font-bold scale-105'
                    : 'text-dark-muted hover:text-white font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`p-1 rounded-lg transition ${
                      isActive ? 'bg-brand-500/20 text-brand-400' : ''
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] mt-0.5 tracking-tight">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
