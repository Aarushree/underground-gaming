'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Search,
  UserCheck,
  PlusCircle,
  Clock,
  IndianRupee,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trophy,
  TrendingUp,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

const MILESTONE = 1000;

interface ToastMessage {
  type: 'success' | 'error';
  text: string;
}

export default function AdminTerminal() {
  const [phone, setPhone] = useState('');
  const [searching, setSearching] = useState(false);
  const [customer, setCustomer] = useState<Profile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [billAmount, setBillAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Real-time profile updates while admin is viewing a customer
  useEffect(() => {
    if (!customer) return;

    const channel = supabase
      .channel(`admin-view-profile-${customer.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${customer.id}`,
        },
        (payload) => {
          setCustomer((prev) =>
            prev ? { ...prev, ...(payload.new as Profile) } : prev
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customer?.id]);

  const handleSearch = async () => {
    const cleanPhone = phone.trim();
    if (!cleanPhone) return;

    setSearching(true);
    setCustomer(null);
    setNotFound(false);
    setBillAmount('');

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', cleanPhone)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setCustomer(data);
      }
    } catch {
      setNotFound(true);
    } finally {
      setSearching(false);
    }
  };

  const handleAddBill = async () => {
    if (!customer || !billAmount || processing) return;
    const amount = parseInt(billAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      setToast({ type: 'error', text: 'Please enter a valid amount' });
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('add_customer_spend', {
        p_customer_id: customer.id,
        p_amount_inr: amount,
      });

      if (error) throw error;

      const result = data as {
        earned_hours: number;
        new_progress: number;
        new_total: number;
        free_hours: number;
      };

      setBillAmount('');
      setToast({
        type: 'success',
        text:
          result.earned_hours > 0
            ? `✅ ₹${amount.toLocaleString('en-IN')} added! 🎉 ${result.earned_hours} free hour${result.earned_hours > 1 ? 's' : ''} earned!`
            : `✅ ₹${amount.toLocaleString('en-IN')} added! Progress: ₹${result.new_progress}/₹1,000`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add bill';
      setToast({ type: 'error', text: msg });
    } finally {
      setProcessing(false);
    }
  };

  const handleRedeemHour = async () => {
    if (!customer || processing || customer.free_hours < 1) return;

    setProcessing(true);
    try {
      const { error } = await supabase.rpc('redeem_free_hour', {
        p_customer_id: customer.id,
      });
      if (error) throw error;
      setToast({ type: 'success', text: '✅ 1 free hour redeemed successfully!' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Redemption failed';
      setToast({ type: 'error', text: msg });
    } finally {
      setProcessing(false);
    }
  };

  const clearCustomer = () => {
    setCustomer(null);
    setNotFound(false);
    setPhone('');
    setBillAmount('');
    setTimeout(() => phoneRef.current?.focus(), 100);
  };

  const progressPct = customer
    ? Math.min((customer.spend_progress / MILESTONE) * 100, 100)
    : 0;

  return (
    <section className="mb-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-gold/15">
          <UserCheck size={18} className="text-gold" />
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">
          Admin Counter Terminal
        </h2>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={[
            'mb-4 flex items-start gap-3 px-4 py-3 rounded-xl border text-sm',
            toast.type === 'success'
              ? 'bg-neon-green/10 border-neon-green/30 text-neon-green'
              : 'bg-crimson/10 border-crimson/30 text-crimson',
          ].join(' ')}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          )}
          <span className="flex-1">{toast.text}</span>
          <button onClick={() => setToast(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Search box */}
      <div className="rounded-xl bg-brand-card border border-brand-border p-4 mb-4">
        <label className="block text-xs text-gray-400 font-medium mb-2 uppercase tracking-widest">
          Search Customer by Phone
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              ref={phoneRef}
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. 9876543210"
              className={[
                'w-full bg-brand-bg border rounded-lg px-3 py-2.5 text-white',
                'placeholder:text-gray-600 text-sm transition-colors',
                'focus:border-gold/60 focus:ring-1 focus:ring-gold/30',
                'border-brand-border',
              ].join(' ')}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!phone.trim() || searching}
            className={[
              'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all',
              'bg-gold text-brand-bg hover:bg-gold-dim active:scale-95',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
            ].join(' ')}
          >
            {searching ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Search size={16} />
            )}
            Find
          </button>
        </div>
      </div>

      {/* Not found */}
      {notFound && (
        <div className="rounded-xl bg-brand-card border border-crimson/30 p-4 text-center text-sm text-crimson">
          <AlertCircle size={20} className="mx-auto mb-2" />
          No customer found with phone <strong>{phone}</strong>.
          <br />
          <span className="text-gray-500 text-xs">Ask them to sign up first.</span>
        </div>
      )}

      {/* Customer card */}
      {customer && (
        <div className="space-y-3">
          {/* Customer info header */}
          <div className="relative rounded-xl bg-brand-card border border-gold/30 p-4">
            <button
              onClick={clearCustomer}
              className="absolute top-3 right-3 p-1 rounded-lg text-gray-500 hover:text-white hover:bg-brand-border transition-colors"
            >
              <X size={14} />
            </button>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gold/15 flex items-center justify-center text-gold font-bold text-lg flex-shrink-0">
                {customer.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-white">{customer.full_name}</p>
                <p className="text-xs text-gray-400">📞 {customer.phone}</p>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="bg-brand-bg rounded-lg p-2.5 text-center">
                <p className="text-xs text-gray-500 mb-1">Free Hours</p>
                <p className={`text-xl font-black ${customer.free_hours > 0 ? 'text-gold' : 'text-gray-500'}`}>
                  {customer.free_hours}
                </p>
              </div>
              <div className="bg-brand-bg rounded-lg p-2.5 text-center">
                <p className="text-xs text-gray-500 mb-1">Progress</p>
                <p className="text-xl font-black text-neon-green">
                  ₹{customer.spend_progress}
                </p>
              </div>
              <div className="bg-brand-bg rounded-lg p-2.5 text-center">
                <p className="text-xs text-gray-500 mb-1">Lifetime</p>
                <p className="text-xl font-black text-white">
                  ₹{customer.total_spent.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span className="flex items-center gap-1">
                  <TrendingUp size={10} />
                  Next milestone
                </span>
                <span>₹{customer.spend_progress} / ₹1,000</span>
              </div>
              <div className="h-2 rounded-full bg-brand-bg border border-brand-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-neon-green-dim to-neon-green transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Add Bill */}
          <div className="rounded-xl bg-brand-card border border-brand-border p-4">
            <label className="block text-xs text-gray-400 font-medium mb-2 uppercase tracking-widest">
              Add Bill Amount (₹)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <IndianRupee
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  type="number"
                  inputMode="numeric"
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddBill()}
                  placeholder="Enter amount"
                  min="1"
                  className={[
                    'w-full bg-brand-bg border border-brand-border rounded-lg',
                    'pl-8 pr-3 py-2.5 text-white placeholder:text-gray-600 text-sm',
                    'focus:border-neon-green/60 focus:ring-1 focus:ring-neon-green/30',
                    'transition-colors',
                  ].join(' ')}
                />
              </div>
              <button
                onClick={handleAddBill}
                disabled={!billAmount || processing}
                className={[
                  'flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold',
                  'bg-neon-green text-brand-bg hover:bg-neon-green-dim active:scale-95',
                  'transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
                ].join(' ')}
              >
                {processing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <PlusCircle size={16} />
                )}
                Add
              </button>
            </div>

            {/* Preview earned hours */}
            {billAmount && parseInt(billAmount, 10) > 0 && (
              <div className="mt-2 text-xs text-gray-500">
                {(() => {
                  const amt = parseInt(billAmount, 10);
                  const newTotal = customer.spend_progress + amt;
                  const earned = Math.floor(newTotal / MILESTONE);
                  const remainder = newTotal % MILESTONE;
                  return earned > 0 ? (
                    <span className="text-gold">
                      🎉 This will earn {earned} free hour{earned > 1 ? 's' : ''}! Carry-over: ₹{remainder}
                    </span>
                  ) : (
                    <span>Progress after: ₹{newTotal} / ₹1,000</span>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Redeem Hour */}
          <div className="rounded-xl bg-brand-card border border-brand-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Redeem Free Hour</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {customer.free_hours > 0
                    ? `${customer.free_hours} hour${customer.free_hours > 1 ? 's' : ''} available`
                    : 'No free hours available'}
                </p>
              </div>
              <button
                onClick={handleRedeemHour}
                disabled={customer.free_hours < 1 || processing}
                className={[
                  'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold',
                  'transition-all active:scale-95',
                  customer.free_hours > 0
                    ? 'bg-gold text-brand-bg hover:bg-gold-dim'
                    : 'bg-brand-bg border border-brand-border text-gray-600 cursor-not-allowed',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
                ].join(' ')}
              >
                {processing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Clock size={16} />
                    <Trophy size={14} />
                  </>
                )}
                Redeem
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
