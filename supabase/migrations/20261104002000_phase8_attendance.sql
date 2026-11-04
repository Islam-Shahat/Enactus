-- =====================================================================
-- Phase 8: Attendance Realtime Publication & Session Status Index
-- Migration: 20261104002000_phase8_attendance.sql
-- =====================================================================

-- 1. Add public.attendance to supabase_realtime publication for live attendee updates.
-- Postgres Row Level Security (RLS) policies on public.attendance still apply to all Realtime clients.
alter publication supabase_realtime add table public.attendance;

-- 2. Performance index for querying session attendance filtered by status
create index if not exists attendance_session_status_idx
  on public.attendance (session_id, status);

