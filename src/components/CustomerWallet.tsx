'use client';

import { useEffect, useState } from 'react';
import { Clock, Trophy, TrendingUp, Star, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

interface CustomerWalletProps {
  initialProfile: Profile;
}

const MILESTONE = 1000; // INR per free hour

export default function CustomerWallet({ initialProfile }: CustomerWalletProps) {
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const supabase = createClient();

  // Subscribe to real-time profile updates (admin adds spend / redeems hours)
  useEffect(() => {
    const channel = supabase
      .channel(`profile-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${profile.id}`,
        },
        (payload) => {
          setProfile((prev) => ({ ...prev, ...(payload.new as Profile) }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile.id]);

  const progressPct = Math.min((profile.spend_progress / MILESTONE) * 100, 100);
  const remaining = MILESTONE - profile.spend_progress;

  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold text-white tracking-tight mb-4">
        My Loyalty Wallet
      </h2>

      <div className="space-y-3">
        {/* Free Hours Balance Card */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gold/10 to-brand-card border border-gold/30 p-5 glow-gold">
          {/* Background decoration */}
          <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-gold/5" />
          <div className="absolute -right-2 -top-2 w-16 h-16 rounded-full bg-gold/8" />

          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs text-gold/70 font-medium uppercase tracking-widest mb-1">
                Free Hours Balance
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-gold">
                  {profile.free_hours}
                </span>
                <span className="text-gold/60 text-lg font-semibold">hrs</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Valid on any station or game
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gold/15">
              <Clock size={28} className="text-gold" />
            </div>
          </div>

          {profile.free_hours > 0 && (
            <div className="mt-4 flex items-center gap-2 text-xs text-gold/80 bg-gold/10 rounded-lg px-3 py-2">
              <Star size={12} className="fill-gold text-gold flex-shrink-0" />
              You have {profile.free_hours} free hour{profile.free_hours !== 1 ? 's' : ''} — show this to the counter staff to redeem!
            </div>
          )}
        </div>

        {/* Progress Card */}
        <div className="rounded-xl bg-brand-card border border-brand-border p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-neon-green/10">
                <TrendingUp size={16} className="text-neon-green" />
              </div>
              <span className="text-sm font-semibold text-white">
                Next Free Hour
              </span>
            </div>
            <span className="text-xs text-gray-500">
              ₹{profile.spend_progress.toLocaleString('en-IN')} / ₹{MILESTONE.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Progress bar */}
          <div className="relative h-3 rounded-full bg-brand-bg overflow-hidden border border-brand-border">
            <div
              className="h-full rounded-full bg-gradient-to-r from-neon-green-dim to-neon-green transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
            {/* Shimmer effect */}
            {progressPct > 5 && (
              <div
                className="absolute top-0 h-full w-8 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                style={{ left: `${Math.max(progressPct - 10, 0)}%` }}
              />
            )}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {progressPct >= 100 ? (
                <span className="text-neon-green font-semibold">
                  🎉 Milestone reached!
                </span>
              ) : (
                <>
                  Spend{' '}
                  <span className="text-white font-semibold">
                    ₹{remaining.toLocaleString('en-IN')}
                  </span>{' '}
                  more to unlock 1 Free Hour
                </>
              )}
            </p>
            <span className="text-xs font-bold text-neon-green">
              {progressPct.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-brand-card border border-brand-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy size={14} className="text-gold" />
              <span className="text-xs text-gray-400 font-medium">Total Spent</span>
            </div>
            <p className="text-2xl font-black text-white">
              ₹{profile.total_spent.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-gray-600 mt-1">lifetime</p>
          </div>

          <div className="rounded-xl bg-brand-card border border-brand-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star size={14} className="text-gold" />
              <span className="text-xs text-gray-400 font-medium">Hours Earned</span>
            </div>
            <p className="text-2xl font-black text-white">
              {Math.floor(profile.total_spent / MILESTONE)}
            </p>
            <p className="text-xs text-gray-600 mt-1">total earned</p>
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-xl bg-brand-card border border-brand-border p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            How Rewards Work
          </p>
          <div className="space-y-2">
            {[
              'Every ₹1,000 you spend = 1 Free Hour',
              'Valid on any table or PlayStation console',
              'Free hours never expire',
              'Show your balance to counter staff to redeem',
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-gray-400">
                <ChevronRight size={12} className="text-neon-green mt-0.5 flex-shrink-0" />
                {tip}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
