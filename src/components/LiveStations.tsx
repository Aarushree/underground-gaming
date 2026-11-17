'use client';

import { useEffect, useState, useCallback } from 'react';
import { Monitor, Gamepad2, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import type { Station, Profile } from '@/lib/types';

interface LiveStationsProps {
  profile: Profile | null;
}

export default function LiveStations({ profile }: LiveStationsProps) {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const isAdmin = profile?.role === 'ADMIN';

  const fetchStations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('stations')
        .select('*')
        .order('name');
      if (error) throw error;
      setStations(data || []);
      setError(null);
    } catch (err) {
      setError('Failed to load stations. Please refresh.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStations();

    const channel = supabase
      .channel('stations-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'stations' },
        (payload) => {
          setStations((prev) =>
            prev.map((s) =>
              s.id === payload.new.id ? { ...s, ...(payload.new as Station) } : s
            )
          );
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStations]);

  const handleToggle = async (station: Station) => {
    if (!isAdmin || toggling) return;
    setToggling(station.id);
    try {
      const { error } = await supabase.rpc('toggle_station_status', {
        p_station_id: station.id,
      });
      if (error) throw error;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Toggle failed';
      setError(msg);
      setTimeout(() => setError(null), 4000);
    } finally {
      setToggling(null);
    }
  };

  const getStationIcon = (type: Station['type']) => {
    return type === 'CONSOLE' ? Gamepad2 : Monitor;
  };

  if (loading) {
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Live Stations</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-36 rounded-xl bg-brand-card border border-brand-border animate-pulse"
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white tracking-tight">
          Live Stations
        </h2>
        <div className="flex items-center gap-2">
          {connected ? (
            <span className="flex items-center gap-1.5 text-xs text-neon-green">
              <Wifi size={12} />
              Live
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <WifiOff size={12} />
              Connecting…
            </span>
          )}
          <button
            onClick={fetchStations}
            className="p-1.5 rounded-lg bg-brand-card border border-brand-border text-gray-400 hover:text-white hover:border-brand-border transition-colors"
            title="Refresh"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-crimson/10 border border-crimson/30 text-crimson text-sm">
          {error}
        </div>
      )}

      {/* Admin hint */}
      {isAdmin && (
        <p className="mb-3 text-xs text-gold/70 flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
          Admin mode — tap any card to toggle status
        </p>
      )}

      {/* Station Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stations.map((station) => {
          const isFree = station.status === 'FREE';
          const Icon = getStationIcon(station.type);
          const isToggling = toggling === station.id;

          return (
            <button
              key={station.id}
              onClick={() => handleToggle(station)}
              disabled={!isAdmin || isToggling}
              className={[
                'relative flex flex-col items-center justify-center gap-2',
                'h-36 rounded-xl border transition-all duration-300',
                'focus:outline-none focus-visible:ring-2',
                isAdmin && !isToggling
                  ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]'
                  : 'cursor-default',
                isFree
                  ? [
                      'bg-neon-green/5 border-neon-green/30',
                      'hover:border-neon-green/60',
                      'focus-visible:ring-neon-green/50',
                      isAdmin && 'glow-green',
                    ].join(' ')
                  : [
                      'bg-crimson/5 border-crimson/30',
                      'hover:border-crimson/60',
                      'focus-visible:ring-crimson/50',
                      isAdmin && 'glow-crimson',
                    ].join(' '),
              ].join(' ')}
            >
              {/* Status dot */}
              <span
                className={[
                  'absolute top-3 right-3 w-2 h-2 rounded-full',
                  isFree
                    ? 'bg-neon-green animate-pulse'
                    : 'bg-crimson',
                ].join(' ')}
              />

              {/* Icon */}
              <div
                className={[
                  'p-3 rounded-full',
                  isFree
                    ? 'bg-neon-green/10 text-neon-green'
                    : 'bg-crimson/10 text-crimson',
                ].join(' ')}
              >
                {isToggling ? (
                  <RefreshCw size={22} className="animate-spin" />
                ) : (
                  <Icon size={22} />
                )}
              </div>

              {/* Name */}
              <span className="text-sm font-semibold text-white leading-tight text-center px-2">
                {station.name.includes('PlayStation')
                  ? station.name
                  : station.type === 'CONSOLE'
                  ? `${station.name} (PlayStation)`
                  : station.name}
              </span>

              {/* Status badge */}
              <span
                className={[
                  'text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-full',
                  isFree
                    ? 'bg-neon-green/15 text-neon-green'
                    : 'bg-crimson/15 text-crimson',
                ].join(' ')}
              >
                {station.status}
              </span>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-neon-green inline-block" />
          Free — available to play
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-crimson inline-block" />
          Booked — in session
        </span>
      </div>
    </section>
  );
}
