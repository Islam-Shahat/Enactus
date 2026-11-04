import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ROLES, ROLE_LABELS } from '../../lib/roles';
import DataTable from '../../components/dashboard/DataTable';
import StatusBadge from '../../components/dashboard/StatusBadge';
import ConfirmDialog from '../../components/dashboard/ConfirmDialog';
import FormField from '../../components/dashboard/FormField';
import { useToast } from '../../components/dashboard/Toast';
import { ShieldCheck, Plus, Trash2, User, Key } from 'lucide-react';

const PAGE_SIZE = 15;

export default function RolesPage() {
  const { user, isSuperAdmin } = useAuth();
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const toast = useToast();
  const queryClient = useQueryClient();

  // Table state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Add Role Dialog state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState(ROLES.MEMBER);
  const [selectedCommitteeId, setSelectedCommitteeId] = useState('');

  // Delete Confirmation state
  const [roleToDelete, setRoleToDelete] = useState(null);

  // Fetch committees for role assignment & display
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

  // Fetch all profiles for user dropdown
  const { data: profilesList = [] } = useQuery({
    queryKey: ['dashboard', 'profiles-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name_ar, full_name_en, avatar_url')
        .order('full_name_ar');
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch user_roles list with server-side pagination & joins
  const { data: rolesData, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'user_roles', page, search, roleFilter],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('user_roles')
        .select(
          `
          id,
          user_id,
          role,
          committee_id,
          season_id,
          granted_by,
          created_at,
          profiles!user_roles_user_id_fkey(
            id,
            full_name_ar,
            full_name_en,
            avatar_url
          ),
          committees(
            id,
            slug,
            name_ar,
            name_en,
            color
          )
        `,
          { count: 'exact' }
        );

      if (roleFilter !== 'all') {
        query = query.eq('role', roleFilter);
      }

      if (search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.or(`full_name_ar.ilike.${term},full_name_en.ilike.${term}`, {
          foreignTable: 'profiles',
        });
      }

      query = query.order('created_at', { ascending: false });
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

  // Add role mutation
  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role, committeeId }) => {
      if (role === ROLES.COMMITTEE_HEAD && !committeeId) {
        throw new Error(isAr ? 'يجب اختيار اللجنة لرئيس اللجنة' : 'Committee is required for committee head');
      }

      const payload = {
        user_id: userId,
        role,
        committee_id: role === ROLES.COMMITTEE_HEAD ? committeeId : null,
        granted_by: user?.id,
      };

      const { data, error: insertError } = await supabase.from('user_roles').insert([payload]);
      if (insertError) throw insertError;
      return data;
    },
    onSuccess: () => {
      toast.show(isAr ? 'تم منح الصلاحية بنجاح' : 'Role granted successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'user_roles'] });
      setIsAddOpen(false);
      setSelectedUserId('');
      setSelectedRole(ROLES.MEMBER);
      setSelectedCommitteeId('');
    },
    onError: (err) => {
      toast.show(err.message || (isAr ? 'فشل منح الصلاحية' : 'Failed to grant role'), 'error');
    },
  });

  // Revoke role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId) => {
      const { error: delError } = await supabase.from('user_roles').delete().eq('id', roleId);
      if (delError) throw delError;
    },
    onSuccess: () => {
      toast.show(isAr ? 'تم سحب الصلاحية بنجاح' : 'Role revoked successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'user_roles'] });
      setRoleToDelete(null);
    },
    onError: (err) => {
      toast.show(err.message || (isAr ? 'فشل سحب الصلاحية' : 'Failed to revoke role'), 'error');
    },
  });

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast.show(isAr ? 'يرجى اختيار العضو' : 'Please select a user', 'error');
      return;
    }
    addRoleMutation.mutate({
      userId: selectedUserId,
      role: selectedRole,
      committeeId: selectedCommitteeId,
    });
  };

  const columns = [
    {
      key: 'user',
      label: isAr ? 'المستخدم' : 'User',
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
              <div style={{ fontSize: '0.72rem', color: '#888' }}>
                ID: {row.user_id ? `${row.user_id.substring(0, 8)}...` : '—'}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'role',
      label: isAr ? 'الصلاحية' : 'Role',
      render: (row) => {
        const label = ROLE_LABELS[row.role]?.[lang] || ROLE_LABELS[row.role]?.ar || row.role;
        return <StatusBadge status={row.role} label={label} />;
      },
    },
    {
      key: 'committee',
      label: isAr ? 'اللجنة التابعة' : 'Associated Committee',
      render: (row) => {
        if (!row.committee_id) {
          return <span style={{ color: '#666', fontSize: '0.85rem' }}>—</span>;
        }
        const cName = isAr ? row.committees?.name_ar : row.committees?.name_en;
        return <StatusBadge label={cName || '—'} color={row.committees?.color} />;
      },
    },
    {
      key: 'created_at',
      label: isAr ? 'تاريخ المنح' : 'Granted At',
      render: (row) => (
        <span style={{ fontSize: '0.85rem', color: '#aaa' }}>
          {row.created_at ? new Date(row.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US') : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: isAr ? 'إجراء' : 'Action',
      align: 'end',
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setRoleToDelete(row);
          }}
          disabled={!isSuperAdmin}
          className="btn-danger-compact"
          title={isAr ? 'سحب الصلاحية' : 'Revoke role'}
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            borderRadius: '6px',
            padding: '0.35rem 0.6rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.78rem',
          }}
        >
          <Trash2 size={14} />
          <span>{isAr ? 'سحب' : 'Revoke'}</span>
        </button>
      ),
    },
  ];

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Key size={24} color="#ffd54f" />
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffd54f', margin: 0 }}>
              {isAr ? 'إدارة الصلاحيات والأدوار' : 'Role & Permission Management'}
            </h1>
          </div>
          <p style={{ color: '#aaa', fontSize: '0.88rem', margin: '0.25rem 0 0' }}>
            {isAr
              ? 'صلاحية خاصة بمدير النظام (Super Admin). يتم فرض التحكم بالأدوار عبر RLS مباشرة في قاعدة البيانات.'
              : 'Super Admin only. RBAC permissions enforced directly via Postgres RLS.'}
          </p>
        </div>

        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
            }}
          >
            <Plus size={18} />
            <span>{isAr ? 'منح صلاحية جديدة' : 'Grant New Role'}</span>
          </button>
        )}
      </div>

      {/* Role filter bar */}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
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
            {isAr ? 'كل الصلاحيات' : 'All Roles'}
          </option>
          {Object.entries(ROLES).map(([k, val]) => (
            <option key={k} value={val} style={{ background: '#181920', color: '#fff' }}>
              {ROLE_LABELS[val]?.[lang] || ROLE_LABELS[val]?.ar || val}
            </option>
          ))}
        </select>
      </div>

      {/* Roles DataTable */}
      <DataTable
        columns={columns}
        data={rolesData?.rows || []}
        total={rolesData?.total || 0}
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
        searchPlaceholder={isAr ? 'بحث باسم العضو...' : 'Search by user name...'}
        emptyTitle={isAr ? 'لا توجد صلاحيات مسجلة' : 'No roles assigned'}
        emptyDescription={isAr ? 'لم يتم العثور على أي أدوار مطابقة للبحث.' : 'No roles matched your search criteria.'}
      />

      {/* Add Role Modal Dialog */}
      {isAddOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 100,
          }}
          onClick={() => setIsAddOpen(false)}
        >
          <div
            style={{
              background: '#14151b',
              border: '1px solid rgba(255, 184, 0, 0.3)',
              borderRadius: '14px',
              padding: '1.5rem',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <ShieldCheck size={22} color="#ffd54f" />
              <h3 style={{ margin: 0, color: '#ffd54f', fontSize: '1.15rem' }}>
                {isAr ? 'منح صلاحية لمستخدم' : 'Grant Role to User'}
              </h3>
            </div>

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Select User */}
              <FormField label={isAr ? 'اختر المستخدم' : 'Select User'} required>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#fff',
                    border: '1px solid rgba(255, 184, 0, 0.3)',
                  }}
                  required
                >
                  <option value="" style={{ background: '#181920', color: '#888' }}>
                    {isAr ? '-- اختر مستخدماً --' : '-- Choose a user --'}
                  </option>
                  {profilesList.map((p) => {
                    const pName = isAr
                      ? p.full_name_ar || p.full_name_en
                      : p.full_name_en || p.full_name_ar;
                    return (
                      <option key={p.id} value={p.id} style={{ background: '#181920', color: '#fff' }}>
                        {pName || p.id}
                      </option>
                    );
                  })}
                </select>
              </FormField>

              {/* Select Role */}
              <FormField label={isAr ? 'الصلاحية المراد منحها' : 'Role to Grant'} required>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#fff',
                    border: '1px solid rgba(255, 184, 0, 0.3)',
                  }}
                >
                  {Object.entries(ROLES).map(([k, val]) => (
                    <option key={k} value={val} style={{ background: '#181920', color: '#fff' }}>
                      {ROLE_LABELS[val]?.[lang] || ROLE_LABELS[val]?.ar || val}
                    </option>
                  ))}
                </select>
              </FormField>

              {/* If Committee Head, select committee */}
              {selectedRole === ROLES.COMMITTEE_HEAD && (
                <FormField label={isAr ? 'اللجنة التابع لها' : 'Committee'} required>
                  <select
                    value={selectedCommitteeId}
                    onChange={(e) => setSelectedCommitteeId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.06)',
                      color: '#fff',
                      border: '1px solid rgba(255, 184, 0, 0.3)',
                    }}
                    required
                  >
                    <option value="" style={{ background: '#181920', color: '#888' }}>
                      {isAr ? '-- اختر اللجنة --' : '-- Choose committee --'}
                    </option>
                    {committees.map((c) => (
                      <option key={c.id} value={c.id} style={{ background: '#181920', color: '#fff' }}>
                        {isAr ? c.name_ar : c.name_en}
                      </option>
                    ))}
                  </select>
                </FormField>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '0.65rem' }}
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={addRoleMutation.isPending}
                  className="btn-primary"
                  style={{ flex: 2, padding: '0.65rem' }}
                >
                  {addRoleMutation.isPending
                    ? isAr
                      ? 'جاري المنح...'
                      : 'Granting...'
                    : isAr
                    ? 'تأكيد المنح'
                    : 'Confirm Grant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revoke Role Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(roleToDelete)}
        onClose={() => setRoleToDelete(null)}
        onConfirm={() => {
          if (roleToDelete?.id) {
            deleteRoleMutation.mutate(roleToDelete.id);
          }
        }}
        title={isAr ? 'تأكيد سحب الصلاحية' : 'Confirm Role Revocation'}
        description={
          roleToDelete
            ? isAr
              ? `هل أنت متأكد من سحب صلاحية "${ROLE_LABELS[roleToDelete.role]?.ar || roleToDelete.role}" من المستخدم "${
                  roleToDelete.profiles?.full_name_ar || roleToDelete.profiles?.full_name_en || 'هذا المستخدم'
                }"؟ لن يتمكن المستخدم من الوصول للمهام التابعة لهذه الصلاحية.`
              : `Are you sure you want to revoke the "${
                  ROLE_LABELS[roleToDelete.role]?.en || roleToDelete.role
                }" role from "${
                  roleToDelete.profiles?.full_name_en || roleToDelete.profiles?.full_name_ar || 'this user'
                }"?`
            : ''
        }
        confirmText={isAr ? 'نعم، اسحب الصلاحية' : 'Yes, Revoke'}
        variant="danger"
        isLoading={deleteRoleMutation.isPending}
      />
    </div>
  );
}
