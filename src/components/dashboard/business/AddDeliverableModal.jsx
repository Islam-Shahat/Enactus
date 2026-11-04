// src/components/dashboard/business/AddDeliverableModal.jsx
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckSquare } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../Toast';
import FormField from '../FormField';
import { DELIVERABLE_KINDS } from '../../../lib/businessHelpers';

export default function AddDeliverableModal({ isOpen, onClose, agreementId, companyId, onCreated }) {
  const { lang, dir } = useLanguage();
  const isAr = lang === 'ar';
  const queryClient = useQueryClient();
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    kind: 'post',
    title: '',
    required_count: 1,
    due_date: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreementId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('deliverables')
        .insert({
          agreement_id: agreementId,
          company_id: companyId || null, // DB trigger fill_deliverable_company will resolve if null
          kind: formData.kind,
          title: formData.title.trim() || null,
          required_count: Math.max(1, parseInt(formData.required_count, 10) || 1),
          due_date: formData.due_date || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.show(isAr ? 'تمت إضافة الالتزام بنجاح' : 'Deliverable added successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['deliverables', agreementId] });
      queryClient.invalidateQueries({ queryKey: ['deliverable_progress'] });
      if (onCreated) onCreated(data);
      onClose();
    } catch (err) {
      console.error('Error adding deliverable:', err);
      toast.show(err.message || (isAr ? 'فشل إضافة الالتزام' : 'Failed to add deliverable'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        dir={dir}
        onClick={(e) => e.stopPropagation()}
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '500px',
          background: 'linear-gradient(170deg, rgba(22, 24, 34, 0.98), rgba(12, 13, 18, 0.98))',
          borderRadius: '20px',
          border: '1px solid rgba(255, 184, 0, 0.3)',
          padding: '2rem',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(255, 184, 0, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffb800',
            }}
          >
            <CheckSquare size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
              {isAr ? 'إضافة التزام / تسليمات للاتفاقية' : 'Add Agreement Deliverable'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
              {isAr ? 'تحديد التزامات السوشيال ميديا أو الفعاليات المتفق عليها' : 'Specify promotional or event deliverables agreed upon'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <FormField label={isAr ? 'نوع الالتزام (Deliverable Kind)' : 'Kind'} required>
            <select
              value={formData.kind}
              onChange={(e) => setFormData({ ...formData, kind: e.target.value })}
              className="dashboard-input"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 184, 0, 0.2)',
                color: '#fff',
              }}
            >
              {Object.entries(DELIVERABLE_KINDS).map(([key, obj]) => (
                <option key={key} value={key} style={{ background: '#161822', color: '#fff' }}>
                  {obj[lang] || obj.ar}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={isAr ? 'وصف / عنوان الالتزام' : 'Deliverable Title / Description'}>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={isAr ? 'مثال: بوست شكر وإعلان الشراكة على فيسبوك' : 'e.g. Partnership announcement post on Facebook'}
              className="dashboard-input"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 184, 0, 0.2)',
                color: '#fff',
              }}
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField label={isAr ? 'العدد المطلوب' : 'Required Count'} required>
              <input
                type="number"
                min="1"
                required
                value={formData.required_count}
                onChange={(e) => setFormData({ ...formData, required_count: e.target.value })}
                className="dashboard-input"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 184, 0, 0.2)',
                  color: '#fff',
                }}
              />
            </FormField>

            <FormField label={isAr ? 'الموعد المحدد للتسليم' : 'Due Date'}>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="dashboard-input"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 184, 0, 0.2)',
                  color: '#fff',
                }}
              />
            </FormField>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-secondary"
              style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', fontSize: '0.9rem', cursor: 'pointer' }}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                padding: '0.75rem 1.8rem',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {loading ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'إضافة الالتزام' : 'Add Deliverable')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

