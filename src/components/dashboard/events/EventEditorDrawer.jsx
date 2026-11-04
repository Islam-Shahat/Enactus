import React, { useState, useEffect } from 'react';
import { 
  X, Save, Calendar, MapPin, Clock, Users, Globe, 
  Upload, Plus, Trash2, Copy, AlertCircle, Loader2, Sparkles, Handshake
} from 'lucide-react';
import Drawer from '../Drawer';
import FormField from '../FormField';
import ConfirmDialog from '../ConfirmDialog';
import { supabase } from '../../../lib/supabase';
import { generateEventSlug } from '../../../lib/eventHelpers';

export default function EventEditorDrawer({
  isOpen,
  onClose,
  event = null,
  activeSeasonId,
  committees = [],
  companies = [],
  onSaved,
}) {
  const isEdit = Boolean(event?.id);

  // Form states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Form Fields
  const [titleAr, setTitleAr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [slug, setSlug] = useState('');
  const [categoryAr, setCategoryAr] = useState('مؤتمر سنوي');
  const [categoryEn, setCategoryEn] = useState('Annual Conference');
  const [briefAr, setBriefAr] = useState('');
  const [briefEn, setBriefEn] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [venueAr, setVenueAr] = useState('');
  const [venueEn, setVenueEn] = useState('');
  const [timeLabelAr, setTimeLabelAr] = useState('');
  const [timeLabelEn, setTimeLabelEn] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [capacity, setCapacity] = useState('');
  const [status, setStatus] = useState('draft');
  const [organizingCommitteeId, setOrganizingCommitteeId] = useState('');
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [coverUrl, setCoverUrl] = useState('');
  const [schedule, setSchedule] = useState([]);
  const [partnerNames, setPartnerNames] = useState([]);
  const [newPartnerInput, setNewPartnerInput] = useState('');
  const [selectedSponsorIds, setSelectedSponsorIds] = useState([]);

  // Populate on open
  useEffect(() => {
    if (event) {
      setTitleAr(event.title_ar || '');
      setTitleEn(event.title_en || '');
      setSlug(event.slug || '');
      setCategoryAr(event.category_ar || 'مؤتمر سنوي');
      setCategoryEn(event.category_en || 'Annual Conference');
      setBriefAr(event.brief_ar || '');
      setBriefEn(event.brief_en || '');
      setDescriptionAr(event.description_ar || '');
      setDescriptionEn(event.description_en || '');
      setVenueAr(event.venue_ar || '');
      setVenueEn(event.venue_en || '');
      setTimeLabelAr(event.time_label_ar || '');
      setTimeLabelEn(event.time_label_en || '');
      setStartsAt(event.starts_at ? new Date(event.starts_at).toISOString().slice(0, 16) : '');
      setEndsAt(event.ends_at ? new Date(event.ends_at).toISOString().slice(0, 16) : '');
      setCapacity(event.capacity ? String(event.capacity) : '');
      setStatus(event.status || 'draft');
      setOrganizingCommitteeId(event.organizing_committee_id || '');
      setRegistrationOpen(Boolean(event.registration_open));
      setIsPublic(event.is_public !== undefined ? Boolean(event.is_public) : true);
      setCoverUrl(event.cover_url || '');
      setSchedule(Array.isArray(event.schedule) ? event.schedule : []);
      setPartnerNames(Array.isArray(event.partner_names) ? event.partner_names : []);
      
      // Load event sponsors
      if (event.id) {
        supabase
          .from('event_sponsors')
          .select('company_id')
          .eq('event_id', event.id)
          .then(({ data }) => {
            if (data) setSelectedSponsorIds(data.map((s) => s.company_id));
          });
      }
    } else {
      // Defaults for new event
      setTitleAr('');
      setTitleEn('');
      setSlug('');
      setCategoryAr('مؤتمر سنوي');
      setCategoryEn('Annual Conference');
      setBriefAr('');
      setBriefEn('');
      setDescriptionAr('');
      setDescriptionEn('');
      setVenueAr('');
      setVenueEn('');
      setTimeLabelAr('');
      setTimeLabelEn('');
      const defaultStart = new Date(Date.now() + 86400000 * 7);
      setStartsAt(defaultStart.toISOString().slice(0, 16));
      setEndsAt(new Date(defaultStart.getTime() + 3600000 * 6).toISOString().slice(0, 16));
      setCapacity('150');
      setStatus('draft');
      setOrganizingCommitteeId(committees[0]?.id || '');
      setRegistrationOpen(false);
      setIsPublic(true);
      setCoverUrl('');
      setSchedule([
        { time_ar: '10:00 ص', time_en: '10:00 AM', activity_ar: 'الاستقبال والتسجيل', activity_en: 'Reception & Registration' },
        { time_ar: '11:00 ص', time_en: '11:00 AM', activity_ar: 'الجلسة الافتتاحية', activity_en: 'Opening Keynote' },
      ]);
      setPartnerNames(['جامعة جنوب الوادي']);
      setSelectedSponsorIds([]);
    }
    setError(null);
  }, [event, isOpen, committees]);

  // Handle Cover Upload
  async function handleCoverUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('يرجى اختيار ملف صورة صالح (PNG, JPG, WebP)');
      return;
    }

    setUploadingCover(true);
    setError(null);

    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `covers/${slug || 'event'}-${Date.now()}.${ext}`;

      const { data, error: uploadError } = await supabase.storage
        .from('event-media')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from('event-media')
        .getPublicUrl(fileName);

      setCoverUrl(publicData.publicUrl);
    } catch (err) {
      setError('فشل رفع الصورة: ' + err.message);
    } finally {
      setUploadingCover(false);
    }
  }

  // Schedule management
  function addScheduleItem() {
    setSchedule([
      ...schedule,
      { time_ar: '12:00 م', time_en: '12:00 PM', activity_ar: '', activity_en: '' },
    ]);
  }

  function updateScheduleItem(index, field, value) {
    const next = [...schedule];
    next[index] = { ...next[index], [field]: value };
    setSchedule(next);
  }

  function removeScheduleItem(index) {
    setSchedule(schedule.filter((_, i) => i !== index));
  }

  // Partner names tags
  function addPartner() {
    if (!newPartnerInput.trim()) return;
    if (!partnerNames.includes(newPartnerInput.trim())) {
      setPartnerNames([...partnerNames, newPartnerInput.trim()]);
    }
    setNewPartnerInput('');
  }

  function removePartner(p) {
    setPartnerNames(partnerNames.filter((item) => item !== p));
  }

  // Toggle Sponsor
  function toggleSponsor(companyId) {
    setSelectedSponsorIds((prev) =>
      prev.includes(companyId) ? prev.filter((id) => id !== companyId) : [...prev, companyId]
    );
  }

  // Handle Save
  async function handleSave(e) {
    e.preventDefault();
    if (!titleAr.trim()) {
      setError('يرجى كتابة عنوان الفعالية بالعربية.');
      return;
    }
    if (!startsAt) {
      setError('يرجى تحديد موعد بدء الفعالية.');
      return;
    }
    if (!activeSeasonId) {
      setError('لا يوجد موسم نشط حالياً.');
      return;
    }

    const finalSlug = slug.trim() || generateEventSlug(titleEn || titleAr);

    setLoading(true);
    setError(null);

    try {
      const payload = {
        season_id: activeSeasonId,
        slug: finalSlug,
        title_ar: titleAr.trim(),
        title_en: titleEn.trim() || null,
        category_ar: categoryAr.trim() || null,
        category_en: categoryEn.trim() || null,
        brief_ar: briefAr.trim() || null,
        brief_en: briefEn.trim() || null,
        description_ar: descriptionAr.trim() || null,
        description_en: descriptionEn.trim() || null,
        venue_ar: venueAr.trim() || null,
        venue_en: venueEn.trim() || null,
        time_label_ar: timeLabelAr.trim() || null,
        time_label_en: timeLabelEn.trim() || null,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        capacity: capacity ? parseInt(capacity, 10) : null,
        status,
        organizing_committee_id: organizingCommitteeId || null,
        registration_open: registrationOpen,
        is_public: isPublic,
        cover_url: coverUrl || null,
        schedule,
        partner_names: partnerNames,
      };

      let savedId = event?.id;

      if (isEdit) {
        const { error: updateError } = await supabase
          .from('events')
          .update(payload)
          .eq('id', event.id);

        if (updateError) throw updateError;
      } else {
        const { data: newEvent, error: insertError } = await supabase
          .from('events')
          .insert([payload])
          .select('id')
          .single();

        if (insertError) throw insertError;
        savedId = newEvent.id;
      }

      // Sync event sponsors
      if (savedId) {
        // delete existing sponsors
        await supabase.from('event_sponsors').delete().eq('event_id', savedId);

        // insert new sponsors
        if (selectedSponsorIds.length > 0) {
          const sponsorRows = selectedSponsorIds.map((cid) => ({
            event_id: savedId,
            company_id: cid,
          }));
          await supabase.from('event_sponsors').insert(sponsorRows);
        }
      }

      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء حفظ الفعالية.');
    } finally {
      setLoading(false);
    }
  }

  // Handle Duplicate
  async function handleDuplicate() {
    if (!event) return;
    setLoading(true);
    try {
      const copyPayload = {
        season_id: event.season_id,
        slug: `${event.slug}-copy-${Date.now().toString(36)}`,
        title_ar: `${event.title_ar} (نسخة)`,
        title_en: event.title_en ? `${event.title_en} (Copy)` : null,
        category_ar: event.category_ar,
        category_en: event.category_en,
        brief_ar: event.brief_ar,
        brief_en: event.brief_en,
        description_ar: event.description_ar,
        description_en: event.description_en,
        venue_ar: event.venue_ar,
        venue_en: event.venue_en,
        time_label_ar: event.time_label_ar,
        time_label_en: event.time_label_en,
        starts_at: event.starts_at,
        ends_at: event.ends_at,
        capacity: event.capacity,
        status: 'draft',
        organizing_committee_id: event.organizing_committee_id,
        registration_open: false,
        is_public: false,
        cover_url: event.cover_url,
        schedule: event.schedule,
        partner_names: event.partner_names,
      };

      const { error: insErr } = await supabase.from('events').insert([copyPayload]);
      if (insErr) throw insErr;

      onSaved?.();
      onClose();
    } catch (err) {
      setError('فشل استنساخ الفعالية: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Handle Delete
  async function handleDelete() {
    if (!event?.id) return;
    setLoading(true);
    try {
      const { error: delErr } = await supabase.from('events').delete().eq('id', event.id);
      if (delErr) throw delErr;

      onSaved?.();
      onClose();
    } catch (err) {
      setError('فشل حذف الفعالية: ' + err.message);
    } finally {
      setLoading(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title={isEdit ? 'تعديل بيانات الفعالية' : 'إضافة فعالية جديدة'}
        subtitle={isEdit ? `الرمز الرابط: ${slug}` : 'إنشاء مؤتمر أو ورشة عمل أو هاكاثون جديد'}
        width="760px"
      >
        <form onSubmit={handleSave} style={{ padding: '0.5rem 0' }}>
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.85rem 1.25rem',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '12px',
                color: '#fca5a5',
                fontSize: '0.9rem',
                marginBottom: '1.5rem',
              }}
            >
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Bilingual Titles */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <FormField label="عنوان الفعالية بالعربية *" required>
              <input
                type="text"
                value={titleAr}
                onChange={(e) => {
                  setTitleAr(e.target.value);
                  if (!isEdit && !slug) setSlug(generateEventSlug(titleEn || e.target.value));
                }}
                placeholder="مثال: مؤتمر قنا لريادة الأعمال 2026"
                required
                style={inputStyle}
              />
            </FormField>

            <FormField label="Title in English">
              <input
                type="text"
                value={titleEn}
                onChange={(e) => {
                  setTitleEn(e.target.value);
                  if (!isEdit) setSlug(generateEventSlug(e.target.value || titleAr));
                }}
                placeholder="e.g. Qena Entrepreneurship Summit 2026"
                dir="ltr"
                style={inputStyle}
              />
            </FormField>
          </div>

          {/* Slug & Category */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <FormField label="الرابط الدائم (Slug) *" required help="يستخدم في رابط الصفحة /events/:slug">
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                placeholder="qena-summit-2026"
                dir="ltr"
                required
                style={inputStyle}
              />
            </FormField>

            <FormField label="التصنيف (Category)">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={categoryAr}
                  onChange={(e) => setCategoryAr(e.target.value)}
                  placeholder="مؤتمر / ورشة"
                  style={inputStyle}
                />
                <input
                  type="text"
                  value={categoryEn}
                  onChange={(e) => setCategoryEn(e.target.value)}
                  placeholder="Conference"
                  dir="ltr"
                  style={inputStyle}
                />
              </div>
            </FormField>
          </div>

          {/* Dates & Times */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <FormField label="موعد البدء *" required>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
                style={inputStyle}
              />
            </FormField>

            <FormField label="موعد الانتهاء المتوقع">
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                style={inputStyle}
              />
            </FormField>
          </div>

          {/* Time Labels */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <FormField label="نص التوقيت المعروض (عربي)" help="مثال: 10:00 صباحاً - 04:00 مساءً">
              <input
                type="text"
                value={timeLabelAr}
                onChange={(e) => setTimeLabelAr(e.target.value)}
                placeholder="10:00 ص - 04:00 م"
                style={inputStyle}
              />
            </FormField>

            <FormField label="Time Label (EN)">
              <input
                type="text"
                value={timeLabelEn}
                onChange={(e) => setTimeLabelEn(e.target.value)}
                placeholder="10:00 AM - 04:00 PM"
                dir="ltr"
                style={inputStyle}
              />
            </FormField>
          </div>

          {/* Venues */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <FormField label="المكان / القاعة بالعربية">
              <input
                type="text"
                value={venueAr}
                onChange={(e) => setVenueAr(e.target.value)}
                placeholder="قاعة المؤتمرات الكبرى - جامعة جنوب الوادي"
                style={inputStyle}
              />
            </FormField>

            <FormField label="Venue in English">
              <input
                type="text"
                value={venueEn}
                onChange={(e) => setVenueEn(e.target.value)}
                placeholder="Grand Hall - South Valley University"
                dir="ltr"
                style={inputStyle}
              />
            </FormField>
          </div>

          {/* Status, Capacity & Organizing Committee */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <FormField label="الحالة *">
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
                <option value="draft">مسودة (Draft)</option>
                <option value="published">معلنة (Published)</option>
                <option value="ongoing">جارية الآن (Ongoing)</option>
                <option value="completed">مكتملة (Completed)</option>
                <option value="cancelled">ملغاة (Cancelled)</option>
              </select>
            </FormField>

            <FormField label="السعة القصوى (Capacity)" help="اتركه فارغاً لعدد غير محدود">
              <input
                type="number"
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="مثال: 150"
                style={inputStyle}
              />
            </FormField>

            <FormField label="اللجنة المنظمة">
              <select
                value={organizingCommitteeId}
                onChange={(e) => setOrganizingCommitteeId(e.target.value)}
                style={inputStyle}
              >
                <option value="">-- بدون تحديد لجنة --</option>
                {committees.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_ar || c.name_en}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {/* Visibility & Registration Toggles */}
          <div
            style={{
              display: 'flex',
              gap: '2rem',
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 184, 0, 0.15)',
              marginBottom: '1.5rem',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', color: '#fff' }}>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#ffb800' }}
              />
              <Globe size={18} color="#ffb800" />
              <span style={{ fontSize: '0.92rem', fontWeight: 700 }}>ظهور في الموقع العام (Public)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', color: '#fff' }}>
              <input
                type="checkbox"
                checked={registrationOpen}
                onChange={(e) => setRegistrationOpen(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#ffb800' }}
              />
              <Sparkles size={18} color="#ffb800" />
              <span style={{ fontSize: '0.92rem', fontWeight: 700 }}>فتح التسجيل العام (Registration Open)</span>
            </label>
          </div>

          {/* Cover Image Upload */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: '#e0e0ec', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              صورة الغلاف (Cover Image)
            </label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              {coverUrl && (
                <div style={{ width: '100px', height: '65px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255, 184, 0, 0.3)', flexShrink: 0 }}>
                  <img src={coverUrl} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="https://... أو ارفع صورة مباشرة"
                  dir="ltr"
                  style={inputStyle}
                />
              </div>
              <label
                className="btn-secondary"
                style={{
                  padding: '0.75rem 1rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: uploadingCover ? 'not-allowed' : 'pointer',
                  fontSize: '0.88rem',
                }}
              >
                {uploadingCover ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                <span>رفع صورة</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  disabled={uploadingCover}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          {/* Briefs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <FormField label="نبذة مختصرة بالعربية">
              <textarea
                rows={2}
                value={briefAr}
                onChange={(e) => setBriefAr(e.target.value)}
                placeholder="نبذة سريعة تظهر في بطاقة الفعالية..."
                style={inputStyle}
              />
            </FormField>

            <FormField label="Short Brief in English">
              <textarea
                rows={2}
                value={briefEn}
                onChange={(e) => setBriefEn(e.target.value)}
                placeholder="Short summary for card view..."
                dir="ltr"
                style={inputStyle}
              />
            </FormField>
          </div>

          {/* Full Descriptions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <FormField label="الوصف التفصيلي بالعربية">
              <textarea
                rows={4}
                value={descriptionAr}
                onChange={(e) => setDescriptionAr(e.target.value)}
                placeholder="شرح كامل لأهداف الفعالية ومخرجاتها..."
                style={inputStyle}
              />
            </FormField>

            <FormField label="Full Description in English">
              <textarea
                rows={4}
                value={descriptionEn}
                onChange={(e) => setDescriptionEn(e.target.value)}
                placeholder="Comprehensive description of goals and outcomes..."
                dir="ltr"
                style={inputStyle}
              />
            </FormField>
          </div>

          {/* Schedule Agenda */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <label style={{ color: '#ffd54f', fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} />
                <span>جدول الأعمال (Schedule & Agenda)</span>
              </label>
              <button
                type="button"
                onClick={addScheduleItem}
                className="btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <Plus size={14} />
                <span>إضافة فقرة</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {schedule.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '110px 110px 1fr 1fr auto',
                    gap: '0.5rem',
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <input
                    type="text"
                    value={item.time_ar || ''}
                    onChange={(e) => updateScheduleItem(idx, 'time_ar', e.target.value)}
                    placeholder="10:00 ص"
                    style={{ ...inputStyle, padding: '0.45rem' }}
                  />
                  <input
                    type="text"
                    value={item.time_en || ''}
                    onChange={(e) => updateScheduleItem(idx, 'time_en', e.target.value)}
                    placeholder="10:00 AM"
                    dir="ltr"
                    style={{ ...inputStyle, padding: '0.45rem' }}
                  />
                  <input
                    type="text"
                    value={item.activity_ar || ''}
                    onChange={(e) => updateScheduleItem(idx, 'activity_ar', e.target.value)}
                    placeholder="عنوان الفقرة بالعربية"
                    style={{ ...inputStyle, padding: '0.45rem' }}
                  />
                  <input
                    type="text"
                    value={item.activity_en || ''}
                    onChange={(e) => updateScheduleItem(idx, 'activity_en', e.target.value)}
                    placeholder="Activity (English)"
                    dir="ltr"
                    style={{ ...inputStyle, padding: '0.45rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => removeScheduleItem(idx)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {schedule.length === 0 && (
                <div style={{ fontSize: '0.85rem', color: '#888', fontStyle: 'italic', textAlign: 'center', padding: '0.5rem' }}>
                  لم يتم إضافة فقرات إلى جدول الأعمال بعد.
                </div>
              )}
            </div>
          </div>

          {/* Partner Names & Sponsors */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
            {/* Free-text Partners */}
            <div>
              <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                أسماء الشركاء والجهات الداعمة
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  value={newPartnerInput}
                  onChange={(e) => setNewPartnerInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addPartner();
                    }
                  }}
                  placeholder="اسم الجهة..."
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={addPartner}
                  className="btn-secondary"
                  style={{ padding: '0.5rem 0.85rem' }}
                >
                  <Plus size={16} />
                </button>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {partnerNames.map((p, i) => (
                  <span
                    key={i}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: 'rgba(255, 184, 0, 0.12)',
                      border: '1px solid rgba(255, 184, 0, 0.3)',
                      color: '#ffd54f',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '9999px',
                      fontSize: '0.82rem',
                    }}
                  >
                    {p}
                    <button
                      type="button"
                      onClick={() => removePartner(p)}
                      style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: 0 }}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Registered Business Sponsors */}
            <div>
              <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                الشركات الراعية المسجلة (Business)
              </label>
              <div
                style={{
                  maxHeight: '130px',
                  overflowY: 'auto',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 184, 0, 0.15)',
                  borderRadius: '10px',
                  padding: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                }}
              >
                {companies.map((comp) => {
                  const isChecked = selectedSponsorIds.includes(comp.id);
                  return (
                    <label
                      key={comp.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.85rem',
                        color: isChecked ? '#ffd54f' : '#ccc',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSponsor(comp.id)}
                        style={{ accentColor: '#ffb800' }}
                      />
                      <span>{comp.name}</span>
                    </label>
                  );
                })}
                {companies.length === 0 && (
                  <div style={{ color: '#888', fontSize: '0.8rem', textAlign: 'center' }}>
                    لا توجد شركات مسجلة في وحدة العلاقات العامة.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '2rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div>
              {isEdit && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={handleDuplicate}
                    disabled={loading}
                    className="btn-secondary"
                    style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem' }}
                  >
                    <Copy size={16} />
                    <span>استنساخ الفعالية</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    disabled={loading}
                    style={{
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.88rem',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#f87171',
                      borderRadius: '10px',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={16} />
                    <span>حذف</span>
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="btn-secondary"
                style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}
              >
                إلغاء
              </button>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{
                  padding: '0.75rem 1.75rem',
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                <span>{isEdit ? 'حفظ التعديلات' : 'إنشاء الفعالية'}</span>
              </button>
            </div>
          </div>
        </form>
      </Drawer>

      <ConfirmDialog
        isOpen={confirmDelete}
        title="تأكيد حذف الفعالية"
        message={`هل أنت متأكد من رغبتك في حذف الفعالية "${titleAr}"؟ سيتم حذف جميع الأدوار والتسجيلات والملاحظات المرتبطة بها نهائياً.`}
        confirmText="نعم، حذف نهائي"
        cancelText="تراجع"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}

const inputStyle = {
  width: '100%',
  padding: '0.75rem 0.9rem',
  borderRadius: '10px',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 184, 0, 0.2)',
  color: '#fff',
  fontSize: '0.92rem',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

