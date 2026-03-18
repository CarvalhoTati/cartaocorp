-- ============================================================
-- CartaoCorp - Fix RPC security: admin role check, row locking,
-- and missing UPDATE policy on allocations
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. Replace create_deposit_with_allocations with admin check
-- ============================================================
CREATE OR REPLACE FUNCTION create_deposit_with_allocations(
  p_card_id UUID,
  p_amount NUMERIC,
  p_reference_month DATE,
  p_description TEXT,
  p_allocations JSONB -- [{"area_id": "uuid", "budget_line_id": "uuid", "amount": 123.45}, ...]
)
RETURNS UUID AS $$
DECLARE
  v_deposit_id UUID;
  v_allocation JSONB;
  v_alloc_total NUMERIC := 0;
BEGIN
  -- Admin role check
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

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

  -- Create allocations with budget_line_id
  FOR v_allocation IN SELECT * FROM jsonb_array_elements(p_allocations)
  LOOP
    INSERT INTO public.allocations (deposit_id, area_id, budget_line_id, amount)
    VALUES (
      v_deposit_id,
      (v_allocation->>'area_id')::UUID,
      CASE WHEN v_allocation->>'budget_line_id' IS NOT NULL
           THEN (v_allocation->>'budget_line_id')::UUID
           ELSE NULL
      END,
      (v_allocation->>'amount')::NUMERIC
    );
  END LOOP;

  RETURN v_deposit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 2. Replace update_deposit_with_allocations with admin check
--    and row locking (FOR UPDATE)
-- ============================================================
CREATE OR REPLACE FUNCTION update_deposit_with_allocations(
  p_deposit_id UUID,
  p_card_id UUID,
  p_amount NUMERIC,
  p_reference_month DATE,
  p_description TEXT,
  p_allocations JSONB -- [{"area_id": "uuid", "budget_line_id": "uuid", "amount": 123.45}, ...]
)
RETURNS UUID AS $$
DECLARE
  v_allocation JSONB;
  v_alloc_total NUMERIC := 0;
BEGIN
  -- Admin role check
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  -- Lock the deposit row to prevent concurrent modifications
  PERFORM id FROM public.deposits WHERE id = p_deposit_id FOR UPDATE;

  -- Validate allocation sum
  SELECT COALESCE(SUM((a->>'amount')::NUMERIC), 0) INTO v_alloc_total
  FROM jsonb_array_elements(p_allocations) a;

  IF v_alloc_total != p_amount THEN
    RAISE EXCEPTION 'Soma das alocações (R$ %) difere do valor do depósito (R$ %)',
      to_char(v_alloc_total, 'FM999G999G999D00'),
      to_char(p_amount, 'FM999G999G999D00');
  END IF;

  -- Update deposit
  UPDATE public.deposits
  SET card_id = p_card_id,
      amount = p_amount,
      reference_month = p_reference_month,
      description = p_description
  WHERE id = p_deposit_id;

  -- Delete old allocations
  DELETE FROM public.allocations WHERE deposit_id = p_deposit_id;

  -- Create new allocations with budget_line_id
  FOR v_allocation IN SELECT * FROM jsonb_array_elements(p_allocations)
  LOOP
    INSERT INTO public.allocations (deposit_id, area_id, budget_line_id, amount)
    VALUES (
      p_deposit_id,
      (v_allocation->>'area_id')::UUID,
      CASE WHEN v_allocation->>'budget_line_id' IS NOT NULL
           THEN (v_allocation->>'budget_line_id')::UUID
           ELSE NULL
      END,
      (v_allocation->>'amount')::NUMERIC
    );
  END LOOP;

  RETURN p_deposit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 3. Add missing UPDATE policy on allocations table
-- ============================================================
CREATE POLICY "Users can update allocations" ON public.allocations
  FOR UPDATE USING (true) WITH CHECK (true);
