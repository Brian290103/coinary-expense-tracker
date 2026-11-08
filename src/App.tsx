import { useCallback, useEffect, useState } from 'react';
import { Toaster } from "@/components/Toaster";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Capacitor } from '@capacitor/core';
import PageNotFound from "./lib/PageNotFound";
import ScrollToTop from "./components/ScrollToTop";
import BackButtonHandler from "./components/BackButtonHandler";
import LockScreen from "./components/LockScreen";
import AppShell from "@/components/AppShell";
import { bootProfiles, getBiometricsEnabled, getProfile } from "@/lib/profiles";
import { db, openProfileDatabase, SETTINGS_ID } from "@/lib/db";
import { useAppStore } from "@/store/useAppStore";
import Home from "@/pages/Home";
import Transactions from "@/pages/Transactions";
import Insights from "@/pages/Insights";
import Budgets from "@/pages/Budgets";
import Settings from "@/pages/Settings";
import Categories from "@/pages/Categories";
import Accounts from "@/pages/Accounts";
import Goals from "@/pages/Goals";
import Profile from "@/pages/Profile";
import Recurring from "@/pages/Recurring";
import Onboarding from "@/pages/Onboarding";
import ToastHost from "@/components/ToastHost";

function App() {
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  const lockState = useAppStore((s) => s.lockState);
  const setLockState = useAppStore((s) => s.setLockState);
  const [pinFallback, setPinFallback] = useState(false);

  const handleUnlock = useCallback((): void => {
    // Biometric passed — the profile may still want its own PIN.
    if (lockState === 'biometric' && pinFallback) {
      setLockState('pin');
      return;
    }
    setLockState('unlocked');
  }, [lockState, pinFallback, setLockState]);

  const handleUsePin = useCallback((): void => {
    setLockState('pin');
  }, [setLockState]);

  // Decide whether the active profile needs a PIN gate.
  const profileHasPin = useCallback(async (): Promise<boolean> => {
    try {
      const settings = await db.settings.get(SETTINGS_ID);
      return !!(settings?.profileLockEnabled && settings?.profilePinHash);
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const id = await bootProfiles();
      if (cancelled) return;
      openProfileDatabase(id);
      const profile = await getProfile(id);
      if (cancelled) return;
      setActiveProfile(profile || null);
    })();
    return () => {
      cancelled = true;
    };
  }, [setActiveProfile]);

  // Gate on every profile switch + first launch (after the profile is known).
  useEffect(() => {
    if (!activeProfileId) return;
    let cancelled = false;
    (async () => {
      setLockState('checking');
      const [bio, hasPin] = await Promise.all([
        getBiometricsEnabled().catch(() => false),
        profileHasPin(),
      ]);
      if (cancelled) return;
      setPinFallback(hasPin);
      if (Capacitor.isNativePlatform() && bio) {
        setLockState('biometric');
        return;
      }
      setLockState(hasPin ? 'pin' : 'unlocked');
    })();
    return () => {
      cancelled = true;
    };
  }, [activeProfileId, setLockState, profileHasPin]);

  if (!activeProfileId || lockState === 'checking') {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
      </div>
    );
  }

  if (lockState !== 'unlocked') {
    return (
      <LockScreen
        mode={lockState}
        profileName={activeProfile?.name || null}
        profileIcon={activeProfile?.icon}
        profileColor={activeProfile?.color}
        allowPinFallback={pinFallback}
        onUnlock={handleUnlock}
        onUsePin={handleUsePin}
      />
    );
  }

  return (
    <Router>
      <ScrollToTop />
      <BackButtonHandler />
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route element={<AppShell key={activeProfileId} />}>
          <Route path="/" element={<Home />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/recurring" element={<Recurring />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/accounts" element={<Accounts />} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
      <Toaster />
      <ToastHost />
    </Router>
  );
}

export default App;
