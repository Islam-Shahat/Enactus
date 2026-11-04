// src/pages/dashboard/LeaderboardPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import DataTable from '../../components/dashboard/DataTable';
import StatusBadge from '../../components/dashboard/StatusBadge';
import { calculateLeaderboardRanks } from '../../lib/pointHelpers';
import {
  Trophy,
  Medal,
  Crown,
  Users,
  Award,
  Calendar,
  Sparkles,
  User,
  Shield,
} from 'lucide-react';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const { isDark } = useTheme();
  const isAr = lang === 'ar';

  // Filters
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [selectedCommitteeId, setSelectedCommitteeId] = useState('all');

  // 1. Fetch Seasons
  const { data: seasons = [] } = useQuery({
    queryKey: ['dashboard', 'seasons_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('id, name, is_active')
        .order('starts_on', { ascending: false });
      if (error) throw error;
      return (data || []).map((s) => ({ ...s, name_ar: s.name, name_en: s.name }));
    },
    staleTime: 10 * 60 * 1000,
  });

  // Set default season to active season
  React.useEffect(() => {
    if (!selectedSeasonId && seasons.length > 0) {
      const active = seasons.find((s) => s.is_active) || seasons[0];
      setSelectedSeasonId(active.id);
    }
  }, [seasons, selectedSeasonId]);

  // 2. Fetch Committees
  const { data: committees = [] } = useQuery({
    queryKey: ['dashboard', 'committees-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('committees')
        .select('id, slug, name_ar, name_en, color')
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // 3. Fetch Leaderboard Scores (member_scores joined with profiles and active memberships)
  const { data: rawScores = [], isLoading: loadingScores } = useQuery({
    queryKey: ['dashboard', 'leaderboard', selectedSeasonId, selectedCommitteeId],
    queryFn: async () => {
      if (!selectedSeasonId) return [];

      // Query member_scores with profile information
      let q = supabase
        .from('member_scores')
        .select(`
          user_id,
          season_id,
          total,
          bonus_total,
          profiles!inner (
            id,
            full_name_ar,
            full_name_en,
            avatar_url
          )
        `)
        .eq('season_id', selectedSeasonId);

      const { data: scoresData, error: scoresErr } = await q;
      if (scoresErr) throw scoresErr;
      if (!scoresData || scoresData.length === 0) return [];

      // Query memberships for this season to resolve each member's committee
      let memQuery = supabase
        .from('memberships')
        .select(`
          user_id,
          committee_id,
          position,
          status,
          committees (
            id,
            name_ar,
            name_en,
            color
          )
        `)
        .eq('season_id', selectedSeasonId)
        .eq('status', 'active');

      if (selectedCommitteeId !== 'all') {
        memQuery = memQuery.eq('committee_id', selectedCommitteeId);
      }

      const { data: memberships, error: memErr } = await memQuery;
      if (memErr) throw memErr;

      const memMap = new Map();
      (memberships || []).forEach((m) => {
        memMap.set(m.user_id, m);
      });

      // Filter and merge
      const merged = [];
      for (const score of scoresData) {
        // If a specific committee filter is applied, only keep members of that committee
        const mem = memMap.get(score.user_id);
        if (selectedCommitteeId !== 'all' && !mem) {
          continue;
        }

        merged.push({
          user_id: score.user_id,
          total: score.total,
          bonus_total: score.bonus_total,
          profile: score.profiles,
          membership: mem || null,
        });
      }

      return merged;
    },
    enabled: Boolean(selectedSeasonId),
  });

  // Calculate ranks deterministically
  const rankedLeaderboard = calculateLeaderboardRanks(rawScores);

  // Top 3 for Podium
  const top1 = rankedLeaderboard[0] || null;
  const top2 = rankedLeaderboard[1] || null;
  const top3 = rankedLeaderboard[2] || null;

  // Find current user's rank
  const myRankEntry = rankedLeaderboard.find((entry) => entry.user_id === user?.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Banner */}
      <div
        className="glass-panel gold-border-glow"
        dir={dir}
        style={{
          borderRadius: '24px',
          padding: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
          background: isDark
            ? 'linear-gradient(135deg, rgba(22, 24, 34, 0.95), rgba(12, 13, 18, 0.95))'
            : 'rgba(255, 255, 255, 0.95)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <Trophy size={28} color="#ffb800" />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0 }}>
              {isAr ? 'لوحة المتصدرين' : 'Leaderboard'}
            </h1>
          </div>
          <p style={{ margin: 0, color: isDark ? '#a0a0b2' : '#6b7280', fontSize: '0.95rem' }}>
            {isAr
              ? 'ترتيب أعضاء كتيبة إيناكتس قنا حسب إجمالي نقاط الأداء المعتمدة'
              : 'Official member rankings and cumulative performance standings'}
          </p>
        </div>

        {/* Filters: Season and Committee */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            value={selectedSeasonId}
            onChange={(e) => setSelectedSeasonId(e.target.value)}
            style={{
              padding: '0.6rem 0.9rem',
              borderRadius: '10px',
              background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
              border: isDark ? '1px solid rgba(255,184,0,0.3)' : '1px solid #d1d5db',
              color: isDark ? '#fff' : '#111',
              fontSize: '0.88rem',
              fontWeight: 600,
            }}
          >
            {seasons.map((s) => (
              <option key={s.id} value={s.id} style={{ background: isDark ? '#181920' : '#fff' }}>
                {isAr ? s.name_ar : s.name_en} {s.is_active ? `(${isAr ? 'الحالي' : 'Active'})` : ''}
              </option>
            ))}
          </select>

          <select
            value={selectedCommitteeId}
            onChange={(e) => setSelectedCommitteeId(e.target.value)}
            style={{
              padding: '0.6rem 0.9rem',
              borderRadius: '10px',
              background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
              border: isDark ? '1px solid rgba(255,184,0,0.3)' : '1px solid #d1d5db',
              color: isDark ? '#fff' : '#111',
              fontSize: '0.88rem',
              fontWeight: 600,
            }}
          >
            <option value="all" style={{ background: isDark ? '#181920' : '#fff' }}>
              {isAr ? 'جميع اللجان (العام)' : 'All Committees (Overall)'}
            </option>
            {committees.map((c) => (
              <option key={c.id} value={c.id} style={{ background: isDark ? '#181920' : '#fff' }}>
                {isAr ? c.name_ar : c.name_en}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* My Rank Highlight Banner */}
      {myRankEntry && (
        <div
          className="gold-border-glow"
          dir={dir}
          style={{
            borderRadius: '16px',
            padding: '1.25rem 1.75rem',
            background: isDark
              ? 'linear-gradient(90deg, rgba(255, 184, 0, 0.15), rgba(22, 24, 34, 0.95))'
              : 'linear-gradient(90deg, #fef3c7, #ffffff)',
            border: '1px solid rgba(255, 184, 0, 0.4)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ffb800, #ff8800)',
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.2rem',
              }}
            >
              #{myRankEntry.rank}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: isDark ? '#fff' : '#111' }}>
                {isAr ? 'ترتيبك الشخصي الحالي' : 'Your Current Standing'}
              </div>
              <div style={{ fontSize: '0.85rem', color: isDark ? '#ffb800' : '#b45309' }}>
                {isAr
                  ? `أنت في المركز #${myRankEntry.rank} برصيد إجمالي ${myRankEntry.total} نقطة`
                  : `Rank #${myRankEntry.rank} with a total of ${myRankEntry.total} points`}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, fontSize: '1.35rem', color: isDark ? '#ffd54f' : '#b45309' }}>
            <Sparkles size={20} />
            <span>{myRankEntry.total} pts</span>
          </div>
        </div>
      )}

      {/* Podium for Top 3 */}
      {rankedLeaderboard.length >= 3 && (
        <div
          dir={dir}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.5rem',
            alignItems: 'end',
          }}
        >
          {/* 2nd Place (Silver) */}
          {top2 && (
            <div
              className="glass-panel"
              style={{
                borderRadius: '20px',
                padding: '1.75rem',
                textAlign: 'center',
                border: '1px solid rgba(192, 192, 192, 0.4)',
                background: isDark
                  ? 'linear-gradient(180deg, rgba(192, 192, 192, 0.12), rgba(20, 22, 30, 0.9))'
                  : '#ffffff',
                boxShadow: '0 15px 35px rgba(0,0,0,0.06)',
                order: dir === 'rtl' ? 1 : 1,
              }}
            >
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #d1d5db, #9ca3af)',
                  color: '#111',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.25rem',
                  margin: '0 auto 1rem',
                  boxShadow: '0 4px 15px rgba(156, 163, 175, 0.4)',
                }}
              >
                2
              </div>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', color: isDark ? '#fff' : '#111' }}>
                {isAr
                  ? top2.profile?.full_name_ar || top2.profile?.full_name_en
                  : top2.profile?.full_name_en || top2.profile?.full_name_ar}
              </div>
              <div style={{ fontSize: '0.85rem', color: isDark ? '#aaa' : '#666', marginTop: '0.25rem' }}>
                {isAr ? top2.membership?.committees?.name_ar : top2.membership?.committees?.name_en}
              </div>
              <div
                style={{
                  marginTop: '1rem',
                  fontWeight: 900,
                  fontSize: '1.4rem',
                  color: '#9ca3af',
                }}
              >
                {top2.total} pts
              </div>
            </div>
          )}

          {/* 1st Place (Gold Crown) */}
          {top1 && (
            <div
              className="glass-panel gold-border-glow"
              style={{
                borderRadius: '24px',
                padding: '2.25rem 1.75rem',
                textAlign: 'center',
                border: '2px solid rgba(255, 184, 0, 0.6)',
                background: isDark
                  ? 'linear-gradient(180deg, rgba(255, 184, 0, 0.2), rgba(24, 26, 36, 0.95))'
                  : 'linear-gradient(180deg, #fffbeb, #ffffff)',
                boxShadow: isDark
                  ? '0 20px 50px rgba(255, 184, 0, 0.25)'
                  : '0 20px 40px rgba(255, 184, 0, 0.2)',
                order: dir === 'rtl' ? 2 : 2,
                transform: 'translateY(-10px)',
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ffd54f, #ffb800)',
                  color: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.5rem',
                  margin: '0 auto 1rem',
                  boxShadow: '0 8px 25px rgba(255, 184, 0, 0.5)',
                  position: 'relative',
                }}
              >
                <Crown size={22} style={{ position: 'absolute', top: -16, color: '#ffb800' }} />
                1
              </div>
              <div style={{ fontWeight: 900, fontSize: '1.3rem', color: isDark ? '#ffd54f' : '#b45309' }}>
                {isAr
                  ? top1.profile?.full_name_ar || top1.profile?.full_name_en
                  : top1.profile?.full_name_en || top1.profile?.full_name_ar}
              </div>
              <div style={{ fontSize: '0.9rem', color: isDark ? '#ccc' : '#555', marginTop: '0.25rem' }}>
                {isAr ? top1.membership?.committees?.name_ar : top1.membership?.committees?.name_en}
              </div>
              <div
                style={{
                  marginTop: '1.25rem',
                  fontWeight: 900,
                  fontSize: '1.75rem',
                  color: isDark ? '#ffd54f' : '#b45309',
                }}
              >
                {top1.total} pts
              </div>
            </div>
          )}

          {/* 3rd Place (Bronze) */}
          {top3 && (
            <div
              className="glass-panel"
              style={{
                borderRadius: '20px',
                padding: '1.75rem',
                textAlign: 'center',
                border: '1px solid rgba(205, 127, 50, 0.4)',
                background: isDark
                  ? 'linear-gradient(180deg, rgba(205, 127, 50, 0.12), rgba(20, 22, 30, 0.9))'
                  : '#ffffff',
                boxShadow: '0 15px 35px rgba(0,0,0,0.06)',
                order: dir === 'rtl' ? 3 : 3,
              }}
            >
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #d97706, #b45309)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.25rem',
                  margin: '0 auto 1rem',
                  boxShadow: '0 4px 15px rgba(180, 83, 9, 0.4)',
                }}
              >
                3
              </div>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', color: isDark ? '#fff' : '#111' }}>
                {isAr
                  ? top3.profile?.full_name_ar || top3.profile?.full_name_en
                  : top3.profile?.full_name_en || top3.profile?.full_name_ar}
              </div>
              <div style={{ fontSize: '0.85rem', color: isDark ? '#aaa' : '#666', marginTop: '0.25rem' }}>
                {isAr ? top3.membership?.committees?.name_ar : top3.membership?.committees?.name_en}
              </div>
              <div
                style={{
                  marginTop: '1rem',
                  fontWeight: 900,
                  fontSize: '1.4rem',
                  color: '#d97706',
                }}
              >
                {top3.total} pts
              </div>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard Full Table */}
      <div
        className="glass-panel gold-border-glow"
        dir={dir}
        style={{
          borderRadius: '20px',
          padding: '1.5rem',
          background: isDark ? 'rgba(22, 24, 34, 0.85)' : '#ffffff',
        }}
      >
        <div style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
            {isAr ? 'الترتيب العام الشامل' : 'Full Standings'}
          </h3>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: isDark ? '#aaa' : '#666' }}>
            {isAr
              ? 'يتم احتساب الرصيد تلقائياً من سجل القيود والمكافآت والخصومات'
              : 'Totals are maintained continuously from the verified append-only ledger'}
          </p>
        </div>

        <DataTable
          columns={[
            {
              key: 'rank',
              header: '#',
              render: (row) => (
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background:
                      row.rank === 1
                        ? '#ffd54f'
                        : row.rank === 2
                        ? '#9ca3af'
                        : row.rank === 3
                        ? '#d97706'
                        : isDark
                        ? 'rgba(255,255,255,0.06)'
                        : '#f3f4f6',
                    color: row.rank <= 3 ? '#000' : isDark ? '#fff' : '#111',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                  }}
                >
                  {row.rank}
                </div>
              ),
            },
            {
              key: 'member',
              header: isAr ? 'العضو' : 'Member',
              render: (row) => {
                const name = isAr
                  ? row.profile?.full_name_ar || row.profile?.full_name_en
                  : row.profile?.full_name_en || row.profile?.full_name_ar;
                const isMe = row.user_id === user?.id;

                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        background: 'rgba(255, 184, 0, 0.15)',
                        border: '1px solid rgba(255, 184, 0, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {row.profile?.avatar_url ? (
                        <img
                          src={row.profile.avatar_url}
                          alt={name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <User size={18} color="#ffb800" />
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: isMe ? '#ffb800' : isDark ? '#fff' : '#111' }}>
                        {name} {isMe && <span style={{ fontSize: '0.75rem', color: '#ffb800' }}>({isAr ? 'أنت' : 'You'})</span>}
                      </div>
                      {row.membership?.position && (
                        <div style={{ fontSize: '0.75rem', color: isDark ? '#aaa' : '#666' }}>
                          <StatusBadge status={row.membership.position} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              },
            },
            {
              key: 'committee',
              header: isAr ? 'اللجنة' : 'Committee',
              render: (row) => (
                <StatusBadge
                  label={
                    row.membership?.committees
                      ? isAr ? row.membership.committees.name_ar : row.membership.committees.name_en
                      : isAr ? 'غير محدد' : 'Unassigned'
                  }
                  color={row.membership?.committees?.color}
                />
              ),
            },
            {
              key: 'total',
              header: isAr ? 'إجمالي النقاط' : 'Total Score',
              render: (row) => (
                <div style={{ fontWeight: 900, fontSize: '1.15rem', color: isDark ? '#ffd54f' : '#b45309' }}>
                  {row.total} pts
                </div>
              ),
            },
          ]}
          data={rankedLeaderboard}
          isLoading={loadingScores}
          emptyMessage={isAr ? 'لا توجد بيانات مسجلة في لوحة المتصدرين لهذا الموسم' : 'No standings for this season yet'}
        />
      </div>
    </div>
  );
}

