// src/components/dashboard/GivePointsModal.jsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import FormField from './FormField';
import ConfirmDialog from './ConfirmDialog';
import { useToast } from './Toast';
import { Award, PlusCircle, MinusCircle, X, Loader2, Sparkles } from 'lucide-react';

export default function GivePointsModal({
  isOpen,
  onClose,
  activeSeasonId = null,
  committees = [],
}) {
  const { user, roles, isSuperAdmin, hasRole } = useAuth();
  const { lang, dir } = useLanguage();
  const { isDark } = useTheme();
  const isAr = lang === 'ar';
  const toast = useToast();
  const queryClient = useQueryClient();

  const isHrOrExec = isSuperAdmin || hasRole(['hr_admin', 'president', 'vice_president']);
  const headRoleObj = roles.find((r) => r.role === 'committee_head');
  const headCommitteeId = headRoleObj?.committee_id;

  // 1. Fetch eligible members
  const { data: eligibleMembers = [] } = useQuery({
    queryKey: ['dashboard', 'give_points_candidates', activeSeasonId, isHrOrExec, headCommitteeId],
    queryFn: async () => {
      let q = supabase
        .from('memberships')
        .select(`
          user_id,
          committee_id,
          position,
          status,
          profiles!inner(
            id,
            full_name_ar,
            full_name_en,
            avatar_url
          ),
          committees(
            name_ar,
            name_en,
            color
          )
        `)
        .eq('status', 'active');

      if (activeSeasonId) {
        q = q.eq('season_id', activeSeasonId);
      }

      if (!isHrOrExec && headCommitteeId) {
        q = q.eq('committee_id', headCommitteeId);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen && Boolean(user?.id),
  });

  // 2. Fetch point rules
  const { data: pointRules = [] } = useQuery({
    queryKey: ['dashboard', 'point_rules_active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('point_rules')
        .select('*')
        .eq('active', true)
        .order('type', { ascending: true })
        .order('value', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen,
  });

  // Form State
  const [selectedUserId, setSelectedUserId] = useState('');
  const [useRule, setUseRule] = useState('rule'); // 'rule' | 'custom'
  const [selectedRuleId, setSelectedRuleId] = useState('');
  const [customType, setCustomType] = useState('bonus'); // 'bonus' | 'penalty'
  const [customValue, setCustomValue] = useState(10);
  const [customReason, setCustomReason] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedUserId('');
      setUseRule('rule');
      setSelectedRuleId('');
      setCustomType('bonus');
      setCustomValue(10);
      setCustomReason('');
    }
  }, [isOpen]);

  const selectedMember = eligibleMembers.find((m) => m.user_id === selectedUserId);
  const selectedRule = pointRules.find((r) => r.id === selectedRuleId);

  // Derive points payload
  const effectiveType = useRule === 'rule' && selectedRule ? selectedRule.type : customType;
  const effectiveValue = useRule === 'rule' && selectedRule ? selectedRule.value : Number(customValue);
  const effectiveReason =
    useRule === 'rule' && selectedRule
      ? isAr ? selectedRule.name_ar : selectedRule.name_en
      : customReason.trim();

  const giveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) throw new Error(isAr ? 'يرجى اختيار العضو' : 'Please select a member');
      if (effectiveValue <= 0) throw new Error(isAr ? 'قيمة النقاط يجب أن تكون أكبر من 0' : 'Points value must be > 0');
      if (!effectiveReason) throw new Error(isAr ? 'سبب منح/خصم النقاط مطلوب' : 'Reason is required');

      // Resolve season ID
      let seasonId = activeSeasonId;
      if (!seasonId) {
        const { data: s } = await supabase
          .from('seasons')
          .select('id')
          .eq('is_active', true)
          .maybeSingle();
        seasonId = s?.id;
      }

      if (!seasonId) {
        throw new Error(isAr ? 'لا يوجد موسم نشط مسجل' : 'No active season found');
      }

      const insertPayload = {
        user_id: selectedUserId,
        season_id: seasonId,
        committee_id: selectedMember?.committee_id || null,
        type: effectiveType,
        value: effectiveValue,
        reason: effectiveReason,
        source: useRule === 'rule' ? 'rule' : 'manual',
        source_id: null,
        rule_id: useRule === 'rule' && selectedRule ? selectedRule.id : null,
        given_by: user.id,
      };

      const { data, error } = await supabase.from('point_entries').insert([insertPayload]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.show(
        effectiveType === 'bonus'
          ? isAr ? 'تم منح نقاط المكافأة بنجاح' : 'Bonus points awarded successfully'
          : isAr ? 'تم تسجيل خصم النقاط بنجاح' : 'Penalty points recorded successfully',
        'success'
      );
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'my_point_entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'all_point_entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'my_scores'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'team_point_stats'] });
      setIsConfirmOpen(false);
      onClose();
    },
    onError: (err) => {
      console.error('[GivePointsModal error]:', err);
      toast.show(err.message || (isAr ? 'فشل تسجيل النقاط' : 'Failed to record points'), 'error');
    },
  });

  const handleOpenConfirm = (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast.show(isAr ? 'يرجى اختيار العضو' : 'Please select a member', 'error');
      return;
    }
    if (useRule === 'rule' && !selectedRuleId) {
      toast.show(isAr ? 'يرجى اختيار قاعدة النقاط' : 'Please select a point rule', 'error');
      return;
    }
    if (useRule === 'custom' && !customReason.trim()) {
      toast.show(isAr ? 'يرجى كتابة سبب الإجراء' : 'Please enter custom reason', 'error');
      return;
    }
    if (effectiveValue <= 0) {
      toast.show(isAr ? 'القيمة يجب أن تكون أكبر من صفر' : 'Value must be greater than zero', 'error');
      return;
    }
    setIsConfirmOpen(true);
  };

  if (!isOpen) return null;

  const titleColor = isDark ? '#ffd54f' : '#b45309';
  const inputStyle = {
    width: '100%',
    padding: '0.65rem 0.85rem',
    borderRadius: '10px',
    background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
    border: isDark ? '1px solid rgba(255, 184, 0, 0.35)' : '1px solid #d97706',
    color: isDark ? '#ffffff' : '#0f111a',
    fontSize: '0.92rem',
    outline: 'none',
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 9999,
        }}
        onClick={onClose}
      >
        <div
          className="glass-panel gold-border-glow"
          dir={dir}
          style={{
            borderRadius: '20px',
            padding: '1.75rem',
            maxWidth: '540px',
            width: '100%',
            boxShadow: isDark ? '0 25px 60px rgba(0,0,0,0.85)' : '0 20px 50px rgba(184, 120, 0, 0.15)',
            background: isDark
              ? 'linear-gradient(150deg, rgba(22, 24, 34, 0.98), rgba(12, 13, 18, 0.98))'
              : 'rgba(255, 255, 255, 0.98)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: isDark ? 'rgba(255, 184, 0, 0.15)' : 'rgba(217, 119, 6, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: titleColor,
                }}
              >
                <Award size={20} />
              </div>
              <h3 className="modal-header-title" style={{ margin: 0, color: titleColor, fontSize: '1.2rem', fontWeight: 800 }}>
                {isAr ? 'منح أو خصم نقاط لعضو' : 'Award or Deduct Points'}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: isDark ? '#a0a0b2' : '#6b7280',
                cursor: 'pointer',
                padding: '0.35rem',
              }}
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleOpenConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            {/* Pick Member */}
            <FormField label={isAr ? 'العضو المستهدف' : 'Target Member'} required>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                style={inputStyle}
                required
              >
                <option value="" style={{ background: isDark ? '#181920' : '#ffffff', color: isDark ? '#888' : '#6b7280' }}>
                  {isAr ? '-- اختر العضو --' : '-- Select Member --'}
                </option>
                {eligibleMembers.map((m) => {
                  const name = isAr
                    ? m.profiles?.full_name_ar || m.profiles?.full_name_en
                    : m.profiles?.full_name_en || m.profiles?.full_name_ar;
                  const comm = isAr ? m.committees?.name_ar : m.committees?.name_en;
                  return (
                    <option
                      key={m.user_id}
                      value={m.user_id}
                      style={{ background: isDark ? '#181920' : '#ffffff', color: isDark ? '#fff' : '#111' }}
                    >
                      {name} {comm ? `(${comm})` : ''}
                    </option>
                  );
                })}
              </select>
            </FormField>

            {/* Selection Mode: Predefined Rule vs Custom */}
            <div
              style={{
                display: 'flex',
                background: isDark ? 'rgba(255,255,255,0.04)' : '#f3f4f6',
                padding: '0.25rem',
                borderRadius: '10px',
                gap: '0.25rem',
              }}
            >
              <button
                type="button"
                onClick={() => setUseRule('rule')}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: useRule === 'rule' ? (isDark ? 'rgba(255,184,0,0.2)' : '#ffffff') : 'transparent',
                  color: useRule === 'rule' ? titleColor : isDark ? '#aaa' : '#666',
                  fontWeight: useRule === 'rule' ? 700 : 500,
                  boxShadow: useRule === 'rule' && !isDark ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer',
                }}
              >
                {isAr ? 'قاعدة معتمدة (Rule)' : 'Predefined Rule'}
              </button>
              <button
                type="button"
                onClick={() => setUseRule('custom')}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: useRule === 'custom' ? (isDark ? 'rgba(255,184,0,0.2)' : '#ffffff') : 'transparent',
                  color: useRule === 'custom' ? titleColor : isDark ? '#aaa' : '#666',
                  fontWeight: useRule === 'custom' ? 700 : 500,
                  boxShadow: useRule === 'custom' && !isDark ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer',
                }}
              >
                {isAr ? 'مخصص (Custom)' : 'Custom Reason'}
              </button>
            </div>

            {useRule === 'rule' ? (
              <FormField label={isAr ? 'اختر القاعدة المعتمدة' : 'Select Point Rule'} required>
                <select
                  value={selectedRuleId}
                  onChange={(e) => setSelectedRuleId(e.target.value)}
                  style={inputStyle}
                  required
                >
                  <option value="" style={{ background: isDark ? '#181920' : '#ffffff', color: isDark ? '#888' : '#6b7280' }}>
                    {isAr ? '-- اختر القاعدة --' : '-- Choose Rule --'}
                  </option>
                  {pointRules.map((r) => {
                    const ruleName = isAr ? r.name_ar : r.name_en;
                    const sign = r.type === 'bonus' ? '+' : '-';
                    return (
                      <option
                        key={r.id}
                        value={r.id}
                        style={{
                          background: isDark ? '#181920' : '#ffffff',
                          color: r.type === 'bonus' ? '#22c55e' : '#ef4444',
                        }}
                      >
                        [{sign}{r.value}] {ruleName}
                      </option>
                    );
                  })}
                </select>
              </FormField>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <FormField label={isAr ? 'نوع الإجراء' : 'Type'} required>
                    <select
                      value={customType}
                      onChange={(e) => setCustomType(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="bonus" style={{ background: isDark ? '#181920' : '#ffffff', color: '#22c55e' }}>
                        {isAr ? 'مكافأة (+) Bonus' : 'Bonus (+)'}
                      </option>
                      <option value="penalty" style={{ background: isDark ? '#181920' : '#ffffff', color: '#ef4444' }}>
                        {isAr ? 'خصم (-) Penalty' : 'Penalty (-)'}
                      </option>
                    </select>
                  </FormField>

                  <FormField label={isAr ? 'عدد النقاط' : 'Points Value'} required>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={customValue}
                      onChange={(e) => setCustomValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      style={inputStyle}
                      required
                    />
                  </FormField>
                </div>

                <FormField label={isAr ? 'سبب منح / خصم النقاط' : 'Reason for Points'} required>
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder={isAr ? 'مثال: تنظيم ورشة عمل استثنائية...' : 'e.g. Organized an outstanding workshop...'}
                    style={inputStyle}
                    required
                  />
                </FormField>
              </>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.85rem', marginTop: '0.6rem' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                style={{ flex: 1, padding: '0.75rem', borderRadius: '10px' }}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="btn-primary"
                style={{
                  flex: 2,
                  padding: '0.75rem',
                  borderRadius: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                }}
              >
                <Sparkles size={16} />
                <span>{isAr ? 'متابعة للتأكيد' : 'Proceed to Confirm'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => giveMutation.mutate()}
        isLoading={giveMutation.isPending}
        title={isAr ? 'تأكيد تسجيل النقاط' : 'Confirm Points Action'}
        message={
          isAr
            ? `هل أنت متأكد من تسجيل ${effectiveType === 'bonus' ? 'مكافأة' : 'خصم'} (${effectiveType === 'bonus' ? '+' : '-'}${effectiveValue} نقطة) للعضو "${
                selectedMember?.profiles?.full_name_ar || selectedMember?.profiles?.full_name_en || ''
              }"؟`
            : `Are you sure you want to record ${effectiveType} (${effectiveType === 'bonus' ? '+' : '-'}${effectiveValue} pts) for "${
                selectedMember?.profiles?.full_name_en || selectedMember?.profiles?.full_name_ar || ''
              }"?`
        }
        confirmText={isAr ? 'نعم، سجل النقاط' : 'Yes, Record Points'}
        variant={effectiveType === 'penalty' ? 'danger' : 'gold'}
      />
    </>
  );
}

