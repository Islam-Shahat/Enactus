// src/components/dashboard/PointRuleModal.jsx
import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import FormField from './FormField';
import { useToast } from './Toast';
import { Settings2, Save, X, Loader2 } from 'lucide-react';

export default function PointRuleModal({
  isOpen,
  onClose,
  ruleToEdit = null,
}) {
  const { lang, dir } = useLanguage();
  const { isDark } = useTheme();
  const isAr = lang === 'ar';
  const toast = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    code: '',
    name_ar: '',
    name_en: '',
    type: 'bonus',
    value: 10,
    active: true,
    description: '',
  });

  useEffect(() => {
    if (ruleToEdit) {
      setFormData({
        code: ruleToEdit.code || '',
        name_ar: ruleToEdit.name_ar || '',
        name_en: ruleToEdit.name_en || '',
        type: ruleToEdit.type || 'bonus',
        value: ruleToEdit.value || 10,
        active: ruleToEdit.active ?? true,
        description: ruleToEdit.description || '',
      });
    } else {
      setFormData({
        code: '',
        name_ar: '',
        name_en: '',
        type: 'bonus',
        value: 10,
        active: true,
        description: '',
      });
    }
  }, [ruleToEdit, isOpen]);

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (ruleToEdit) {
        const { data, error } = await supabase
          .from('point_rules')
          .update({
            name_ar: payload.name_ar,
            name_en: payload.name_en,
            type: payload.type,
            value: payload.value,
            active: payload.active,
            description: payload.description,
          })
          .eq('id', ruleToEdit.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('point_rules')
          .insert([
            {
              code: payload.code.toLowerCase().trim().replace(/\s+/g, '_'),
              name_ar: payload.name_ar,
              name_en: payload.name_en,
              type: payload.type,
              value: payload.value,
              active: payload.active,
              is_auto: false,
              description: payload.description,
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
        ruleToEdit
          ? isAr ? 'تم تعديل قاعدة النقاط بنجاح' : 'Point rule updated successfully'
          : isAr ? 'تم إضافة قاعدة النقاط بنجاح' : 'Point rule created successfully',
        'success'
      );
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'point_rules_list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'point_rules_active'] });
      onClose();
    },
    onError: (err) => {
      console.error('[PointRuleModal error]:', err);
      toast.show(err.message || (isAr ? 'فشل حفظ القاعدة' : 'Failed to save rule'), 'error');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!ruleToEdit && !formData.code.trim()) {
      toast.show(isAr ? 'كود القاعدة مطلوب' : 'Rule code is required', 'error');
      return;
    }
    if (!formData.name_ar.trim() || !formData.name_en.trim()) {
      toast.show(isAr ? 'الاسم بالعربية والإنجليزية مطلوب' : 'Both Arabic and English names are required', 'error');
      return;
    }
    if (formData.value <= 0) {
      toast.show(isAr ? 'قيمة النقاط يجب أن تكون أكبر من 0' : 'Value must be greater than zero', 'error');
      return;
    }

    saveMutation.mutate(formData);
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
          maxWidth: '520px',
          width: '100%',
          boxShadow: isDark ? '0 25px 60px rgba(0,0,0,0.85)' : '0 20px 50px rgba(184, 120, 0, 0.15)',
          background: isDark
            ? 'linear-gradient(150deg, rgba(22, 24, 34, 0.98), rgba(12, 13, 18, 0.98))'
            : 'rgba(255, 255, 255, 0.98)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
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
              <Settings2 size={20} />
            </div>
            <h3 className="modal-header-title" style={{ margin: 0, color: titleColor, fontSize: '1.2rem', fontWeight: 800 }}>
              {ruleToEdit
                ? isAr ? 'تعديل قاعدة النقاط' : 'Edit Point Rule'
                : isAr ? 'إضافة قاعدة نقاط جديدة' : 'Add Point Rule'}
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <FormField label={isAr ? 'كود القاعدة (Code)' : 'Rule Code'} required={!ruleToEdit}>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="e.g. workshop_lead"
              disabled={Boolean(ruleToEdit)}
              style={{ ...inputStyle, opacity: ruleToEdit ? 0.6 : 1 }}
              required={!ruleToEdit}
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField label={isAr ? 'الاسم بالعربية' : 'Arabic Name'} required>
              <input
                type="text"
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                placeholder="مثال: تقديم ورشة تدريبية"
                style={inputStyle}
                required
              />
            </FormField>

            <FormField label={isAr ? 'الاسم بالإنجليزية' : 'English Name'} required>
              <input
                type="text"
                value={formData.name_en}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                placeholder="e.g. Workshop Delivery"
                style={inputStyle}
                required
              />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField label={isAr ? 'النوع' : 'Type'} required>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
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

            <FormField label={isAr ? 'القيمة (النقاط)' : 'Points Value'} required>
              <input
                type="number"
                min="1"
                max="1000"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                style={inputStyle}
                required
              />
            </FormField>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.2rem' }}>
            <input
              type="checkbox"
              id="rule-active-toggle"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: '#ffb800', cursor: 'pointer' }}
            />
            <label htmlFor="rule-active-toggle" style={{ fontSize: '0.9rem', color: isDark ? '#fff' : '#111', cursor: 'pointer' }}>
              {isAr ? 'تفعيل القاعدة (متاحة للاستخدام)' : 'Active rule (available for selection)'}
            </label>
          </div>

          <FormField label={isAr ? 'وصف القاعدة (اختياري)' : 'Description (Optional)'}>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={isAr ? 'تفاصيل إضافية لشروط تطبيق القاعدة...' : 'Details for applying this rule...'}
              style={inputStyle}
            />
          </FormField>

          <div style={{ display: 'flex', gap: '0.85rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saveMutation.isPending}
              className="btn-secondary"
              style={{ flex: 1, padding: '0.75rem', borderRadius: '10px' }}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
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
              {saveMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{isAr ? 'جاري الحفظ...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>{isAr ? 'حفظ القاعدة' : 'Save Rule'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

