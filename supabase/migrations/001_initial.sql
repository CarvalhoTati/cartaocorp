-- ============================================================
-- CartaoCorp - Initial Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles (extends Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cards
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  last_four_digits TEXT NOT NULL CHECK (length(last_four_digits) = 4),
  bank TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Areas / Cost Centers
CREATE TABLE areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#6366f1',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Deposits
CREATE TABLE deposits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  reference_month DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Allocations
CREATE TABLE allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deposit_id UUID NOT NULL REFERENCES deposits(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0)
);

-- Expenses
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE RESTRICT,
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  expense_date DATE NOT NULL,
  reference_month DATE NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_deposits_card_id ON deposits(card_id);
CREATE INDEX idx_deposits_reference_month ON deposits(reference_month);
CREATE INDEX idx_allocations_deposit_id ON allocations(deposit_id);
CREATE INDEX idx_allocations_area_id ON allocations(area_id);
CREATE INDEX idx_expenses_card_id ON expenses(card_id);
CREATE INDEX idx_expenses_area_id ON expenses(area_id);
CREATE INDEX idx_expenses_reference_month ON expenses(reference_month);
CREATE INDEX idx_expenses_created_by ON expenses(created_by);

-- ============================================================
-- VIEWS
-- ============================================================

-- Card balance: total deposits - total expenses per card
CREATE OR REPLACE VIEW v_card_balance AS
SELECT
  c.id AS card_id,
  c.name AS card_name,
  c.bank,
  c.last_four_digits,
  c.is_active,
  COALESCE(d.total_deposits, 0) AS total_deposits,
  COALESCE(e.total_expenses, 0) AS total_expenses,
  COALESCE(d.total_deposits, 0) - COALESCE(e.total_expenses, 0) AS balance
FROM cards c
LEFT JOIN (
  SELECT card_id, SUM(amount) AS total_deposits
  FROM deposits GROUP BY card_id
) d ON d.card_id = c.id
LEFT JOIN (
  SELECT card_id, SUM(amount) AS total_expenses
  FROM expenses GROUP BY card_id
) e ON e.card_id = c.id;

-- Area + Card balance: allocated - spent per area per card
CREATE OR REPLACE VIEW v_area_card_balance AS
SELECT
  a.id AS area_id,
  a.name AS area_name,
  a.color AS area_color,
  c.id AS card_id,
  c.name AS card_name,
  COALESCE(alloc.allocated, 0) AS allocated,
  COALESCE(exp.spent, 0) AS spent,
  COALESCE(alloc.allocated, 0) - COALESCE(exp.spent, 0) AS balance
FROM areas a
CROSS JOIN cards c
LEFT JOIN (
  SELECT al.area_id, d.card_id, SUM(al.amount) AS allocated
  FROM allocations al
  JOIN deposits d ON d.id = al.deposit_id
  GROUP BY al.area_id, d.card_id
) alloc ON alloc.area_id = a.id AND alloc.card_id = c.id
LEFT JOIN (
  SELECT area_id, card_id, SUM(amount) AS spent
  FROM expenses GROUP BY area_id, card_id
) exp ON exp.area_id = a.id AND exp.card_id = c.id
WHERE COALESCE(alloc.allocated, 0) > 0 OR COALESCE(exp.spent, 0) > 0;

-- Area balance: total across all cards
CREATE OR REPLACE VIEW v_area_balance AS
SELECT
  a.id AS area_id,
  a.name AS area_name,
  a.color AS area_color,
  a.is_active,
  COALESCE(alloc.total_allocated, 0) AS total_allocated,
  COALESCE(exp.total_spent, 0) AS total_spent,
  COALESCE(alloc.total_allocated, 0) - COALESCE(exp.total_spent, 0) AS balance
FROM areas a
LEFT JOIN (
  SELECT al.area_id, SUM(al.amount) AS total_allocated
  FROM allocations al
  GROUP BY al.area_id
) alloc ON alloc.area_id = a.id
LEFT JOIN (
  SELECT area_id, SUM(amount) AS total_spent
  FROM expenses GROUP BY area_id
) exp ON exp.area_id = a.id;

-- Monthly summary
CREATE OR REPLACE VIEW v_monthly_summary AS
SELECT
  e.reference_month,
  e.card_id,
  c.name AS card_name,
  e.area_id,
  a.name AS area_name,
  a.color AS area_color,
  SUM(e.amount) AS total_expenses,
  COUNT(*) AS expense_count
FROM expenses e
JOIN cards c ON c.id = e.card_id
JOIN areas a ON a.id = e.area_id
GROUP BY e.reference_month, e.card_id, c.name, e.area_id, a.name, a.color;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger: Validate allocation sum equals deposit amount
CREATE OR REPLACE FUNCTION check_allocation_sum()
RETURNS TRIGGER AS $$
DECLARE
  deposit_amount NUMERIC(12,2);
  allocation_total NUMERIC(12,2);
BEGIN
  SELECT amount INTO deposit_amount FROM deposits WHERE id = NEW.deposit_id;
  SELECT COALESCE(SUM(amount), 0) INTO allocation_total
  FROM allocations WHERE deposit_id = NEW.deposit_id;
  -- Note: this runs per-row, so we check after insert/update
  -- The atomic function handles the full validation
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Validate expense doesn't exceed available balance
CREATE OR REPLACE FUNCTION check_expense_balance()
RETURNS TRIGGER AS $$
DECLARE
  available_balance NUMERIC(12,2);
BEGIN
  SELECT COALESCE(balance, 0) INTO available_balance
  FROM public.v_area_card_balance
  WHERE area_id = NEW.area_id AND card_id = NEW.card_id;

  IF TG_OP = 'UPDATE' THEN
    available_balance := available_balance + OLD.amount;
  END IF;

  IF NEW.amount > available_balance THEN
    RAISE EXCEPTION 'Saldo insuficiente. Disponível: R$ %, Solicitado: R$ %',
      to_char(available_balance, 'FM999G999G999D00'),
      to_char(NEW.amount, 'FM999G999G999D00');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_check_expense_balance
BEFORE INSERT OR UPDATE ON expenses
FOR EACH ROW EXECUTE FUNCTION check_expense_balance();

-- ============================================================
-- ATOMIC FUNCTION: Create deposit with allocations
-- ============================================================
CREATE OR REPLACE FUNCTION create_deposit_with_allocations(
  p_card_id UUID,
  p_amount NUMERIC,
  p_reference_month DATE,
  p_description TEXT,
  p_allocations JSONB -- [{"area_id": "uuid", "amount": 123.45}, ...]
)
RETURNS UUID AS $$
DECLARE
  v_deposit_id UUID;
  v_allocation JSONB;
  v_alloc_total NUMERIC := 0;
BEGIN
  -- Validate allocation sum
  SELECT COALESCE(SUM((a->>'amount')::NUMERIC), 0) INTO v_alloc_total
  FROM jsonb_array_elements(p_allocations) a;

  IF v_alloc_total != p_amount THEN
    RAISE EXCEPTION 'Soma das alocações (R$ %) difere do valor do depósito (R$ %)',
      to_char(v_alloc_total, 'FM999G999G999D00'),
      to_char(p_amount, 'FM999G999G999D00');
  END IF;

  -- Create deposit
  INSERT INTO public.deposits (card_id, amount, reference_month, description)
  VALUES (p_card_id, p_amount, p_reference_month, p_description)
  RETURNING id INTO v_deposit_id;

  -- Create allocations
  FOR v_allocation IN SELECT * FROM jsonb_array_elements(p_allocations)
  LOOP
    INSERT INTO public.allocations (deposit_id, area_id, amount)
    VALUES (
      v_deposit_id,
      (v_allocation->>'area_id')::UUID,
      (v_allocation->>'amount')::NUMERIC
    );
  END LOOP;

  RETURN v_deposit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update own
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- Cards: all authenticated can read, only admin can insert/update/delete
CREATE POLICY "cards_select" ON cards FOR SELECT TO authenticated USING (true);
CREATE POLICY "cards_insert" ON cards FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "cards_update" ON cards FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "cards_delete" ON cards FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Areas: same as cards
CREATE POLICY "areas_select" ON areas FOR SELECT TO authenticated USING (true);
CREATE POLICY "areas_insert" ON areas FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "areas_update" ON areas FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "areas_delete" ON areas FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Deposits: all can read, only admin can insert/update/delete
CREATE POLICY "deposits_select" ON deposits FOR SELECT TO authenticated USING (true);
CREATE POLICY "deposits_insert" ON deposits FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "deposits_update" ON deposits FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "deposits_delete" ON deposits FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Allocations: all can read, only admin can manage (through deposits)
CREATE POLICY "allocations_select" ON allocations FOR SELECT TO authenticated USING (true);
CREATE POLICY "allocations_insert" ON allocations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "allocations_delete" ON allocations FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Expenses: all can read and insert, only admin can delete
CREATE POLICY "expenses_select" ON expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "expenses_insert" ON expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "expenses_update" ON expenses FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "expenses_delete" ON expenses FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
