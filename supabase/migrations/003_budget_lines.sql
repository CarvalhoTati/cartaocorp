-- ============================================================
-- CartaoCorp - Budget Lines (Rubricas) per Area
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Budget Lines table
CREATE TABLE budget_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  planned_amount NUMERIC(12,2) NOT NULL CHECK (planned_amount > 0),
  reference_month DATE NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(area_id, name, reference_month)
);

-- Indexes
CREATE INDEX idx_budget_lines_area_id ON budget_lines(area_id);
CREATE INDEX idx_budget_lines_reference_month ON budget_lines(reference_month);

-- Add budget_line_id to expenses (optional FK)
ALTER TABLE expenses ADD COLUMN budget_line_id UUID REFERENCES budget_lines(id) ON DELETE SET NULL;
CREATE INDEX idx_expenses_budget_line_id ON expenses(budget_line_id);

-- View: balance per budget line = planned - spent
CREATE OR REPLACE VIEW v_budget_line_balance AS
SELECT
  bl.id,
  bl.area_id,
  bl.name,
  bl.planned_amount,
  bl.reference_month,
  bl.description,
  bl.is_active,
  COALESCE(SUM(e.amount), 0) AS spent,
  bl.planned_amount - COALESCE(SUM(e.amount), 0) AS balance
FROM budget_lines bl
LEFT JOIN expenses e ON e.budget_line_id = bl.id
GROUP BY bl.id, bl.area_id, bl.name, bl.planned_amount, bl.reference_month, bl.description, bl.is_active;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_budget_line_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_budget_line_updated
BEFORE UPDATE ON budget_lines
FOR EACH ROW EXECUTE FUNCTION update_budget_line_timestamp();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE budget_lines ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "budget_lines_select" ON budget_lines
  FOR SELECT TO authenticated USING (true);

-- Only admin can insert
CREATE POLICY "budget_lines_insert" ON budget_lines
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Only admin can update
CREATE POLICY "budget_lines_update" ON budget_lines
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Only admin can delete
CREATE POLICY "budget_lines_delete" ON budget_lines
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
