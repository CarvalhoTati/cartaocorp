-- ============================================================
-- CartaoCorp - Budget Line Accumulated Balance
-- Run this in the Supabase SQL Editor
-- ============================================================
-- Replaces v_budget_line_balance to include accumulated balance
-- across all months for the same rubrica name within an area.
-- Example: "Almoco" in Jan has R$50 left over -> Feb shows +R$50
-- ============================================================

DROP VIEW IF EXISTS v_budget_line_balance;
CREATE VIEW v_budget_line_balance AS
WITH line_spending AS (
  SELECT
    bl.id,
    bl.area_id,
    bl.name,
    bl.planned_amount,
    bl.reference_month,
    bl.description,
    bl.is_active,
    bl.created_at,
    bl.updated_at,
    COALESCE(SUM(e.amount), 0) AS spent
  FROM budget_lines bl
  LEFT JOIN expenses e ON e.budget_line_id = bl.id
  WHERE bl.is_active = true
  GROUP BY bl.id
),
accumulated AS (
  SELECT
    area_id,
    name,
    SUM(planned_amount) AS total_planned,
    SUM(spent) AS total_spent
  FROM line_spending
  GROUP BY area_id, name
)
SELECT
  ls.id,
  ls.area_id,
  ls.name,
  ls.planned_amount,
  ls.reference_month,
  ls.description,
  ls.is_active,
  ls.created_at,
  ls.updated_at,
  ls.spent,
  ls.planned_amount - ls.spent AS balance,
  a.total_planned AS accumulated_planned,
  a.total_spent AS accumulated_spent,
  a.total_planned - a.total_spent AS accumulated_balance
FROM line_spending ls
JOIN accumulated a ON a.area_id = ls.area_id AND a.name = ls.name;
