// supabase/functions/_shared/committees.ts

export interface CommitteeRecord {
  id: string;
  slug: string;
  name_ar?: string | null;
  name_en?: string | null;
  color?: string | null;
}

/**
 * Resolves a committee from user input without building dynamic PostgREST .or() filters.
 * Matching rules:
 * 1. Exact match on slug (case-insensitive)
 * 2. Exact match on English name (case-insensitive)
 * 3. Exact match on Arabic name (trimmed)
 * 4. Unique partial match on slug or names (only if exactly one committee matches; returns null if ambiguous)
 */
export function resolveCommittee(
  query: string | undefined | null,
  committees: CommitteeRecord[]
): CommitteeRecord | null {
  if (!query || typeof query !== 'string') return null;
  const q = query.trim();
  if (!q) return null;

  const qLower = q.toLowerCase();

  // 1. Exact slug match
  const exactSlug = committees.find((c) => c.slug.toLowerCase() === qLower);
  if (exactSlug) return exactSlug;

  // 2. Exact English name match
  const exactNameEn = committees.find((c) => c.name_en?.toLowerCase().trim() === qLower);
  if (exactNameEn) return exactNameEn;

  // 3. Exact Arabic name match
  const exactNameAr = committees.find((c) => c.name_ar?.trim() === q);
  if (exactNameAr) return exactNameAr;

  // 4. Partial matching - ONLY return if exactly ONE committee matches
  const partialMatches = committees.filter((c) => {
    const slugMatch = c.slug.toLowerCase().includes(qLower);
    const enMatch = c.name_en ? c.name_en.toLowerCase().includes(qLower) : false;
    const arMatch = c.name_ar ? c.name_ar.includes(q) : false;
    return slugMatch || enMatch || arMatch;
  });

  if (partialMatches.length === 1) {
    return partialMatches[0];
  }

  // Ambiguous or no matches
  return null;
}

