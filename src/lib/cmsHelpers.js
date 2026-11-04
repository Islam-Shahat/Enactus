// src/lib/cmsHelpers.js
import { z } from 'zod';

// =====================================================================
// CMS TABS & ROLE PERMISSIONS
// =====================================================================
export const CMS_TABS = [
  { key: 'stats', label_ar: 'الإحصائيات', label_en: 'Stats', roles: ['media_admin', 'president', 'vice_president'] },
  { key: 'partners', label_ar: 'الشركاء والرعاة', label_en: 'Partners', roles: ['pr_admin', 'president', 'vice_president'] },
  { key: 'team', label_ar: 'فريق العمل والمجلس', label_en: 'Team & Board', roles: ['hr_admin', 'president', 'vice_president'] },
  { key: 'committees', label_ar: 'اللجان والأنشطة', label_en: 'Committees', roles: ['president', 'vice_president', 'hr_admin'] },
  { key: 'news', label_ar: 'الأخبار والمقالات', label_en: 'News', roles: ['media_admin', 'president', 'vice_president'] },
  { key: 'gallery', label_ar: 'معرض الصور', label_en: 'Gallery', roles: ['media_admin', 'president', 'vice_president'] },
  { key: 'faqs', label_ar: 'الأسئلة الشائعة', label_en: 'FAQ', roles: ['media_admin', 'hr_admin', 'president', 'vice_president'] },
  { key: 'packages', label_ar: 'باقات الرعاية', label_en: 'Sponsorship Packages', roles: ['pr_admin', 'president', 'vice_president'] },
  { key: 'content', label_ar: 'الصفحات الثابتة', label_en: 'Static Pages', roles: ['media_admin', 'president', 'vice_president'] },
  { key: 'settings', label_ar: 'إعدادات الموقع', label_en: 'Site Settings', roles: ['president', 'vice_president', 'hr_admin'] },
];

/**
 * Filter CMS tabs visible for the user according to their role.
 */
export function getVisibleTabs(userRoles = [], isSuperAdmin = false) {
  if (isSuperAdmin) return CMS_TABS;
  return CMS_TABS.filter((tab) => {
    return tab.roles.some((r) => userRoles.includes(r));
  });
}

// =====================================================================
// ZOD VALIDATION SCHEMAS
// =====================================================================

export const StatSchema = z.object({
  key: z.string().min(1, 'مفتاح الإحصائية مطلوب').max(50),
  value: z.coerce.number({ invalid_type_error: 'القيمة يجب أن تكون رقماً' }),
  suffix: z.string().max(20).optional().nullable(),
  label_ar: z.string().min(1, 'العنوان بالعربية مطلوب'),
  label_en: z.string().optional().nullable(),
  is_visible: z.boolean().default(true),
});

export const PartnerSchema = z.object({
  name_ar: z.string().min(1, 'اسم الشريك بالعربية مطلوب'),
  name_en: z.string().optional().nullable(),
  kind: z.enum(['sponsor', 'partner', 'strategic']).default('sponsor'),
  tier: z.enum(['platinum', 'gold', 'silver', 'bronze']).optional().nullable(),
  website: z.string().url('رابط الموقع غير صالح').or(z.literal('')).optional().nullable(),
  logo_url: z.string().optional().nullable(),
  cover_url: z.string().optional().nullable(),
  description_ar: z.string().optional().nullable(),
  description_en: z.string().optional().nullable(),
  is_visible: z.boolean().default(true),
});

export const TeamMemberSchema = z.object({
  name_ar: z.string().min(1, 'الاسم بالعربية مطلوب'),
  name_en: z.string().optional().nullable(),
  kind: z.enum(['board', 'head', 'alumni']),
  committee_id: z.string().uuid().optional().nullable(),
  position_ar: z.string().min(1, 'المسمى الوظيفي بالعربية مطلوب'),
  position_en: z.string().optional().nullable(),
  faculty_ar: z.string().optional().nullable(),
  faculty_en: z.string().optional().nullable(),
  current_position_ar: z.string().optional().nullable(),
  current_position_en: z.string().optional().nullable(),
  quote_ar: z.string().optional().nullable(),
  quote_en: z.string().optional().nullable(),
  bio_ar: z.string().optional().nullable(),
  bio_en: z.string().optional().nullable(),
  photo_url: z.string().optional().nullable(),
  links: z.object({
    linkedin: z.string().optional().nullable(),
    facebook: z.string().optional().nullable(),
  }).default({}),
  is_visible: z.boolean().default(true),
});

export const CommitteeContentSectionSchema = z.object({
  brief: z.string().optional().nullable(),
  mascot: z.string().optional().nullable(),
  quote: z.string().optional().nullable(),
  duties: z.array(z.string()).default([]),
  skillsRequired: z.array(z.string()).default([]),
  skillsGained: z.array(z.string()).default([]),
  activeProjects: z.array(z.string()).default([]),
});

export const CommitteeSchema = z.object({
  name_ar: z.string().min(1, 'اسم اللجنة بالعربية مطلوب'),
  name_en: z.string().optional().nullable(),
  slug: z.string().min(1, 'الرابط الدائم مطلوب'),
  code: z.string().max(10).optional().nullable(),
  description_ar: z.string().optional().nullable(),
  description_en: z.string().optional().nullable(),
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'كود لون غير صالح').default('#ffb800'),
  icon: z.string().optional().nullable(),
  is_media_team: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export const NewsPostSchema = z.object({
  title_ar: z.string().min(1, 'عنوان الخبر بالعربية مطلوب'),
  title_en: z.string().optional().nullable(),
  slug: z.string().min(1, 'الرابط الدائم مطلوب'),
  category_ar: z.string().optional().nullable(),
  category_en: z.string().optional().nullable(),
  excerpt_ar: z.string().optional().nullable(),
  excerpt_en: z.string().optional().nullable(),
  body_ar: z.string().min(1, 'محتوى الخبر بالعربية مطلوب'),
  body_en: z.string().optional().nullable(),
  cover_url: z.string().optional().nullable(),
  is_published: z.boolean().default(false),
  published_at: z.string().optional().nullable(),
});

export const GalleryItemSchema = z.object({
  media_url: z.string().min(1, 'رابط الصورة أو الفيديو مطلوب'),
  kind: z.enum(['image', 'video']).default('image'),
  caption_ar: z.string().optional().nullable(),
  caption_en: z.string().optional().nullable(),
  event_id: z.string().uuid().optional().nullable(),
  is_visible: z.boolean().default(true),
});

export const FaqSchema = z.object({
  question_ar: z.string().min(1, 'السؤال بالعربية مطلوب'),
  question_en: z.string().optional().nullable(),
  answer_ar: z.string().min(1, 'الإجابة بالعربية مطلوبة'),
  answer_en: z.string().optional().nullable(),
  is_visible: z.boolean().default(true),
});

export const SponsorshipPackageSchema = z.object({
  name_ar: z.string().min(1, 'اسم الباقة بالعربية مطلوب'),
  name_en: z.string().optional().nullable(),
  tier: z.enum(['platinum', 'gold', 'silver', 'bronze']).default('gold'),
  tagline_ar: z.string().optional().nullable(),
  tagline_en: z.string().optional().nullable(),
  badge_ar: z.string().optional().nullable(),
  badge_en: z.string().optional().nullable(),
  is_featured: z.boolean().default(false),
  is_public: z.boolean().default(true),
  is_active: z.boolean().default(true),
  benefits_ar: z.array(z.string()).default([]),
  benefits_en: z.array(z.string()).default([]),
});

export const SiteContentSchema = z.object({
  key: z.string().min(1, 'مفتاح الصفحة مطلوب'),
  locale: z.enum(['ar', 'en']),
  title: z.string().optional().nullable(),
  markdown: z.string().default(''),
});

// =====================================================================
// SORT ORDER & REORDERING HELPERS
// =====================================================================

/**
 * Swap sort_order between two items and return the updated pair.
 */
export function swapSortOrder(itemA, itemB) {
  if (!itemA || !itemB) return [itemA, itemB];
  const orderA = itemA.sort_order ?? 0;
  const orderB = itemB.sort_order ?? 0;
  return [
    { ...itemA, sort_order: orderB },
    { ...itemB, sort_order: orderA },
  ];
}

/**
 * Normalizes an array of items by assigning sequential sort_order (10, 20, 30...).
 */
export function normalizeSortOrders(items = [], step = 10) {
  if (!Array.isArray(items)) return [];
  return items.map((item, index) => ({
    ...item,
    sort_order: (index + 1) * step,
  }));
}

/**
 * Moves an item within an array from one index to another, returning a new normalized array.
 */
export function moveItemInList(items = [], fromIndex, toIndex) {
  if (!Array.isArray(items)) return [];
  if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length) {
    return items;
  }
  const result = [...items];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return normalizeSortOrders(result);
}

/**
 * Gets preview URL for an item based on its tab type and record properties.
 */
export function getPreviewUrl(tabKey, item = {}) {
  switch (tabKey) {
    case 'stats':
      return '/';
    case 'partners':
      return '/partners';
    case 'team':
      return item?.kind === 'alumni' ? '/alumni' : '/team';
    case 'committees':
      return item?.slug ? `/committees/${item.slug}` : '/committees';
    case 'news':
      return item?.slug ? `/news/${item.slug}` : '/news';
    case 'gallery':
      return '/gallery';
    case 'faqs':
      return '/faq';
    case 'packages':
      return '/sponsor';
    case 'content':
      if (item?.key === 'terms') return '/terms';
      if (item?.key === 'privacy') return '/terms';
      if (item?.key === 'about') return '/about';
      return '/';
    default:
      return '/';
  }
}
