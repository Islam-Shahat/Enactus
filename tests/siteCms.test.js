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
  it('returns all tabs for super_admin', () => {
    const tabs = getVisibleTabs([], true);
    expect(tabs.length).toBe(10);
  });

  it('filters tabs strictly for pr_admin', () => {
    const tabs = getVisibleTabs(['pr_admin'], false);
    const keys = tabs.map((t) => t.key);
    expect(keys).toContain('partners');
    expect(keys).toContain('packages');
    expect(keys).not.toContain('stats');
    expect(keys).not.toContain('gallery');
  });

  it('filters tabs for media_admin', () => {
    const tabs = getVisibleTabs(['media_admin'], false);
    const keys = tabs.map((t) => t.key);
    expect(keys).toContain('stats');
    expect(keys).toContain('news');
    expect(keys).toContain('gallery');
    expect(keys).toContain('faqs');
    expect(keys).toContain('content');
    expect(keys).not.toContain('partners');
  });

  it('filters tabs for hr_admin', () => {
    const tabs = getVisibleTabs(['hr_admin'], false);
    const keys = tabs.map((t) => t.key);
    expect(keys).toContain('team');
    expect(keys).toContain('committees');
    expect(keys).toContain('faqs');
    expect(keys).toContain('settings');
    expect(keys).not.toContain('stats');
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

