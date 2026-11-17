-- ============================================================
-- Underground A Gaming Playstation – Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  phone       TEXT UNIQUE NOT NULL,
  role        TEXT NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'ADMIN')),
  spend_progress  INT NOT NULL DEFAULT 0,   -- INR progress toward next 1000
  total_spent     INT NOT NULL DEFAULT 0,   -- lifetime INR spent
  free_hours      INT NOT NULL DEFAULT 0,   -- redeemable free hours
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. STATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('TABLE', 'CONSOLE')),
  status      TEXT NOT NULL DEFAULT 'FREE' CHECK (status IN ('FREE', 'BOOKED')),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pre-seed the 4 stations
INSERT INTO public.stations (name, type, status) VALUES
  ('Table 1',                 'TABLE',   'FREE'),
  ('Table 2',                 'TABLE',   'FREE'),
  ('Console 1 (PlayStation)', 'CONSOLE', 'FREE'),
  ('Console 2 (PlayStation)', 'CONSOLE', 'FREE')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. LOYALTY LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.loyalty_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id     UUID NOT NULL REFERENCES public.profiles(id),
  action_type  TEXT NOT NULL CHECK (action_type IN ('ADD_SPEND', 'REDEEM_HOUR')),
  amount_inr   INT NOT NULL DEFAULT 0,
  hours_changed INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_logs ENABLE ROW LEVEL SECURITY;

-- ---- PROFILES policies ----

-- Users can read their own profile; Admins can read all
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

-- Only the system (via SECURITY DEFINER functions) can update profiles
CREATE POLICY "profiles_update_admin_only"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

-- ---- STATIONS policies ----

-- Anyone (including unauthenticated) can view stations
CREATE POLICY "stations_select_all"
  ON public.stations FOR SELECT
  USING (true);

-- Only admins can toggle station status
CREATE POLICY "stations_update_admin_only"
  ON public.stations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

-- ---- LOYALTY LOGS policies ----

-- Users see only their own logs; Admins see all
CREATE POLICY "loyalty_logs_select"
  ON public.loyalty_logs FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

-- Only admins (via RPC) can insert logs
CREATE POLICY "loyalty_logs_insert_admin_only"
  ON public.loyalty_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

-- ============================================================
-- 5. ATOMIC RPC FUNCTIONS (SECURITY DEFINER)
-- ============================================================

-- Function: add_customer_spend
-- Called by admin to add a bill amount for a customer
CREATE OR REPLACE FUNCTION public.add_customer_spend(
  p_customer_id UUID,
  p_amount_inr  INT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id       UUID;
  v_admin_role     TEXT;
  v_customer       public.profiles%ROWTYPE;
  v_new_progress   INT;
  v_new_total      INT;
  v_earned_hours   INT;
  v_new_free_hours INT;
BEGIN
  -- Verify caller is an admin
  v_admin_id := auth.uid();
  SELECT role INTO v_admin_role
    FROM public.profiles WHERE id = v_admin_id;

  IF v_admin_role IS DISTINCT FROM 'ADMIN' THEN
    RAISE EXCEPTION 'Access denied: caller is not ADMIN';
  END IF;

  IF p_amount_inr <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Lock and read customer row
  SELECT * INTO v_customer
    FROM public.profiles WHERE id = p_customer_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  -- Calculate new progress and earned hours
  v_new_progress   := (v_customer.spend_progress + p_amount_inr) % 1000;
  v_earned_hours   := FLOOR((v_customer.spend_progress + p_amount_inr) / 1000);
  v_new_total      := v_customer.total_spent + p_amount_inr;
  v_new_free_hours := v_customer.free_hours + v_earned_hours;

  -- Update customer profile
  UPDATE public.profiles SET
    spend_progress = v_new_progress,
    total_spent    = v_new_total,
    free_hours     = v_new_free_hours,
    updated_at     = NOW()
  WHERE id = p_customer_id;

  -- Audit log
  INSERT INTO public.loyalty_logs
    (user_id, admin_id, action_type, amount_inr, hours_changed)
  VALUES
    (p_customer_id, v_admin_id, 'ADD_SPEND', p_amount_inr, v_earned_hours);

  RETURN json_build_object(
    'success',       true,
    'earned_hours',  v_earned_hours,
    'new_progress',  v_new_progress,
    'new_total',     v_new_total,
    'free_hours',    v_new_free_hours
  );
END;
$$;

-- Function: redeem_free_hour
-- Called by admin to deduct 1 free hour from a customer
CREATE OR REPLACE FUNCTION public.redeem_free_hour(
  p_customer_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id   UUID;
  v_admin_role TEXT;
  v_customer   public.profiles%ROWTYPE;
BEGIN
  -- Verify caller is an admin
  v_admin_id := auth.uid();
  SELECT role INTO v_admin_role
    FROM public.profiles WHERE id = v_admin_id;

  IF v_admin_role IS DISTINCT FROM 'ADMIN' THEN
    RAISE EXCEPTION 'Access denied: caller is not ADMIN';
  END IF;

  -- Lock and read customer row
  SELECT * INTO v_customer
    FROM public.profiles WHERE id = p_customer_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  IF v_customer.free_hours < 1 THEN
    RAISE EXCEPTION 'Customer has no free hours to redeem';
  END IF;

  -- Deduct one hour
  UPDATE public.profiles SET
    free_hours = free_hours - 1,
    updated_at = NOW()
  WHERE id = p_customer_id;

  -- Audit log
  INSERT INTO public.loyalty_logs
    (user_id, admin_id, action_type, amount_inr, hours_changed)
  VALUES
    (p_customer_id, v_admin_id, 'REDEEM_HOUR', 0, -1);

  RETURN json_build_object(
    'success',    true,
    'free_hours', v_customer.free_hours - 1
  );
END;
$$;

-- Function: toggle_station_status
-- Called by admin to flip a station's status
CREATE OR REPLACE FUNCTION public.toggle_station_status(
  p_station_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role TEXT;
  v_new_status TEXT;
BEGIN
  SELECT role INTO v_admin_role
    FROM public.profiles WHERE id = auth.uid();

  IF v_admin_role IS DISTINCT FROM 'ADMIN' THEN
    RAISE EXCEPTION 'Access denied: caller is not ADMIN';
  END IF;

  UPDATE public.stations
    SET status     = CASE WHEN status = 'FREE' THEN 'BOOKED' ELSE 'FREE' END,
        updated_at = NOW()
  WHERE id = p_station_id
  RETURNING status INTO v_new_status;

  RETURN json_build_object('success', true, 'new_status', v_new_status);
END;
$$;

-- ============================================================
-- 6. AUTO-CREATE PROFILE ON SIGNUP (TRIGGER)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'CUSTOMER'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 7. REALTIME PUBLICATIONS
-- ============================================================
-- Enable realtime on stations and profiles tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.stations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- ============================================================
-- DONE! To promote the first user to ADMIN, run:
-- UPDATE public.profiles SET role = 'ADMIN' WHERE phone = 'your-phone-number';
-- ============================================================
