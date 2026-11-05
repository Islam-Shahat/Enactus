import { describe, it, expect } from 'vitest';
import {
  getVisibleTabs,
  swapSortOrder,
  moveItemInList,
  normalizeSortOrders,
  getPreviewUrl,
  StatSchema,
  PartnerSchema,
  FaqSchema,
  NewsPostSchema,
  SponsorshipPackageSchema,
} from '../src/lib/cmsHelpers';

describe('CMS Tabs & Permissions', () => {
  it('returns all 10 tabs for super_admin regardless of userRoles array', () => {
    const tabs = getVisibleTabs([], true);
    expect(tabs.length).toBe(10);
    const keys = tabs.map((t) => t.key);
    expect(keys).toEqual([
      'stats',
      'partners',
      'team',
      'committees',
      'news',
      'gallery',
      'faqs',
      'packages',
      'content',
      'settings',
    ]);
  });

  it('returns all 10 tabs for president and vice_president', () => {
    const presTabs = getVisibleTabs(['president'], false);
    expect(presTabs.length).toBe(10);

    const vpTabs = getVisibleTabs([{ role: 'vice_president' }], false);
    expect(vpTabs.length).toBe(10);
  });

  it('filters tabs strictly for pr_admin (string role array)', () => {
    const tabs = getVisibleTabs(['pr_admin'], false);
    const keys = tabs.map((t) => t.key);
    expect(keys).toEqual(['partners', 'packages']);
  });

  it('filters tabs strictly for pr_admin when given AuthContext object shape', () => {
    const tabs = getVisibleTabs([{ role: 'pr_admin', committee_id: null }], false);
    const keys = tabs.map((t) => t.key);
    expect(keys).toEqual(['partners', 'packages']);
  });

  it('filters tabs strictly for media_admin (string role array)', () => {
    const tabs = getVisibleTabs(['media_admin'], false);
    const keys = tabs.map((t) => t.key);
    expect(keys).toEqual(['stats', 'news', 'gallery', 'faqs', 'content']);
  });

  it('filters tabs strictly for media_admin when given AuthContext object shape', () => {
    const tabs = getVisibleTabs([{ role: 'media_admin', committee_id: 'c-media' }], false);
    const keys = tabs.map((t) => t.key);
    expect(keys).toEqual(['stats', 'news', 'gallery', 'faqs', 'content']);
  });

  it('filters tabs strictly for hr_admin (string role array)', () => {
    const tabs = getVisibleTabs(['hr_admin'], false);
    const keys = tabs.map((t) => t.key);
    expect(keys).toEqual(['team', 'committees', 'faqs', 'settings']);
  });

  it('filters tabs strictly for hr_admin when given AuthContext object shape', () => {
    const tabs = getVisibleTabs([{ role: 'hr_admin', committee_id: 'c-hr' }], false);
    const keys = tabs.map((t) => t.key);
    expect(keys).toEqual(['team', 'committees', 'faqs', 'settings']);
  });

  it('computes union of tabs for multi-role users (e.g. pr_admin + media_admin)', () => {
    const tabs = getVisibleTabs([
      { role: 'pr_admin', committee_id: 'c-pr' },
      { role: 'media_admin', committee_id: 'c-media' },
    ], false);
    const keys = tabs.map((t) => t.key);
    expect(keys).toEqual(['stats', 'partners', 'news', 'gallery', 'faqs', 'packages', 'content']);
  });

  it('returns empty tabs array for non-permitted roles (e.g. member, finance_admin)', () => {
    expect(getVisibleTabs(['member'], false)).toEqual([]);
    expect(getVisibleTabs([{ role: 'finance_admin', committee_id: null }], false)).toEqual([]);
    expect(getVisibleTabs([], false)).toEqual([]);
    expect(getVisibleTabs(null, false)).toEqual([]);
    expect(getVisibleTabs(undefined, false)).toEqual([]);
  });
});

describe('Sort Order Reordering Helpers', () => {
  it('swaps sort_order between two items', () => {
    const item1 = { id: '1', sort_order: 10 };
    const item2 = { id: '2', sort_order: 30 };
    const [swapped1, swapped2] = swapSortOrder(item1, item2);
    expect(swapped1.sort_order).toBe(30);
    expect(swapped2.sort_order).toBe(10);
  });

  it('normalizes sort orders with step 10', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const normalized = normalizeSortOrders(items);
    expect(normalized[0].sort_order).toBe(10);
    expect(normalized[1].sort_order).toBe(20);
    expect(normalized[2].sort_order).toBe(30);
  });

  it('moves item from index 2 to index 0 and re-orders', () => {
    const items = [
      { id: 'a', sort_order: 10 },
      { id: 'b', sort_order: 20 },
      { id: 'c', sort_order: 30 },
    ];
    const reordered = moveItemInList(items, 2, 0);
    expect(reordered[0].id).toBe('c');
    expect(reordered[0].sort_order).toBe(10);
    expect(reordered[1].id).toBe('a');
    expect(reordered[1].sort_order).toBe(20);
    expect(reordered[2].id).toBe('b');
    expect(reordered[2].sort_order).toBe(30);
  });

  it('returns items untouched if index is invalid', () => {
    const items = [{ id: 'a' }, { id: 'b' }];
    expect(moveItemInList(items, -1, 1)).toEqual(items);
    expect(moveItemInList(items, 0, 5)).toEqual(items);
  });
});

describe('Preview URL Helper', () => {
  it('maps tabs to preview URLs', () => {
    expect(getPreviewUrl('stats')).toBe('/');
    expect(getPreviewUrl('partners')).toBe('/partners');
    expect(getPreviewUrl('team', { kind: 'board' })).toBe('/team');
    expect(getPreviewUrl('team', { kind: 'alumni' })).toBe('/alumni');
    expect(getPreviewUrl('committees', { slug: 'technology' })).toBe('/committees/technology');
    expect(getPreviewUrl('news', { slug: 'launch-2026' })).toBe('/news/launch-2026');
    expect(getPreviewUrl('gallery')).toBe('/gallery');
    expect(getPreviewUrl('faqs')).toBe('/faq');
    expect(getPreviewUrl('packages')).toBe('/sponsor');
    expect(getPreviewUrl('content', { key: 'terms' })).toBe('/terms');
  });
});

describe('Zod Validation Schemas', () => {
  it('validates StatSchema', () => {
    const valid = StatSchema.safeParse({
      key: 'members_count',
      value: 120,
      suffix: '+',
      label_ar: 'عضو نشط',
      label_en: 'Active Members',
    });
    expect(valid.success).toBe(true);

    const invalid = StatSchema.safeParse({
      key: 'members',
      value: 'not-a-number',
      label_ar: '',
    });
    expect(invalid.success).toBe(false);
  });

  it('validates PartnerSchema', () => {
    const valid = PartnerSchema.safeParse({
      name_ar: 'جامعة جنوب الوادي',
      name_en: 'South Valley University',
      kind: 'strategic',
      tier: 'platinum',
      website: 'https://svu.edu.eg',
    });
    expect(valid.success).toBe(true);
  });

  it('validates FaqSchema', () => {
    const valid = FaqSchema.safeParse({
      question_ar: 'ما هي شروط الانضمام؟',
      question_en: 'What are the requirements?',
      answer_ar: 'أن تكون طالباً جامعياً مقيداً بجامعة جنوب الوادي.',
      answer_en: 'Must be an enrolled university student.',
    });
    expect(valid.success).toBe(true);
  });

  it('validates NewsPostSchema', () => {
    const valid = NewsPostSchema.safeParse({
      title_ar: 'افتتاح الموسم الجديد',
      slug: 'new-season-opening',
      body_ar: 'تم بحمد الله افتتاح الموسم الجديد...',
    });
    expect(valid.success).toBe(true);
  });

  it('validates SponsorshipPackageSchema', () => {
    const valid = SponsorshipPackageSchema.safeParse({
      name_ar: 'الباقة البلاتينية',
      tier: 'platinum',
      benefits_ar: ['شعار في جميع المطبوعات', 'ركن مخصص في المعرض'],
    });
    expect(valid.success).toBe(true);
  });
});

