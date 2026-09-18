-- Family Reunification & Evacuee Safety Registry Schema
-- Run this in the Supabase SQL Editor if you want native PostgreSQL table storage and realtime replication.

CREATE TABLE IF NOT EXISTS safe_check_ins (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    contact_masked TEXT NOT NULL,
    nic_masked TEXT,
    status TEXT NOT NULL DEFAULT 'SAFE_HOME',
    shelter_id TEXT,
    shelter_name TEXT,
    ward_id TEXT REFERENCES wards(id),
    location_detail TEXT,
    family_count INT DEFAULT 1,
    vulnerabilities JSONB DEFAULT '[]'::jsonb,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    verified_by_shelter BOOLEAN DEFAULT FALSE
);

-- Indexes for lightning-fast search
CREATE INDEX IF NOT EXISTS idx_safe_check_ins_name ON safe_check_ins USING gin (to_tsvector('english', full_name));
CREATE INDEX IF NOT EXISTS idx_safe_check_ins_created ON safe_check_ins (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_safe_check_ins_shelter ON safe_check_ins (shelter_id);

-- Row Level Security (RLS)
ALTER TABLE safe_check_ins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read safe_check_ins" ON safe_check_ins;
CREATE POLICY "anon read safe_check_ins" ON safe_check_ins FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon insert safe_check_ins" ON safe_check_ins;
CREATE POLICY "anon insert safe_check_ins" ON safe_check_ins FOR INSERT TO anon WITH CHECK (true);

-- Enable Realtime Replication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE safe_check_ins;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
