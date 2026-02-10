-- ============================================================
-- CartaoCorp - Card ↔ Area mapping
-- Defines which areas are allowed for each card
-- Example: Card "RH" → only Area "RH"
-- ============================================================

CREATE TABLE card_areas (
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, area_id)
);

CREATE INDEX idx_card_areas_card_id ON card_areas(card_id);
CREATE INDEX idx_card_areas_area_id ON card_areas(area_id);

-- RLS
ALTER TABLE card_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "card_areas_select" ON card_areas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "card_areas_insert" ON card_areas
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "card_areas_delete" ON card_areas
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
