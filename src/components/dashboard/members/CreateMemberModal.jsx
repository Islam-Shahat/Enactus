// src/components/dashboard/members/CreateMemberModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useLanguage } from '../../../context/LanguageContext';
import { parseEgyptianNationalId, formatMemberCode } from '../../../lib/nationalIdHelper';
import { useToast } from '../Toast';
import {
  UserPlus,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';

const COMMON_FACULTIES = [
  'كلية الهندسة',
  'كلية الحاسبات والمعلومات',
  'كلية التجارة',
  'كلية الطب البشري',
  'كلية الصيدلة',
  'كلية العلاج الطبيعي',
  'كلية العلوم',
  'كلية الآداب',
  'كلية الحقوق',
  'كلية التربية',
  'كلية الإعلام',
  'كلية الزراعة',
  'كلية التمريض',
  'أخرى',
];

export default function CreateMemberModal({ isOpen, onClose, committees = [], seasonYear = '2026', nextSequence = 1 }) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const toast = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    fullNameAr: '',
    fullNameEn: '',
    nationalId: '',
    phone: '',
    email: '',
    committeeId: '',
    position: 'member',
    faculty: 'كلية التجارة',
    studyYear: 2,
  });

  const [formError, setFormError] = useState('');
  const [successResult, setSuccessResult] = useState(null);

  // Set default committee when list is loaded
  useEffect(() => {
    if (committees.length > 0 && !formData.committeeId) {
      setFormData((prev) => ({ ...prev, committeeId: committees[0].id }));
    }
  }, [committees, formData.committeeId]);

  // Decode Egyptian National ID live
  const parsedNid = useMemo(() => {
    if (formData.nationalId.length === 14) {
      return parseEgyptianNationalId(formData.nationalId);
    }
    return null;
  }, [formData.nationalId]);

  // Preview expected Member Code (e.g. 2026001)
  const previewMemberCode = useMemo(() => {
    return formatMemberCode(seasonYear, nextSequence);
  }, [seasonYear, nextSequence]);

  const createMemberMutation = useMutation({
    mutationFn: async (payload) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error(isAr ? 'جلسة غير مصرح بها. يرجى إعادة تسجيل الدخول.' : 'Unauthorized session.');
      }

      // 1. Try secure database RPC first (independent of un-deployed Edge Functions)
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('create_member_admin', {
          p_full_name_ar: payload.fullNameAr,
          p_full_name_en: payload.fullNameEn || payload.fullNameAr,
          p_national_id: payload.nationalId,
          p_phone: payload.phone || null,
          p_email: payload.email || null,
          p_committee_id: payload.committeeId,
          p_position: payload.position || 'member',
          p_faculty: payload.faculty || null,
          p_study_year: payload.studyYear ? parseInt(payload.studyYear, 10) : null,
          p_birth_date: payload.birthDate || null,
          p_gender: payload.gender || null,
          p_governorate: payload.governorate || null,
        });

        if (!rpcErr && rpcData) {
          if (rpcData.ok === false) {
            throw new Error(rpcData.error || (isAr ? 'فشل إضافة العضو' : 'Failed to add member'));
          }
          return rpcData;
        }
        if (rpcErr && !rpcErr.message?.includes('function') && !rpcErr.message?.includes('does not exist')) {
          throw new Error(rpcErr.message);
        }
      } catch (rpcEx) {
        if (!rpcEx.message?.includes('does not exist') && !rpcEx.message?.includes('function')) {
          throw rpcEx;
        }
      }

      // 2. Fallback to Edge Function
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (isAr ? 'فشل إضافة العضو' : 'Failed to add member'));
      }
      return data;
    },
    onSuccess: (data) => {
      setSuccessResult(data);
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'members'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'members-full'] });
      toast.show(
        isAr
          ? `تمت إضافة العضو بنجاح! كود العضو: ${data.memberCode}`
          : `Member added successfully! Code: ${data.memberCode}`,
        'success'
      );
    },
    onError: (err) => {
      setFormError(err.message);
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.fullNameAr.trim() || formData.fullNameAr.trim().length < 3) {
      setFormError(isAr ? 'يرجى إدخال اسم العضو ثلاثياً بالعربية على الأقل' : 'Please enter full Arabic name');
      return;
    }

    if (!formData.nationalId.trim() || !/^\d{14}$/.test(formData.nationalId.trim())) {
      setFormError(isAr ? 'الرقم القومي يجب أن يتكون من 14 رقماً صحيحاً' : 'National ID must be 14 digits');
      return;
    }

    if (!formData.committeeId) {
      setFormError(isAr ? 'يرجى اختيار اللجنة التابع لها العضو' : 'Please select a committee');
      return;
    }

    const payload = {
      fullNameAr: formData.fullNameAr.trim(),
      fullNameEn: formData.fullNameEn.trim() || formData.fullNameAr.trim(),
      nationalId: formData.nationalId.trim(),
      phone: formData.phone.trim() || undefined,
      email: formData.email.trim() || undefined,
      committeeId: formData.committeeId,
      position: formData.position,
      faculty: formData.faculty,
      studyYear: Number(formData.studyYear),
      birthDate: parsedNid?.isValid ? parsedNid.birthDateStr : undefined,
      gender: parsedNid?.isValid ? parsedNid.gender.key : undefined,
      governorate: parsedNid?.isValid ? parsedNid.governorate.ar : undefined,
    };

    createMemberMutation.mutate(payload);
  };

  const handleResetAndClose = () => {
    setSuccessResult(null);
    setFormError('');
    setFormData({
      fullNameAr: '',
      fullNameEn: '',
      nationalId: '',
      phone: '',
      email: '',
      committeeId: committees[0]?.id || '',
      position: 'member',
      faculty: 'كلية التجارة',
      studyYear: 2,
    });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 6, 10, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: '24px',
          border: '1.5px solid rgba(255, 184, 0, 0.4)',
          background: 'linear-gradient(145deg, #12131c, #0a0b10)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(255, 184, 0, 0.2)',
          padding: '2rem',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(255, 184, 0, 0.25), rgba(255, 184, 0, 0.05))',
                border: '1px solid #ffb800',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffb800',
              }}
            >
              <UserPlus size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                {isAr ? 'إضافة عضو جديد للكوميونتي' : 'Add New Community Member'}
              </h2>
              <p style={{ color: '#88889a', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>
                {isAr
                  ? 'إنشاء حساب عضوية فوري مع كود 7 أرقام وكلمة مرور بالرقم القومي'
                  : 'Instant membership account with 7-digit code and National ID password'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetAndClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              color: '#888',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Success Card */}
        {successResult ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '2px solid #10b981',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem auto',
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
              {isAr ? 'تمت إضافة العضو بنجاح!' : 'Member Successfully Added!'}
            </h3>
            <p style={{ color: '#a0a0b2', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {isAr
                ? 'تم إنشاء حساب الداشبورد الخاص بالعضو، ويمكنه الآن تسجيل الدخول مباشرة بالبيانات التالية:'
                : 'Dashboard account created. The member can now sign in using:'}
            </p>

            <div
              className="glass-panel"
              style={{
                background: 'rgba(255, 184, 0, 0.05)',
                border: '1.5px dashed rgba(255, 184, 0, 0.5)',
                borderRadius: '16px',
                padding: '1.25rem',
                textAlign: 'start',
                marginBottom: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#888', fontSize: '0.85rem' }}>{isAr ? 'اسم العضو:' : 'Member Name:'}</span>
                <span style={{ color: '#fff', fontWeight: 700 }}>{successResult.fullNameAr}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#888', fontSize: '0.85rem' }}>{isAr ? 'كود الدخول (7 أرقام):' : 'Member Code:'}</span>
                <span style={{ color: '#ffb800', fontWeight: 900, fontSize: '1.2rem', letterSpacing: '1px' }}>
                  {successResult.memberCode}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#888', fontSize: '0.85rem' }}>{isAr ? 'كلمة المرور (الرقم القومي):' : 'Password (National ID):'}</span>
                <span style={{ color: '#ffd54f', fontWeight: 800, direction: 'ltr' }}>{successResult.nationalId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#888', fontSize: '0.85rem' }}>{isAr ? 'البريد الإلكتروني للداشبورد:' : 'Auth Email:'}</span>
                <span style={{ color: '#ddd', fontSize: '0.85rem', direction: 'ltr' }}>{successResult.email}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetAndClose}
              className="btn-gold"
              style={{
                width: '100%',
                padding: '0.85rem',
                fontWeight: 700,
                borderRadius: '12px',
                cursor: 'pointer',
              }}
            >
              {isAr ? 'تم، إغلاق والعودة للقائمة' : 'Done, Return to Members'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {formError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  borderRadius: '12px',
                  padding: '0.75rem 1rem',
                  color: '#fca5a5',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                }}
              >
                <AlertCircle size={18} />
                <span>{formError}</span>
              </div>
            )}

            {/* Expected Member Code Badge Callout */}
            <div
              style={{
                background: 'linear-gradient(90deg, rgba(255, 184, 0, 0.12), rgba(255, 184, 0, 0.03))',
                border: '1px solid rgba(255, 184, 0, 0.3)',
                borderRadius: '14px',
                padding: '0.85rem 1.15rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Sparkles size={18} color="#ffb800" />
                <div>
                  <div style={{ color: '#ffd54f', fontSize: '0.85rem', fontWeight: 700 }}>
                    {isAr ? 'كود العضو التسلسلي التلقائي' : 'Auto-generated Member Code'}
                  </div>
                  <div style={{ color: '#888', fontSize: '0.75rem' }}>
                    {isAr ? 'مكون من 7 أرقام (سنة الموسم + رقم العضو)' : '7 digits (Season year + sequence)'}
                  </div>
                </div>
              </div>
              <div
                style={{
                  background: '#ffb800',
                  color: '#000',
                  fontWeight: 900,
                  fontSize: '1.1rem',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '8px',
                  letterSpacing: '1px',
                }}
              >
                {previewMemberCode}
              </div>
            </div>

            {/* Row 1: Full Names */}
            <div className="form-grid-2">
              <div>
                <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  {isAr ? 'الاسم الكامل بالعربية *' : 'Full Name (Arabic) *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isAr ? 'مثال: إسلام شحات رسلي' : 'Islam Shahat Rosly'}
                  value={formData.fullNameAr}
                  onChange={(e) => setFormData({ ...formData, fullNameAr: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 184, 0, 0.25)',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  {isAr ? 'الاسم بالإنجليزية (اختياري)' : 'Full Name (English)'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Islam Shahat Rosly"
                  value={formData.fullNameEn}
                  onChange={(e) => setFormData({ ...formData, fullNameEn: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 184, 0, 0.25)',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '0.9rem',
                    direction: 'ltr',
                  }}
                />
              </div>
            </div>

            {/* Row 2: National ID with live decoding */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ color: '#ffd54f', fontSize: '0.85rem', fontWeight: 700 }}>
                  {isAr ? 'الرقم القومي (14 رقماً) * • كلمة السر للداشبورد' : 'National ID (14 digits) * • Dashboard Password'}
                </label>
                <span style={{ color: '#888', fontSize: '0.78rem' }}>
                  {formData.nationalId.length} / 14
                </span>
              </div>
              <input
                type="text"
                maxLength={14}
                required
                placeholder="30308152700315"
                value={formData.nationalId}
                onChange={(e) => setFormData({ ...formData, nationalId: e.target.value.replace(/\D/g, '') })}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: parsedNid?.isValid
                    ? '1.5px solid #10b981'
                    : formData.nationalId.length === 14
                    ? '1.5px solid #ef4444'
                    : '1px solid rgba(255, 184, 0, 0.25)',
                  borderRadius: '10px',
                  padding: '0.75rem',
                  color: '#fff',
                  outline: 'none',
                  fontSize: '1rem',
                  direction: 'ltr',
                  letterSpacing: '1.5px',
                  fontWeight: 700,
                }}
              />

              {/* Live Egyptian NID Decoded Info */}
              {parsedNid?.isValid && (
                <div
                  style={{
                    marginTop: '0.6rem',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '10px',
                    padding: '0.6rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    fontSize: '0.8rem',
                  }}
                >
                  <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700 }}>
                    <CheckCircle2 size={14} /> {isAr ? 'رقم قومي صحيح' : 'Valid National ID'}
                  </span>
                  <span style={{ color: '#ddd' }}>
                    🎂 {isAr ? 'الميلاد:' : 'Birth:'} {parsedNid.birthDateStr}
                  </span>
                  <span style={{ color: '#ffd54f', fontWeight: 700 }}>
                    ⏳ {isAr ? 'السن:' : 'Age:'} {parsedNid.age} {isAr ? 'سنة' : 'yrs'}
                  </span>
                  <span style={{ color: '#ddd' }}>
                    📍 {isAr ? 'المحافظة:' : 'Gov:'} {parsedNid.governorate.ar}
                  </span>
                  <span style={{ color: '#ddd' }}>
                    👤 {isAr ? 'النوع:' : 'Gender:'} {parsedNid.gender.ar}
                  </span>
                </div>
              )}
            </div>

            {/* Row 3: Committee & Position */}
            <div className="form-grid-2">
              <div>
                <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  {isAr ? 'اللجنة التابع لها *' : 'Assigned Committee *'}
                </label>
                <select
                  required
                  value={formData.committeeId}
                  onChange={(e) => setFormData({ ...formData, committeeId: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#161824',
                    border: '1px solid rgba(255, 184, 0, 0.25)',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '0.9rem',
                  }}
                >
                  {committees.map((c) => (
                    <option key={c.id} value={c.id}>
                      {isAr ? c.name_ar : c.name_en || c.name_ar}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  {isAr ? 'المنصب / الدور *' : 'Position / Role *'}
                </label>
                <select
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#161824',
                    border: '1px solid rgba(255, 184, 0, 0.25)',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '0.9rem',
                  }}
                >
                  <option value="member">{isAr ? 'عضو (Member)' : 'Member'}</option>
                  <option value="head">{isAr ? 'رئيس لجنة (Committee Head)' : 'Committee Head'}</option>
                  <option value="vice">{isAr ? 'نائب رئيس لجنة (Vice Head)' : 'Vice Head'}</option>
                  <option value="coordinator">{isAr ? 'منسق (Coordinator)' : 'Coordinator'}</option>
                </select>
              </div>
            </div>

            {/* Row 4: Phone & Email */}
            <div className="form-grid-2">
              <div>
                <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  {isAr ? 'رقم الهاتف (واتساب)' : 'Phone Number'}
                </label>
                <input
                  type="tel"
                  placeholder="01557523934"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 184, 0, 0.25)',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '0.9rem',
                    direction: 'ltr',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  {isAr ? 'البريد الإلكتروني (اختياري)' : 'Email (Optional)'}
                </label>
                <input
                  type="email"
                  placeholder={isAr ? 'مثال: islam@gmail.com' : 'e.g. islam@gmail.com'}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 184, 0, 0.25)',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '0.9rem',
                    direction: 'ltr',
                  }}
                />
              </div>
            </div>

            {/* Row 5: Faculty & Study Year */}
            <div className="form-grid-2">
              <div>
                <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  {isAr ? 'الكلية' : 'Faculty'}
                </label>
                <select
                  value={formData.faculty}
                  onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#161824',
                    border: '1px solid rgba(255, 184, 0, 0.25)',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '0.9rem',
                  }}
                >
                  {COMMON_FACULTIES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  {isAr ? 'الفرقة الدراسية' : 'Study Year'}
                </label>
                <select
                  value={formData.studyYear}
                  onChange={(e) => setFormData({ ...formData, studyYear: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    background: '#161824',
                    border: '1px solid rgba(255, 184, 0, 0.25)',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '0.9rem',
                  }}
                >
                  <option value={1}>{isAr ? 'الفرقة الأولى' : '1st Year'}</option>
                  <option value={2}>{isAr ? 'الفرقة الثانية' : '2nd Year'}</option>
                  <option value={3}>{isAr ? 'الفرقة الثالثة' : '3rd Year'}</option>
                  <option value={4}>{isAr ? 'الفرقة الرابعة' : '4th Year'}</option>
                  <option value={5}>{isAr ? 'الفرقة الخامسة / دراسات عليا' : '5th Year / Grad'}</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.25rem' }}>
              <button
                type="button"
                onClick={handleResetAndClose}
                disabled={createMemberMutation.isPending}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ccc',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '10px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>

              <button
                type="submit"
                disabled={createMemberMutation.isPending}
                className="btn-gold"
                style={{
                  padding: '0.75rem 2rem',
                  borderRadius: '10px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: createMemberMutation.isPending ? 'not-allowed' : 'pointer',
                }}
              >
                {createMemberMutation.isPending ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>{isAr ? 'جاري إنشاء الحساب...' : 'Creating Account...'}</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={18} />
                    <span>{isAr ? 'إضافة العضو وتفعيل الحساب' : 'Add Member & Activate'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
