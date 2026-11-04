import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import Drawer from './Drawer';
import FormField from './FormField';
import ConfirmDialog from './ConfirmDialog';
import { useToast } from './Toast';
import { Save, Trash2, XCircle } from 'lucide-react';

export default function TaskFormDrawer({
  isOpen,
  onClose,
  taskToEdit = null, // null for create, object for edit
  activeSeasonId = null,
  committees = [],
}) {
  const { user, roles, isSuperAdmin, hasRole } = useAuth();
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const toast = useToast();
  const queryClient = useQueryClient();

  const isHrOrExec = isSuperAdmin || hasRole(['hr_admin', 'president', 'vice_president', 'coordinator']);
  const headRoleObj = roles.find((r) => r.role === 'committee_head');
  const headCommitteeId = headRoleObj?.committee_id;

  // Available committees for this user
  const selectableCommittees = isHrOrExec
    ? committees
    : committees.filter((c) => c.id === headCommitteeId);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    committee_id: '',
    assignee_id: '',
    priority: 'normal',
    due_date: '',
    points_value: 0,
  });

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  // Reset or fill form on open
  useEffect(() => {
    if (taskToEdit) {
      setFormData({
        title: taskToEdit.title || '',
        description: taskToEdit.description || '',
        committee_id: taskToEdit.committee_id || '',
        assignee_id: taskToEdit.assignee_id || '',
        priority: taskToEdit.priority || 'normal',
        due_date: taskToEdit.due_date ? new Date(taskToEdit.due_date).toISOString().slice(0, 16) : '',
        points_value: taskToEdit.points_value || 0,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        committee_id: selectableCommittees[0]?.id || headCommitteeId || '',
        assignee_id: '',
        priority: 'normal',
        due_date: '',
        points_value: 10,
      });
    }
  }, [taskToEdit, isOpen, selectableCommittees, headCommitteeId]);

  // Fetch candidate assignees (members of the selected committee in the active season)
  const { data: eligibleAssignees = [] } = useQuery({
    queryKey: ['dashboard', 'eligible_assignees', formData.committee_id, activeSeasonId],
    queryFn: async () => {
      if (!formData.committee_id) return [];
      let q = supabase
        .from('memberships')
        .select(`
          user_id,
          position,
          status,
          profiles!inner(
            id,
            full_name_ar,
            full_name_en,
            avatar_url
          )
        `)
        .eq('committee_id', formData.committee_id)
        .eq('status', 'active');

      if (activeSeasonId) {
        q = q.eq('season_id', activeSeasonId);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(formData.committee_id),
  });

  // Save / Update Mutation
  const saveTaskMutation = useMutation({
    mutationFn: async (payload) => {
      if (taskToEdit) {
        // Update existing
        const { data, error } = await supabase
          .from('tasks')
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', taskToEdit.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('tasks')
          .insert([
            {
              ...payload,
              season_id: activeSeasonId,
              created_by: user.id,
              status: 'todo',
            },
          ])
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      toast.show(
        taskToEdit
          ? isAr
            ? 'تم حفظ تعديلات المهمة'
            : 'Task updated successfully'
          : isAr
          ? 'تم إنشاء المهمة بنجاح'
          : 'Task created successfully',
        'success'
      );
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'tasks'] });
      onClose();
    },
    onError: (err) => {
      toast.show(err.message || (isAr ? 'فشل حفظ المهمة' : 'Failed to save task'), 'error');
    },
  });

  // Delete Mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('tasks').delete().eq('id', taskToEdit.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.show(isAr ? 'تم حذف المهمة' : 'Task deleted', 'success');
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'tasks'] });
      setIsDeleteOpen(false);
      onClose();
    },
    onError: (err) => {
      toast.show(err.message || (isAr ? 'فشل حذف المهمة' : 'Failed to delete task'), 'error');
    },
  });

  // Cancel Task Mutation
  const cancelTaskMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', taskToEdit.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.show(isAr ? 'تم إلغاء المهمة' : 'Task cancelled', 'success');
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'tasks'] });
      setIsCancelOpen(false);
      onClose();
    },
    onError: (err) => {
      toast.show(err.message || (isAr ? 'فشل إلغاء المهمة' : 'Failed to cancel task'), 'error');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.show(isAr ? 'عنوان المهمة مطلوب' : 'Task title is required', 'error');
      return;
    }
    if (!formData.committee_id) {
      toast.show(isAr ? 'يرجى اختيار اللجنة' : 'Please select a committee', 'error');
      return;
    }

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      committee_id: formData.committee_id,
      assignee_id: formData.assignee_id || null,
      priority: formData.priority,
      due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
      points_value: parseInt(formData.points_value, 10) || 0,
    };

    saveTaskMutation.mutate(payload);
  };

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title={
          taskToEdit
            ? isAr
              ? 'تعديل المهمة'
              : 'Edit Task'
            : isAr
            ? 'إنشاء مهمة جديدة'
            : 'Create New Task'
        }
        subtitle={
          taskToEdit
            ? taskToEdit.title
            : isAr
            ? 'إسناد مهمة لعضو مع تحديد النقاط وموعد التسليم'
            : 'Assign a task with points and deadline'
        }
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', flexWrap: 'wrap' }}>
            {taskToEdit && (
              <>
                <button
                  type="button"
                  onClick={() => setIsDeleteOpen(true)}
                  className="btn-danger-compact"
                  style={{
                    padding: '0.65rem 1rem',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Trash2 size={16} />
                  <span>{isAr ? 'حذف' : 'Delete'}</span>
                </button>

                {taskToEdit.status !== 'cancelled' && (
                  <button
                    type="button"
                    onClick={() => setIsCancelOpen(true)}
                    className="btn-secondary"
                    style={{
                      padding: '0.65rem 1rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <XCircle size={16} />
                    <span>{isAr ? 'إلغاء المهمة' : 'Cancel Task'}</span>
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={saveTaskMutation.isPending}
              className="btn-primary"
              style={{
                flex: 1,
                padding: '0.75rem',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <Save size={16} />
              <span>
                {saveTaskMutation.isPending
                  ? isAr
                    ? 'جاري الحفظ...'
                    : 'Saving...'
                  : taskToEdit
                  ? isAr
                    ? 'حفظ التعديلات'
                    : 'Save Changes'
                  : isAr
                  ? 'إنشاء المهمة'
                  : 'Create Task'}
              </span>
            </button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Title */}
          <FormField label={isAr ? 'عنوان المهمة' : 'Task Title'} required>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={isAr ? 'مثال: تصميم بوستر فعالية الافتتاح' : 'e.g. Design event banner'}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255, 184, 0, 0.3)',
                color: '#fff',
              }}
              required
            />
          </FormField>

          {/* Description */}
          <FormField label={isAr ? 'وصف وتفاصيل المهمة' : 'Description'}>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={isAr ? 'اكتب تفاصيل ومطلوبات المهمة بالتفصيل...' : 'Enter task requirements...'}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255, 184, 0, 0.3)',
                color: '#fff',
                resize: 'vertical',
              }}
            />
          </FormField>

          {/* Committee Select */}
          <FormField label={isAr ? 'اللجنة التابعة' : 'Committee'} required>
            <select
              value={formData.committee_id}
              onChange={(e) => {
                setFormData({ ...formData, committee_id: e.target.value, assignee_id: '' });
              }}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255, 184, 0, 0.3)',
                color: '#fff',
              }}
              required
            >
              <option value="" style={{ background: '#181920', color: '#888' }}>
                {isAr ? '-- اختر اللجنة --' : '-- Choose Committee --'}
              </option>
              {selectableCommittees.map((c) => (
                <option key={c.id} value={c.id} style={{ background: '#181920', color: '#fff' }}>
                  {isAr ? c.name_ar : c.name_en}
                </option>
              ))}
            </select>
          </FormField>

          {/* Assignee Select */}
          <FormField label={isAr ? 'تعيين لعضو' : 'Assign to Member'}>
            <select
              value={formData.assignee_id}
              onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255, 184, 0, 0.3)',
                color: '#fff',
              }}
            >
              <option value="" style={{ background: '#181920', color: '#888' }}>
                {isAr ? '-- بدون تعيين (مهمة عامة للجنة) --' : '-- Unassigned (General Committee Task) --'}
              </option>
              {eligibleAssignees.map((m) => {
                const mName = isAr
                  ? m.profiles?.full_name_ar || m.profiles?.full_name_en
                  : m.profiles?.full_name_en || m.profiles?.full_name_ar;
                return (
                  <option key={m.user_id} value={m.user_id} style={{ background: '#181920', color: '#fff' }}>
                    {mName} ({m.position})
                  </option>
                );
              })}
            </select>
          </FormField>

          {/* Priority & Points Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField label={isAr ? 'الأولوية' : 'Priority'}>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255, 184, 0, 0.3)',
                  color: '#fff',
                }}
              >
                <option value="low" style={{ background: '#181920', color: '#fff' }}>
                  {isAr ? 'منخفضة' : 'Low'}
                </option>
                <option value="normal" style={{ background: '#181920', color: '#fff' }}>
                  {isAr ? 'عادية' : 'Normal'}
                </option>
                <option value="high" style={{ background: '#181920', color: '#fff' }}>
                  {isAr ? 'مرتفعة' : 'High'}
                </option>
                <option value="urgent" style={{ background: '#181920', color: '#fff' }}>
                  {isAr ? 'عاجلة' : 'Urgent'}
                </option>
              </select>
            </FormField>

            <FormField label={isAr ? 'قيمة النقاط (Bonus)' : 'Points Value'}>
              <input
                type="number"
                min="0"
                value={formData.points_value}
                onChange={(e) => setFormData({ ...formData, points_value: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255, 184, 0, 0.3)',
                  color: '#fff',
                }}
              />
            </FormField>
          </div>

          {/* Due Date */}
          <FormField label={isAr ? 'موعد التسليم (Due Date)' : 'Due Date'}>
            <input
              type="datetime-local"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255, 184, 0, 0.3)',
                color: '#fff',
              }}
            />
          </FormField>
        </form>
      </Drawer>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => deleteTaskMutation.mutate()}
        title={isAr ? 'تأكيد حذف المهمة' : 'Confirm Task Deletion'}
        description={
          isAr
            ? `هل أنت متأكد من رغبتك في حذف مهمة "${taskToEdit?.title}"؟ لا يمكن التراجع عن هذا الإجراء وسيتم حذف جميع التعليقات والمرفقات التابعة لها.`
            : `Are you sure you want to delete "${taskToEdit?.title}"? All attached comments and files will be removed.`
        }
        confirmText={isAr ? 'نعم، احذف المهمة' : 'Yes, Delete'}
        variant="danger"
        isLoading={deleteTaskMutation.isPending}
      />

      {/* Cancel Confirmation */}
      <ConfirmDialog
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        onConfirm={() => cancelTaskMutation.mutate()}
        title={isAr ? 'تأكيد إلغاء المهمة' : 'Confirm Task Cancellation'}
        description={
          isAr
            ? `سيتم تحويل حالة المهمة إلى "ملغاة" (Cancelled) دون حذف سجلها أو تعليقاتها.`
            : `The task status will be marked as cancelled.`
        }
        confirmText={isAr ? 'تأكيد الإلغاء' : 'Confirm Cancel'}
        variant="gold"
        isLoading={cancelTaskMutation.isPending}
      />
    </>
  );
}
