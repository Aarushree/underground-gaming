'use client';

import { useState } from 'react';
import { Gamepad2, LogOut, User, Shield, Menu, X } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

interface HeaderProps {
  profile: Profile | null;
  onAuthClick: () => void;
}

export default function Header({ profile, onAuthClick }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-brand-bg/80 backdrop-blur-md border-b border-brand-border">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-neon-green/10 border border-neon-green/30 flex items-center justify-center">
            <Gamepad2 size={16} className="text-neon-green" />
          </div>
          <div className="leading-tight">
            <h1 className="text-base font-black tracking-wider text-white uppercase leading-none">
              Underground
            </h1>
            <p className="text-[10px] font-semibold tracking-widest text-neon-green uppercase leading-none mt-1">
              A Gaming Playstation
            </p>
          </div>
        </div>

        {/* Right side */}
        {profile ? (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-card border border-brand-border hover:border-neon-green/40 transition-colors"
            >
              {profile.role === 'ADMIN' ? (
                <Shield size={14} className="text-gold" />
              ) : (
                <User size={14} className="text-gray-400" />
              )}
              <span className="text-xs font-medium text-white max-w-24 truncate">
                {profile.full_name.split(' ')[0]}
              </span>
              {menuOpen ? (
                <X size={12} className="text-gray-400" />
              ) : (
                <Menu size={12} className="text-gray-400" />
              )}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-brand-card border border-brand-border rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="px-3 py-3 border-b border-brand-border">
                  <p className="text-xs font-semibold text-white truncate">
                    {profile.full_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{profile.phone}</p>
                  {profile.role === 'ADMIN' && (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs text-gold bg-gold/10 px-2 py-0.5 rounded-full">
                      <Shield size={10} />
                      Admin
                    </span>
                  )}
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-crimson hover:bg-crimson/5 transition-colors"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onAuthClick}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-neon-green/10 border border-neon-green/30 text-neon-green hover:bg-neon-green/20 transition-colors"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}
