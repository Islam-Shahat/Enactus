// tests/submitApplication.test.js
import { describe, it, expect } from 'vitest';
import { buildApplicationRow } from '../supabase/functions/submit-application/index.ts';
import { submitApplicationSchema } from '../supabase/functions/_shared/schemas.ts';

// Allowed columns in public.applications table according to Supabase migrations
const APPLICATIONS_DB_COLUMNS = new Set([
  'id',
  'season_id',
  'full_name',
  'email',
  'phone',
  'university_id',
  'faculty',
  'study_year',
  'first_choice_id',
  'second_choice_id',
  'motivation',
  'answers',
  'cv_url',
  'status',
  'interview_score',
  'notes',
  'reviewed_by',
  'converted_user_id',
  'created_at',
  'updated_at',
  'ip_hash',
]);

describe('submit-application Field Mapping & Schema Regression Tests', () => {
  const sampleInput = {
    fullName: 'محمود أحمد مصطفى',
    email: 'Mahmoud@Example.com',
    phone: '01012345678',
    faculty: 'كلية الهندسة - قنا',
    universityId: 'ENG-2026-44',
    studyYear: 2,
    committeeSlug: 'project-management',
    secondChoiceSlug: 'marketing-media',
    motivation: 'الشغف بريادة الأعمال وتطوير مهارات العمل التنموي',
    answers: { experience: '2 years in volunteer work', tools: 'Figma, Excel' },
  };

  const sampleApplicationId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const sampleSeasonId = '11111111-2222-3333-4444-555555555555';
  const sampleFirstChoiceId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const sampleSecondChoiceId = 'ffffffff-gggg-hhhh-iiii-jjjjjjjjjjjj';
  const sampleIpHash = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
  const sampleCvUrl = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890/cv.pdf';

  it('maps a valid application payload strictly to actual applications table schema', () => {
    const row = buildApplicationRow({
      applicationId: sampleApplicationId,
      seasonId: sampleSeasonId,
      input: sampleInput,
      normalizedEmail: sampleInput.email.trim().toLowerCase(),
      firstChoiceId: sampleFirstChoiceId,
      secondChoiceId: sampleSecondChoiceId,
      cvUrl: sampleCvUrl,
      ipHash: sampleIpHash,
    });

    // 1. Verify every field in the mapped row corresponds to a real column in public.applications
    for (const key of Object.keys(row)) {
      expect(
        APPLICATIONS_DB_COLUMNS.has(key),
        `Column "${key}" does not exist in public.applications schema!`
      ).toBe(true);
    }

    // 2. Explicit regression checks against previously broken column names
    expect(row).not.toHaveProperty('committee_id');
    expect(row).not.toHaveProperty('score');

    // 3. Verify proper column names per migrations
    expect(row.first_choice_id).toBe(sampleFirstChoiceId);
    expect(row.second_choice_id).toBe(sampleSecondChoiceId);
    expect(row.interview_score).toBeNull();
    expect(row.notes).toBeNull();
    expect(row.reviewed_by).toBeNull();
    expect(row.status).toBe('new');
    expect(row.id).toBe(sampleApplicationId);
    expect(row.season_id).toBe(sampleSeasonId);
    expect(row.full_name).toBe('محمود أحمد مصطفى');
    expect(row.email).toBe('mahmoud@example.com');
    expect(row.phone).toBe('01012345678');
    expect(row.university_id).toBe('ENG-2026-44');
    expect(row.faculty).toBe('كلية الهندسة - قنا');
    expect(row.cv_url).toBe(sampleCvUrl);
    expect(row.ip_hash).toBe(sampleIpHash);
    expect(row.answers).toEqual(sampleInput.answers);
  });

  describe('study_year Numeric Validation', () => {
    it('stores numeric study year as integer number, not sanitized empty string', () => {
      const row = buildApplicationRow({
        applicationId: sampleApplicationId,
        seasonId: sampleSeasonId,
        input: { ...sampleInput, studyYear: 3 },
        normalizedEmail: 'test@example.com',
      });

      expect(typeof row.study_year).toBe('number');
      expect(row.study_year).toBe(3);
      expect(Number.isInteger(row.study_year)).toBe(true);
    });

    it('correctly parses string and Arabic labels into numeric study year', () => {
      const cases = [
        { raw: 'الفرقة الأولى', expected: 1 },
        { raw: 'الفرقة الثانية', expected: 2 },
        { raw: 'الفرقة الثالثة', expected: 3 },
        { raw: 'الفرقة الرابعة', expected: 4 },
        { raw: 'الفرقة الخامسة / دراسات عليا', expected: 5 },
        { raw: '1st Year', expected: 1 },
        { raw: '4th Year', expected: 4 },
        { raw: '2', expected: 2 },
      ];

      for (const { raw, expected } of cases) {
        const row = buildApplicationRow({
          applicationId: sampleApplicationId,
          seasonId: sampleSeasonId,
          input: { ...sampleInput, studyYear: raw },
          normalizedEmail: 'test@example.com',
        });

        expect(row.study_year).toBe(expected);
        expect(typeof row.study_year).toBe('number');
      }
    });

    it('clamps numeric study year between 1 and 8', () => {
      const rowOver = buildApplicationRow({
        applicationId: sampleApplicationId,
        seasonId: sampleSeasonId,
        input: { ...sampleInput, studyYear: 12 },
        normalizedEmail: 'test@example.com',
      });
      expect(rowOver.study_year).toBe(8);

      const rowUnder = buildApplicationRow({
        applicationId: sampleApplicationId,
        seasonId: sampleSeasonId,
        input: { ...sampleInput, studyYear: 0 },
        normalizedEmail: 'test@example.com',
      });
      expect(rowUnder.study_year).toBe(1);
    });

    it('returns null for missing or invalid study year', () => {
      const rowNull = buildApplicationRow({
        applicationId: sampleApplicationId,
        seasonId: sampleSeasonId,
        input: { ...sampleInput, studyYear: null },
        normalizedEmail: 'test@example.com',
      });
      expect(rowNull.study_year).toBeNull();
    });
  });

  describe('submitApplicationSchema Validation', () => {
    it('accepts both committeeSlug and firstChoiceSlug in schema payload', () => {
      const payload1 = {
        fullName: 'سارة خالد',
        email: 'sara@example.com',
        phone: '01234567890',
        faculty: 'كلية العلوم',
        studyYear: 'الفرقة الثانية',
        committeeSlug: 'hr',
      };
      const res1 = submitApplicationSchema.safeParse(payload1);
      expect(res1.success).toBe(true);
      if (res1.success) {
        expect(res1.data.committeeSlug).toBe('hr');
        expect(res1.data.studyYear).toBe(2);
      }

      const payload2 = {
        fullName: 'سارة خالد',
        email: 'sara@example.com',
        phone: '01234567890',
        faculty: 'كلية العلوم',
        studyYear: 3,
        firstChoiceSlug: 'presentation',
        secondChoiceSlug: 'media',
      };
      const res2 = submitApplicationSchema.safeParse(payload2);
      expect(res2.success).toBe(true);
      if (res2.success) {
        expect(res2.data.firstChoiceSlug).toBe('presentation');
        expect(res2.data.secondChoiceSlug).toBe('media');
        expect(res2.data.studyYear).toBe(3);
      }
    });
  });

  describe('20261105224500_secure_application_submission.sql Migration & RPC Contract', () => {
    it('verifies the RPC migration file exists and enforces security practices', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const migrationPath = path.resolve(
        __dirname,
        '../supabase/migrations/20261105224500_secure_application_submission.sql'
      );

      expect(fs.existsSync(migrationPath)).toBe(true);

      const content = fs.readFileSync(migrationPath, 'utf-8');

      // Function definition & security definer checks
      expect(content).toContain('function public.submit_recruitment_application');
      expect(content).toMatch(/security\s+definer/i);
      expect(content).toMatch(/set\s+search_path\s*=\s*''/i);

      // Permissions: anon execution must be granted
      expect(content).toMatch(/grant\s+execute\s+on\s+function\s+public\.submit_recruitment_application[\s\S]*to\s+anon/i);

      // Fallback RLS & storage policies
      expect(content).toContain('applications_insert_anon');
      expect(content).toContain('cvs_insert_anon');
      expect(content).toMatch(/grant\s+insert\s+on\s+public\.applications\s+to\s+anon/i);
    });
  });

  describe('VIP Card Render & Scope Integrity', () => {
    it('verifies JoinUsPage and RecruitmentModal destructure watch and guard VIP pass fields', async () => {
      const fs = await import('fs');
      const path = await import('path');

      const joinUsContent = fs.readFileSync(path.resolve(__dirname, '../src/pages/JoinUsPage.jsx'), 'utf-8');
      const modalContent = fs.readFileSync(path.resolve(__dirname, '../src/components/RecruitmentModal.jsx'), 'utf-8');

      // Check destructuring of watch in useForm
      expect(joinUsContent).toContain('watch,');
      expect(modalContent).toContain('watch,');

      // Check submittedInfo fallback
      expect(joinUsContent).toContain('submittedInfo.fullName');
      expect(modalContent).toContain('submittedInfo.fullName');
    });
  });

  describe('Application Deletion Workflow & Security Contracts', () => {
    it('verifies migration 20261106093000 configures delete_application RPC and updated RLS policy', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const migrationPath = path.resolve(
        __dirname,
        '../supabase/migrations/20261106093000_allow_application_deletion.sql'
      );

      expect(fs.existsSync(migrationPath)).toBe(true);

      const content = fs.readFileSync(migrationPath, 'utf-8');
      expect(content).toContain('policy applications_delete');
      expect(content).toContain("'hr_admin', 'president', 'vice_president'");
      expect(content).toContain('function public.delete_application');
      expect(content).toContain('grant execute on function public.delete_application');
      expect(content).toContain('grant delete on public.applications to authenticated');
    });

    it('verifies ApplicationsPage integrates application deletion with ConfirmDialog and RPC/table fallback', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const appPage = fs.readFileSync(
        path.resolve(__dirname, '../src/pages/dashboard/ApplicationsPage.jsx'),
        'utf-8'
      );

      expect(appPage).toContain("supabase.rpc('delete_application'");
      expect(appPage).toContain(".from('applications')");
      expect(appPage).toContain('.delete()');
      expect(appPage).toContain('appToDelete');
      expect(appPage).toContain('setAppToDelete');
      expect(appPage).toContain('Trash2');
    });
  });
});

