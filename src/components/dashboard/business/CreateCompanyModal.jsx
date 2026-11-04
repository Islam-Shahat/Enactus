// src/components/dashboard/business/CreateCompanyModal.jsx
import React, { useState } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Building2, Globe, MapPin, Briefcase, User, Sparkles } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../Toast';
import FormField from '../FormField';
import { COMPANY_STAGES } from '../../../lib/businessHelpers';

export default function CreateCompanyModal({ isOpen, onClose, onCreated }) {
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const isAr = lang === 'ar';
  const queryClient = useQueryClient();
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name_ar: '',
    name_en: '',
    industry: '',
    website: '',
    address: '',
    stage: 'lead',
    owner_id: user?.id || '',
  });

  // Query profiles for owner selection
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['profiles', 'company_owners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name_ar, full_name_en')
        .order('full_name_ar');
      if (error) return [];
      return data || [];
    },
    enabled: isOpen,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name_ar.trim()) {
      toast.show(isAr ? 'يرجى إدخال اسم الشركة بالعربية' : 'Company Arabic name is required', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .insert({
          name_ar: formData.name_ar.trim(),
          name_en: formData.name_en.trim() || null,
          industry: formData.industry.trim() || null,
          website: formData.website.trim() || null,
          address: formData.address.trim() || null,
          stage: formData.stage,
          owner_id: formData.owner_id || user?.id || null,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.show(
        isAr ? 'تمت إضافة الشركة بنجاح إلى مسار العلاقات' : 'Company added successfully',
        'success'
      );
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      if (onCreated) onCreated(data);
      onClose();
    } catch (err) {
      console.error('Error creating company:', err);
      toast.show(
        err.message || (isAr ? 'حدث خطأ أثناء إضافة الشركة' : 'Failed to add company'),
        'error'
      );
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
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
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
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(255, 184, 0, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffb800',
            }}
          >
            <Building2 size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
              {isAr ? 'إضافة شركة جديدة' : 'Add New Company'}
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
              {isAr ? 'تسجيل شركة في قاعدة بيانات العلاقات العامة والشركاء' : 'Register company into PR & partnerships CRM'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <FormField
            label={isAr ? 'اسم الشركة (بالعربية)' : 'Company Name (Arabic)'}
            required
          >
            <input
              type="text"
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              placeholder={isAr ? 'مثال: شركة مياه الشرب والصرف الصحي' : 'e.g. Acme Corp Arabic Name'}
              required
              className="dashboard-input"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 184, 0, 0.2)',
                color: '#fff',
                fontSize: '0.95rem',
              }}
            />
          </FormField>

          <FormField label={isAr ? 'اسم الشركة (بالإنجليزية)' : 'Company Name (English)'}>
            <input
              type="text"
              value={formData.name_en}
              onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              placeholder="e.g. Acme Corporation"
              className="dashboard-input"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 184, 0, 0.2)',
                color: '#fff',
                fontSize: '0.95rem',
              }}
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField label={isAr ? 'مجال العمل / الصناعة' : 'Industry'}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  placeholder={isAr ? 'تقنية / صناعة / بنوك' : 'Tech / Banking'}
                  className="dashboard-input"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 184, 0, 0.2)',
                    color: '#fff',
                    fontSize: '0.95rem',
                  }}
                />
              </div>
            </FormField>

            <FormField label={isAr ? 'مرحلة المسار (Stage)' : 'Pipeline Stage'}>
              <select
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                className="dashboard-input"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 184, 0, 0.2)',
                  color: '#fff',
                  fontSize: '0.95rem',
                }}
              >
                {COMPANY_STAGES.map((st) => (
                  <option key={st.key} value={st.key} style={{ background: '#161822', color: '#fff' }}>
                    {st.label[lang] || st.label.ar}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label={isAr ? 'الموقع الإلكتروني' : 'Website'}>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://example.com"
              className="dashboard-input"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 184, 0, 0.2)',
                color: '#fff',
                fontSize: '0.95rem',
              }}
            />
          </FormField>

          <FormField label={isAr ? 'العنوان والمقر' : 'Address'}>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder={isAr ? 'قنا / القاهرة / المنطقة الصناعية' : 'e.g. Industrial Zone, Qena'}
              className="dashboard-input"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 184, 0, 0.2)',
                color: '#fff',
                fontSize: '0.95rem',
              }}
            />
          </FormField>

          <FormField label={isAr ? 'مسؤول التواصل (Owner)' : 'Owner'}>
            <select
              value={formData.owner_id}
              onChange={(e) => setFormData({ ...formData, owner_id: e.target.value })}
              className="dashboard-input"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 184, 0, 0.2)',
                color: '#fff',
                fontSize: '0.95rem',
              }}
            >
              <option value="" style={{ background: '#161822', color: '#fff' }}>
                {isAr ? '-- غير محدد --' : '-- Unassigned --'}
              </option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id} style={{ background: '#161822', color: '#fff' }}>
                  {isAr ? m.full_name_ar || m.full_name_en : m.full_name_en || m.full_name_ar}
                </option>
              ))}
            </select>
          </FormField>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-secondary"
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '10px',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
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
              {loading ? (isAr ? 'جاري الإضافة...' : 'Adding...') : (isAr ? 'إضافة الشركة' : 'Add Company')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

