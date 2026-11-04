// tests/committees.test.js
import { describe, it, expect } from 'vitest';
import { resolveCommittee } from '../supabase/functions/_shared/committees.ts';

const SAMPLE_COMMITTEES = [
  { id: '1', slug: 'project-management', name_ar: 'إدارة المشاريع', name_en: 'Project Management' },
  { id: '2', slug: 'presentation', name_ar: 'العرض والتقديم', name_en: 'Presentation' },
  { id: '3', slug: 'human-resources', name_ar: 'الموارد البشرية', name_en: 'Human Resources' },
  { id: '4', slug: 'public-relations', name_ar: 'العلاقات العامة', name_en: 'Public Relations' },
  { id: '5', slug: 'marketing-media', name_ar: 'التسويق والإعلام', name_en: 'Marketing & Media' },
];

describe('resolveCommittee', () => {
  it('1. Matches exact slug', () => {
    const res = resolveCommittee('project-management', SAMPLE_COMMITTEES);
    expect(res?.id).toBe('1');
  });

  it('2. Matches case-insensitive slug', () => {
    const res = resolveCommittee('PRESENTATION', SAMPLE_COMMITTEES);
    expect(res?.id).toBe('2');
  });

  it('3. Matches exact English name', () => {
    const res = resolveCommittee('human resources', SAMPLE_COMMITTEES);
    expect(res?.id).toBe('3');
  });

  it('4. Matches exact Arabic name', () => {
    const res = resolveCommittee('العلاقات العامة', SAMPLE_COMMITTEES);
    expect(res?.id).toBe('4');
  });

  it('5. Matches unique partial name in English', () => {
    const res = resolveCommittee('Marketing', SAMPLE_COMMITTEES);
    expect(res?.id).toBe('5');
  });

  it('6. Matches unique partial name in Arabic', () => {
    const res = resolveCommittee('المشاريع', SAMPLE_COMMITTEES);
    expect(res?.id).toBe('1');
  });

  it('7. Rejects ambiguous partial match when multiple committees match', () => {
    // Both 'Presentation' and 'Public Relations' contain 'Relations' or 'Pres' or similar
    // 'P' or 'Re' matches multiple
    const res = resolveCommittee('Re', SAMPLE_COMMITTEES);
    expect(res).toBeNull();
  });

  it('8. Returns null for non-matching input', () => {
    const res = resolveCommittee('non-existent-committee', SAMPLE_COMMITTEES);
    expect(res).toBeNull();
  });

  it('9. Handles empty, null, and whitespace-only queries safely without throwing', () => {
    expect(resolveCommittee('', SAMPLE_COMMITTEES)).toBeNull();
    expect(resolveCommittee('   ', SAMPLE_COMMITTEES)).toBeNull();
    expect(resolveCommittee(null, SAMPLE_COMMITTEES)).toBeNull();
    expect(resolveCommittee(undefined, SAMPLE_COMMITTEES)).toBeNull();
  });
});

