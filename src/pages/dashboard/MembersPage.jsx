import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import DataTable from '../../components/dashboard/DataTable';
import StatusBadge from '../../components/dashboard/StatusBadge';
import Drawer from '../../components/dashboard/Drawer';
import FormField from '../../components/dashboard/FormField';
import { useToast } from '../../components/dashboard/Toast';
import { User, Mail, Phone, BookOpen, GraduationCap, ShieldCheck, Edit3, Save } from 'lucide-react';

const PAGE_SIZE = 10;

export default function MembersPage() {
  const { isSuperAdmin, hasRole } = useAuth();
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const toast = useToast();
  const queryClient = useQueryClient();

  const canManage = isSuperAdmin || hasRole(['hr_admin', 'president', 'vice_president']);

  // Table state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [committeeFilter, setCommitteeFilter] = useState('all');
  const [positionFilter, setPositionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('joined_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Drawer state
  const [selectedMembership, setSelectedMembership] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    position: '',
    committee_id: '',
    membershipStatus: '',
    profileStatus: '',
  });

  // Fetch active season
  const { data: activeSeason } = useQuery({
    queryKey: ['dashboard', 'active-season'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('id, name, is_active')
        .eq('is_active', true)
        .maybeSingle();
      if (error || !data) {
        const { data: fallback, error: fbErr } = await supabase
          .from('seasons')
          .select('id, name, is_active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (fbErr) throw fbErr;
        return fallback ? { ...fallback, name_ar: fallback.name, name_en: fallback.name } : null;
      }
      return { ...data, name_ar: data.name, name_en: data.name };
    },
    staleTime: 10 * 60 * 1000,
  });

  // Fetch committees for filter & change options
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

  // Fetch private profile info when drawer opens
  const { data: privateProfile, isLoading: isPrivateLoading } = useQuery({
    queryKey: ['dashboard', 'profile_private', selectedMembership?.user_id],
    queryFn: async () => {
      if (!selectedMembership?.user_id) return null;
      const { data, error } = await supabase
        .from('profile_private')
        .select('*')
        .eq('user_id', selectedMembership.user_id)
        .maybeSingle();
      if (error) {
        // RLS might forbid non-authorized users, gracefully return null
        return null;
      }
      return data;
    },
    enabled: Boolean(selectedMembership?.user_id),
  });

  // Fetch memberships list with pagination
  const { data: membersData, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'members', activeSeason?.id, page, search, committeeFilter, positionFilter, statusFilter, sortBy, sortOrder],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('memberships')
        .select(
          `
          id,
          user_id,
          season_id,
          committee_id,
          position,
          status,
          joined_at,
          left_at,
          profiles!inner(
            id,
            full_name_ar,
            full_name_en,
            avatar_url,
            bio,
            locale,
            status
          ),
          committees!inner(
            id,
            slug,
            name_ar,
            name_en,
            color
          )
        `,
          { count: 'exact' }
        );

      if (activeSeason?.id) {
        query = query.eq('season_id', activeSeason.id);
      }

      if (committeeFilter !== 'all') {
        query = query.eq('committee_id', committeeFilter);
      }

      if (positionFilter !== 'all') {
        query = query.eq('position', positionFilter);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.or(`full_name_ar.ilike.${term},full_name_en.ilike.${term}`, {
          foreignTable: 'profiles',
        });
      }

      const ascending = sortOrder === 'asc';
      query = query.order(sortBy, { ascending });
      query = query.range(from, to);

      const { data, error: qError, count } = await query;
      if (qError) throw qError;

      return {
        rows: data || [],
        total: count || 0,
      };
    },
    keepPreviousData: true,
  });

  // Open drawer and initialize edit form
  const handleSelectMember = (membership) => {
    setSelectedMembership(membership);
    setIsEditing(false);
    setEditForm({
      position: membership.position,
      committee_id: membership.committee_id,
      membershipStatus: membership.status,
      profileStatus: membership.profiles?.status || 'active',
    });
  };

  // Update mutation for membership & profile status
  const updateMemberMutation = useMutation({
    mutationFn: async ({ membershipId, userId, position, committee_id, membershipStatus, profileStatus }) => {
      // 1. Update membership
      const { error: memErr } = await supabase
        .from('memberships')
        .update({
          position,
          committee_id,
          status: membershipStatus,
          left_at: membershipStatus === 'left' ? new Date().toISOString().split('T')[0] : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', membershipId);
      if (memErr) throw memErr;

      // 2. Update profile status
      if (userId && profileStatus) {
        const { error: profErr } = await supabase
          .from('profiles')
          .update({
            status: profileStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
        if (profErr) throw profErr;
      }
    },
    onSuccess: () => {
      toast.show(isAr ? 'تم تحديث بيانات العضو بنجاح' : 'Member updated successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'members'] });
      setIsEditing(false);
      setSelectedMembership(null);
    },
    onError: (err) => {
      toast.show(err.message || (isAr ? 'حدث خطأ أثناء التحديث' : 'Failed to update member'), 'error');
    },
  });

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!selectedMembership) return;
    updateMemberMutation.mutate({
      membershipId: selectedMembership.id,
      userId: selectedMembership.user_id,
      position: editForm.position,
      committee_id: editForm.committee_id,
      membershipStatus: editForm.membershipStatus,
      profileStatus: editForm.profileStatus,
    });
  };

  // Columns definition
  const columns = [
    {
      key: 'member',
      label: isAr ? 'العضو' : 'Member',
      render: (row) => {
        const name = isAr
          ? row.profiles?.full_name_ar || row.profiles?.full_name_en
          : row.profiles?.full_name_en || row.profiles?.full_name_ar;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(255, 184, 0, 0.1)',
                border: '1px solid rgba(255, 184, 0, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {row.profiles?.avatar_url ? (
                <img
                  src={row.profiles.avatar_url}
                  alt={name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <User size={18} color="#ffb800" />
              )}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>{name || '—'}</div>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>
                {isAr ? 'انضم في: ' : 'Joined: '}
                {row.joined_at || '—'}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'committee',
      label: isAr ? 'اللجنة' : 'Committee',
      render: (row) => {
        const cName = isAr ? row.committees?.name_ar : row.committees?.name_en;
        return (
          <StatusBadge
            label={cName || '—'}
            color={row.committees?.color}
          />
        );
      },
    },
    {
      key: 'position',
      label: isAr ? 'المنصب' : 'Position',
      render: (row) => <StatusBadge status={row.position} />,
    },
    {
      key: 'status',
      label: isAr ? 'حالة العضوية' : 'Membership Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'profileStatus',
      label: isAr ? 'حالة الحساب' : 'Account Status',
      render: (row) => <StatusBadge status={row.profiles?.status || 'active'} />,
    },
  ];

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffd54f', margin: 0 }}>
            {isAr ? 'أعضاء الموسم الحالي' : 'Active Season Members'}
          </h1>
          <p style={{ color: '#aaa', fontSize: '0.88rem', margin: '0.25rem 0 0' }}>
            {isAr
              ? `إدارة أعضاء الموسم (${activeSeason ? (isAr ? activeSeason.name_ar : activeSeason.name_en) : '...'}) واللجان والمناصب`
              : `Manage members, positions, and committees for current season`}
          </p>
        </div>

        {canManage && (
          <span
            style={{
              fontSize: '0.8rem',
              color: '#ffb800',
              background: 'rgba(255, 184, 0, 0.1)',
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              border: '1px solid rgba(255, 184, 0, 0.3)',
            }}
          >
            {isAr ? 'صلاحية الإدارة مفعلة (HR / إدارة)' : 'Management permissions active (HR / Exec)'}
          </span>
        )}
      </div>

      {/* Custom Filters for DataTable */}
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          marginBottom: '1rem',
        }}
      >
        {/* Committee filter */}
        <select
          value={committeeFilter}
          onChange={(e) => {
            setCommitteeFilter(e.target.value);
            setPage(1);
          }}
          className="select-field"
          style={{
            padding: '0.55rem 0.9rem',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.06)',
            color: '#fff',
            border: '1px solid rgba(255, 184, 0, 0.3)',
            fontSize: '0.85rem',
          }}
        >
          <option value="all" style={{ background: '#181920', color: '#fff' }}>
            {isAr ? 'كل اللجان' : 'All Committees'}
          </option>
          {committees.map((c) => (
            <option key={c.id} value={c.id} style={{ background: '#181920', color: '#fff' }}>
              {isAr ? c.name_ar : c.name_en}
            </option>
          ))}
        </select>

        {/* Position filter */}
        <select
          value={positionFilter}
          onChange={(e) => {
            setPositionFilter(e.target.value);
            setPage(1);
          }}
          className="select-field"
          style={{
            padding: '0.55rem 0.9rem',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.06)',
            color: '#fff',
            border: '1px solid rgba(255, 184, 0, 0.3)',
            fontSize: '0.85rem',
          }}
        >
          <option value="all" style={{ background: '#181920', color: '#fff' }}>
            {isAr ? 'كل المناصب' : 'All Positions'}
          </option>
          <option value="head" style={{ background: '#181920', color: '#fff' }}>
            {isAr ? 'رئيس لجنة (Head)' : 'Head'}
          </option>
          <option value="vice" style={{ background: '#181920', color: '#fff' }}>
            {isAr ? 'نائب رئيس لجنة (Vice)' : 'Vice'}
          </option>
          <option value="coordinator" style={{ background: '#181920', color: '#fff' }}>
            {isAr ? 'منسق (Coordinator)' : 'Coordinator'}
          </option>
          <option value="member" style={{ background: '#181920', color: '#fff' }}>
            {isAr ? 'عضو (Member)' : 'Member'}
          </option>
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="select-field"
          style={{
            padding: '0.55rem 0.9rem',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.06)',
            color: '#fff',
            border: '1px solid rgba(255, 184, 0, 0.3)',
            fontSize: '0.85rem',
          }}
        >
          <option value="all" style={{ background: '#181920', color: '#fff' }}>
            {isAr ? 'كل حالات العضوية' : 'All Membership Statuses'}
          </option>
          <option value="active" style={{ background: '#181920', color: '#fff' }}>
            {isAr ? 'نشط' : 'Active'}
          </option>
          <option value="left" style={{ background: '#181920', color: '#fff' }}>
            {isAr ? 'غادر' : 'Left'}
          </option>
          <option value="alumni" style={{ background: '#181920', color: '#fff' }}>
            {isAr ? 'خريج' : 'Alumni'}
          </option>
        </select>
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={membersData?.rows || []}
        total={membersData?.total || 0}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        isLoading={isLoading}
        error={error}
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder={isAr ? 'بحث بالاسم...' : 'Search by name...'}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={(col) => {
          if (sortBy === col) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
          } else {
            setSortBy(col);
            setSortOrder('asc');
          }
        }}
        onRowClick={handleSelectMember}
        emptyTitle={isAr ? 'لا يوجد أعضاء' : 'No members found'}
        emptyDescription={
          isAr
            ? 'لم يتم العثور على أعضاء مطابقين للبحث أو الفلتر المحدد.'
            : 'No members match the current search or filter criteria.'
        }
      />

      {/* Member Details Drawer */}
      <Drawer
        isOpen={Boolean(selectedMembership)}
        onClose={() => {
          setSelectedMembership(null);
          setIsEditing(false);
        }}
        title={isAr ? 'تفاصيل العضو' : 'Member Details'}
        subtitle={
          selectedMembership
            ? isAr
              ? selectedMembership.profiles?.full_name_ar || selectedMembership.profiles?.full_name_en
              : selectedMembership.profiles?.full_name_en || selectedMembership.profiles?.full_name_ar
            : ''
        }
        footer={
          selectedMembership && canManage && (
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="btn-primary"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem',
                  }}
                >
                  <Edit3 size={16} />
                  <span>{isAr ? 'تعديل البيانات والصلاحية' : 'Edit Member'}</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="btn-secondary"
                    style={{ flex: 1, padding: '0.75rem' }}
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={updateMemberMutation.isPending}
                    className="btn-primary"
                    style={{
                      flex: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem',
                    }}
                  >
                    <Save size={16} />
                    <span>
                      {updateMemberMutation.isPending
                        ? isAr
                          ? 'جاري الحفظ...'
                          : 'Saving...'
                        : isAr
                        ? 'حفظ التغييرات'
                        : 'Save Changes'}
                    </span>
                  </button>
                </>
              )}
            </div>
          )
        }
      >
        {selectedMembership && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Header Card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '10px',
                border: '1px solid rgba(255, 184, 0, 0.2)',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'rgba(255, 184, 0, 0.1)',
                  border: '1px solid rgba(255, 184, 0, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {selectedMembership.profiles?.avatar_url ? (
                  <img
                    src={selectedMembership.profiles.avatar_url}
                    alt="avatar"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <User size={28} color="#ffb800" />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>
                  {isAr
                    ? selectedMembership.profiles?.full_name_ar || selectedMembership.profiles?.full_name_en
                    : selectedMembership.profiles?.full_name_en || selectedMembership.profiles?.full_name_ar}
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                  <StatusBadge
                    label={isAr ? selectedMembership.committees?.name_ar : selectedMembership.committees?.name_en}
                    color={selectedMembership.committees?.color}
                  />
                  <StatusBadge status={selectedMembership.position} />
                  <StatusBadge status={selectedMembership.status} />
                </div>
              </div>
            </div>

            {/* Read / Edit Form */}
            {isEditing ? (
              <form
                onSubmit={handleSaveEdit}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  padding: '1rem',
                  background: 'rgba(255, 184, 0, 0.03)',
                  border: '1px solid rgba(255, 184, 0, 0.25)',
                  borderRadius: '10px',
                }}
              >
                <h4 style={{ margin: 0, color: '#ffd54f', fontSize: '0.95rem' }}>
                  {isAr ? 'تعديل بيانات العضوية' : 'Edit Membership'}
                </h4>

                {/* Committee */}
                <FormField label={isAr ? 'اللجنة' : 'Committee'}>
                  <select
                    value={editForm.committee_id}
                    onChange={(e) => setEditForm({ ...editForm, committee_id: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.06)',
                      color: '#fff',
                      border: '1px solid rgba(255, 184, 0, 0.3)',
                    }}
                  >
                    {committees.map((c) => (
                      <option key={c.id} value={c.id} style={{ background: '#181920', color: '#fff' }}>
                        {isAr ? c.name_ar : c.name_en}
                      </option>
                    ))}
                  </select>
                </FormField>

                {/* Position */}
                <FormField label={isAr ? 'المنصب' : 'Position'}>
                  <select
                    value={editForm.position}
                    onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.06)',
                      color: '#fff',
                      border: '1px solid rgba(255, 184, 0, 0.3)',
                    }}
                  >
                    <option value="member" style={{ background: '#181920', color: '#fff' }}>
                      {isAr ? 'عضو (Member)' : 'Member'}
                    </option>
                    <option value="vice" style={{ background: '#181920', color: '#fff' }}>
                      {isAr ? 'نائب رئيس لجنة (Vice)' : 'Vice Head'}
                    </option>
                    <option value="head" style={{ background: '#181920', color: '#fff' }}>
                      {isAr ? 'رئيس لجنة (Head)' : 'Head'}
                    </option>
                    <option value="coordinator" style={{ background: '#181920', color: '#fff' }}>
                      {isAr ? 'منسق (Coordinator)' : 'Coordinator'}
                    </option>
                  </select>
                </FormField>

                {/* Membership Status */}
                <FormField label={isAr ? 'حالة العضوية بالموسم' : 'Membership Status'}>
                  <select
                    value={editForm.membershipStatus}
                    onChange={(e) => setEditForm({ ...editForm, membershipStatus: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.06)',
                      color: '#fff',
                      border: '1px solid rgba(255, 184, 0, 0.3)',
                    }}
                  >
                    <option value="active" style={{ background: '#181920', color: '#fff' }}>
                      {isAr ? 'نشط (Active)' : 'Active'}
                    </option>
                    <option value="left" style={{ background: '#181920', color: '#fff' }}>
                      {isAr ? 'غادر (Left)' : 'Left'}
                    </option>
                    <option value="alumni" style={{ background: '#181920', color: '#fff' }}>
                      {isAr ? 'خريج (Alumni)' : 'Alumni'}
                    </option>
                  </select>
                </FormField>

                {/* Profile Status */}
                <FormField label={isAr ? 'حالة الحساب العام' : 'Account Status'}>
                  <select
                    value={editForm.profileStatus}
                    onChange={(e) => setEditForm({ ...editForm, profileStatus: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.06)',
                      color: '#fff',
                      border: '1px solid rgba(255, 184, 0, 0.3)',
                    }}
                  >
                    <option value="active" style={{ background: '#181920', color: '#fff' }}>
                      {isAr ? 'نشط (Active)' : 'Active'}
                    </option>
                    <option value="suspended" style={{ background: '#181920', color: '#fff' }}>
                      {isAr ? 'معلق (Suspended)' : 'Suspended'}
                    </option>
                    <option value="alumni" style={{ background: '#181920', color: '#fff' }}>
                      {isAr ? 'خريج (Alumni)' : 'Alumni'}
                    </option>
                  </select>
                </FormField>
              </form>
            ) : null}

            {/* Public profile info */}
            <div>
              <h4 style={{ color: '#ffd54f', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                {isAr ? 'معلومات عامة' : 'Public Profile'}
              </h4>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '0.75rem',
                }}
              >
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>{isAr ? 'الاسم بالعربي' : 'Arabic Name'}</div>
                  <div style={{ color: '#fff', fontWeight: 500 }}>{selectedMembership.profiles?.full_name_ar || '—'}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>{isAr ? 'الاسم بالإنجليزي' : 'English Name'}</div>
                  <div style={{ color: '#fff', fontWeight: 500 }}>{selectedMembership.profiles?.full_name_en || '—'}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>{isAr ? 'اللغة المفضلة' : 'Locale'}</div>
                  <div style={{ color: '#fff', fontWeight: 500 }}>
                    {selectedMembership.profiles?.locale === 'ar' ? 'العربية' : 'English'}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>{isAr ? 'تاريخ الانضمام' : 'Join Date'}</div>
                  <div style={{ color: '#fff', fontWeight: 500 }}>{selectedMembership.joined_at || '—'}</div>
                </div>
              </div>

              {selectedMembership.profiles?.bio && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    background: 'rgba(255,255,255,0.02)',
                    padding: '0.75rem',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                    {isAr ? 'النبذة التعريفية (Bio)' : 'Bio'}
                  </div>
                  <div style={{ color: '#ddd', fontSize: '0.88rem', lineHeight: 1.5 }}>
                    {selectedMembership.profiles.bio}
                  </div>
                </div>
              )}
            </div>

            {/* Private Contact Information (Only rendered if RLS allowed the select) */}
            <div>
              <h4
                style={{
                  color: '#ffd54f',
                  fontSize: '0.95rem',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <ShieldCheck size={16} />
                <span>{isAr ? 'البيانات الشخصية الحساسة' : 'Private Information'}</span>
              </h4>

              {isPrivateLoading ? (
                <div style={{ color: '#888', fontSize: '0.85rem' }}>
                  {isAr ? 'جاري التحقق من الصلاحيات...' : 'Checking access...'}
                </div>
              ) : privateProfile ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '0.75rem',
                    background: 'rgba(255, 184, 0, 0.02)',
                    border: '1px solid rgba(255, 184, 0, 0.15)',
                    padding: '0.75rem',
                    borderRadius: '8px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#888', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Mail size={12} />
                      <span>{isAr ? 'البريد الإلكتروني' : 'Email'}</span>
                    </div>
                    <div style={{ color: '#fff', fontWeight: 500, fontSize: '0.88rem' }}>
                      {privateProfile.email || '—'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#888', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Phone size={12} />
                      <span>{isAr ? 'رقم الهاتف' : 'Phone'}</span>
                    </div>
                    <div style={{ color: '#fff', fontWeight: 500, fontSize: '0.88rem' }}>
                      {privateProfile.phone || '—'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#888', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <GraduationCap size={12} />
                      <span>{isAr ? 'الكلية' : 'Faculty'}</span>
                    </div>
                    <div style={{ color: '#fff', fontWeight: 500, fontSize: '0.88rem' }}>
                      {privateProfile.faculty || '—'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#888', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <BookOpen size={12} />
                      <span>{isAr ? 'الفرقة الدراسية' : 'Study Year'}</span>
                    </div>
                    <div style={{ color: '#fff', fontWeight: 500, fontSize: '0.88rem' }}>
                      {privateProfile.study_year ? `${isAr ? 'الفرقة ' : 'Year '}${privateProfile.study_year}` : '—'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#888' }}>
                      {isAr ? 'الرقم الجامعي' : 'University ID'}
                    </div>
                    <div style={{ color: '#fff', fontWeight: 500, fontSize: '0.88rem' }}>
                      {privateProfile.university_id || '—'}
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    color: '#888',
                    fontSize: '0.82rem',
                    fontStyle: 'italic',
                  }}
                >
                  {isAr
                    ? 'البيانات الشخصية الحساسة محمية بموجب الصلاحيات و RLS.'
                    : 'Private personal information is restricted by RLS.'}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
