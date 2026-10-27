import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppHeader } from './components/AppHeader';
import { BottomNavigation } from './components/BottomNavigation';
import { DashboardPage } from './pages/DashboardPage';
import { OrdersPage } from './pages/OrdersPage';
import { OrderFormPage } from './pages/OrderFormPage';
import { OrderDetailsPage } from './pages/OrderDetailsPage';
import { MapPage } from './pages/MapPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { WorkSessionPage } from './pages/WorkSessionPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { WorkSession } from './types';
import { getActiveOrPausedSession } from './repositories/sessionsRepository';

export const App: React.FC = () => {
  const [currentSession, setCurrentSession] = useState<WorkSession | null>(null);

  useEffect(() => {
    async function checkSession() {
      try {
        const session = await getActiveOrPausedSession();
        setCurrentSession(session);
      } catch (err) {
        console.error(err);
      }
    }
    checkSession();

    // Check periodically in background
    const interval = setInterval(checkSession, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-dark-bg text-white flex flex-col font-sans selection:bg-brand-500 selection:text-white">
        <AppHeader currentSession={currentSession} />

        <main className="flex-1 w-full max-w-lg mx-auto">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/new" element={<OrderFormPage />} />
            <Route path="/orders/edit/:id" element={<OrderFormPage />} />
            <Route path="/orders/:id" element={<OrderDetailsPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/work-session" element={<WorkSessionPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>

        <BottomNavigation />
      </div>
    </BrowserRouter>
  );
};

export default App;
