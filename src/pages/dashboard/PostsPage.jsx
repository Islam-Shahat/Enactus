// src/pages/dashboard/PostsPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar as CalendarIcon,
  LayoutGrid,
  Building2,
  FolderOpen,
  Plus,
  Search,
  Filter,
  Megaphone,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import ContentCalendar from '../../components/dashboard/media/ContentCalendar';
import MediaLibraryTab from '../../components/dashboard/media/MediaLibraryTab';
import PartnerDeliverablesTab from '../../components/dashboard/media/PartnerDeliverablesTab';
import PostDrawer from '../../components/dashboard/media/PostDrawer';
import {
  POST_PLATFORMS,
  POST_STATUSES,
} from '../../lib/mediaHelpers';

export default function PostsPage() {
  const { user, isSuperAdmin, hasRole } = useAuth();
  const { lang, dir } = useLanguage();
  const isAr = lang === 'ar';

  const canCreate = isSuperAdmin || hasRole(['media_admin', 'president', 'vice_president', 'pr_admin', 'committee_head']) || hasRole('member');

  // Active Tab: 'calendar' | 'kanban' | 'partners' | 'library'
  const [activeTab, setActiveTab] = useState('calendar');

  // Filters
  const [platformFilter, setPlatformFilter] = useState('all');
  const [committeeFilter, setCommitteeFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Drawer state
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerInitialDate, setDrawerInitialDate] = useState(null);

  // Fetch committees for filter
  const { data: committees = [] } = useQuery({
    queryKey: ['committees', 'filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('committees')
        .select('id, name_ar, name_en, is_media_team')
        .order('name_ar');
      if (error) return [];
      return data || [];
    },
  });

  // Fetch posts
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts', 'all_content', platformFilter, committeeFilter, search],
    queryFn: async () => {
      let q = supabase
        .from('posts')
        .select(`
          id,
          season_id,
          committee_id,
          platform,
          title,
          caption,
          media_paths,
          scheduled_at,
          published_at,
          post_url,
          status,
          created_by,
          approved_by,
          created_at,
          committee:committee_id (id, name_ar, name_en),
          creator:created_by (id, full_name_ar, full_name_en)
        `)
        .order('created_at', { ascending: false });

      if (platformFilter !== 'all') {
        q = q.eq('platform', platformFilter);
      }

      if (committeeFilter !== 'all') {
        q = q.eq('committee_id', committeeFilter);
      }

      if (search.trim()) {
        q = q.or(`title.ilike.%${search.trim()}%,caption.ilike.%${search.trim()}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Grouping for Kanban Board
  const kanbanGroups = React.useMemo(() => {
    const groups = {};
    POST_STATUSES.forEach((st) => {
      groups[st.key] = [];
    });
    posts.forEach((p) => {
      if (groups[p.status]) {
        groups[p.status].push(p);
      } else if (groups.draft) {
        groups.draft.push(p);
      }
    });
    return groups;
  }, [posts]);

  const handleOpenCreate = (dateStr = null) => {
    setSelectedPostId(null);
    setDrawerInitialDate(dateStr);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (postId) => {
    setSelectedPostId(postId);
    setDrawerInitialDate(null);
    setIsDrawerOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 900, color: '#fff' }}>
            {isAr ? 'المحتوى الإعلامي وجدولة المنشورات' : 'Content Hub & Media Workflow'}
          </h1>
          <p style={{ color: '#a0a0b2', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            {isAr
              ? 'تقويم النشر، اعتماد التصميمات، تتبع التزامات الرعاة، ومكتبة الميديا'
              : 'Content calendar, approval workflows, partner deliverables, and media library'}
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={() => handleOpenCreate(null)}
            className="btn-primary"
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '10px',
              fontSize: '0.88rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            <span>{isAr ? 'منشور جديد' : 'New Post'}</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('calendar')}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            background: activeTab === 'calendar' ? 'rgba(255, 184, 0, 0.15)' : 'transparent',
            color: activeTab === 'calendar' ? '#ffb800' : '#a0a0b2',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <CalendarIcon size={16} />
          <span>{isAr ? 'تقويم النشر (Calendar)' : 'Content Calendar'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('kanban')}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            background: activeTab === 'kanban' ? 'rgba(255, 184, 0, 0.15)' : 'transparent',
            color: activeTab === 'kanban' ? '#ffb800' : '#a0a0b2',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <LayoutGrid size={16} />
          <span>{isAr ? 'لوحة المتابعة (Kanban)' : 'Kanban Workflow'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('partners')}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            background: activeTab === 'partners' ? 'rgba(255, 184, 0, 0.15)' : 'transparent',
            color: activeTab === 'partners' ? '#ffb800' : '#a0a0b2',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Building2 size={16} />
          <span>{isAr ? 'إنجاز التزامات الرعاة (Deliverables)' : 'Partner Deliverables'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('library')}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            background: activeTab === 'library' ? 'rgba(255, 184, 0, 0.15)' : 'transparent',
            color: activeTab === 'library' ? '#ffb800' : '#a0a0b2',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <FolderOpen size={16} />
          <span>{isAr ? 'مكتبة الميديا (Media Library)' : 'Media Library'}</span>
        </button>
      </div>

      {/* Filter / Search Bar (For Calendar and Kanban tabs) */}
      {(activeTab === 'calendar' || activeTab === 'kanban') && (
        <div
          className="glass-panel"
          style={{
            padding: '1rem',
            borderRadius: '14px',
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: '1 1 250px', position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
                insetInlineStart: '12px',
                color: '#88889a',
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isAr ? 'بحث في المنشورات...' : 'Search posts...'}
              className="dashboard-input"
              style={{
                width: '100%',
                padding: '0.65rem 1rem',
                paddingInlineStart: '36px',
                borderRadius: '8px',
                fontSize: '0.85rem',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="dashboard-input"
              style={{ padding: '0.65rem 0.9rem', borderRadius: '8px', fontSize: '0.85rem' }}
            >
              <option value="all">{isAr ? '-- جميع المنصات --' : '-- All Platforms --'}</option>
              {POST_PLATFORMS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label[lang] || p.label.ar}
                </option>
              ))}
            </select>

            <select
              value={committeeFilter}
              onChange={(e) => setCommitteeFilter(e.target.value)}
              className="dashboard-input"
              style={{ padding: '0.65rem 0.9rem', borderRadius: '8px', fontSize: '0.85rem' }}
            >
              <option value="all">{isAr ? '-- جميع اللجان --' : '-- All Committees --'}</option>
              {committees.map((c) => (
                <option key={c.id} value={c.id}>
                  {isAr ? c.name_ar : c.name_en || c.name_ar}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* TAB 1: CALENDAR VIEW */}
      {activeTab === 'calendar' && (
        <ContentCalendar
          posts={posts}
          onSelectPost={(pId) => handleOpenEdit(pId)}
          onCreateOnDate={(dateStr) => handleOpenCreate(dateStr)}
        />
      )}

      {/* TAB 2: KANBAN WORKFLOW */}
      {activeTab === 'kanban' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            alignItems: 'start',
            overflowX: 'auto',
            paddingBottom: '1rem',
          }}
        >
          {POST_STATUSES.map((status) => {
            const statusPosts = kanbanGroups[status.key] || [];

            return (
              <div
                key={status.key}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  minHeight: '420px',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: status.text }} />
                    <h3 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>
                      {status.label[lang] || status.label.ar}
                    </h3>
                  </div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '999px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: '#c5c5d6',
                    }}
                  >
                    {statusPosts.length}
                  </span>
                </div>

                {/* Post Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {statusPosts.length === 0 ? (
                    <div
                      style={{
                        padding: '1.5rem 0.5rem',
                        textAlign: 'center',
                        color: '#6b7280',
                        fontSize: '0.78rem',
                        border: '1px dashed rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px',
                      }}
                    >
                      {isAr ? 'لا توجد منشورات' : 'No posts'}
                    </div>
                  ) : (
                    statusPosts.map((post) => {
                      const plat = POST_PLATFORMS.find((p) => p.key === post.platform);

                      return (
                        <div
                          key={post.id}
                          onClick={() => handleOpenEdit(post.id)}
                          className="glass-panel"
                          style={{
                            padding: '0.85rem',
                            borderRadius: '10px',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.4rem',
                            transition: 'border-color 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 184, 0, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span
                              style={{
                                padding: '0.15rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                background: 'rgba(255, 184, 0, 0.15)',
                                color: plat?.color || '#ffb800',
                              }}
                            >
                              {plat?.label[lang] || plat?.label.ar || post.platform}
                            </span>
                            <ChevronRight size={14} color="#88889a" />
                          </div>

                          <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.88rem' }}>
                            {post.title}
                          </span>

                          {post.caption && (
                            <p
                              style={{
                                fontSize: '0.78rem',
                                color: '#a0a0b2',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                margin: 0,
                              }}
                            >
                              {post.caption}
                            </p>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem', fontSize: '0.75rem', color: '#88889a' }}>
                            {post.scheduled_at ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Clock size={12} color="#60a5fa" />
                                {new Date(post.scheduled_at).toLocaleDateString()}
                              </span>
                            ) : post.published_at ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#c084fc' }}>
                                <CheckCircle2 size={12} />
                                {new Date(post.published_at).toLocaleDateString()}
                              </span>
                            ) : (
                              <span>—</span>
                            )}

                            {post.creator && (
                              <span>
                                {(isAr ? post.creator.full_name_ar || post.creator.full_name_en : post.creator.full_name_en || post.creator.full_name_ar)?.split(' ')[0]}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: PARTNERS PROGRESS */}
      {activeTab === 'partners' && <PartnerDeliverablesTab />}

      {/* TAB 4: MEDIA LIBRARY */}
      {activeTab === 'library' && <MediaLibraryTab />}

      {/* Post Drawer */}
      {isDrawerOpen && (
        <PostDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          postId={selectedPostId}
          initialDate={drawerInitialDate}
        />
      )}
    </div>
  );
}

