// src/pages/dashboard/CompaniesPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  Plus,
  LayoutGrid,
  Table as TableIcon,
  Search,
  Filter,
  Globe,
  ExternalLink,
  User,
  Briefcase,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import DataTable from '../../components/dashboard/DataTable';
import StatCard from '../../components/dashboard/StatCard';
import StatusBadge from '../../components/dashboard/StatusBadge';
import EmptyState from '../../components/dashboard/EmptyState';
import CreateCompanyModal from '../../components/dashboard/business/CreateCompanyModal';
import CompanyDrawer from '../../components/dashboard/business/CompanyDrawer';
import { COMPANY_STAGES } from '../../lib/businessHelpers';

const PAGE_SIZE = 15;

export default function CompaniesPage() {
  const { user, isSuperAdmin, hasRole } = useAuth();
  const { lang, dir } = useLanguage();
  const isAr = lang === 'ar';

  const canWrite = isSuperAdmin || hasRole(['pr_admin', 'president', 'vice_president']);

  // View state: 'kanban' | 'table'
  const [viewMode, setViewMode] = useState('kanban');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Selected company for drawer
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch companies list / count
  const { data: companiesData, isLoading } = useQuery({
    queryKey: ['companies', search, stageFilter, page, viewMode],
    queryFn: async () => {
      let q = supabase
        .from('companies')
        .select(`
          id,
          name_ar,
          name_en,
          industry,
          website,
          stage,
          created_at,
          owner:owner_id (id, full_name_ar, full_name_en)
        `, { count: 'exact' });

      if (stageFilter && stageFilter !== 'all') {
        q = q.eq('stage', stageFilter);
      }

      if (search.trim()) {
        q = q.or(`name_ar.ilike.%${search.trim()}%,name_en.ilike.%${search.trim()}%,industry.ilike.%${search.trim()}%`);
      }

      q = q.order('updated_at', { ascending: false });

      if (viewMode === 'table') {
        const from = (page - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        q = q.range(from, to);
      }

      const { data, count, error } = await q;
      if (error) throw error;
      return { list: data || [], total: count || 0 };
    },
  });

  const companies = companiesData?.list || [];
  const totalCount = companiesData?.total || 0;

  // Grouping for Kanban columns
  const kanbanGroups = React.useMemo(() => {
    const groups = {};
    COMPANY_STAGES.forEach((s) => {
      groups[s.key] = [];
    });
    companies.forEach((comp) => {
      if (groups[comp.stage]) {
        groups[comp.stage].push(comp);
      } else if (groups.lead) {
        groups.lead.push(comp);
      }
    });
    return groups;
  }, [companies]);

  const tableColumns = [
    {
      key: 'name_ar',
      label: isAr ? 'اسم الشركة' : 'Company Name',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 700, color: '#fff' }}>{row.name_ar}</div>
          {row.name_en && (
            <div style={{ fontSize: '0.8rem', color: '#a0a0b2' }}>{row.name_en}</div>
          )}
        </div>
      ),
    },
    {
      key: 'industry',
      label: isAr ? 'المجال' : 'Industry',
      render: (row) => row.industry || '—',
    },
    {
      key: 'stage',
      label: isAr ? 'المرحلة' : 'Stage',
      render: (row) => {
        const st = COMPANY_STAGES.find((s) => s.key === row.stage);
        return (
          <span
            style={{
              padding: '0.25rem 0.65rem',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: st?.color || 'rgba(255, 255, 255, 0.1)',
              color: st?.text || '#fff',
            }}
          >
            {st?.label[lang] || st?.label.ar || row.stage}
          </span>
        );
      },
    },
    {
      key: 'owner',
      label: isAr ? 'مسؤول المتابعة' : 'Owner',
      render: (row) =>
        row.owner
          ? isAr
            ? row.owner.full_name_ar || row.owner.full_name_en
            : row.owner.full_name_en || row.owner.full_name_ar
          : '—',
    },
    {
      key: 'website',
      label: isAr ? 'الموقع' : 'Website',
      render: (row) =>
        row.website ? (
          <a
            href={row.website.startsWith('http') ? row.website : `https://${row.website}`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{ color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          >
            <Globe size={13} />
            <span style={{ fontSize: '0.8rem' }}>{isAr ? 'زيارة' : 'Visit'}</span>
          </a>
        ) : (
          '—'
        ),
    },
    {
      key: 'actions',
      label: isAr ? 'التفاصيل' : 'Details',
      align: 'right',
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedCompanyId(row.id)}
          className="btn-secondary"
          style={{
            padding: '0.3rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
        >
          {isAr ? 'عرض' : 'View'}
        </button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2.5rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 900, color: '#fff' }}>
            {isAr ? 'إدارة الشركات والرعاة' : 'Companies & Partnerships'}
          </h1>
          <p style={{ color: '#a0a0b2', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            {isAr
              ? 'متابعة مسار العلاقات العامة والشركات من مرحلة التواصل حتى التوقيع'
              : 'PR pipeline management from lead to signed & delivered'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* View Mode Toggle */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '0.25rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'kanban' ? 'rgba(255, 184, 0, 0.2)' : 'transparent',
                color: viewMode === 'kanban' ? '#ffb800' : '#a0a0b2',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              <LayoutGrid size={15} />
              <span>{isAr ? 'لوحة المسار (كانبان)' : 'Kanban'}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'table' ? 'rgba(255, 184, 0, 0.2)' : 'transparent',
                color: viewMode === 'table' ? '#ffb800' : '#a0a0b2',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              <TableIcon size={15} />
              <span>{isAr ? 'جدول' : 'Table'}</span>
            </button>
          </div>

          {canWrite && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
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
              <span>{isAr ? 'إضافة شركة' : 'Add Company'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
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
            placeholder={isAr ? 'بحث باسم الشركة أو مجال العمل...' : 'Search company name or industry...'}
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

        {viewMode === 'table' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} color="#ffd54f" />
            <select
              value={stageFilter}
              onChange={(e) => {
                setStageFilter(e.target.value);
                setPage(1);
              }}
              className="dashboard-input"
              style={{ padding: '0.65rem 1rem', borderRadius: '8px', fontSize: '0.85rem' }}
            >
              <option value="all">{isAr ? '-- جميع المراحل --' : '-- All Stages --'}</option>
              {COMPANY_STAGES.map((st) => (
                <option key={st.key} value={st.key}>
                  {st.label[lang] || st.label.ar}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* VIEW: KANBAN PIPELINE */}
      {viewMode === 'kanban' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
            alignItems: 'start',
            overflowX: 'auto',
            paddingBottom: '1rem',
          }}
        >
          {COMPANY_STAGES.map((stage) => {
            const stageCompanies = kanbanGroups[stage.key] || [];

            return (
              <div
                key={stage.key}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  minHeight: '400px',
                }}
              >
                {/* Column Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: stage.text,
                      }}
                    />
                    <h3 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>
                      {stage.label[lang] || stage.label.ar}
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
                    {stageCompanies.length}
                  </span>
                </div>

                {/* Company Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {stageCompanies.length === 0 ? (
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
                      {isAr ? 'لا توجد شركات' : 'No companies'}
                    </div>
                  ) : (
                    stageCompanies.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => setSelectedCompanyId(c.id)}
                        className="glass-panel"
                        style={{
                          padding: '0.9rem',
                          borderRadius: '10px',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.4rem',
                          transition: 'transform 0.15s ease, border-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255, 184, 0, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem' }}>
                            {c.name_ar}
                          </span>
                          <ChevronRight size={14} color="#88889a" />
                        </div>

                        {c.name_en && (
                          <div style={{ fontSize: '0.75rem', color: '#a0a0b2' }}>{c.name_en}</div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem', fontSize: '0.75rem', color: '#88889a' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Briefcase size={12} color="#ffb800" />
                            {c.industry || (isAr ? 'عام' : 'General')}
                          </span>

                          {c.owner && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#c5c5d6' }}>
                              <User size={12} />
                              {(isAr ? c.owner.full_name_ar || c.owner.full_name_en : c.owner.full_name_en || c.owner.full_name_ar)?.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VIEW: TABLE */
        <DataTable
          columns={tableColumns}
          data={companies}
          isLoading={isLoading}
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={totalCount}
          onPageChange={(p) => setPage(p)}
          onRowClick={(row) => setSelectedCompanyId(row.id)}
          emptyMessage={isAr ? 'لا توجد شركات مطابقة' : 'No companies found'}
        />
      )}

      {/* Create Company Modal */}
      {showCreateModal && (
        <CreateCompanyModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={(newComp) => setSelectedCompanyId(newComp.id)}
        />
      )}

      {/* Company Drawer */}
      {selectedCompanyId && (
        <CompanyDrawer
          isOpen={Boolean(selectedCompanyId)}
          onClose={() => setSelectedCompanyId(null)}
          companyId={selectedCompanyId}
        />
      )}
    </div>
  );
}

