CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS wards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rainfall_mm FLOAT DEFAULT 0.0,
    river_level_pct FLOAT DEFAULT 0.0,
    status TEXT DEFAULT 'NORMAL'
);

CREATE TABLE IF NOT EXISTS hazards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lat FLOAT NOT NULL,
    lng FLOAT NOT NULL,
    location GEOMETRY(Point, 4326),
    ward_id TEXT REFERENCES wards(id),
    category TEXT NOT NULL,
    description TEXT,
    photo_url TEXT,
    status TEXT DEFAULT 'PENDING',
    urgency TEXT DEFAULT 'LOW',
    confidence_score FLOAT DEFAULT 0.0,
    is_road_blocked BOOLEAN DEFAULT FALSE,
    confirmations_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    closure_photo_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_hazards_location ON hazards USING GIST(location);

CREATE TABLE IF NOT EXISTS shelters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ward_id TEXT REFERENCES wards(id),
    name TEXT NOT NULL,
    total_beds INT NOT NULL,
    occupied_beds INT DEFAULT 0,
    supplies_status TEXT DEFAULT 'ADEQUATE'
);

CREATE TABLE IF NOT EXISTS ai_settings (
    id INT PRIMARY KEY DEFAULT 1,
    confirm_threshold FLOAT DEFAULT 0.65,
    reject_threshold FLOAT DEFAULT 0.30
);

INSERT INTO ai_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION hazards_set_location() RETURNS TRIGGER AS $$
BEGIN
  NEW.location := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hazards_set_location ON hazards;
CREATE TRIGGER trg_hazards_set_location
  BEFORE INSERT OR UPDATE OF lat, lng ON hazards
  FOR EACH ROW EXECUTE FUNCTION hazards_set_location();

CREATE OR REPLACE FUNCTION check_cluster(
    report_lat FLOAT, report_lng FLOAT, radius_meters FLOAT, time_limit TIMESTAMPTZ
)
RETURNS SETOF hazards AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM hazards
    WHERE ST_DWithin(
        location::geography,
        ST_SetSRID(ST_MakePoint(report_lng, report_lat), 4326)::geography,
        radius_meters
    )
    AND created_at >= time_limit;
END;
$$ LANGUAGE plpgsql;

GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.hazards, public.wards, public.shelters TO anon;

ALTER TABLE hazards ENABLE ROW LEVEL SECURITY;
ALTER TABLE wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE shelters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read hazards" ON hazards;
DROP POLICY IF EXISTS "anon read wards" ON wards;
DROP POLICY IF EXISTS "anon read shelters" ON shelters;
CREATE POLICY "anon read hazards" ON hazards FOR SELECT TO anon USING (true);
CREATE POLICY "anon read wards" ON wards FOR SELECT TO anon USING (true);
CREATE POLICY "anon read shelters" ON shelters FOR SELECT TO anon USING (true);

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE hazards;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE wards;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE shelters;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

INSERT INTO wards (id, name, rainfall_mm, river_level_pct, status) VALUES
('ward_01', 'Nagalagam Street (Kelani River Basin)', 68.0, 88.0, 'CRITICAL'),
('ward_02', 'Thimbirigasyaya / Town Hall', 42.0, 62.0, 'WATCH'),
('ward_03', 'Pettah / Colombo Fort', 8.0, 15.0, 'NORMAL')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  rainfall_mm = EXCLUDED.rainfall_mm,
  river_level_pct = EXCLUDED.river_level_pct,
  status = EXCLUDED.status;

INSERT INTO shelters (ward_id, name, total_beds, occupied_beds, supplies_status) VALUES
('ward_01', 'Kelaniya Temple Hall', 120, 96, 'LOW'),
('ward_01', 'Peliyagoda Community Centre', 80, 22, 'ADEQUATE'),
('ward_02', 'Town Hall Relief Bay', 150, 61, 'ADEQUATE'),
('ward_02', 'Thimbirigasyaya School', 90, 88, 'CRITICAL'),
('ward_03', 'Fort Railway Waiting Hall', 60, 12, 'ADEQUATE');

INSERT INTO hazards (lat, lng, ward_id, category, description, status, urgency, confidence_score, is_road_blocked, confirmations_count)
VALUES
(6.9535, 79.8732, 'ward_01', 'FLOOD', 'Waist-deep water near Nagalagam bridge', 'AREA_ALERT', 'CRITICAL', 0.91, TRUE, 4),
(6.9548, 79.8734, 'ward_01', 'FLOOD', 'Road impassable, cars stalled', 'PUBLISHED', 'CRITICAL', 0.84, TRUE, 2),
(6.9271, 79.8612, 'ward_02', 'FALLEN_TREE', 'Large tree across Bauddhaloka Mawatha', 'COUNCIL_TICKET', 'MEDIUM', 0.72, TRUE, 1),
(6.9355, 79.8500, 'ward_03', 'HELP_REQUEST', 'Family of 5 needs dry shelter tonight', 'NEED_INFO', 'MEDIUM', 0.41, FALSE, 0);

DO $$
BEGIN
  BEGIN
    CREATE POLICY "public read hazard photos"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'hazard-photos');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
