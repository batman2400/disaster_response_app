-- Phase 4: persist per-check pipeline traces on each hazard.
-- Run this once in the Supabase SQL editor if apply.sql has not been re-applied.
ALTER TABLE hazards ADD COLUMN IF NOT EXISTS trace JSONB;
