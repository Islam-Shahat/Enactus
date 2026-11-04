// src/components/dashboard/business/CreateAgreementModal.jsx
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Building2, UploadCloud, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../Toast';
import FormField from '../FormField';
import { SPONSOR_TIERS, formatMoney, parseMoney } from '../../../lib/businessHelpers';
import { uploadContractPdf } from '../../../lib/businessStorage';

export default function CreateAgreementModal({ isOpen, onClose, onCreated }) {
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const isAr = lang === 'ar';
  const queryClient = useQueryClient();
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_id: '',
    season_id: '',
    package_id: '',
    title: '',
    total_value: '',
    start_date: '',
    end_date: '',
    owner_id: user?.id || '',
    notes: '',
  });
  const [contractFile, setContractFile] = useState(null);

  // Fetch active season & all seasons
  const { data: seasons = [] } = useQuery({
    queryKey: ['seasons', 'list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('id, name, is_active')
        .order('is_active', { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: isOpen,
  });

  // Default active season
  React.useEffect(() => {
    if (seasons.length > 0 && !formData.season_id) {
      const active = seasons.find((s) => s.is_active) || seasons[0];
      setFormData((prev) => ({ ...prev, season_id: active.id }));
    }
  }, [seasons, formData.season_id]);

  // Fetch companies for dropdown
  const { data: companies = [] } = useQuery({
    queryKey: ['companies', 'dropdown'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name_ar, name_en')
        .order('name_ar');
      if (error) return [];
      return data || [];
    },
    enabled: isOpen,
  });

  // Fetch sponsorship packages
  const { data: packages = [] } = useQuery({
    queryKey: ['sponsorship_packages', formData.season_id],
    queryFn: async () => {
      let q = supabase
        .from('sponsorship_packages')
        .select('id, name_ar, name_en, tier, price, is_active')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (formData.season_id) {
        q = q.or(`season_id.eq.${formData.season_id},season_id.is.null`);
      }
      const { data, error } = await q;
      if (error) return [];
      return data || [];
    },
    enabled: isOpen,
  });

  // Fetch profiles for owner dropdown
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['profiles', 'agreement_owners'],
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

  // When package changes, prefill title and total_value
  const handlePackageChange = (pkgId) => {
    if (!pkgId) {
      setFormData((prev) => ({ ...prev, package_id: '' }));
      return;
    }

    const selectedPkg = packages.find((p) => p.id === pkgId);
    const selectedCompany = companies.find((c) => c.id === formData.company_id);
    const compName = selectedCompany
      ? isAr
        ? selectedCompany.name_ar
        : selectedCompany.name_en || selectedCompany.name_ar
      : '';

    if (selectedPkg) {
      const pkgName = isAr ? selectedPkg.name_ar : selectedPkg.name_en || selectedPkg.name_ar;
      setFormData((prev) => ({
        ...prev,
        package_id: pkgId,
        total_value: String(selectedPkg.price),
        title: prev.title || `${isAr ? 'اتفاقية رعاية' : 'Sponsorship Agreement'} - ${pkgName}${compName ? ` - ${compName}` : ''}`,
      }));
    }
  };

  const handleCompanyChange = (compId) => {
    const selectedCompany = companies.find((c) => c.id === compId);
    const compName = selectedCompany
      ? isAr
        ? selectedCompany.name_ar
        : selectedCompany.name_en || selectedCompany.name_ar
      : '';

    setFormData((prev) => {
      let nextTitle = prev.title;
      if (!nextTitle && compName) {
        nextTitle = `${isAr ? 'عقد رعاية' : 'Sponsorship Agreement'} - ${compName}`;
      }
      return {
        ...prev,
        company_id: compId,
        title: nextTitle,
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.company_id) {
      toast.show(isAr ? 'يرجى اختيار الشركة' : 'Please select a company', 'error');
      return;
    }
    if (!formData.season_id) {
      toast.show(isAr ? 'يرجى اختيار الموسم' : 'Please select a season', 'error');
      return;
    }
    if (!formData.title.trim()) {
      toast.show(isAr ? 'يرجى إدخال عنوان الاتفاقية' : 'Agreement title is required', 'error');
      return;
    }
    const val = parseMoney(formData.total_value);
    if (val <= 0) {
      toast.show(isAr ? 'يرجى إدخال قيمة مالية صحيحة' : 'Please enter a valid agreement value', 'error');
      return;
    }

    setLoading(true);
    try {
      const agreementId = crypto.randomUUID();
      let contractPath = null;

      // Upload contract PDF if provided
      if (contractFile) {
        contractPath = await uploadContractPdf(agreementId, contractFile);
      }

      const { data, error } = await supabase
        .from('agreements')
        .insert({
          id: agreementId,
          season_id: formData.season_id,
          company_id: formData.company_id,
          package_id: formData.package_id || null,
          title: formData.title.trim(),
          total_value: val,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          contract_path: contractPath,
          status: 'draft',
          owner_id: formData.owner_id || user?.id || null,
          notes: formData.notes.trim() || null,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.show(
        isAr ? 'تم إنشاء الاتفاقية بنجاح' : 'Agreement created successfully',
        'success'
      );
      queryClient.invalidateQueries({ queryKey: ['agreements'] });
      queryClient.invalidateQueries({ queryKey: ['agreement_balances'] });
      if (onCreated) onCreated(data);
      onClose();
    } catch (err) {
      console.error('Error creating agreement:', err);
      toast.show(
        err.message || (isAr ? 'فشل إنشاء الاتفاقية' : 'Failed to create agreement'),
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
          maxWidth: '650px',
          maxHeight: '92vh',
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
            <FileText size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
              {isAr ? 'إنشاء اتفاقية رعاية جديدة' : 'New Sponsorship Agreement'}
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
              {isAr ? 'تسجيل عقد رعاية أو شراكة مع ربط الباقات المالية والملفات' : 'Register a sponsorship agreement with packages and contract'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField label={isAr ? 'الشركة الشريكة' : 'Partner Company'} required>
              <select
                required
                value={formData.company_id}
                onChange={(e) => handleCompanyChange(e.target.value)}
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
                <option value="" style={{ background: '#161822', color: '#fff' }}>
                  {isAr ? '-- اختر الشركة --' : '-- Select Company --'}
                </option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id} style={{ background: '#161822', color: '#fff' }}>
                    {isAr ? c.name_ar : c.name_en || c.name_ar}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label={isAr ? 'الموسم الأكاديمي' : 'Season'} required>
              <select
                required
                value={formData.season_id}
                onChange={(e) => setFormData({ ...formData, season_id: e.target.value })}
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
                {seasons.map((s) => (
                  <option key={s.id} value={s.id} style={{ background: '#161822', color: '#fff' }}>
                    {s.name} {s.is_active ? (isAr ? '(الموسم الحالي)' : '(Active)') : ''}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
            <FormField label={isAr ? 'باقة الرعاية (اختياري للربط المسبق)' : 'Sponsorship Package'}>
              <select
                value={formData.package_id}
                onChange={(e) => handlePackageChange(e.target.value)}
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
                <option value="" style={{ background: '#161822', color: '#fff' }}>
                  {isAr ? '-- اتفاقية مخصصة بدون باقة --' : '-- Custom Agreement --'}
                </option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id} style={{ background: '#161822', color: '#fff' }}>
                    {isAr ? pkg.name_ar : pkg.name_en} ({formatMoney(pkg.price, lang)})
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label={isAr ? 'القيمة الإجمالية (جنيه مصري)' : 'Total Value (EGP)'}
              required
            >
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.total_value}
                onChange={(e) => setFormData({ ...formData, total_value: e.target.value })}
                placeholder="0.00"
                className="dashboard-input"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 184, 0, 0.2)',
                  color: '#fff',
                  fontWeight: 700,
                }}
              />
            </FormField>
          </div>

          <FormField label={isAr ? 'عنوان الاتفاقية / العقد' : 'Agreement Title'} required>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={isAr ? 'مثال: عقد رعاية الموسم لشركة المياه' : 'e.g. Annual Platinum Sponsorship'}
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
            <FormField label={isAr ? 'تاريخ بداية الاتفاقية' : 'Start Date'}>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
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

            <FormField label={isAr ? 'تاريخ نهاية الاتفاقية' : 'End Date'}>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
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

          <FormField label={isAr ? 'المسؤول من الفريق (Owner)' : 'Assigned PR Owner'}>
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

          {/* Contract PDF Upload */}
          <FormField
            label={isAr ? 'نسخة العقد الموقعة (PDF فقط - بحد أقصى 10 ميجابايت)' : 'Signed Contract File (PDF only, max 10MB)'}
          >
            <div
              style={{
                border: '2px dashed rgba(255, 184, 0, 0.3)',
                borderRadius: '12px',
                padding: '1.25rem',
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.02)',
                cursor: 'pointer',
              }}
              onClick={() => document.getElementById('contract-file-input').click()}
            >
              <input
                id="contract-file-input"
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    if (f.type !== 'application/pdf') {
                      toast.show(isAr ? 'يجب أن يكون الملف بصيغة PDF' : 'File must be PDF', 'error');
                      return;
                    }
                    if (f.size > 10 * 1024 * 1024) {
                      toast.show(isAr ? 'حجم الملف يتجاوز 10 ميجابايت' : 'Max file size is 10MB', 'error');
                      return;
                    }
                    setContractFile(f);
                  }
                }}
              />
              <UploadCloud size={28} color="#ffb800" style={{ margin: '0 auto 0.5rem' }} />
              {contractFile ? (
                <div style={{ color: '#34d399', fontWeight: 600, fontSize: '0.9rem' }}>
                  {contractFile.name} ({(contractFile.size / (1024 * 1024)).toFixed(2)} MB)
                </div>
              ) : (
                <div style={{ color: '#a0a0b2', fontSize: '0.85rem' }}>
                  {isAr ? 'اضغط هنا لرفع ملف العقد الموثق' : 'Click to select signed PDF contract'}
                </div>
              )}
            </div>
          </FormField>

          <FormField label={isAr ? 'ملاحظات وبنود إضافية' : 'Notes & Key Terms'}>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={isAr ? 'أي شروط خاصة أو مواعيد إضافية متفق عليها...' : 'Any special terms or remarks...'}
              className="dashboard-input"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 184, 0, 0.2)',
                color: '#fff',
              }}
            />
          </FormField>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
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
              {loading ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'إنشاء الاتفاقية' : 'Create Agreement')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

