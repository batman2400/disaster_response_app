CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE wards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rainfall_mm FLOAT DEFAULT 0.0,
    river_level_pct FLOAT DEFAULT 0.0,
    status TEXT DEFAULT 'NORMAL'
);

CREATE TABLE hazards (
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

CREATE INDEX idx_hazards_location ON hazards USING GIST(location);

CREATE TABLE shelters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ward_id TEXT REFERENCES wards(id),
    name TEXT NOT NULL,
    total_beds INT NOT NULL,
    occupied_beds INT DEFAULT 0,
    supplies_status TEXT DEFAULT 'ADEQUATE'
);

CREATE TABLE ai_settings (
    id INT PRIMARY KEY DEFAULT 1,
    confirm_threshold FLOAT DEFAULT 0.65,
    reject_threshold FLOAT DEFAULT 0.30
);

INSERT INTO ai_settings (id) VALUES (1);

-- Keep location in sync with lat/lng so check_cluster() actually works.
CREATE OR REPLACE FUNCTION hazards_set_location() RETURNS TRIGGER AS $$
BEGIN
  NEW.location := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
