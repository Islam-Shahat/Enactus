// src/components/dashboard/business/CompanyDrawer.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Globe,
  MapPin,
  Briefcase,
  User,
  Phone,
  Mail,
  Plus,
  Trash2,
  MessageSquare,
  Clock,
  Star,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../Toast';
import Drawer from '../Drawer';
import StatusBadge from '../StatusBadge';
import FormField from '../FormField';
import { COMPANY_STAGES } from '../../../lib/businessHelpers';

export default function CompanyDrawer({ isOpen, onClose, companyId }) {
  const { user, isSuperAdmin, hasRole } = useAuth();
  const { lang, dir } = useLanguage();
  const isAr = lang === 'ar';
  const queryClient = useQueryClient();
  const toast = useToast();

  const canWrite = isSuperAdmin || hasRole(['pr_admin', 'president', 'vice_president']);

  // Fetch company details
  const {
    data: company,
    isLoading: loadingCompany,
  } = useQuery({
    queryKey: ['company', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from('companies')
        .select(`
          id,
          name_ar,
          name_en,
          industry,
          website,
          address,
          stage,
          created_at,
          owner:owner_id (id, full_name_ar, full_name_en, avatar_url),
          creator:created_by (id, full_name_ar, full_name_en)
        `)
        .eq('id', companyId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isOpen && Boolean(companyId),
  });

  // Fetch company contacts (RLS: pr_admin/president/vice only)
  const {
    data: contacts = [],
    isLoading: loadingContacts,
    error: contactsError,
  } = useQuery({
    queryKey: ['company_contacts', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('company_contacts')
        .select('*')
        .eq('company_id', companyId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) {
        // Graceful handle of RLS 42501 permission error for non-PR
        return [];
      }
      return data || [];
    },
    enabled: isOpen && Boolean(companyId) && canWrite,
  });

  // Fetch company notes timeline (RLS: pr_admin/president/vice only)
  const {
    data: notes = [],
    isLoading: loadingNotes,
    error: notesError,
  } = useQuery({
    queryKey: ['company_notes', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('company_notes')
        .select(`
          id,
          body,
          created_at,
          author:author_id (id, full_name_ar, full_name_en, avatar_url)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: isOpen && Boolean(companyId) && canWrite,
  });

  // Add Contact Form State
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    job_title: '',
    phone: '',
    email: '',
    is_primary: false,
  });

  // Add Note State
  const [noteBody, setNoteBody] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Update Stage Mutation
  const updateStageMutation = useMutation({
    mutationFn: async (newStage) => {
      const { error } = await supabase
        .from('companies')
        .update({ stage: newStage })
        .eq('id', companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.show(isAr ? 'تم تحديث مرحلة الشركة' : 'Company stage updated', 'success');
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company', companyId] });
    },
    onError: (err) => {
      toast.show(err.message || (isAr ? 'فشل التحديث' : 'Update failed'), 'error');
    },
  });

  // Add Contact Mutation
  const addContactMutation = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase.from('company_contacts').insert({
        company_id: companyId,
        name: data.name.trim(),
        job_title: data.job_title.trim() || null,
        phone: data.phone.trim() || null,
        email: data.email.trim() || null,
        is_primary: data.is_primary,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.show(isAr ? 'تمت إضافة جهة الاتصال' : 'Contact added', 'success');
      setShowAddContact(false);
      setContactForm({ name: '', job_title: '', phone: '', email: '', is_primary: false });
      queryClient.invalidateQueries({ queryKey: ['company_contacts', companyId] });
    },
    onError: (err) => {
      toast.show(err.message || (isAr ? 'فشل إضافة جهة الاتصال' : 'Failed to add contact'), 'error');
    },
  });

  // Delete Contact Mutation
  const deleteContactMutation = useMutation({
    mutationFn: async (contactId) => {
      const { error } = await supabase
        .from('company_contacts')
        .delete()
        .eq('id', contactId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.show(isAr ? 'تم حذف جهة الاتصال' : 'Contact deleted', 'success');
      queryClient.invalidateQueries({ queryKey: ['company_contacts', companyId] });
    },
  });

  // Add Note Mutation
  const addNoteMutation = useMutation({
    mutationFn: async (body) => {
      const { error } = await supabase.from('company_notes').insert({
        company_id: companyId,
        author_id: user?.id,
        body: body.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.show(isAr ? 'تم تسجيل الملاحظة' : 'Note added', 'success');
      setNoteBody('');
      queryClient.invalidateQueries({ queryKey: ['company_notes', companyId] });
    },
    onError: (err) => {
      toast.show(err.message || (isAr ? 'فشل تسجيل الملاحظة' : 'Failed to add note'), 'error');
    },
  });

  const currentStageObj = COMPANY_STAGES.find((s) => s.key === company?.stage);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      width="640px"
      title={
        company
          ? isAr
            ? company.name_ar
            : company.name_en || company.name_ar
          : isAr
          ? 'تفاصيل الشركة'
          : 'Company Details'
      }
      subtitle={company?.industry || (isAr ? 'سجل العلاقات العامة' : 'PR Record')}
    >
      {loadingCompany ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#ffb800' }}>
          {isAr ? 'جاري التحميل...' : 'Loading company...'}
        </div>
      ) : !company ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#f87171' }}>
          {isAr ? 'لم يتم العثور على الشركة' : 'Company not found'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem', paddingBottom: '2rem' }}>
          {/* Header Card with Stage Switcher */}
          <div
            className="glass-panel"
            style={{
              padding: '1.25rem',
              borderRadius: '16px',
              border: '1px solid rgba(255, 184, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              background: 'rgba(255, 255, 255, 0.02)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                  {company.name_ar}
                </h3>
                {company.name_en && (
                  <p style={{ fontSize: '0.88rem', color: '#a0a0b2' }}>{company.name_en}</p>
                )}
              </div>
              <span
                style={{
                  padding: '0.35rem 0.85rem',
                  borderRadius: '999px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  backgroundColor: currentStageObj?.color || 'rgba(255, 184, 0, 0.15)',
                  color: currentStageObj?.text || '#ffb800',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                {currentStageObj?.label[lang] || currentStageObj?.label.ar || company.stage}
              </span>
            </div>

            {/* Quick Stage Transition Selector for PR/Leaders */}
            {canWrite && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#ffd54f', fontWeight: 600 }}>
                  {isAr ? 'تغيير مرحلة المسار:' : 'Change Stage:'}
                </span>
                <select
                  value={company.stage}
                  onChange={(e) => updateStageMutation.mutate(e.target.value)}
                  disabled={updateStageMutation.isPending}
                  className="dashboard-input"
                  style={{
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.85rem',
                    borderRadius: '8px',
                    background: '#161822',
                    color: '#fff',
                    border: '1px solid rgba(255, 184, 0, 0.3)',
                    cursor: 'pointer',
                  }}
                >
                  {COMPANY_STAGES.map((st) => (
                    <option key={st.key} value={st.key}>
                      {st.label[lang] || st.label.ar}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Basic Info Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                fontSize: '0.85rem',
                marginTop: '0.5rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c5c5d6' }}>
                <Briefcase size={15} color="#ffb800" />
                <span>{company.industry || (isAr ? 'غير محدد' : 'Not specified')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c5c5d6' }}>
                <User size={15} color="#ffb800" />
                <span>
                  {isAr ? 'المسؤول: ' : 'Owner: '}
                  {company.owner
                    ? isAr
                      ? company.owner.full_name_ar || company.owner.full_name_en
                      : company.owner.full_name_en || company.owner.full_name_ar
                    : isAr
                    ? 'غير محدد'
                    : 'Unassigned'}
                </span>
              </div>
              {company.website && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#60a5fa' }}>
                  <Globe size={15} />
                  <a
                    href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#60a5fa', textDecoration: 'underline' }}
                  >
                    {company.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              {company.address && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c5c5d6' }}>
                  <MapPin size={15} color="#ffb800" />
                  <span>{company.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Contacts Section (Protected) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffd54f', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <User size={16} />
                {isAr ? 'جهات الاتصال بالشركة' : 'Company Contacts'} ({contacts.length})
              </h4>
              {canWrite && !showAddContact && (
                <button
                  type="button"
                  onClick={() => setShowAddContact(true)}
                  className="btn-secondary"
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} />
                  {isAr ? 'إضافة مسؤول' : 'Add Contact'}
                </button>
              )}
            </div>

            {/* Add Contact inline form */}
            {showAddContact && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!contactForm.name.trim()) return;
                  addContactMutation.mutate(contactForm);
                }}
                className="glass-panel"
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 184, 0, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <input
                    type="text"
                    required
                    placeholder={isAr ? 'مثال: إسلام شحات رسلي' : 'e.g. Islam Shahat Rosly'}
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="dashboard-input"
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', borderRadius: '6px' }}
                  />
                  <input
                    type="text"
                    placeholder={isAr ? 'المسمى الوظيفي' : 'Job Title'}
                    value={contactForm.job_title}
                    onChange={(e) => setContactForm({ ...contactForm, job_title: e.target.value })}
                    className="dashboard-input"
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', borderRadius: '6px' }}
                  />
                  <input
                    type="tel"
                    placeholder="01557523934"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    className="dashboard-input"
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', borderRadius: '6px' }}
                  />
                  <input
                    type="email"
                    placeholder="islam@gmail.com"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="dashboard-input"
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', borderRadius: '6px' }}
                  />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#c5c5d6' }}>
                  <input
                    type="checkbox"
                    checked={contactForm.is_primary}
                    onChange={(e) => setContactForm({ ...contactForm, is_primary: e.target.checked })}
                  />
                  {isAr ? 'جهة الاتصال الأساسية والرئيسية' : 'Primary contact for this company'}
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddContact(false)}
                    className="btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: '6px' }}
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={addContactMutation.isPending}
                    className="btn-primary"
                    style={{ padding: '0.35rem 1rem', fontSize: '0.8rem', borderRadius: '6px' }}
                  >
                    {isAr ? 'حفظ' : 'Save'}
                  </button>
                </div>
              </form>
            )}

            {/* Contacts List */}
            {contacts.length === 0 ? (
              <div
                style={{
                  padding: '1.25rem',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '10px',
                  color: '#9ca3af',
                  fontSize: '0.85rem',
                }}
              >
                {!canWrite
                  ? (isAr ? 'بيانات الاتصال والتواصل مقتصرة على مسؤولي العلاقات العامة والرئاسة.' : 'Contacts restricted to PR and Leadership.')
                  : (isAr ? 'لا توجد جهات اتصال مسجلة حتى الآن.' : 'No contacts added yet.')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {contacts.map((c) => (
                  <div
                    key={c.id}
                    className="glass-panel"
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '10px',
                      border: c.is_primary ? '1px solid rgba(255, 184, 0, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>{c.name}</span>
                        {c.is_primary && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              background: 'rgba(255, 184, 0, 0.2)',
                              color: '#ffb800',
                              fontWeight: 700,
                            }}
                          >
                            {isAr ? 'رئيسي' : 'Primary'}
                          </span>
                        )}
                      </div>
                      {c.job_title && (
                        <div style={{ fontSize: '0.78rem', color: '#a0a0b2' }}>{c.job_title}</div>
                      )}
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.35rem', fontSize: '0.8rem', color: '#c5c5d6' }}>
                        {c.phone && (
                          <a href={`tel:${c.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#ffd54f' }}>
                            <Phone size={12} />
                            <span>{c.phone}</span>
                          </a>
                        )}
                        {c.email && (
                          <a href={`mailto:${c.email}`} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#60a5fa' }}>
                            <Mail size={12} />
                            <span>{c.email}</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {canWrite && (
                      <button
                        type="button"
                        onClick={() => deleteContactMutation.mutate(c.id)}
                        disabled={deleteContactMutation.isPending}
                        title={isAr ? 'حذف' : 'Delete'}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#f87171',
                          cursor: 'pointer',
                          padding: '0.4rem',
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes & Timeline Section (Protected) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffd54f', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <MessageSquare size={16} />
              {isAr ? 'سجل الملاحظات والمتابعة' : 'Notes & Interaction Timeline'} ({notes.length})
            </h4>

            {canWrite && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!noteBody.trim()) return;
                  addNoteMutation.mutate(noteBody);
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
              >
                <textarea
                  rows={2}
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder={isAr ? 'سجل تفاصيل المكالمة، الاجتماع، أو الخطوة القادمة...' : 'Log call notes, meeting outcomes, or next steps...'}
                  className="dashboard-input"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    resize: 'vertical',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    disabled={addNoteMutation.isPending || !noteBody.trim()}
                    className="btn-primary"
                    style={{
                      padding: '0.4rem 1.2rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    {isAr ? 'تسجيل الملاحظة' : 'Add Note'}
                  </button>
                </div>
              </form>
            )}

            {/* Notes Timeline List */}
            {notes.length === 0 ? (
              <div
                style={{
                  padding: '1.25rem',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '10px',
                  color: '#9ca3af',
                  fontSize: '0.85rem',
                }}
              >
                {!canWrite
                  ? (isAr ? 'سجل الملاحظات مقتصر على مسؤولي العلاقات العامة والرئاسة.' : 'Notes timeline restricted to PR and Leadership.')
                  : (isAr ? 'لا توجد ملاحظات مسجلة حتى الآن.' : 'No notes added yet.')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {notes.map((n) => (
                  <div
                    key={n.id}
                    className="glass-panel"
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffd54f' }}>
                        {n.author
                          ? isAr
                            ? n.author.full_name_ar || n.author.full_name_en
                            : n.author.full_name_en || n.author.full_name_ar
                          : isAr
                          ? 'عضو الفريق'
                          : 'Team Member'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#88889a', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} />
                        {new Date(n.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#e0e0ec', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {n.body}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}

