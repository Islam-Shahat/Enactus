// tests/attendanceWorkflow.test.js
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Attendance Workflow & Backend Database Contract', () => {
  const migrationPath = path.resolve(
    __dirname,
    '../supabase/migrations/20261105205500_secure_attendance_recording.sql'
  );

  it('migration file exists and has correct timestamp', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    const filename = path.basename(migrationPath);
    expect(filename).toMatch(/^20261105205500_secure_attendance_recording\.sql$/);
  });

  it('migration grants attendance_write to oc_admin and all management roles', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    expect(sql).toContain("private.can(array['president', 'vice_president', 'hr_admin', 'oc_admin', 'coordinator'])");
    expect(sql).toContain('drop policy if exists attendance_write on public.attendance');
    expect(sql).toContain('create policy attendance_write on public.attendance for all to authenticated');
  });

  it('migration creates record_session_attendance RPC with SECURITY DEFINER and search_path', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    expect(sql).toContain('create or replace function public.record_session_attendance(');
    expect(sql).toContain('security definer');
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain('grant execute on function public.record_session_attendance');
  });

  it('RPC handles all identifier types: ENACTUS-MEMBER, UUID, member_code, national_id, email', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    expect(sql).toContain("v_clean like 'ENACTUS-MEMBER:%'");
    expect(sql).toContain('p.member_code = v_clean');
    expect(sql).toContain('pp.national_id = v_clean');
    expect(sql).toContain('lower(pp.email) = lower(v_clean)');
  });

  it('RPC safely guards against duplicate check-in if member already present or late', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    expect(sql).toContain("v_existing.status in ('present', 'late')");
    expect(sql).toContain("'already_recorded', true");
  });

  it('RPC upserts attendance on conflict (session_id, user_id)', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    expect(sql).toContain('on conflict (session_id, user_id) do update set');
    expect(sql).toContain('status = excluded.status');
    expect(sql).toContain('method = excluded.method');
  });

  describe('Client-side QR & Member Code Parser contract', () => {
    function parseMemberQr(raw) {
      if (!raw || typeof raw !== 'string') return null;
      const clean = raw.trim();
      if (clean.startsWith('ENACTUS-MEMBER:')) {
        const parts = clean.split(':');
        return {
          type: 'enactus_pass',
          userId: parts[1] || null,
          memberCode: parts[2] || null,
          sessionId: parts[3] || null,
        };
      }
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)) {
        return { type: 'uuid', value: clean };
      }
      if (/^\d{7}$/.test(clean)) {
        return { type: 'member_code', value: clean };
      }
      if (/^\d{14}$/.test(clean)) {
        return { type: 'national_id', value: clean };
      }
      return { type: 'unknown', value: clean };
    }

    it('parses official ENACTUS-MEMBER format correctly', () => {
      const parsed = parseMemberQr('ENACTUS-MEMBER:11111111-2222-3333-4444-555555555555:2026042:ANY');
      expect(parsed).toEqual({
        type: 'enactus_pass',
        userId: '11111111-2222-3333-4444-555555555555',
        memberCode: '2026042',
        sessionId: 'ANY',
      });
    });

    it('parses 7-digit member codes', () => {
      const parsed = parseMemberQr('2026001');
      expect(parsed).toEqual({ type: 'member_code', value: '2026001' });
    });

    it('parses 14-digit national IDs', () => {
      const parsed = parseMemberQr('30201012701234');
      expect(parsed).toEqual({ type: 'national_id', value: '30201012701234' });
    });

    it('parses raw UUID', () => {
      const parsed = parseMemberQr('abcdef01-2345-6789-abcd-ef0123456789');
      expect(parsed).toEqual({ type: 'uuid', value: 'abcdef01-2345-6789-abcd-ef0123456789' });
    });
  });

  describe('Live Attendees Roster & Counters Enrichment', () => {
    function enrichAttendanceWithProfiles(records, profiles) {
      const profMap = new Map((profiles || []).map((p) => [p.id, p]));
      return (records || []).map((r) => ({
        ...r,
        profiles: profMap.get(r.user_id) || null,
      }));
    }

    function calculateAttendanceStats(attendees) {
      return {
        present: (attendees || []).filter((a) => a.status === 'present').length,
        late: (attendees || []).filter((a) => a.status === 'late').length,
        excused: (attendees || []).filter((a) => a.status === 'excused').length,
        absent: (attendees || []).filter((a) => a.status === 'absent').length,
        total: (attendees || []).length,
      };
    }

    it('correctly maps and enriches attendee records with profile details', () => {
      const records = [
        { id: 'att-1', user_id: 'user-1', status: 'present', method: 'qr', checked_in_at: '2026-11-05T20:00:00Z' },
        { id: 'att-2', user_id: 'user-2', status: 'late', method: 'manual', checked_in_at: '2026-11-05T20:15:00Z' },
      ];
      const profiles = [
        { id: 'user-1', full_name_ar: 'أحمد محمود', full_name_en: 'Ahmed Mahmoud', member_code: '2026001' },
        { id: 'user-2', full_name_ar: 'سارة علي', full_name_en: 'Sara Ali', member_code: '2026002' },
      ];

      const enriched = enrichAttendanceWithProfiles(records, profiles);
      expect(enriched).toHaveLength(2);
      expect(enriched[0].profiles?.member_code).toBe('2026001');
      expect(enriched[0].profiles?.full_name_ar).toBe('أحمد محمود');
      expect(enriched[1].profiles?.member_code).toBe('2026002');
    });

    it('correctly calculates live counters for all attendance states', () => {
      const attendees = [
        { id: '1', status: 'present' },
        { id: '2', status: 'present' },
        { id: '3', status: 'late' },
        { id: '4', status: 'excused' },
        { id: '5', status: 'absent' },
      ];
      const stats = calculateAttendanceStats(attendees);
      expect(stats.present).toBe(2);
      expect(stats.late).toBe(1);
      expect(stats.excused).toBe(1);
      expect(stats.absent).toBe(1);
      expect(stats.total).toBe(5);
    });
  });
});
