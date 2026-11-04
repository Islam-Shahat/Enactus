// src/components/dashboard/cms/CmsItemDrawer.jsx
import React, { useState, useEffect } from 'react';
import { 
  X, Save, Upload, Plus, Trash2, Globe, AlertCircle, 
  Loader2, Sparkles, ExternalLink, Image as ImageIcon, CheckCircle2 
} from 'lucide-react';
import Drawer from '../Drawer';
import FormField from '../FormField';
import MarkdownEditor from './MarkdownEditor';
import { supabase } from '../../../lib/supabase';
import { uploadSiteAsset } from '../../../lib/cmsStorage';
import { 
  StatSchema, PartnerSchema, TeamMemberSchema, CommitteeSchema, 
  NewsPostSchema, GalleryItemSchema, FaqSchema, SponsorshipPackageSchema,
  SiteContentSchema, getPreviewUrl 
} from '../../../lib/cmsHelpers';

export default function CmsItemDrawer({
  isOpen,
  onClose,
  tabKey,
  item = null,
  allCommittees = [],
  allMembers = [],
  onSaved,
}) {
  const isEdit = Boolean(item?.id || (tabKey === 'content' && item?.key) || (tabKey === 'settings'));

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState(null);

  // Form states per tab
  const [formData, setFormData] = useState({});

  // Committee specific states
  const [committeeHeadId, setCommitteeHeadId] = useState('');
  const [committeeHeadName, setCommitteeHeadName] = useState('');
  const [committeeHeadRole, setCommitteeHeadRole] = useState('');
  const [committeeHeadPhoto, setCommitteeHeadPhoto] = useState('');
  const [dutiesListAr, setDutiesListAr] = useState([]);
  const [dutiesListEn, setDutiesListEn] = useState([]);
  const [skillsReqListAr, setSkillsReqListAr] = useState([]);
  const [skillsReqListEn, setSkillsReqListEn] = useState([]);
  const [skillsGainListAr, setSkillsGainListAr] = useState([]);
  const [skillsGainListEn, setSkillsGainListEn] = useState([]);
  const [projectsListAr, setProjectsListAr] = useState([]);
  const [projectsListEn, setProjectsListEn] = useState([]);

  // Package benefits
  const [benefitsListAr, setBenefitsListAr] = useState([]);
  const [benefitsListEn, setBenefitsListEn] = useState([]);

  const initDefaults = (key) => {
    switch (key) {
      case 'stats':
        setFormData({ key: '', value: 0, suffix: '+', label_ar: '', label_en: '', is_visible: true, sort_order: 10 });
        break;
      case 'partners':
        setFormData({ name_ar: '', name_en: '', kind: 'sponsor', tier: 'gold', website: '', logo_url: '', cover_url: '', description_ar: '', description_en: '', is_visible: true, sort_order: 10 });
        break;
      case 'team':
        setFormData({ name_ar: '', name_en: '', kind: 'board', position_ar: '', position_en: '', faculty_ar: '', faculty_en: '', quote_ar: '', quote_en: '', bio_ar: '', bio_en: '', photo_url: '', links: { linkedin: '', facebook: '' }, is_visible: true, sort_order: 10 });
        break;
      case 'committees':
        setFormData({ name_ar: '', name_en: '', slug: '', code: '', description_ar: '', description_en: '', color: '#ffb800', is_media_team: false, is_active: true, sort_order: 10 });
        setDutiesListAr([]);
        setDutiesListEn([]);
        setSkillsReqListAr([]);
        setSkillsReqListEn([]);
        setSkillsGainListAr([]);
        setSkillsGainListEn([]);
        setProjectsListAr([]);
        setProjectsListEn([]);
        setCommitteeHeadId('');
        setCommitteeHeadName('');
        setCommitteeHeadRole('');
        setCommitteeHeadPhoto('');
        break;
      case 'news':
        setFormData({ title_ar: '', title_en: '', slug: '', category_ar: 'أخبار الفريق', category_en: 'Team News', excerpt_ar: '', excerpt_en: '', body_ar: '', body_en: '', cover_url: '', is_published: true, published_at: new Date().toISOString() });
        break;
      case 'gallery':
        setFormData({ media_url: '', kind: 'image', caption_ar: '', caption_en: '', is_visible: true, sort_order: 10 });
        break;
      case 'faqs':
        setFormData({ question_ar: '', question_en: '', answer_ar: '', answer_en: '', is_visible: true, sort_order: 10 });
        break;
      case 'packages':
        setFormData({ name_ar: '', name_en: '', tier: 'gold', tagline_ar: '', tagline_en: '', badge_ar: '', badge_en: '', is_featured: false, is_public: true, is_active: true, sort_order: 10 });
        setBenefitsListAr([]);
        setBenefitsListEn([]);
        break;
      case 'content':
        setFormData({ key: 'terms', locale: 'ar', title: '', markdown: '' });
        break;
      case 'settings':
        setFormData({ applications_open: true });
        break;
      default:
        setFormData({});
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setError(null);

    if (item) {
      setFormData({ ...item });

      if (tabKey === 'committees') {
        const cAr = item.content?.ar || {};
        const cEn = item.content?.en || {};
        setDutiesListAr(Array.isArray(cAr.duties) ? cAr.duties : []);
        setDutiesListEn(Array.isArray(cEn.duties) ? cEn.duties : []);
        setSkillsReqListAr(Array.isArray(cAr.skillsRequired) ? cAr.skillsRequired : []);
        setSkillsReqListEn(Array.isArray(cEn.skillsRequired) ? cEn.skillsRequired : []);
        setSkillsGainListAr(Array.isArray(cAr.skillsGained) ? cAr.skillsGained : []);
        setSkillsGainListEn(Array.isArray(cEn.skillsGained) ? cEn.skillsGained : []);
        setProjectsListAr(Array.isArray(cAr.activeProjects) ? cAr.activeProjects : []);
        setProjectsListEn(Array.isArray(cEn.activeProjects) ? cEn.activeProjects : []);

        // Load committee head from team_public
        if (item.id) {
          supabase
            .from('team_public')
            .select('*')
            .eq('committee_id', item.id)
            .eq('kind', 'head')
            .maybeSingle()
            .then(({ data }) => {
              if (data) {
                setCommitteeHeadId(data.id || '');
                setCommitteeHeadName(data.name_ar || '');
                setCommitteeHeadRole(data.position_ar || '');
                setCommitteeHeadPhoto(data.photo_url || '');
              } else {
                setCommitteeHeadId('');
                setCommitteeHeadName('');
                setCommitteeHeadRole('');
                setCommitteeHeadPhoto('');
              }
            });
        }
      }

      if (tabKey === 'packages') {
        setBenefitsListAr(Array.isArray(item.benefits_ar) ? item.benefits_ar : []);
        setBenefitsListEn(Array.isArray(item.benefits_en) ? item.benefits_en : []);
      }
    } else {
      // Defaults for new item
      initDefaults(tabKey);
    }
  }, [isOpen, item, tabKey]);

  // Generic Image Upload
  async function handleFileUpload(e, fieldName, pathPrefix) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError(null);

    try {
      const ext = file.name.split('.').pop() || 'webp';
      const recordId = item?.id || (item?.slug || Date.now().toString(36));
      const destPath = `${pathPrefix}/${recordId}/${fieldName}-${Date.now()}.${ext}`;

      const publicUrl = await uploadSiteAsset(file, destPath);
      setFormData((prev) => ({ ...prev, [fieldName]: publicUrl }));
    } catch (err) {
      setError(err.message || 'فشل رفع الصورة');
    } finally {
      setUploadingImage(false);
    }
  }

  // Handle Save
  async function handleSave(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      switch (tabKey) {
        case 'stats': {
          const parsed = StatSchema.parse(formData);
          if (isEdit) {
            const { error: err } = await supabase.from('site_stats').update(parsed).eq('id', item.id);
            if (err) throw err;
          } else {
            const { error: err } = await supabase.from('site_stats').insert([parsed]);
            if (err) throw err;
          }
          break;
        }

        case 'partners': {
          const parsed = PartnerSchema.parse(formData);
          if (isEdit) {
            const { error: err } = await supabase.from('partners').update(parsed).eq('id', item.id);
            if (err) throw err;
          } else {
            const { error: err } = await supabase.from('partners').insert([parsed]);
            if (err) throw err;
          }
          break;
        }

        case 'team': {
          const parsed = TeamMemberSchema.parse(formData);
          if (isEdit) {
            const { error: err } = await supabase.from('team_public').update(parsed).eq('id', item.id);
            if (err) throw err;
          } else {
            const { error: err } = await supabase.from('team_public').insert([parsed]);
            if (err) throw err;
          }
          break;
        }

        case 'committees': {
          const parsed = CommitteeSchema.parse(formData);
          const fullContent = {
            ar: {
              brief: formData.content_brief_ar || item?.content?.ar?.brief || '',
              mascot: formData.content_mascot_ar || item?.content?.ar?.mascot || '',
              quote: formData.content_quote_ar || item?.content?.ar?.quote || '',
              duties: dutiesListAr,
              skillsRequired: skillsReqListAr,
              skillsGained: skillsGainListAr,
              activeProjects: projectsListAr,
            },
            en: {
              brief: formData.content_brief_en || item?.content?.en?.brief || '',
              mascot: formData.content_mascot_en || item?.content?.en?.mascot || '',
              quote: formData.content_quote_en || item?.content?.en?.quote || '',
              duties: dutiesListEn,
              skillsRequired: skillsReqListEn,
              skillsGained: skillsGainListEn,
              activeProjects: projectsListEn,
            },
          };

          let committeeId = item?.id;

          if (isEdit) {
            const { error: err } = await supabase
              .from('committees')
              .update({ ...parsed, content: fullContent })
              .eq('id', item.id);
            if (err) throw err;
          } else {
            const { data: newC, error: err } = await supabase
              .from('committees')
              .insert([{ ...parsed, content: fullContent }])
              .select('id')
              .single();
            if (err) throw err;
            committeeId = newC.id;
          }

          // Update Committee Head in team_public if provided
          if (committeeId && committeeHeadName.trim()) {
            const headPayload = {
              committee_id: committeeId,
              kind: 'head',
              name_ar: committeeHeadName.trim(),
              position_ar: committeeHeadRole.trim() || `رئيس لجنة ${parsed.name_ar}`,
              photo_url: committeeHeadPhoto || null,
              is_visible: true,
            };

            if (committeeHeadId) {
              await supabase.from('team_public').update(headPayload).eq('id', committeeHeadId);
            } else {
              await supabase.from('team_public').insert([headPayload]);
            }
          }
          break;
        }

        case 'news': {
          const parsed = NewsPostSchema.parse(formData);
          if (isEdit) {
            const { error: err } = await supabase.from('news_posts').update(parsed).eq('id', item.id);
            if (err) throw err;
          } else {
            const { error: err } = await supabase.from('news_posts').insert([parsed]);
            if (err) throw err;
          }
          break;
        }

        case 'gallery': {
          const parsed = GalleryItemSchema.parse(formData);
          if (isEdit) {
            const { error: err } = await supabase.from('gallery_items').update(parsed).eq('id', item.id);
            if (err) throw err;
          } else {
            const { error: err } = await supabase.from('gallery_items').insert([parsed]);
            if (err) throw err;
          }
          break;
        }

        case 'faqs': {
          const parsed = FaqSchema.parse(formData);
          if (isEdit) {
            const { error: err } = await supabase.from('faqs').update(parsed).eq('id', item.id);
            if (err) throw err;
          } else {
            const { error: err } = await supabase.from('faqs').insert([parsed]);
            if (err) throw err;
          }
          break;
        }

        case 'packages': {
          const parsed = SponsorshipPackageSchema.parse({
            ...formData,
            benefits_ar: benefitsListAr,
            benefits_en: benefitsListEn,
          });
          if (isEdit) {
            const { error: err } = await supabase.from('sponsorship_packages').update(parsed).eq('id', item.id);
            if (err) throw err;
          } else {
            const { error: err } = await supabase.from('sponsorship_packages').insert([parsed]);
            if (err) throw err;
          }
          break;
        }

        case 'content': {
          const key = formData.key || 'terms';
          const locale = formData.locale || 'ar';
          const val = {
            title: formData.title || '',
            markdown: formData.markdown || '',
          };
          const { error: err } = await supabase
            .from('site_content')
            .upsert({ key, locale, value: val }, { onConflict: 'key, locale' });
          if (err) throw err;
          break;
        }

        case 'settings': {
          const { error: err } = await supabase
            .from('settings')
            .upsert(
              { key: 'applications_open', value: Boolean(formData.applications_open) },
              { onConflict: 'key' }
            );
          if (err) throw err;
          break;
        }

        default:
          break;
      }

      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء حفظ البيانات.');
    } finally {
      setLoading(false);
    }
  }

  // Helper for adding string items to dynamic lists
  function addToList(list, setList, val) {
    if (!val || !val.trim()) return;
    if (!list.includes(val.trim())) {
      setList([...list, val.trim()]);
    }
    setBufferInput('');
  }

  function removeFromList(list, setList, idx) {
    setList(list.filter((_, i) => i !== idx));
  }

  const previewUrl = getPreviewUrl(tabKey, item || formData);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `تعديل عنصر (${tabKey})` : `إضافة عنصر جديد (${tabKey})`}
      subtitle="الحقول العربية أساسية، والإنجليزية اختيارية تملأ تلقائياً عند تركها فارغة."
      width="780px"
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

        {/* TAB 1: STATS */}
        {tabKey === 'stats' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <FormField label="المفتاح البرمجي (Key) *" required help="مثل members_count, projects_count">
                <input
                  type="text"
                  value={formData.key || ''}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  placeholder="members_count"
                  dir="ltr"
                  required
                  style={inputStyle}
                />
              </FormField>

              <FormField label="القيمة الرقمية *" required>
                <input
                  type="number"
                  value={formData.value ?? ''}
                  onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                  placeholder="120"
                  required
                  style={inputStyle}
                />
              </FormField>

              <FormField label="الرمز اللاحق (Suffix)" help="مثل +, %">
                <input
                  type="text"
                  value={formData.suffix || ''}
                  onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                  placeholder="+"
                  style={inputStyle}
                />
              </FormField>
            </div>

            <BilingualFields
              labelAr="العنوان بالعربية *"
              valueAr={formData.label_ar || ''}
              onChangeAr={(val) => setFormData({ ...formData, label_ar: val })}
              labelEn="Label in English"
              valueEn={formData.label_en || ''}
              onChangeEn={(val) => setFormData({ ...formData, label_en: val })}
              requiredAr
            />
          </div>
        )}

        {/* TAB 2: PARTNERS */}
        {tabKey === 'partners' && (
          <div>
            <BilingualFields
              labelAr="اسم الشريك بالعربية *"
              valueAr={formData.name_ar || ''}
              onChangeAr={(val) => setFormData({ ...formData, name_ar: val })}
              labelEn="Partner Name in English"
              valueEn={formData.name_en || ''}
              onChangeEn={(val) => setFormData({ ...formData, name_en: val })}
              requiredAr
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <FormField label="نوع الشراكة *">
                <select
                  value={formData.kind || 'sponsor'}
                  onChange={(e) => setFormData({ ...formData, kind: e.target.value })}
                  style={inputStyle}
                >
                  <option value="sponsor">راعي (Sponsor)</option>
                  <option value="partner">شريك (Partner)</option>
                  <option value="strategic">شريك استراتيجي (Strategic)</option>
                </select>
              </FormField>

              <FormField label="فئة الرعاية (Tier)">
                <select
                  value={formData.tier || ''}
                  onChange={(e) => setFormData({ ...formData, tier: e.target.value || null })}
                  style={inputStyle}
                >
                  <option value="">بدون فئة</option>
                  <option value="platinum">بلاتيني (Platinum)</option>
                  <option value="gold">ذهبي (Gold)</option>
                  <option value="silver">فضي (Silver)</option>
                  <option value="bronze">برونزي (Bronze)</option>
                </select>
              </FormField>

              <FormField label="رابط الموقع الإلكتروني">
                <input
                  type="url"
                  value={formData.website || ''}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://company.com"
                  dir="ltr"
                  style={inputStyle}
                />
              </FormField>
            </div>

            <ImageUploadField
              label="شعار الشريك (Logo)"
              value={formData.logo_url}
              onChange={(url) => setFormData({ ...formData, logo_url: url })}
              onUpload={(e) => handleFileUpload(e, 'logo_url', 'partners')}
              uploading={uploadingImage}
            />

            <BilingualFields
              labelAr="وصف الشراكة بالعربية"
              valueAr={formData.description_ar || ''}
              onChangeAr={(val) => setFormData({ ...formData, description_ar: val })}
              labelEn="Description in English"
              valueEn={formData.description_en || ''}
              onChangeEn={(val) => setFormData({ ...formData, description_en: val })}
              isTextarea
            />
          </div>
        )}

        {/* TAB 3: TEAM & BOARD */}
        {tabKey === 'team' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <FormField label="فئة العضو *">
                <select
                  value={formData.kind || 'board'}
                  onChange={(e) => setFormData({ ...formData, kind: e.target.value })}
                  style={inputStyle}
                >
                  <option value="board">مجلس الإدارة (Board)</option>
                  <option value="head">رئيس لجنة (Committee Head)</option>
                  <option value="alumni">خريج ملهم (Alumni)</option>
                </select>
              </FormField>

              {formData.kind === 'head' && (
                <FormField label="اللجنة التابع لها">
                  <select
                    value={formData.committee_id || ''}
                    onChange={(e) => setFormData({ ...formData, committee_id: e.target.value || null })}
                    style={inputStyle}
                  >
                    <option value="">-- اختر اللجنة --</option>
                    {allCommittees.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name_ar}
                      </option>
                    ))}
                  </select>
                </FormField>
              )}
            </div>

            <BilingualFields
              labelAr="الاسم بالعربية *"
              valueAr={formData.name_ar || ''}
              onChangeAr={(val) => setFormData({ ...formData, name_ar: val })}
              labelEn="Name in English"
              valueEn={formData.name_en || ''}
              onChangeEn={(val) => setFormData({ ...formData, name_en: val })}
              requiredAr
            />

            <BilingualFields
              labelAr="المسمى أو المنصب بالعربية *"
              valueAr={formData.position_ar || ''}
              onChangeAr={(val) => setFormData({ ...formData, position_ar: val })}
              labelEn="Position in English"
              valueEn={formData.position_en || ''}
              onChangeEn={(val) => setFormData({ ...formData, position_en: val })}
              requiredAr
            />

            <ImageUploadField
              label="الصورة الشخصية (Photo)"
              value={formData.photo_url}
              onChange={(url) => setFormData({ ...formData, photo_url: url })}
              onUpload={(e) => handleFileUpload(e, 'photo_url', 'team')}
              uploading={uploadingImage}
            />

            <BilingualFields
              labelAr="الكلية / الجامعة بالعربية"
              valueAr={formData.faculty_ar || ''}
              onChangeAr={(val) => setFormData({ ...formData, faculty_ar: val })}
              labelEn="Faculty / University (EN)"
              valueEn={formData.faculty_en || ''}
              onChangeEn={(val) => setFormData({ ...formData, faculty_en: val })}
            />

            <BilingualFields
              labelAr="اقتباس أو كلمة العضو"
              valueAr={formData.quote_ar || ''}
              onChangeAr={(val) => setFormData({ ...formData, quote_ar: val })}
              labelEn="Member Quote (EN)"
              valueEn={formData.quote_en || ''}
              onChangeEn={(val) => setFormData({ ...formData, quote_en: val })}
              isTextarea
            />
          </div>
        )}

        {/* TAB 4: COMMITTEES */}
        {tabKey === 'committees' && (
          <div>
            <BilingualFields
              labelAr="اسم اللجنة بالعربية *"
              valueAr={formData.name_ar || ''}
              onChangeAr={(val) => setFormData({ ...formData, name_ar: val })}
              labelEn="Committee Name in English"
              valueEn={formData.name_en || ''}
              onChangeEn={(val) => setFormData({ ...formData, name_en: val })}
              requiredAr
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <FormField label="الرابط الدائم (Slug) *" required>
                <input
                  type="text"
                  value={formData.slug || ''}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  placeholder="technology"
                  dir="ltr"
                  required
                  style={inputStyle}
                />
              </FormField>

              <FormField label="الكود (Code)">
                <input
                  type="text"
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="TECH"
                  dir="ltr"
                  style={inputStyle}
                />
              </FormField>

              <FormField label="لون الهوية">
                <input
                  type="color"
                  value={formData.color || '#ffb800'}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  style={{ ...inputStyle, padding: '2px', height: '38px', cursor: 'pointer' }}
                />
              </FormField>

              <FormField label="فريق الإعلام؟">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', cursor: 'pointer', color: '#fff' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(formData.is_media_team)}
                    onChange={(e) => setFormData({ ...formData, is_media_team: e.target.checked })}
                    style={{ accentColor: '#ffb800' }}
                  />
                  <span>نعم (Media)</span>
                </label>
              </FormField>
            </div>

            {/* Committee Head Editor */}
            <div
              style={{
                padding: '1rem',
                borderRadius: '12px',
                background: 'rgba(255, 184, 0, 0.05)',
                border: '1px solid rgba(255, 184, 0, 0.2)',
                marginBottom: '1.5rem',
              }}
            >
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffd54f', marginBottom: '0.75rem' }}>
                بيانات رئيس اللجنة (Committee Head)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                <input
                  type="text"
                  value={committeeHeadName}
                  onChange={(e) => setCommitteeHeadName(e.target.value)}
                  placeholder="اسم رئيس اللجنة..."
                  style={inputStyle}
                />
                <input
                  type="text"
                  value={committeeHeadRole}
                  onChange={(e) => setCommitteeHeadRole(e.target.value)}
                  placeholder="المسمى (افتراضي: رئيس اللجنة)..."
                  style={inputStyle}
                />
              </div>
              <input
                type="text"
                value={committeeHeadPhoto}
                onChange={(e) => setCommitteeHeadPhoto(e.target.value)}
                placeholder="رابط صورة رئيس اللجنة..."
                dir="ltr"
                style={inputStyle}
              />
            </div>

            {/* Content JSONB Lists: Duties, Skills, Projects */}
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffd54f', marginBottom: '0.5rem' }}>
                المهام والمسؤوليات (Duties)
              </h4>
              <ListEditor
                titleAr="المهام بالعربية"
                listAr={dutiesListAr}
                setListAr={setDutiesListAr}
                titleEn="Duties in English"
                listEn={dutiesListEn}
                setListEn={setDutiesListEn}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffd54f', marginBottom: '0.5rem' }}>
                المهارات المطلوبة (Skills Required)
              </h4>
              <ListEditor
                titleAr="المهارات بالعربية"
                listAr={skillsReqListAr}
                setListAr={setSkillsReqListAr}
                titleEn="Skills in English"
                listEn={skillsReqListEn}
                setListEn={setSkillsReqListEn}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffd54f', marginBottom: '0.5rem' }}>
                المهارات المكتسبة (Skills Gained)
              </h4>
              <ListEditor
                titleAr="المكتسبات بالعربية"
                listAr={skillsGainListAr}
                setListAr={setSkillsGainListAr}
                titleEn="Gained in English"
                listEn={skillsGainListEn}
                setListEn={setSkillsGainListEn}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffd54f', marginBottom: '0.5rem' }}>
                المشاريع الحالية (Active Projects)
              </h4>
              <ListEditor
                titleAr="المشاريع بالعربية"
                listAr={projectsListAr}
                setListAr={setProjectsListAr}
                titleEn="Projects in English"
                listEn={projectsListEn}
                setListEn={setProjectsListEn}
              />
            </div>
          </div>
        )}

        {/* TAB 5: NEWS */}
        {tabKey === 'news' && (
          <div>
            <BilingualFields
              labelAr="عنوان الخبر بالعربية *"
              valueAr={formData.title_ar || ''}
              onChangeAr={(val) => setFormData({ ...formData, title_ar: val })}
              labelEn="Title in English"
              valueEn={formData.title_en || ''}
              onChangeEn={(val) => setFormData({ ...formData, title_en: val })}
              requiredAr
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <FormField label="الرابط الدائم (Slug) *" required>
                <input
                  type="text"
                  value={formData.slug || ''}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  placeholder="launch-season-2026"
                  dir="ltr"
                  required
                  style={inputStyle}
                />
              </FormField>

              <FormField label="التصنيف">
                <input
                  type="text"
                  value={formData.category_ar || ''}
                  onChange={(e) => setFormData({ ...formData, category_ar: e.target.value })}
                  placeholder="أخبار الفريق"
                  style={inputStyle}
                />
              </FormField>
            </div>

            <ImageUploadField
              label="صورة الغلاف (Cover)"
              value={formData.cover_url}
              onChange={(url) => setFormData({ ...formData, cover_url: url })}
              onUpload={(e) => handleFileUpload(e, 'cover_url', 'news')}
              uploading={uploadingImage}
            />

            <BilingualFields
              labelAr="الموجز / المقتطف بالعربية"
              valueAr={formData.excerpt_ar || ''}
              onChangeAr={(val) => setFormData({ ...formData, excerpt_ar: val })}
              labelEn="Excerpt in English"
              valueEn={formData.excerpt_en || ''}
              onChangeEn={(val) => setFormData({ ...formData, excerpt_en: val })}
              isTextarea
            />

            <BilingualFields
              labelAr="نص الخبر الكامل بالعربية *"
              valueAr={formData.body_ar || ''}
              onChangeAr={(val) => setFormData({ ...formData, body_ar: val })}
              labelEn="Full Content in English"
              valueEn={formData.body_en || ''}
              onChangeEn={(val) => setFormData({ ...formData, body_en: val })}
              isTextarea
              rows={6}
              requiredAr
            />
          </div>
        )}

        {/* TAB 6: GALLERY */}
        {tabKey === 'gallery' && (
          <div>
            <ImageUploadField
              label="رابط الصورة أو الفيديو *"
              value={formData.media_url}
              onChange={(url) => setFormData({ ...formData, media_url: url })}
              onUpload={(e) => handleFileUpload(e, 'media_url', 'gallery')}
              uploading={uploadingImage}
            />

            <div style={{ marginBottom: '1.25rem' }}>
              <FormField label="النوع">
                <select
                  value={formData.kind || 'image'}
                  onChange={(e) => setFormData({ ...formData, kind: e.target.value })}
                  style={inputStyle}
                >
                  <option value="image">صورة (Image)</option>
                  <option value="video">فيديو (Video)</option>
                </select>
              </FormField>
            </div>

            <BilingualFields
              labelAr="التعليق التوضيحي بالعربية"
              valueAr={formData.caption_ar || ''}
              onChangeAr={(val) => setFormData({ ...formData, caption_ar: val })}
              labelEn="Caption in English"
              valueEn={formData.caption_en || ''}
              onChangeEn={(val) => setFormData({ ...formData, caption_en: val })}
            />
          </div>
        )}

        {/* TAB 7: FAQS */}
        {tabKey === 'faqs' && (
          <div>
            <BilingualFields
              labelAr="السؤال بالعربية *"
              valueAr={formData.question_ar || ''}
              onChangeAr={(val) => setFormData({ ...formData, question_ar: val })}
              labelEn="Question in English"
              valueEn={formData.question_en || ''}
              onChangeEn={(val) => setFormData({ ...formData, question_en: val })}
              requiredAr
            />

            <BilingualFields
              labelAr="الإجابة بالعربية *"
              valueAr={formData.answer_ar || ''}
              onChangeAr={(val) => setFormData({ ...formData, answer_ar: val })}
              labelEn="Answer in English"
              valueEn={formData.answer_en || ''}
              onChangeEn={(val) => setFormData({ ...formData, answer_en: val })}
              isTextarea
              rows={4}
              requiredAr
            />
          </div>
        )}

        {/* TAB 8: SPONSORSHIP PACKAGES */}
        {tabKey === 'packages' && (
          <div>
            <BilingualFields
              labelAr="اسم الباقة بالعربية *"
              valueAr={formData.name_ar || ''}
              onChangeAr={(val) => setFormData({ ...formData, name_ar: val })}
              labelEn="Package Name in English"
              valueEn={formData.name_en || ''}
              onChangeEn={(val) => setFormData({ ...formData, name_en: val })}
              requiredAr
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <FormField label="المستوى (Tier) *">
                <select
                  value={formData.tier || 'gold'}
                  onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                  style={inputStyle}
                >
                  <option value="platinum">بلاتيني (Platinum)</option>
                  <option value="gold">ذهبي (Gold)</option>
                  <option value="silver">فضي (Silver)</option>
                  <option value="bronze">برونزي (Bronze)</option>
                </select>
              </FormField>

              <FormField label="شارة مميزة؟">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', color: '#fff', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(formData.is_featured)}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    style={{ accentColor: '#ffb800' }}
                  />
                  <span>باقة مميزة (Featured)</span>
                </label>
              </FormField>
            </div>

            <BilingualFields
              labelAr="العبارة الترويجية بالعربية"
              valueAr={formData.tagline_ar || ''}
              onChangeAr={(val) => setFormData({ ...formData, tagline_ar: val })}
              labelEn="Tagline in English"
              valueEn={formData.tagline_en || ''}
              onChangeEn={(val) => setFormData({ ...formData, tagline_en: val })}
            />

            {/* Benefits Lists */}
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffd54f', marginBottom: '0.5rem' }}>
                المزايا والامتيازات (Perks & Benefits)
              </h4>
              <ListEditor
                titleAr="المزايا بالعربية"
                listAr={benefitsListAr}
                setListAr={setBenefitsListAr}
                titleEn="Benefits in English"
                listEn={benefitsListEn}
                setListEn={setBenefitsListEn}
              />
            </div>
          </div>
        )}

        {/* TAB 9: STATIC PAGES (MARKDOWN) */}
        {tabKey === 'content' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <FormField label="الصفحة الثابتة (Key) *" required>
                <select
                  value={formData.key || 'terms'}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  style={inputStyle}
                >
                  <option value="terms">الشروط والأحكام (Terms of Service)</option>
                  <option value="privacy">سياسة الخصوصية (Privacy Policy)</option>
                  <option value="about">عن المنصة وإيناكتس (About Us)</option>
                </select>
              </FormField>

              <FormField label="اللغة المستهدفة *">
                <select
                  value={formData.locale || 'ar'}
                  onChange={(e) => setFormData({ ...formData, locale: e.target.value })}
                  style={inputStyle}
                >
                  <option value="ar">العربية (Arabic - RTL)</option>
                  <option value="en">English (LTR)</option>
                </select>
              </FormField>
            </div>

            <FormField label="عنوان الصفحة">
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="الشروط والأحكام"
                style={inputStyle}
              />
            </FormField>

            <FormField label="محتوى الصفحة بصيغة Markdown">
              <MarkdownEditor
                value={formData.markdown || ''}
                onChange={(val) => setFormData({ ...formData, markdown: val })}
                dir={formData.locale === 'en' ? 'ltr' : 'rtl'}
              />
            </FormField>
          </div>
        )}

        {/* TAB 10: SETTINGS */}
        {tabKey === 'settings' && (
          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', color: '#fff' }}>
              <input
                type="checkbox"
                checked={Boolean(formData.applications_open)}
                onChange={(e) => setFormData({ ...formData, applications_open: e.target.checked })}
                style={{ width: '22px', height: '22px', accentColor: '#ffb800' }}
              />
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#ffd54f' }}>
                  فتح باب التقديم والانضمام (Recruitment Open)
                </div>
                <div style={{ color: '#a0a0b2', fontSize: '0.85rem' }}>
                  عند تفعيل هذا الخيار، سيظهر زر "انضم إلينا" في الموقع وسيكون نموذج التقديم متاحاً للزوار.
                </div>
              </div>
            </label>
          </div>
        )}

        {/* Visibility Toggle for supported tabs */}
        {formData.is_visible !== undefined && (
          <div style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', color: '#fff' }}>
              <input
                type="checkbox"
                checked={Boolean(formData.is_visible)}
                onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })}
                style={{ accentColor: '#ffb800' }}
              />
              <Globe size={16} color="#ffb800" />
              <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>ظهور في الموقع العام (Visible)</span>
            </label>
          </div>
        )}

        {/* Actions Bar */}
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
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{ padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            >
              <ExternalLink size={14} />
              <span>معاينة في الموقع</span>
            </a>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginInlineStart: 'auto' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-secondary"
              style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                padding: '0.65rem 1.5rem',
                fontSize: '0.92rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{isEdit ? 'حفظ التعديلات' : 'إضافة العنصر'}</span>
            </button>
          </div>
        </div>
      </form>
    </Drawer>
  );
}

// Side by side bilingual field helper
function BilingualFields({
  labelAr,
  valueAr,
  onChangeAr,
  labelEn,
  valueEn,
  onChangeEn,
  isTextarea = false,
  rows = 3,
  requiredAr = false,
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
      <FormField label={labelAr} required={requiredAr}>
        {isTextarea ? (
          <textarea
            rows={rows}
            value={valueAr}
            onChange={(e) => onChangeAr(e.target.value)}
            required={requiredAr}
            style={inputStyle}
          />
        ) : (
          <input
            type="text"
            value={valueAr}
            onChange={(e) => onChangeAr(e.target.value)}
            required={requiredAr}
            style={inputStyle}
          />
        )}
      </FormField>

      <FormField label={labelEn} help="اختياري: في حال تركه فارغاً يستخدم العربي">
        {isTextarea ? (
          <textarea
            rows={rows}
            value={valueEn}
            onChange={(e) => onChangeEn(e.target.value)}
            dir="ltr"
            style={inputStyle}
          />
        ) : (
          <input
            type="text"
            value={valueEn}
            onChange={(e) => onChangeEn(e.target.value)}
            dir="ltr"
            style={inputStyle}
          />
        )}
      </FormField>
    </div>
  );
}

// Image upload field helper
function ImageUploadField({ label, value, onChange, onUpload, uploading }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={{ display: 'block', color: '#e0e0ec', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem' }}>
        {label}
      </label>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        {value && (
          <div style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255, 184, 0, 0.3)', flexShrink: 0 }}>
            <img src={value} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://... أو /assets/..."
          dir="ltr"
          style={{ ...inputStyle, flex: 1 }}
        />
        <label
          className="btn-secondary"
          style={{
            padding: '0.65rem 0.9rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            cursor: uploading ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
            whiteSpace: 'nowrap',
          }}
        >
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          <span>رفع صورة</span>
          <input
            type="file"
            accept="image/*"
            onChange={onUpload}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </label>
      </div>
    </div>
  );
}

// Dynamic List Editor for JSONB arrays
function ListEditor({ titleAr, listAr, setListAr, titleEn, listEn, setListEn }) {
  const [valAr, setValAr] = useState('');
  const [valEn, setValEn] = useState('');

  function addItem() {
    if (!valAr.trim()) return;
    setListAr([...listAr, valAr.trim()]);
    setListEn([...listEn, valEn.trim() || valAr.trim()]);
    setValAr('');
    setValEn('');
  }

  function removeItem(idx) {
    setListAr(listAr.filter((_, i) => i !== idx));
    setListEn(listEn.filter((_, i) => i !== idx));
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <input
          type="text"
          value={valAr}
          onChange={(e) => setValAr(e.target.value)}
          placeholder={titleAr}
          style={{ ...inputStyle, flex: 1 }}
        />
        <input
          type="text"
          value={valEn}
          onChange={(e) => setValEn(e.target.value)}
          placeholder={titleEn}
          dir="ltr"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          type="button"
          onClick={addItem}
          className="btn-secondary"
          style={{ padding: '0.5rem 0.85rem', display: 'flex', alignItems: 'center' }}
        >
          <Plus size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '140px', overflowY: 'auto' }}>
        {listAr.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.35rem 0.6rem',
              borderRadius: '6px',
              background: 'rgba(255, 184, 0, 0.08)',
              fontSize: '0.82rem',
            }}
          >
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <span style={{ color: '#fff', fontWeight: 600 }}>{item}</span>
              {listEn[idx] && <span style={{ color: '#aaa', fontStyle: 'italic' }}>({listEn[idx]})</span>}
            </div>
            <button
              type="button"
              onClick={() => removeItem(idx)}
              style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0 }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '0.65rem 0.85rem',
  borderRadius: '8px',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 184, 0, 0.2)',
  color: '#fff',
  fontSize: '0.88rem',
  outline: 'none',
  boxSizing: 'border-box',
};
