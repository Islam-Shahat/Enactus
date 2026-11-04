// src/pages/dashboard/SiteCmsPage.jsx
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Globe, Plus, Search, Eye, EyeOff, ArrowUp, ArrowDown, 
  Edit3, Trash2, ExternalLink, Sparkles, AlertCircle, 
  CheckCircle2, RefreshCw, Loader2, FileText, Settings, 
  HelpCircle, Image as ImageIcon, Users, Briefcase, Award
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import Skeleton from '../../components/dashboard/Skeleton';
import EmptyState from '../../components/dashboard/EmptyState';
import ConfirmDialog from '../../components/dashboard/ConfirmDialog';
import CmsItemDrawer from '../../components/dashboard/cms/CmsItemDrawer';
import { 
  CMS_TABS, getVisibleTabs, swapSortOrder, 
  getPreviewUrl 
} from '../../lib/cmsHelpers';

export default function SiteCmsPage() {
  const { user, userRoles = [], isSuperAdmin } = useAuth();
  const { lang, dir } = useLanguage();
  const isAr = lang === 'ar';
  const queryClient = useQueryClient();

  const visibleTabs = getVisibleTabs(userRoles, isSuperAdmin);
  const [activeTabKey, setActiveTabKey] = useState(visibleTabs[0]?.key || 'stats');

  const [search, setSearch] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleteItemConfirm, setDeleteItemConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. Fetch Committees for reference
  const { data: allCommittees = [] } = useQuery({
    queryKey: ['committees-cms-ref'],
    queryFn: async () => {
      const { data } = await supabase.from('committees').select('*').order('name_ar');
      return data || [];
    },
  });

  // 2. Fetch Active Tab Items
  const {
    data: items = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['cms-items', activeTabKey],
    enabled: Boolean(activeTabKey),
    queryFn: async () => {
      switch (activeTabKey) {
        case 'stats':
          return (await supabase.from('site_stats').select('*').order('sort_order', { ascending: true })).data || [];
        case 'partners':
          return (await supabase.from('partners').select('*').order('sort_order', { ascending: true })).data || [];
        case 'team':
          return (await supabase.from('team_public').select('*').order('sort_order', { ascending: true })).data || [];
        case 'committees':
          return (await supabase.from('committees').select('*').order('sort_order', { ascending: true })).data || [];
        case 'news':
          return (await supabase.from('news_posts').select('*').order('published_at', { ascending: false })).data || [];
        case 'gallery':
          return (await supabase.from('gallery_items').select('*').order('sort_order', { ascending: true })).data || [];
        case 'faqs':
          return (await supabase.from('faqs').select('*').order('sort_order', { ascending: true })).data || [];
        case 'packages':
          return (await supabase.from('sponsorship_packages').select('*').order('sort_order', { ascending: true })).data || [];
        case 'content':
          return (await supabase.from('site_content').select('*').order('key', { ascending: true })).data || [];
        case 'settings':
          return (await supabase.from('settings').select('*')).data || [];
        default:
          return [];
      }
    },
  });

  // Invalidate matching React Query keys after any CMS mutation
  function invalidateCmsCaches(tab) {
    queryClient.invalidateQueries(['cms-items', tab]);
    switch (tab) {
      case 'stats':
        queryClient.invalidateQueries({ queryKey: ['stats'] });
        break;
      case 'partners':
        queryClient.invalidateQueries({ queryKey: ['partners'] });
        break;
      case 'team':
        queryClient.invalidateQueries({ queryKey: ['board'] });
        queryClient.invalidateQueries({ queryKey: ['alumni'] });
        break;
      case 'committees':
        queryClient.invalidateQueries({ queryKey: ['committees'] });
        break;
      case 'news':
        queryClient.invalidateQueries({ queryKey: ['news'] });
        break;
      case 'gallery':
        queryClient.invalidateQueries({ queryKey: ['gallery'] });
        break;
      case 'faqs':
        queryClient.invalidateQueries({ queryKey: ['faqs'] });
        break;
      case 'packages':
        queryClient.invalidateQueries({ queryKey: ['tiers'] });
        break;
      case 'content':
        queryClient.invalidateQueries({ queryKey: ['site_content'] });
        break;
      case 'settings':
        queryClient.invalidateQueries({ queryKey: ['applications-open'] });
        break;
      default:
        break;
    }
  }

  // Handle Visibility Toggle
  async function handleToggleVisibility(item) {
    const isNews = activeTabKey === 'news';
    const currentVal = isNews ? item.is_published : item.is_visible;
    const nextVal = !currentVal;

    const tableName = getTableName(activeTabKey);
    if (!tableName) return;

    try {
      const updatePayload = isNews ? { is_published: nextVal } : { is_visible: nextVal };
      const { error } = await supabase.from(tableName).update(updatePayload).eq('id', item.id);
      if (error) throw error;

      invalidateCmsCaches(activeTabKey);
      refetch();
    } catch (err) {
      alert('فشل تحديث الظهور: ' + err.message);
    }
  }

  // Handle Sort Order Reorder (Move Up / Down)
  async function handleMove(index, direction) {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const currentItem = items[index];
    const targetItem = items[targetIndex];

    const [updatedCurrent, updatedTarget] = swapSortOrder(currentItem, targetItem);
    const tableName = getTableName(activeTabKey);
    if (!tableName) return;

    try {
      await Promise.all([
        supabase.from(tableName).update({ sort_order: updatedCurrent.sort_order }).eq('id', currentItem.id),
        supabase.from(tableName).update({ sort_order: updatedTarget.sort_order }).eq('id', targetItem.id),
      ]);

      invalidateCmsCaches(activeTabKey);
      refetch();
    } catch (err) {
      alert('فشل تغيير الترتيب: ' + err.message);
    }
  }

  // Handle Delete
  async function handleDeleteConfirm() {
    if (!deleteItemConfirm) return;
    setIsDeleting(true);
    const tableName = getTableName(activeTabKey);

    try {
      let query = supabase.from(tableName).delete();
      if (activeTabKey === 'content') {
        query = query.eq('key', deleteItemConfirm.key).eq('locale', deleteItemConfirm.locale);
      } else {
        query = query.eq('id', deleteItemConfirm.id);
      }

      const { error } = await query;
      if (error) throw error;

      invalidateCmsCaches(activeTabKey);
      refetch();
    } catch (err) {
      alert('فشل الحذف: ' + err.message);
    } finally {
      setIsDeleting(false);
      setDeleteItemConfirm(null);
    }
  }

  function getTableName(tab) {
    switch (tab) {
      case 'stats': return 'site_stats';
      case 'partners': return 'partners';
      case 'team': return 'team_public';
      case 'committees': return 'committees';
      case 'news': return 'news_posts';
      case 'gallery': return 'gallery_items';
      case 'faqs': return 'faqs';
      case 'packages': return 'sponsorship_packages';
      case 'content': return 'site_content';
      case 'settings': return 'settings';
      default: return null;
    }
  }

  // Filtered Items by Search
  const filteredItems = items.filter((it) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const str = JSON.stringify(it).toLowerCase();
    return str.includes(q);
  });

  if (visibleTabs.length === 0) {
    return (
      <div style={{ maxWidth: '800px', margin: '4rem auto', textAlign: 'center' }}>
        <AlertCircle size={48} color="#f87171" style={{ marginBottom: '1rem' }} />
        <h2 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 800 }}>لا توجد صلاحيات لعرض هذه الصفحة</h2>
        <p style={{ color: '#a0a0b2' }}>يرجى التواصل مع إدارة النظام لمنحك الصلاحيات المناسبة لتعديل محتوى الموقع.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '2rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 900, color: '#fff', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Globe size={28} color="#ffb800" />
            <span>إدارة محتوى الموقع (Site CMS)</span>
          </h1>
          <p style={{ color: '#a0a0b2', fontSize: '0.92rem', margin: 0 }}>
            تحديث وتعديل المحتوى المعروض على موقع إيناكتس العام مباشرة دون الحاجة لأي تعديل برمجي.
          </p>
        </div>

        {activeTabKey !== 'settings' && (
          <button
            type="button"
            onClick={() => {
              setSelectedItem(null);
              setIsDrawerOpen(true);
            }}
            className="btn-primary"
            style={{
              padding: '0.65rem 1.25rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.92rem',
              fontWeight: 800,
            }}
          >
            <Plus size={18} />
            <span>إضافة عنصر جديد</span>
          </button>
        )}
      </div>

      {/* Tabs Row */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          marginBottom: '1.75rem',
          overflowX: 'auto',
          paddingBottom: '0.25rem',
        }}
      >
        {visibleTabs.map((tab) => {
          const isActive = activeTabKey === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTabKey(tab.key);
                setSearch('');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.65rem 1.1rem',
                border: 'none',
                background: isActive ? 'rgba(255, 184, 0, 0.15)' : 'transparent',
                color: isActive ? '#ffd54f' : '#a0a0b2',
                borderBottom: isActive ? '2px solid #ffb800' : '2px solid transparent',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontWeight: isActive ? 800 : 600,
                fontSize: '0.9rem',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              <span>{isAr ? tab.label_ar : tab.label_en}</span>
            </button>
          );
        })}
      </div>

      {/* Search & Stats Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '0.85rem 1.25rem',
          borderRadius: '14px',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث في محتويات هذا القسم..."
            style={{
              width: '100%',
              padding: '0.6rem 1rem 0.6rem 2.4rem',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 184, 0, 0.2)',
              color: '#fff',
              fontSize: '0.88rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <Search size={16} color="#888" style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        <div style={{ color: '#888', fontSize: '0.85rem' }}>
          عدد العناصر: <strong style={{ color: '#ffd54f' }}>{filteredItems.length}</strong>
        </div>
      </div>

      {/* Content Table / List */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1, 2, 3, 4].map((n) => (
            <Skeleton key={n} height="65px" borderRadius="12px" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="لا توجد عناصر مضافة"
          description="لم يتم العثور على أي عناصر في هذا القسم حتى الآن."
          actionText={activeTabKey !== 'settings' ? 'إضافة عنصر جديد' : undefined}
          onAction={() => {
            setSelectedItem(null);
            setIsDrawerOpen(true);
          }}
        />
      ) : (
        <div
          style={{
            borderRadius: '14px',
            border: '1px solid rgba(255, 184, 0, 0.18)',
            overflow: 'hidden',
            background: 'rgba(0, 0, 0, 0.3)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 184, 0, 0.1)', color: '#ffd54f', textAlign: 'right' }}>
                <th style={{ padding: '0.85rem 1rem', width: '90px', textAlign: 'center' }}>الترتيب</th>
                <th style={{ padding: '0.85rem 1rem' }}>العنوان / الاسم</th>
                <th style={{ padding: '0.85rem 1rem' }}>التفاصيل / المفتاح</th>
                <th style={{ padding: '0.85rem 1rem', width: '110px', textAlign: 'center' }}>الظهور</th>
                <th style={{ padding: '0.85rem 1rem', width: '160px', textAlign: 'center' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((it, idx) => {
                const previewUrl = getPreviewUrl(activeTabKey, it);
                const title = it.name_ar || it.title_ar || it.label_ar || it.question_ar || it.key;
                const titleEn = it.name_en || it.title_en || it.label_en || it.question_en;
                const isVis = activeTabKey === 'news' ? it.is_published : it.is_visible;

                return (
                  <tr
                    key={it.id || `${it.key}-${it.locale}` || idx}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'background 0.15s',
                    }}
                  >
                    {/* Sort Order & Arrows */}
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      {it.sort_order !== undefined && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                          <button
                            type="button"
                            onClick={() => handleMove(idx, 'up')}
                            disabled={idx === 0}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: idx === 0 ? '#444' : '#ffd54f',
                              cursor: idx === 0 ? 'not-allowed' : 'pointer',
                              padding: '2px',
                            }}
                          >
                            <ArrowUp size={14} />
                          </button>
                          <span style={{ fontSize: '0.8rem', color: '#888', minWidth: '18px' }}>
                            {it.sort_order}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleMove(idx, 'down')}
                            disabled={idx === filteredItems.length - 1}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: idx === filteredItems.length - 1 ? '#444' : '#ffd54f',
                              cursor: idx === filteredItems.length - 1 ? 'not-allowed' : 'pointer',
                              padding: '2px',
                            }}
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Title & Preview Image */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {(it.logo_url || it.photo_url || it.cover_url || it.media_url) && (
                          <div style={{ width: '38px', height: '38px', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,184,0,0.2)', flexShrink: 0 }}>
                            <img
                              src={it.logo_url || it.photo_url || it.cover_url || it.media_url}
                              alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                        )}
                        <div>
                          <div style={{ color: '#fff', fontWeight: 700 }}>{title}</div>
                          {titleEn && <div style={{ fontSize: '0.78rem', color: '#ffd54f' }}>{titleEn}</div>}
                        </div>
                      </div>
                    </td>

                    {/* Details / Tag / Category */}
                    <td style={{ padding: '0.75rem 1rem', color: '#a0a0b2', fontSize: '0.85rem' }}>
                      {it.kind && (
                        <span style={{ display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: '#ffd54f', fontSize: '0.75rem', marginInlineEnd: '0.5rem' }}>
                          {it.kind}
                        </span>
                      )}
                      {it.tier && (
                        <span style={{ display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255,184,0,0.1)', color: '#ffd54f', fontSize: '0.75rem', marginInlineEnd: '0.5rem' }}>
                          {it.tier}
                        </span>
                      )}
                      {it.slug && <span style={{ fontFamily: 'monospace', color: '#888' }}>/{it.slug}</span>}
                      {it.value !== undefined && <span style={{ fontWeight: 700, color: '#4ade80' }}>{it.value} {it.suffix || ''}</span>}
                      {it.locale && <span style={{ textTransform: 'uppercase', color: '#ffd54f' }}>[{it.locale}]</span>}
                    </td>

                    {/* Show/Hide Toggle */}
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      {isVis !== undefined ? (
                        <button
                          type="button"
                          onClick={() => handleToggleVisibility(it)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: isVis ? '#4ade80' : '#888',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.78rem',
                          }}
                          title={isVis ? 'ظاهر للعامة (اضغط للإخفاء)' : 'مخفي (اضغط للظهور)'}
                        >
                          {isVis ? <Eye size={18} /> : <EyeOff size={18} />}
                        </button>
                      ) : (
                        <span style={{ color: '#666' }}>-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
                        {previewUrl && (
                          <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary"
                            style={{ padding: '0.35rem 0.55rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center' }}
                            title="معاينة في الموقع"
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItem(it);
                            setIsDrawerOpen(true);
                          }}
                          className="btn-secondary"
                          style={{ padding: '0.35rem 0.55rem', fontSize: '0.78rem' }}
                          title="تعديل"
                        >
                          <Edit3 size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteItemConfirm(it)}
                          style={{
                            padding: '0.35rem 0.55rem',
                            fontSize: '0.78rem',
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#f87171',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                          }}
                          title="حذف"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Item Drawer */}
      <CmsItemDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        tabKey={activeTabKey}
        item={selectedItem}
        allCommittees={allCommittees}
        onSaved={() => {
          invalidateCmsCaches(activeTabKey);
          refetch();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteItemConfirm)}
        title="تأكيد حذف العنصر"
        message={`هل أنت متأكد من رغبتك في حذف هذا العنصر نهائياً من الموقع العام؟`}
        confirmText="نعم، حذف نهائي"
        cancelText="تراجع"
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteItemConfirm(null)}
      />
    </div>
  );
}

