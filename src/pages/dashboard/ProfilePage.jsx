import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ROLE_LABELS } from '../../lib/roles';
import FormField from '../../components/dashboard/FormField';
import StatusBadge from '../../components/dashboard/StatusBadge';
import { useToast } from '../../components/dashboard/Toast';
import {
  User,
  Camera,
  GraduationCap,
  BookOpen,
  Save,
  Loader2,
} from 'lucide-react';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 MB
const RESIZE_DIMENSION = 512;

function resizeImage(file, maxSize = RESIZE_DIMENSION) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to process image'));
              return;
            }
            resolve(blob);
          },
          mimeType,
          0.9
        );
      };
      img.onerror = () => reject(new Error('Invalid image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const { user, profile, roles, refreshProfile } = useAuth();
  const { lang, setLang } = useLanguage();
  const isAr = lang === 'ar';
  const toast = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  // Form states
  const [formData, setFormData] = useState({
    full_name_ar: '',
    full_name_en: '',
    bio: '',
    locale: 'ar',
    phone: '',
  });

  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Fetch private profile fields (phone, email, faculty, etc.)
  const { data: privateProfile, isLoading: isPrivateLoading } = useQuery({
    queryKey: ['dashboard', 'my_profile_private', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profile_private')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: Boolean(user?.id),
  });

  // Fetch active memberships for the user
  const { data: myMemberships = [] } = useQuery({
    queryKey: ['dashboard', 'my_memberships', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('memberships')
        .select(`
          id,
          position,
          status,
          joined_at,
          committees(id, slug, name_ar, name_en, color),
          seasons(id, name, is_active)
        `)
        .eq('user_id', user.id);
      if (error) return [];
      return data || [];
    },
    enabled: Boolean(user?.id),
  });

  // Sync state when profile or privateProfile changes
  useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        full_name_ar: profile.full_name_ar || '',
        full_name_en: profile.full_name_en || '',
        bio: profile.bio || '',
        locale: profile.locale || 'ar',
      }));
      setAvatarPreview(profile.avatar_url || null);
    }
  }, [profile]);

  useEffect(() => {
    if (privateProfile) {
      setFormData((prev) => ({
        ...prev,
        phone: privateProfile.phone || '',
      }));
    }
  }, [privateProfile]);

  // Avatar upload handler
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.show(
        isAr ? 'صيغة الصورة غير مدعومة. يرجى اختيار JPEG أو PNG أو WebP' : 'Unsupported format (JPEG, PNG, WebP only)',
        'error'
      );
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      toast.show(isAr ? 'حجم الصورة يتجاوز الحد الأقصى (2 ميجابايت)' : 'File size exceeds 2 MB limit', 'error');
      return;
    }

    try {
      setIsUploadingAvatar(true);
      // Client-side resize to 512px
      const resizedBlob = await resizeImage(file, RESIZE_DIMENSION);
      const ext = file.type === 'image/png' ? 'png' : 'jpg';
      const filePath = `${user.id}/avatar.${ext}`;

      // Upload to 'avatars' bucket
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, resizedBlob, {
        upsert: true,
        contentType: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
      });

      if (uploadError) throw uploadError;

      // Get public URL with cache-busting timestamp
      const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = `${publicData.publicUrl}?t=${Date.now()}`;

      // Update profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarPreview(publicUrl);
      await refreshProfile();
      toast.show(isAr ? 'تم تحديث الصورة الشخصية بنجاح' : 'Avatar updated successfully', 'success');
    } catch (err) {
      toast.show(err.message || (isAr ? 'فشل رفع الصورة' : 'Failed to upload avatar'), 'error');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Profile save mutation
  const saveMutation = useMutation({
    mutationFn: async (dataToSave) => {
      // 1. Update profiles
      const { error: profError } = await supabase
        .from('profiles')
        .update({
          full_name_ar: dataToSave.full_name_ar.trim() || null,
          full_name_en: dataToSave.full_name_en.trim() || null,
          bio: dataToSave.bio.trim() || null,
          locale: dataToSave.locale,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (profError) throw profError;

      // 2. Update profile_private (phone)
      const { error: privError } = await supabase
        .from('profile_private')
        .upsert(
          {
            user_id: user.id,
            phone: dataToSave.phone.trim() || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      if (privError) throw privError;
    },
    onSuccess: async () => {
      toast.show(isAr ? 'تم حفظ التعديلات بنجاح' : 'Profile updated successfully', 'success');
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'my_profile_private'] });
      // If user changed locale, match app language
      if (formData.locale && formData.locale !== lang) {
        setLang(formData.locale);
      }
    },
    onError: (err) => {
      toast.show(err.message || (isAr ? 'فشل حفظ التعديلات' : 'Failed to save changes'), 'error');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffd54f', margin: 0 }}>
          {isAr ? 'الملف الشخصي' : 'My Profile'}
        </h1>
        <p style={{ color: '#aaa', fontSize: '0.88rem', margin: '0.25rem 0 0' }}>
          {isAr
            ? 'عرض وتعديل بياناتك الشخصية، صورتك، وتفضيلات اللغة'
            : 'Manage your profile details, avatar, and account preferences'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        {/* Top Overview Card with Avatar */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 184, 0, 0.2)',
            borderRadius: '12px',
            padding: '1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '1.5rem',
          }}
        >
          {/* Avatar with Upload Trigger */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                background: 'rgba(255, 184, 0, 0.1)',
                border: '2px solid rgba(255, 184, 0, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="avatar"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <User size={44} color="#ffb800" />
              )}

              {isUploadingAvatar && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Loader2 size={24} color="#ffb800" className="animate-spin" />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              title={isAr ? 'تغيير الصورة الشخصية' : 'Change avatar'}
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                background: '#ffb800',
                color: '#12131a',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              }}
            >
              <Camera size={16} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
          </div>

          {/* User info & badges */}
          <div style={{ flex: 1, minWidth: '240px' }}>
            <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#fff', fontWeight: 700 }}>
              {isAr
                ? profile?.full_name_ar || profile?.full_name_en || user?.email
                : profile?.full_name_en || profile?.full_name_ar || user?.email}
            </h2>
            <div style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '0.2rem' }}>
              {user?.email}
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
              {roles.map((r, idx) => (
                <StatusBadge
                  key={idx}
                  status={r.role}
                  label={ROLE_LABELS[r.role]?.[lang] || ROLE_LABELS[r.role]?.ar || r.role}
                />
              ))}
              <StatusBadge status={profile?.status || 'active'} />
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 184, 0, 0.2)',
            borderRadius: '12px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          <h3 style={{ margin: 0, color: '#ffd54f', fontSize: '1.1rem' }}>
            {isAr ? 'البيانات الأساسية' : 'Personal Details'}
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem',
            }}
          >
            {/* Arabic Name */}
            <FormField label={isAr ? 'الاسم باللغة العربية' : 'Full Name (Arabic)'}>
              <input
                type="text"
                value={formData.full_name_ar}
                onChange={(e) => setFormData({ ...formData, full_name_ar: e.target.value })}
                placeholder={isAr ? 'مثال: إسلام شحات' : 'e.g. إسلام شحات'}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  border: '1px solid rgba(255, 184, 0, 0.3)',
                }}
              />
            </FormField>

            {/* English Name */}
            <FormField label={isAr ? 'الاسم باللغة الإنجليزية' : 'Full Name (English)'}>
              <input
                type="text"
                value={formData.full_name_en}
                onChange={(e) => setFormData({ ...formData, full_name_en: e.target.value })}
                placeholder="e.g. Eslam Shahat"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  border: '1px solid rgba(255, 184, 0, 0.3)',
                }}
              />
            </FormField>

            {/* Phone */}
            <FormField label={isAr ? 'رقم الهاتف (الواتساب)' : 'Phone Number'}>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="010XXXXXXXX"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  border: '1px solid rgba(255, 184, 0, 0.3)',
                }}
              />
            </FormField>

            {/* Locale */}
            <FormField label={isAr ? 'لغة الواجهة الافتراضية' : 'Preferred Language'}>
              <select
                value={formData.locale}
                onChange={(e) => setFormData({ ...formData, locale: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  border: '1px solid rgba(255, 184, 0, 0.3)',
                }}
              >
                <option value="ar" style={{ background: '#181920', color: '#fff' }}>
                  العربية (Arabic)
                </option>
                <option value="en" style={{ background: '#181920', color: '#fff' }}>
                  English (الإنجليزية)
                </option>
              </select>
            </FormField>
          </div>

          {/* Bio */}
          <FormField label={isAr ? 'نبذة شخصية (Bio)' : 'Bio / About You'}>
            <textarea
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder={isAr ? 'اكتب نبذة عن دورك أو اهتماماتك في الفريق...' : 'Tell us about yourself...'}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.06)',
                color: '#fff',
                border: '1px solid rgba(255, 184, 0, 0.3)',
                resize: 'vertical',
              }}
            />
          </FormField>

          {/* Submit Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.75rem',
                borderRadius: '8px',
                fontWeight: 600,
              }}
            >
              <Save size={18} />
              <span>{saveMutation.isPending ? (isAr ? 'جاري الحفظ...' : 'Saving...') : isAr ? 'حفظ التعديلات' : 'Save Changes'}</span>
            </button>
          </div>
        </form>

        {/* Read-Only Academic & Membership Details */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 184, 0, 0.15)',
            borderRadius: '12px',
            padding: '1.5rem',
          }}
        >
          <h3 style={{ margin: '0 0 1rem', color: '#ffd54f', fontSize: '1.1rem' }}>
            {isAr ? 'السجل الأكاديمي وعضويات اللجان' : 'Academic & Committee Records'}
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.85rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: '#888', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <GraduationCap size={14} />
                <span>{isAr ? 'الكلية' : 'Faculty'}</span>
              </div>
              <div style={{ color: '#fff', fontWeight: 600, marginTop: '0.25rem' }}>
                {privateProfile?.faculty || '—'}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.85rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: '#888', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <BookOpen size={14} />
                <span>{isAr ? 'الفرقة الدراسية' : 'Study Year'}</span>
              </div>
              <div style={{ color: '#fff', fontWeight: 600, marginTop: '0.25rem' }}>
                {privateProfile?.study_year ? `${isAr ? 'الفرقة ' : 'Year '}${privateProfile.study_year}` : '—'}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.85rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>
                {isAr ? 'الرقم الجامعي' : 'University ID'}
              </div>
              <div style={{ color: '#fff', fontWeight: 600, marginTop: '0.25rem' }}>
                {privateProfile?.university_id || '—'}
              </div>
            </div>
          </div>

          {/* Memberships history list */}
          <h4 style={{ margin: '0 0 0.75rem', color: '#ddd', fontSize: '0.95rem' }}>
            {isAr ? 'عضويات المواسم' : 'Season Memberships'}
          </h4>

          {myMemberships.length === 0 ? (
            <div style={{ color: '#777', fontSize: '0.85rem', fontStyle: 'italic' }}>
              {isAr ? 'لا توجد عضويات مسجلة حالياً.' : 'No active memberships recorded.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {myMemberships.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: 'rgba(255, 184, 0, 0.03)',
                    border: '1px solid rgba(255, 184, 0, 0.15)',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <StatusBadge
                      label={isAr ? m.committees?.name_ar : m.committees?.name_en}
                      color={m.committees?.color}
                    />
                    <StatusBadge status={m.position} />
                    <span style={{ fontSize: '0.82rem', color: '#aaa' }}>
                      {m.seasons?.name || ''}
                    </span>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
