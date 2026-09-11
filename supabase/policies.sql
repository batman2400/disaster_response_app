GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.hazards, public.wards, public.shelters TO anon;

ALTER TABLE hazards ENABLE ROW LEVEL SECURITY;
ALTER TABLE wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE shelters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon read hazards" ON hazards FOR SELECT TO anon USING (true);
CREATE POLICY "anon read wards" ON wards FOR SELECT TO anon USING (true);
CREATE POLICY "anon read shelters" ON shelters FOR SELECT TO anon USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE hazards, wards, shelters;
