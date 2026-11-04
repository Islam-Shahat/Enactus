// src/components/dashboard/media/PartnerDeliverablesTab.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useLanguage } from '../../../context/LanguageContext';
import {
  DELIVERABLE_KINDS,
  calculateDeliverableProgress,
} from '../../../lib/businessHelpers';

export default function PartnerDeliverablesTab() {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  const [selectedCompanyId, setSelectedCompanyId] = useState('all');

  // Fetch companies having deliverables
  const { data: companies = [], isLoading: loadingCompanies } = useQuery({
    queryKey: ['partner_companies_deliverables'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          id,
          name_ar,
          name_en,
          industry,
          stage
        `)
        .order('name_ar');
      if (error) return [];
      return data || [];
    },
  });

  // Fetch all deliverables joined with progress & fulfilling published posts
  const { data: deliverables = [], isLoading: loadingDeliverables } = useQuery({
    queryKey: ['partner_deliverables_all', selectedCompanyId],
    queryFn: async () => {
      let q = supabase
        .from('deliverables')
        .select(`
          id,
          agreement_id,
          company_id,
          kind,
          title,
          required_count,
          due_date,
          created_at,
          company:company_id (id, name_ar, name_en),
          agreements:agreement_id (id, title, total_value),
          post_deliverables (
            post:post_id (
              id,
              title,
              platform,
              status,
              published_at,
              post_url
            )
          )
        `)
        .order('due_date', { ascending: true });

      if (selectedCompanyId !== 'all') {
        q = q.eq('company_id', selectedCompanyId);
      }

      const { data: delivRows, error: dErr } = await q;
      if (dErr) throw dErr;

      // Query deliverable_progress view
      const { data: progressRows } = await supabase
        .from('deliverable_progress')
        .select('*');

      const progressMap = (progressRows || []).reduce((acc, r) => {
        acc[r.deliverable_id] = r.done_count || 0;
        return acc;
      }, {});

      return (delivRows || []).map((d) => ({
        ...d,
        done_count: progressMap[d.id] ?? 0,
      }));
    },
  });

  // Group deliverables by company
  const companyGroups = React.useMemo(() => {
    const map = {};
    deliverables.forEach((d) => {
      const cId = d.company_id || 'unknown';
      if (!map[cId]) {
        map[cId] = {
          company: d.company,
          items: [],
        };
      }
      map[cId].items.push(d);
    });
    return Object.values(map);
  }, [deliverables]);

  const todayStr = new Date().toISOString().split('T')[0];
  const isLoading = loadingCompanies || loadingDeliverables;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Filter by Partner Company */}
      <div
        className="glass-panel"
        style={{
          padding: '1rem 1.25rem',
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Building2 size={18} color="#ffb800" />
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
            {isAr ? 'تصفية حسب الشريك الراعي:' : 'Filter by Partner:'}
          </span>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="dashboard-input"
            style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}
          >
            <option value="all">{isAr ? '-- جميع الشركاء --' : '-- All Partners --'}</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {isAr ? c.name_ar : c.name_en || c.name_ar}
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: '0.85rem', color: '#ffd54f', fontWeight: 600 }}>
          {deliverables.length} {isAr ? 'التزام تعاقدي' : 'contractual deliverables'}
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#ffb800' }}>
          {isAr ? 'جاري تحميل نسب إنجاز التزامات الشركاء...' : 'Loading partner deliverable progress...'}
        </div>
      ) : companyGroups.length === 0 ? (
        <div
          style={{
            padding: '3rem',
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '16px',
            color: '#88889a',
          }}
        >
          {isAr ? 'لا توجد التزامات مسجلة للشركاء.' : 'No partner deliverables recorded yet.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {companyGroups.map((group) => {
            const compName = group.company
              ? isAr
                ? group.company.name_ar
                : group.company.name_en || group.company.name_ar
              : isAr
              ? 'شريك عام'
              : 'Partner';

            // Aggregate progress for this company
            let compDone = 0;
            let compReq = 0;
            group.items.forEach((item) => {
              compDone += item.done_count || 0;
              compReq += item.required_count || 1;
            });
            const compPercent = Math.min(100, Math.round((compDone / compReq) * 100));

            return (
              <div
                key={group.company?.id || Math.random()}
                className="glass-panel"
                style={{
                  padding: '1.5rem',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 184, 0, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                }}
              >
                {/* Company Header with Total Progress */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'rgba(255, 184, 0, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffb800',
                      }}
                    >
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                        {compName}
                      </h3>
                      {group.company?.industry && (
                        <span style={{ fontSize: '0.78rem', color: '#a0a0b2' }}>{group.company.industry}</span>
                      )}
                    </div>
                  </div>

                  {/* Company summary pill */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.85rem', color: '#c5c5d6' }}>
                      {isAr ? 'الإنجاز الكلي للراعي:' : 'Overall:'}{' '}
                      <strong style={{ color: compPercent === 100 ? '#34d399' : '#ffd54f' }}>
                        {compDone} / {compReq} ({compPercent}%)
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Deliverables List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {group.items.map((item) => {
                    const prog = calculateDeliverableProgress(item.done_count, item.required_count);
                    const isOverdue = !prog.isComplete && item.due_date && item.due_date < todayStr;
                    const publishedPosts = (item.post_deliverables || [])
                      .map((pd) => pd.post)
                      .filter((p) => p && p.status === 'published');

                    return (
                      <div
                        key={item.id}
                        className="glass-panel"
                        style={{
                          padding: '1rem 1.25rem',
                          borderRadius: '12px',
                          border: isOverdue
                            ? '1px solid rgba(239, 68, 68, 0.4)'
                            : prog.isComplete
                            ? '1px solid rgba(16, 185, 129, 0.35)'
                            : '1px solid rgba(255, 255, 255, 0.06)',
                          background: isOverdue
                            ? 'rgba(239, 68, 68, 0.04)'
                            : 'rgba(255, 255, 255, 0.02)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.6rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span
                              style={{
                                padding: '0.2rem 0.6rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: 'rgba(255, 184, 0, 0.15)',
                                color: '#ffb800',
                              }}
                            >
                              {DELIVERABLE_KINDS[item.kind]?.[lang] || item.kind}
                            </span>
                            <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.92rem' }}>
                              {item.title || DELIVERABLE_KINDS[item.kind]?.[lang] || item.kind}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            {isOverdue && (
                              <span
                                style={{
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: '999px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  background: 'rgba(239, 68, 68, 0.2)',
                                  color: '#f87171',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                }}
                              >
                                <AlertTriangle size={12} />
                                {isAr ? 'متأخر عن الموعد' : 'Overdue'}
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: '0.9rem',
                                fontWeight: 900,
                                color: prog.isComplete ? '#34d399' : '#ffd54f',
                              }}
                            >
                              {prog.done} / {prog.required}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div
                          style={{
                            width: '100%',
                            height: '7px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            borderRadius: '999px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${prog.percentage}%`,
                              height: '100%',
                              background: prog.isComplete
                                ? 'linear-gradient(90deg, #10b981, #34d399)'
                                : isOverdue
                                ? 'linear-gradient(90deg, #ef4444, #f87171)'
                                : 'linear-gradient(90deg, #f59e0b, #ffb800)',
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>

                        {item.due_date && (
                          <div style={{ fontSize: '0.75rem', color: '#88889a', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Calendar size={12} />
                            <span>{isAr ? 'الموعد المحدد: ' : 'Target Due: '}{item.due_date}</span>
                          </div>
                        )}

                        {/* List of Published Posts that Count */}
                        {publishedPosts.length > 0 && (
                          <div style={{ marginTop: '0.4rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <span style={{ fontSize: '0.75rem', color: '#c5c5d6', fontWeight: 600 }}>
                              {isAr ? 'المنشورات المنفذة المحسوبة تلقائياً:' : 'Fulfilling Published Posts:'}
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.35rem' }}>
                              {publishedPosts.map((p) => (
                                <div
                                  key={p.id}
                                  style={{
                                    fontSize: '0.78rem',
                                    color: '#60a5fa',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                  }}
                                >
                                  <CheckCircle2 size={13} color="#34d399" />
                                  <span>{p.title} ({p.platform})</span>
                                  {p.published_at && (
                                    <span style={{ color: '#88889a', fontSize: '0.72rem' }}>
                                      • {new Date(p.published_at).toLocaleDateString()}
                                    </span>
                                  )}
                                  {p.post_url && (
                                    <a
                                      href={p.post_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{ color: '#ffd54f', display: 'inline-flex', alignItems: 'center' }}
                                    >
                                      <ExternalLink size={12} />
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

