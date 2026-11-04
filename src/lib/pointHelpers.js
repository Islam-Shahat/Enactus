// src/lib/pointHelpers.js

export const DISPUTE_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours

/**
 * Checks whether a point entry is eligible for dispute submission.
 * Requirements:
 * - Must be of type 'penalty'
 * - Must not be voided
 * - Must be created within the last 48 hours
 * - Must not have an existing dispute
 */
export function isDisputeEligible(entry, now = new Date()) {
  if (!entry) return false;
  if (entry.type !== 'penalty') return false;
  if (entry.voided_at) return false;
  if (entry.dispute || entry.point_disputes?.length > 0) return false;

  const createdAt = new Date(entry.created_at);
  if (isNaN(createdAt.getTime())) return false;

  const diffMs = now.getTime() - createdAt.getTime();
  return diffMs >= 0 && diffMs <= DISPUTE_WINDOW_MS;
}

/**
 * Calculates the remaining time within the 48-hour dispute window.
 */
export function getRemainingDisputeTime(createdAtString, now = new Date()) {
  const createdAt = new Date(createdAtString);
  if (isNaN(createdAt.getTime())) {
    return { expired: true, remainingMs: 0, hours: 0, minutes: 0 };
  }

  const elapsedMs = now.getTime() - createdAt.getTime();
  const remainingMs = DISPUTE_WINDOW_MS - elapsedMs;

  if (remainingMs <= 0) {
    return { expired: true, remainingMs: 0, hours: 0, minutes: 0 };
  }

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

  return {
    expired: false,
    remainingMs,
    hours,
    minutes,
  };
}

/**
 * Formats a point value with its sign (+ or -).
 */
export function formatPointValue(type, value) {
  const num = Math.abs(Number(value) || 0);
  if (type === 'penalty') return `-${num}`;
  return `+${num}`;
}

/**
 * Calculates leaderboard ranks deterministically.
 * Handles equal total scores by sharing the same rank.
 */
export function calculateLeaderboardRanks(scores = []) {
  if (!Array.isArray(scores)) return [];

  // Sort descending by total score, then by bonus_total descending
  const sorted = [...scores].sort((a, b) => {
    const diff = (b.total ?? 0) - (a.total ?? 0);
    if (diff !== 0) return diff;
    return (b.bonus_total ?? 0) - (a.bonus_total ?? 0);
  });

  let currentRank = 1;
  return sorted.map((item, index) => {
    if (index > 0) {
      const prev = sorted[index - 1];
      if ((item.total ?? 0) < (prev.total ?? 0)) {
        currentRank = index + 1;
      }
    }
    return {
      ...item,
      rank: currentRank,
    };
  });
}

