import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Sparkles, User, Mail, Phone, CheckCircle2, Copy, Check, ArrowLeft, ArrowRight, Clock, AlertCircle, Loader2, UploadCloud } from 'lucide-react';
import { useApplicationsOpen } from '../hooks/usePublicContent';
import { useLanguage } from '../context/LanguageContext';
import { FACULTIES, ACADEMIC_YEARS, RECRUITMENT_COMMITTEES } from '../services/mockLocalization';
import { recruitmentFormSchema } from '../lib/schemas';
import { supabase } from '../lib/supabase';
import Turnstile from '../components/Turnstile';
import SEO from '../components/SEO';

export default function JoinUsPage() {
  const [searchParams] = useSearchParams();
  const preselectedCommittee = searchParams.get('committee') || '';
  const { data: applicationsOpen = true } = useApplicationsOpen();
  const { lang, dir } = useLanguage();
  const isAr = lang === 'ar';

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [submittedInfo, setSubmittedInfo] = useState({ fullName: '', faculty: '', committee: '' });
  const [copied, setCopied] = useState(false);
  const [serverError, setServerError] = useState('');
  const [alreadyAppliedNotice, setAlreadyAppliedNotice] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [cvFile, setCvFile] = useState(null);
  const [cvError, setCvError] = useState('');

  const defaultFaculty = isAr ? 'كلية الهندسة' : 'Faculty of Engineering';
  const defaultYear = isAr ? 'الفرقة الثانية' : '2nd Year (Sophomore)';
  const defaultComm = preselectedCommittee || (isAr ? 'إدارة المشاريع التنموية (PM)' : 'Project Management (PM)');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(recruitmentFormSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      faculty: defaultFaculty,
      studyYear: defaultYear,
      committee: defaultComm,
      impactGoal: '',
      honeypot: '',
    },
  });

  const currentFaculty = useWatch({ control, name: 'faculty' });
  const currentCommittee = useWatch({ control, name: 'committee' });

  useEffect(() => {
    if (preselectedCommittee) {
      setValue('committee', preselectedCommittee);
    }
  }, [preselectedCommittee, setValue]);

  const handleCvChange = (e) => {
    const file = e.target.files?.[0];
    setCvError('');
    if (!file) {
      setCvFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setCvError(isAr ? 'حجم الملف يجب ألا يتجاوز 5 ميجابايت' : 'File size must not exceed 5 MB');
      setCvFile(null);
      return;
    }

    if (file.type && !['application/pdf', 'application/x-pdf'].includes(file.type.toLowerCase())) {
      setCvError(isAr ? 'يجب أن يكون الملف بصيغة PDF فقط' : 'Only PDF documents are allowed');
      setCvFile(null);
      return;
    }

    setCvFile(file);
  };

  const onSubmit = async (values) => {
    setServerError('');
    setAlreadyAppliedNotice('');

    try {
      let cvBase64 = undefined;
      let cvFileName = undefined;

      if (cvFile) {
        const reader = new FileReader();
        cvBase64 = await new Promise((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result;
            const base64 = typeof result === 'string' ? result.split(',')[1] : '';
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(cvFile);
        });
        cvFileName = cvFile.name;
      }

      const payload = {
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        faculty: values.faculty,
        studyYear: values.studyYear,
        committeeSlug: values.committee,
        motivation: values.impactGoal || undefined,
        answers: {
          impactGoal: values.impactGoal || '',
        },
        honeypot: values.honeypot || '',
        turnstileToken: turnstileToken || undefined,
        cvBase64,
        cvFileName,
      };

      // 1. Primary: Use secure database RPC function (bypasses un-deployed Edge Functions)
      let submissionSuccess = false;
      let resultData = null;

      try {
        let cvUrl = null;
        if (cvFile) {
          try {
            const cvId = typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `cv-${Date.now()}`;
            const filePath = `${cvId}/cv.pdf`;
            const { error: uploadError } = await supabase.storage.from('cvs').upload(filePath, cvFile, {
              contentType: 'application/pdf',
              upsert: false,
            });
            if (!uploadError) {
              cvUrl = filePath;
            }
          } catch (storageErr) {
            console.warn('[JoinUsPage] Direct CV upload notice:', storageErr);
          }
        }

        const { data: rpcData, error: rpcErr } = await supabase.rpc('submit_recruitment_application', {
          p_full_name: values.fullName.trim(),
          p_email: values.email.trim(),
          p_phone: values.phone?.trim() || null,
          p_faculty: values.faculty?.trim() || null,
          p_study_year: values.studyYear || null,
          p_committee_slug: values.committee || null,
          p_motivation: values.impactGoal?.trim() || null,
          p_answers: {
            impactGoal: values.impactGoal || '',
            faculty: values.faculty || '',
            studyYear: values.studyYear || '',
          },
          p_cv_url: cvUrl,
        });

        if (!rpcErr && rpcData) {
          if (rpcData.ok === false) {
            setServerError(
              rpcData.error || (isAr ? 'تعذر إرسال طلب الانضمام.' : 'Failed to submit application.')
            );
            return;
          }
          resultData = rpcData;
          submissionSuccess = true;
        }
      } catch (rpcException) {
        console.warn('[JoinUsPage] RPC submission attempt notice:', rpcException);
      }

      // 2. Secondary fallback: Edge Function invoke (if deployed or RPC unavailable)
      if (!submissionSuccess) {
        const { data, error } = await supabase.functions.invoke('submit-application', {
          body: payload,
        });

        if (error || data?.error || data?.ok === false) {
          const errMsg = data?.error || error?.message;
          setServerError(
            errMsg || (isAr ? 'تعذر إرسال طلب الانضمام، يرجى المحاولة لاحقاً.' : 'Failed to submit application. Please try again.')
          );
          return;
        }

        resultData = data;
      }

      if (resultData?.alreadyApplied) {
        setAlreadyAppliedNotice(
          resultData.message || (isAr ? 'لقد تم تسجيل طلب انضمام بهذا البريد الإلكتروني بالفعل لهذا الموسم.' : 'An application with this email was already received.')
        );
      }

      const appId = resultData?.id || resultData?.applicationId;
      const passCode = appId ? `ENACTUS-SVU-${appId.substring(0, 4).toUpperCase()}` : 'ENACTUS-SVU-PENDING';
      setMemberId(passCode);
      setSubmittedInfo({
        fullName: values.fullName || '',
        faculty: values.faculty || '',
        committee: values.committee || '',
      });
      setIsSubmitted(true);

      import('canvas-confetti').then((m) => {
        const confetti = m.default || m;
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#ffd700', '#ffaa00', '#ff8c00', '#ffffff'],
        });
      });

      window.scrollTo({ top: 100, behavior: 'smooth' });
    } catch (err) {
      console.error('[JoinUsPage] submission error:', err);
      setServerError(
        isAr ? 'حدث خطأ غير متوقع أثناء إرسال طلبك. يرجى المحاولة مرة أخرى.' : 'An unexpected error occurred. Please try again.'
      );
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(memberId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page-container-padding" dir={dir} style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <SEO
        title={isAr ? 'انضم إلينا (Recruitment)' : 'Join Us (Recruitment)'}
        description={isAr
          ? 'انضم لكتيبة إيناكوس قنا - جامعة جنوب الوادي للموسم الجديد 2026. قدّم الآن لإحدى اللجان السبع.'
          : 'Join the Enactus Qena battalion - South Valley University for the 2026 season. Apply now to one of the seven committees.'}
      />
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 3.5rem auto' }}>
          <span className="badge-gold font-cinzel" style={{ marginBottom: '1rem' }}>
            RECRUITMENT PORTAL • 2026
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.8rem)', fontWeight: 900, marginBottom: '1.25rem', color: '#fff' }}>
            {isAr ? (
              <>اترك أثرك الخالد: <span className="gold-gradient-text">انضم لكتيبة إيناكوس قنا</span></>
            ) : (
              <>LEAVE YOUR MARK: <span className="gold-gradient-text">Join Enactus Qena Battalion</span></>
            )}
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#c5c5d8', lineHeight: 1.8 }}>
            {isAr
              ? '"The future was found, and it\'s looking for you!" لا تكتفِ بالمشاهدة، كن أحد فرسان التغيير ومبتكري المشاريع التي تخدم صعيد مصر وتصعد للمسابقة الوطنية.'
              : '"The future was found, and it\'s looking for you!" Don\'t just watch; become one of the changemakers driving social startups that uplift Upper Egypt and compete on the national stage.'}
          </p>
        </div>

        {/* Urgency Ribbon */}
        <div
          className="glass-panel card-shine"
          style={{
            maxWidth: '720px',
            margin: '0 auto 2.5rem auto',
            padding: '1rem 1.25rem',
            borderRadius: '16px',
            border: applicationsOpen ? '1px solid rgba(255, 184, 0, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Clock size={20} color={applicationsOpen ? '#ffb800' : '#ef4444'} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 700 }}>
              {applicationsOpen
                ? (isAr ? 'باب التقديم مفتوح لجميع كليات جامعة جنوب الوادي' : 'Applications are open to all South Valley University faculties')
                : (isAr ? 'باب التقديم مغلق حالياً للموسم الجديد' : 'Applications are currently closed for the new season')}
            </span>
          </div>
          <span
            className="badge-gold"
            style={{
              background: applicationsOpen ? '#ffd54f' : 'rgba(239, 68, 68, 0.15)',
              color: applicationsOpen ? '#08080a' : '#fca5a5',
              borderColor: applicationsOpen ? 'transparent' : 'rgba(239, 68, 68, 0.4)',
              fontWeight: 900,
            }}
          >
            {applicationsOpen ? (isAr ? 'FORM OPEN' : 'APPLICATIONS OPEN') : (isAr ? 'APPLICATIONS CLOSED' : 'CLOSED')}
          </span>
        </div>

        {/* Form or Result Card or Closed Card */}
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          {!applicationsOpen ? (
            <div
              className="glass-panel gold-border-glow"
              style={{
                borderRadius: '24px',
                padding: '3.5rem 2rem',
                textAlign: 'center',
                background: 'linear-gradient(145deg, rgba(22, 24, 34, 0.95), rgba(12, 13, 18, 0.98))',
              }}
            >
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: 'rgba(255, 184, 0, 0.15)',
                  border: '2px solid #ffb800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffd54f',
                  margin: '0 auto 1.5rem auto',
                }}
              >
                <Clock size={34} />
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', marginBottom: '0.75rem' }}>
                {isAr ? 'باب التقديم مغلق حالياً' : 'Applications Are Currently Closed'}
              </h2>
              <p style={{ color: '#c5c5d6', fontSize: '1.05rem', lineHeight: 1.8, maxWidth: '520px', margin: '0 auto 2.5rem auto' }}>
                {isAr
                  ? 'انتهت فترة استقبال طلبات الانضمام للموسم الحالي. تابع صفحاتنا الرسمية على منصات التواصل الاجتماعي للإعلان عن فتح باب التقديم للمراحل القادمة.'
                  : 'Recruitment for the current season has ended. Follow our official social media channels for announcements regarding upcoming recruitment waves.'}
              </p>
              <Link to="/" className="btn-primary" style={{ display: 'inline-flex', justifyContent: 'center' }}>
                <span>{isAr ? 'العودة للرئيسية' : 'Back to Home'}</span>
                {isAr ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
              </Link>
            </div>
          ) : !isSubmitted ? (
            <div
              className="glass-panel gold-border-glow responsive-form-p"
              style={{
                borderRadius: '24px',
                padding: '3rem 2.5rem',
                background: 'linear-gradient(145deg, rgba(22, 24, 34, 0.95), rgba(12, 13, 18, 0.98))',
              }}
            >
              {serverError && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.85rem 1rem',
                    borderRadius: '12px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#fca5a5',
                    marginBottom: '1.5rem',
                    fontSize: '0.9rem',
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{serverError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)}>
                {/* Honeypot anti-bot trap */}
                <div style={{ display: 'none', position: 'absolute', left: '-9999px' }} aria-hidden="true">
                  <input type="text" tabIndex={-1} autoComplete="off" {...register('honeypot')} />
                </div>

                {/* Full Name */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="join-fullName" style={{ display: 'block', color: '#ffd54f', fontSize: '0.92rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                    {isAr ? 'الاسم بالكامل (ثلاثي أو رباعي) *' : 'Full Name (3 or 4 names) *'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="join-fullName"
                      type="text"
                      placeholder={isAr ? 'مثال: يوسف محمود عبد الرحيم' : 'e.g. Youssef Mahmoud'}
                      {...register('fullName')}
                      style={{
                        width: '100%',
                        background: 'rgba(10, 11, 16, 0.85)',
                        border: errors.fullName ? '1px solid #ef4444' : '1px solid rgba(255, 184, 0, 0.3)',
                        borderRadius: '12px',
                        padding: isAr ? '0.9rem 1rem 0.9rem 2.8rem' : '0.9rem 2.8rem 0.9rem 1rem',
                        color: '#fff',
                        fontSize: '1rem',
                        outline: 'none',
                      }}
                    />
                    <User size={18} color="#ffb800" style={{ position: 'absolute', [isAr ? 'left' : 'right']: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                  {errors.fullName && (
                    <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.3rem', display: 'block' }}>
                      {errors.fullName.message}
                    </span>
                  )}
                </div>

                {/* Email & Phone */}
                <div className="form-grid-2" style={{ marginBottom: '1.5rem' }}>
                  <div>
                    <label htmlFor="join-email" style={{ display: 'block', color: '#ffd54f', fontSize: '0.92rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                      {isAr ? 'البريد الإلكتروني الشخصي *' : 'Personal Email Address *'}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="join-email"
                        type="email"
                        placeholder="student@example.com"
                        {...register('email')}
                        style={{
                          width: '100%',
                          background: 'rgba(10, 11, 16, 0.85)',
                          border: errors.email ? '1px solid #ef4444' : '1px solid rgba(255, 184, 0, 0.3)',
                          borderRadius: '12px',
                          padding: isAr ? '0.9rem 1rem 0.9rem 2.8rem' : '0.9rem 2.8rem 0.9rem 1rem',
                          color: '#fff',
                          fontSize: '1rem',
                          outline: 'none',
                          direction: 'ltr',
                          textAlign: isAr ? 'right' : 'left',
                        }}
                      />
                      <Mail size={18} color="#ffb800" style={{ position: 'absolute', [isAr ? 'left' : 'right']: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                    {errors.email && (
                      <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.3rem', display: 'block' }}>
                        {errors.email.message}
                      </span>
                    )}
                  </div>

                  <div>
                    <label htmlFor="join-phone" style={{ display: 'block', color: '#ffd54f', fontSize: '0.92rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                      {isAr ? 'رقم الهاتف (الواتساب للمقابلات) *' : 'Phone / WhatsApp *'}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="join-phone"
                        type="tel"
                        placeholder="010XXXXXXXX"
                        {...register('phone')}
                        style={{
                          width: '100%',
                          background: 'rgba(10, 11, 16, 0.85)',
                          border: errors.phone ? '1px solid #ef4444' : '1px solid rgba(255, 184, 0, 0.3)',
                          borderRadius: '12px',
                          padding: isAr ? '0.9rem 1rem 0.9rem 2.8rem' : '0.9rem 2.8rem 0.9rem 1rem',
                          color: '#fff',
                          fontSize: '1rem',
                          outline: 'none',
                          direction: 'ltr',
                          textAlign: isAr ? 'right' : 'left',
                        }}
                      />
                      <Phone size={18} color="#ffb800" style={{ position: 'absolute', [isAr ? 'left' : 'right']: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                    {errors.phone && (
                      <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.3rem', display: 'block' }}>
                        {errors.phone.message}
                      </span>
                    )}
                  </div>
                </div>

                {/* Faculty & Academic Year */}
                <div className="form-grid-2" style={{ marginBottom: '1.5rem' }}>
                  <div>
                    <label htmlFor="join-faculty" style={{ display: 'block', color: '#ffd54f', fontSize: '0.92rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                      {isAr ? 'الكلية بجامعة جنوب الوادي *' : 'Faculty at SVU *'}
                    </label>
                    <select
                      id="join-faculty"
                      {...register('faculty')}
                      style={{
                        width: '100%',
                        background: 'rgba(10, 11, 16, 0.85)',
                        border: errors.faculty ? '1px solid #ef4444' : '1px solid rgba(255, 184, 0, 0.3)',
                        borderRadius: '12px',
                        padding: '0.9rem 1rem',
                        color: '#fff',
                        fontSize: '0.95rem',
                        outline: 'none',
                      }}
                    >
                      {FACULTIES.map((f, i) => {
                        const val = isAr ? f.ar : f.en;
                        return (
                          <option key={i} value={val}>
                            {val}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="join-studyYear" style={{ display: 'block', color: '#ffd54f', fontSize: '0.92rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                      {isAr ? 'الفرقة الدراسية *' : 'Academic Year *'}
                    </label>
                    <select
                      id="join-studyYear"
                      {...register('studyYear')}
                      style={{
                        width: '100%',
                        background: 'rgba(10, 11, 16, 0.85)',
                        border: errors.studyYear ? '1px solid #ef4444' : '1px solid rgba(255, 184, 0, 0.3)',
                        borderRadius: '12px',
                        padding: '0.9rem 1rem',
                        color: '#fff',
                        fontSize: '0.95rem',
                        outline: 'none',
                      }}
                    >
                      {ACADEMIC_YEARS.map((yr, i) => {
                        const val = isAr ? yr.ar : yr.en;
                        return (
                          <option key={i} value={val}>
                            {val}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Committee selection */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label htmlFor="join-committee" style={{ color: '#ffd54f', fontSize: '0.92rem', fontWeight: 700 }}>
                      {isAr ? 'اللجنة التي ترغب في الانضمام إليها *' : 'Committee You Wish to Join *'}
                    </label>
                    <Link to="/committees" style={{ color: '#ffb800', fontSize: '0.8rem', textDecoration: 'none' }}>
                      {isAr ? 'دليل مهام اللجان ←' : 'Committees Guide →'}
                    </Link>
                  </div>
                  <select
                    id="join-committee"
                    {...register('committee')}
                    style={{
                      width: '100%',
                      background: 'rgba(10, 11, 16, 0.85)',
                      border: errors.committee ? '1px solid #ef4444' : '1px solid rgba(255, 184, 0, 0.3)',
                      borderRadius: '12px',
                      padding: '0.9rem 1rem',
                      color: '#fff',
                      fontSize: '0.95rem',
                      outline: 'none',
                    }}
                  >
                    {RECRUITMENT_COMMITTEES.map((c, i) => {
                      const val = isAr ? c.ar : c.en;
                      return (
                        <option key={i} value={val}>
                          {val}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Impact Goal */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="join-impactGoal" style={{ display: 'block', color: '#ffd54f', fontSize: '0.92rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                    {isAr
                      ? 'ما هو الأثر أو المهارة التي تطمح لإضافتها للكتيبة ومجتمع قنا؟'
                      : 'What impact or skills do you aim to bring to the battalion and Qena community?'}
                  </label>
                  <textarea
                    id="join-impactGoal"
                    rows="3"
                    placeholder={isAr ? 'حدثنا باختصار عن أفكارك وشغفك...' : 'Briefly tell us about your passion, ideas, and motivation...'}
                    {...register('impactGoal')}
                    style={{
                      width: '100%',
                      background: 'rgba(10, 11, 16, 0.85)',
                      border: errors.impactGoal ? '1px solid #ef4444' : '1px solid rgba(255, 184, 0, 0.3)',
                      borderRadius: '12px',
                      padding: '0.9rem 1rem',
                      color: '#fff',
                      fontSize: '0.95rem',
                      outline: 'none',
                      resize: 'none',
                    }}
                  />
                </div>

                {/* Optional CV Upload */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="join-cvFile" style={{ display: 'block', color: '#ffd54f', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    {isAr ? 'إرفاق السيرة الذاتية (CV) بصيغة PDF (اختياري)' : 'Attach Resume / CV in PDF (Optional)'}
                  </label>
                  <div
                    style={{
                      border: cvError ? '1px dashed #ef4444' : '1px dashed rgba(255, 184, 0, 0.35)',
                      borderRadius: '12px',
                      padding: '0.85rem 1rem',
                      background: 'rgba(10, 11, 16, 0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                      <UploadCloud size={20} color="#ffb800" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.85rem', color: cvFile ? '#fff' : '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cvFile ? cvFile.name : (isAr ? 'اختر ملف PDF (أقصى حجم 5 ميجابايت)' : 'Choose a PDF file (max 5 MB)')}
                      </span>
                    </div>
                    <label
                      htmlFor="join-cvFile"
                      className="btn-secondary"
                      style={{
                        cursor: 'pointer',
                        padding: '0.4rem 0.9rem',
                        fontSize: '0.8rem',
                        flexShrink: 0,
                      }}
                    >
                      <span>{isAr ? 'استعراض' : 'Browse'}</span>
                      <input
                        id="join-cvFile"
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={handleCvChange}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                  {cvError && (
                    <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.3rem', display: 'block' }}>
                      {cvError}
                    </span>
                  )}
                </div>

                {/* Cloudflare Turnstile */}
                <Turnstile onVerify={(t) => setTurnstileToken(t)} onExpire={() => setTurnstileToken('')} />

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary animate-pulse-glow"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '1.1rem',
                    fontSize: '1.15rem',
                    opacity: isSubmitting ? 0.7 : 1,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={22} className="animate-spin" />
                      <span>{isAr ? 'جاري إرسال الطلب...' : 'Submitting Application...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={22} />
                      <span>{isAr ? 'تأكيد التسجيل واستخراج بطاقة العضوية ☥' : 'Confirm Registration & Issue Membership Pass ☥'}</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* Digital VIP Pass Generated */
            <div
              className="glass-panel gold-border-glow"
              style={{
                borderRadius: '24px',
                padding: '3rem 2.5rem',
                textAlign: 'center',
                background: 'linear-gradient(145deg, rgba(22, 24, 34, 0.98), rgba(10, 11, 16, 0.98))',
              }}
            >
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: 'rgba(255, 184, 0, 0.2)',
                  border: '2px solid #ffb800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem auto',
                  color: '#ffd54f',
                }}
              >
                <CheckCircle2 size={42} />
              </div>

              <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#fff', marginBottom: '0.5rem' }}>
                {isAr ? 'تم استلام طلبك بنجاح!' : 'Application Received Successfully!'}
              </h2>
              <p style={{ color: '#c5c5d6', fontSize: '1.05rem', marginBottom: '2rem' }}>
                {alreadyAppliedNotice || (
                  isAr ? (
                    <>أهلاً بك في مرحلة الانطلاق. إليك بطاقة عضويتك الرسمية الخاصة بـ <strong style={{ color: '#ffd54f' }}>Enactus Qena</strong>:</>
                  ) : (
                    <>Welcome to the launch journey! Here is your official VIP Pass for <strong style={{ color: '#ffd54f' }}>Enactus Qena</strong>:</>
                  )
                )}
              </p>

              {/* VIP Card */}
              <div
                className="gold-border-glow card-shine"
                style={{
                  maxWidth: '400px',
                  width: '100%',
                  margin: '0 auto 2.5rem auto',
                  borderRadius: '20px',
                  background: 'linear-gradient(145deg, #181924, #0b0c10)',
                  border: '2px solid rgba(255, 184, 0, 0.65)',
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 35px rgba(255, 184, 0, 0.3)',
                  overflow: 'hidden',
                  textAlign: isAr ? 'right' : 'left',
                  position: 'relative',
                }}
              >
                <div style={{ width: '60px', height: '10px', borderRadius: '5px', background: '#000', margin: '14px auto 0 auto', border: '1px solid rgba(255, 184, 0, 0.4)' }} />

                <div className="responsive-card-p" style={{ padding: '1.75rem 2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <img src="/assets/E2.jpg" alt="Logo" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                      <div>
                        <div className="font-cinzel" style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ffb800' }}>
                          ENACTUS QENA
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#a3a3b2' }}>South Valley University</div>
                      </div>
                    </div>
                    <span className="badge-gold font-cinzel" style={{ fontSize: '0.7rem' }}>NC 2026</span>
                  </div>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#ffd54f', fontWeight: 600 }}>
                      {isAr ? 'اسم المحارب:' : 'Member Name:'}
                    </div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#fff' }}>
                      {submittedInfo.fullName || (watch ? watch('fullName') : '')}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#a3a3b2' }}>{isAr ? 'الكلية:' : 'Faculty:'}</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#e0e0ec' }}>
                        {submittedInfo.faculty || currentFaculty || ''}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#a3a3b2' }}>{isAr ? 'اللجنة:' : 'Committee:'}</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffb800' }}>
                        {submittedInfo.committee || currentCommittee || ''}
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px dashed rgba(255, 184, 0, 0.35)', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#888' }}>{isAr ? 'كود التسجيل:' : 'Pass Serial:'}</div>
                      <div className="font-cinzel" style={{ fontSize: '0.92rem', color: '#ffd54f', fontWeight: 800 }}>{memberId}</div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#ffb800', fontStyle: 'italic', fontWeight: 700 }}>
                      PEOPLE. IDEAS. IMPACT.
                    </div>
                  </div>
                </div>

                <div style={{ position: 'absolute', bottom: '-20px', [isAr ? 'left' : 'right']: '-20px', fontSize: '6rem', color: 'rgba(255, 184, 0, 0.04)', pointerEvents: 'none' }}>
                  ☥
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  onClick={handleCopyCode}
                  style={{
                    background: 'rgba(255, 184, 0, 0.15)',
                    border: '1px solid rgba(255, 184, 0, 0.4)',
                    color: '#ffd54f',
                    borderRadius: '9999px',
                    padding: '0.85rem 1.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontWeight: 700,
                  }}
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  <span>{copied ? (isAr ? 'تم نسخ كود العضوية!' : 'Pass ID Copied!') : (isAr ? 'نسخ كود العضوية' : 'Copy Pass ID')}</span>
                </button>

                <a
                  href="https://www.facebook.com/Enactus.svu"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary"
                  style={{ padding: '0.85rem 2rem' }}
                >
                  <span>{isAr ? 'متابعة إعلان المقابلات على فيسبوك' : 'Follow Interviews on Facebook'}</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
