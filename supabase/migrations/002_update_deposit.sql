-- ============================================================
-- CartaoCorp - Update Deposit with Allocations (atomic)
-- Run this in the Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION update_deposit_with_allocations(
  p_deposit_id UUID,
  p_card_id UUID,
  p_amount NUMERIC,
  p_reference_month DATE,
  p_description TEXT,
  p_allocations JSONB -- [{"area_id": "uuid", "amount": 123.45}, ...]
)
RETURNS UUID AS $$
DECLARE
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

  -- Update deposit
  UPDATE public.deposits
  SET card_id = p_card_id,
      amount = p_amount,
      reference_month = p_reference_month,
      description = p_description
  WHERE id = p_deposit_id;

  -- Delete old allocations
  DELETE FROM public.allocations WHERE deposit_id = p_deposit_id;

  -- Create new allocations
  FOR v_allocation IN SELECT * FROM jsonb_array_elements(p_allocations)
  LOOP
    INSERT INTO public.allocations (deposit_id, area_id, amount)
    VALUES (
      p_deposit_id,
      (v_allocation->>'area_id')::UUID,
      (v_allocation->>'amount')::NUMERIC
    );
  END LOOP;

  RETURN p_deposit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
