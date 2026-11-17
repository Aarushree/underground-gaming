'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import Header from '@/components/Header';
import LiveStations from '@/components/LiveStations';
import CustomerWallet from '@/components/CustomerWallet';
import AdminTerminal from '@/components/AdminTerminal';
import AuthForm from '@/components/AuthForm';
import { Gamepad2, QrCode } from 'lucide-react';

export default function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  const supabase = createClient();

  // Load session and profile on mount
  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && mounted) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (mounted) setProfile(data ?? null);
      }
      if (mounted) setLoading(false);
    };

    loadProfile();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (mounted) {
            setProfile(data ?? null);
            setShowAuth(false);
          }
        } else {
          if (mounted) setProfile(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-neon-green/10 border border-neon-green/30 mb-4 animate-pulse">
            <Gamepad2 size={32} className="text-neon-green" />
          </div>
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (showAuth) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <Header
        profile={profile}
        onAuthClick={() => setShowAuth(true)}
      />

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Hero greeting */}
        <div className="mb-8 hero-gradient rounded-2xl border border-brand-border p-5">
          <div className="flex items-start justify-between">
            <div>
              {profile ? (
                <>
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                    Welcome back,
                  </p>
                  <h1 className="text-2xl font-black text-white">
                    {profile.full_name.split(' ')[0]} 👾
                  </h1>
                  {profile.role === 'ADMIN' && (
                    <span className="inline-flex items-center gap-1 mt-2 text-xs text-gold bg-gold/10 border border-gold/20 px-2 py-0.5 rounded-full">
                      🛡️ Admin Mode Active
                    </span>
                  )}
                </>
              ) : (
                <>
                  <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-widest mb-1.5">
                    Welcome to
                  </p>
                  <h1 className="text-3xl font-black text-white tracking-wider uppercase leading-none">
                    Underground
                  </h1>
                  <p className="text-xs font-semibold tracking-widest text-neon-green uppercase mt-1.5">
                    A Gaming Playstation
                  </p>
                  <p className="text-xs text-gray-400 mt-2.5">
                    Real-time station availability · Loyalty rewards
                  </p>
                </>
              )}
            </div>
            <div className="p-2.5 rounded-xl bg-brand-card border border-brand-border">
              <QrCode size={24} className="text-gray-500" />
            </div>
          </div>

          {!profile && (
            <button
              onClick={() => setShowAuth(true)}
              className="mt-4 w-full py-2.5 rounded-xl bg-neon-green/10 border border-neon-green/30 text-neon-green text-sm font-semibold hover:bg-neon-green/20 transition-colors"
            >
              Sign in to track loyalty rewards →
            </button>
          )}
        </div>

        {/* Admin Counter Terminal — ONLY for admins */}
        {profile?.role === 'ADMIN' && <AdminTerminal />}

        {/* Live Station Availability — always visible */}
        <LiveStations profile={profile} />

        {/* Customer Wallet — only for logged-in customers */}
        {profile && profile.role === 'CUSTOMER' && (
          <CustomerWallet initialProfile={profile} />
        )}

        {/* CTA for guests */}
        {!profile && (
          <div className="mt-2 rounded-xl bg-brand-card border border-brand-border p-5 text-center">
            <p className="text-sm font-semibold text-white mb-1">
              🎮 Earn Free Hours Every Visit
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Spend ₹1,000 and get 1 hour free — on any table or console.
            </p>
            <button
              onClick={() => setShowAuth(true)}
              className="px-6 py-2.5 rounded-xl bg-gold text-brand-bg text-sm font-bold hover:bg-gold-dim active:scale-95 transition-all"
            >
              Join Loyalty Program
            </button>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 pb-6 text-center text-xs text-gray-700">
          <p className="font-semibold text-gray-500">Underground <span className="text-gray-600">· A Gaming Playstation</span></p>
          <p className="mt-1">Powered by real-time station tracking & loyalty system</p>
        </footer>
      </main>
    </div>
  );
}
