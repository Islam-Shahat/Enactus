import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Calendar, MapPin, Clock, Users, Ticket, CheckCircle2, 
  AlertCircle, Download, Search, Edit3, ExternalLink, QrCode, 
  DollarSign, Sparkles, Image, Star, Plus, Trash2, UserCheck, 
  UserX, Camera, CameraOff, RefreshCw, Loader2, ArrowRight
} from 'lucide-react';
import Drawer from '../Drawer';
import StatusBadge from '../StatusBadge';
import ConfirmDialog from '../ConfirmDialog';
import { supabase } from '../../../lib/supabase';
import { exportToCsv } from '../../../lib/csvExport';
import { calculateAverageRating, calculateEventCapacity } from '../../../lib/eventHelpers';
import { Html5Qrcode } from 'html5-qrcode';

export default function EventDetailDrawer({
  isOpen,
  onClose,
  event,
  onEdit,
  onRefresh,
}) {
  const [activeTab, setActiveTab] = useState('overview'); // overview, roles, registrations, checkin, budget, impact

  // Sub-data states
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [availableMembers, setAvailableMembers] = useState([]);

  // Check-in state
  const [scannerActive, setScannerActive] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [checkinMessage, setCheckinMessage] = useState(null); // { type: 'success'|'warning'|'error', text: '' }
  const [recentCheckins, setRecentCheckins] = useState([]);
  const scannerRef = useRef(null);

  // Registrations search & filter
  const [regSearch, setRegSearch] = useState('');
  const [regStatusFilter, setRegStatusFilter] = useState('all');

  // Role creation
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleCount, setNewRoleCount] = useState(2);
  const [addingRole, setAddingRole] = useState(false);

  // Volunteer assignment
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRoleId, setAssignRoleId] = useState('');

  // Impact edit
  const [impactData, setImpactData] = useState({
    attendees_count: 0,
    satisfaction_rate: '95%',
    projects_presented: 5,
    certificates_issued: 0,
    notes: '',
  });
  const [savingImpact, setSavingImpact] = useState(false);

  // Fetch all related event data when opened
  useEffect(() => {
    if (!isOpen || !event?.id) return;
    loadEventData();
    return () => {
      stopScanner();
    };
  }, [isOpen, event?.id]);

  async function loadEventData() {
    if (!event?.id) return;
    setLoading(true);

    try {
      // 1. Roles
      const { data: rolesData } = await supabase
        .from('event_roles')
        .select('*')
        .eq('event_id', event.id);
      setRoles(rolesData || []);

      // 2. Volunteers
      const { data: volData } = await supabase
        .from('event_volunteers')
        .select('*, profiles(full_name_ar, full_name_en, email, avatar_url), event_roles(name)')
        .eq('event_id', event.id);
      setVolunteers(volData || []);

      // 3. Registrations
      const { data: regData } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', event.id)
        .order('created_at', { ascending: false });
      setRegistrations(regData || []);

      // 4. Feedback
      const { data: feedData } = await supabase
        .from('event_feedback')
        .select('*')
        .eq('event_id', event.id)
        .order('created_at', { ascending: false });
      setFeedback(feedData || []);

      // 5. Gallery
      const { data: galData } = await supabase
        .from('gallery_items')
        .select('*')
        .eq('event_id', event.id)
        .order('sort_order', { ascending: true });
      setGallery(galData || []);

      // 6. Budgets & Expenses
      const { data: bData } = await supabase.from('budgets').select('*').eq('event_id', event.id);
      setBudgets(bData || []);

      const { data: exData } = await supabase.from('expenses').select('*').eq('event_id', event.id);
      setExpenses(exData || []);

      // 7. Active season members for volunteer assignment
      if (event.season_id) {
        const { data: memData } = await supabase
          .from('memberships')
          .select('user_id, profiles(id, full_name_ar, full_name_en)')
          .eq('season_id', event.season_id)
          .eq('status', 'active');
        if (memData) {
          setAvailableMembers(memData.map((m) => m.profiles).filter(Boolean));
        }
      }

      // Initialize impact data
      if (event.impact && typeof event.impact === 'object') {
        setImpactData({
          attendees_count: event.impact.attendees_count ?? (regData?.filter((r) => r.status === 'attended').length || 0),
          satisfaction_rate: event.impact.satisfaction_rate ?? '95%',
          projects_presented: event.impact.projects_presented ?? 5,
          certificates_issued: event.impact.certificates_issued ?? 0,
          notes: event.impact.notes ?? '',
        });
      }
    } catch (err) {
      console.error('Failed loading event data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Camera QR scanner start/stop
  async function startScanner() {
    setCheckinMessage(null);
    setScannerActive(true);
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode('qr-reader-container');
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => handleQrScanned(decodedText),
          (errorMessage) => {}
        );
      } catch (err) {
        console.error('Scanner init error:', err);
        setCheckinMessage({ type: 'error', text: 'تعذر تشغيل الكاميرا: ' + (err.message || 'يرجى التأكد من صلاحيات الكاميرا') });
        setScannerActive(false);
      }
    }, 100);
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        // ignore already stopped
      }
      scannerRef.current = null;
    }
    setScannerActive(false);
  }

  // Handle scanned text or manual code
  async function handleCheckinCode(rawCode) {
    if (!rawCode || !rawCode.trim()) return;
    setCheckinMessage(null);

    // Extract ticket code if URL was passed (e.g. /ticket/ENQ-123456)
    let cleanCode = rawCode.trim();
    if (cleanCode.includes('/ticket/')) {
      const parts = cleanCode.split('/ticket/');
      cleanCode = parts[parts.length - 1].split('?')[0].split('#')[0];
    }
    cleanCode = cleanCode.toUpperCase();

    // Find registration in state or fetch from DB
    let reg = registrations.find((r) => r.ticket_code.toUpperCase() === cleanCode);
    if (!reg) {
      const { data } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', event.id)
        .eq('ticket_code', cleanCode)
        .maybeSingle();
      reg = data;
    }

    if (!reg) {
      setCheckinMessage({
        type: 'error',
        text: `رمز التذكرة (${cleanCode}) غير صحيح أو لا يتبع هذه الفعالية.`,
      });
      return;
    }

    if (reg.status === 'attended') {
      const timeStr = reg.checked_in_at ? new Date(reg.checked_in_at).toLocaleTimeString('ar-EG') : '';
      setCheckinMessage({
        type: 'warning',
        text: `تنبيه: الحاضر "${reg.full_name}" مسجل حضوره مسبقاً في تمام ${timeStr}`,
      });
      return;
    }

    if (reg.status === 'waitlist') {
      setCheckinMessage({
        type: 'warning',
        text: `تنبيه: التذكرة (${cleanCode}) للمشارك "${reg.full_name}" ما زالت في قائمة الانتظار ولم تتأكد بعد!`,
      });
      return;
    }

    if (reg.status === 'cancelled') {
      setCheckinMessage({
        type: 'error',
        text: `تنبيه: تسجيل "${reg.full_name}" ملغي مسبقاً!`,
      });
      return;
    }

    // Mark attended
    const nowIso = new Date().toISOString();
    const { error: updErr } = await supabase
      .from('event_registrations')
      .update({ status: 'attended', checked_in_at: nowIso })
      .eq('id', reg.id);

    if (updErr) {
      setCheckinMessage({ type: 'error', text: 'فشل تسجيل الحضور: ' + updErr.message });
      return;
    }

    // Update state
    setRegistrations((prev) =>
      prev.map((r) => (r.id === reg.id ? { ...r, status: 'attended', checked_in_at: nowIso } : r))
    );

    const checkinLogItem = {
      id: reg.id,
      name: reg.full_name,
      code: reg.ticket_code,
      time: new Date().toLocaleTimeString('ar-EG'),
    };
    setRecentCheckins((prev) => [checkinLogItem, ...prev.slice(0, 19)]);

    setCheckinMessage({
      type: 'success',
      text: `تم تسجيل حضور "${reg.full_name}" بنجاح! مرحباً به في الفعالية.`,
    });
    setManualCode('');
  }

  function handleQrScanned(decodedText) {
    handleCheckinCode(decodedText);
  }

  // Waitlist Promotion
  async function promoteWaitlist(regId) {
    try {
      const { error: updErr } = await supabase
        .from('event_registrations')
        .update({ status: 'registered' })
        .eq('id', regId);
      if (updErr) throw updErr;

      setRegistrations((prev) =>
        prev.map((r) => (r.id === regId ? { ...r, status: 'registered' } : r))
      );
    } catch (err) {
      alert('فشل ترقية التسجيل: ' + err.message);
    }
  }

  // Cancel Registration
  async function cancelReg(regId) {
    if (!confirm('هل أنت متأكد من إلغاء هذا التسجيل؟')) return;
    try {
      const { error: updErr } = await supabase
        .from('event_registrations')
        .update({ status: 'cancelled' })
        .eq('id', regId);
      if (updErr) throw updErr;

      setRegistrations((prev) =>
        prev.map((r) => (r.id === regId ? { ...r, status: 'cancelled' } : r))
      );
    } catch (err) {
      alert('فشل إلغاء التسجيل: ' + err.message);
    }
  }

  // Export registrations to CSV
  function handleExportCsv() {
    const columns = [
      { key: 'full_name', label: 'الاسم الكامل' },
      { key: 'email', label: 'البريد الإلكتروني' },
      { key: 'phone', label: 'رقم الهاتف' },
      { key: 'ticket_code', label: 'رمز التذكرة' },
      { key: 'status', label: 'الحالة' },
      { key: 'checked_in_at', label: 'وقت الحضور' },
      { key: 'created_at', label: 'تاريخ التسجيل' },
    ];
    exportToCsv(`registrations-${event.slug || event.id}`, columns, registrations);
  }

  // Roles management
  async function handleAddRole(e) {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setAddingRole(true);
    try {
      const { data, error: insErr } = await supabase
        .from('event_roles')
        .insert([{ event_id: event.id, name: newRoleName.trim(), needed_count: Number(newRoleCount) || 1 }])
        .select()
        .single();
      if (insErr) throw insErr;

      setRoles([...roles, data]);
      setNewRoleName('');
      setNewRoleCount(2);
    } catch (err) {
      alert('فشل إضافة الدور: ' + err.message);
    } finally {
      setAddingRole(false);
    }
  }

  async function handleDeleteRole(roleId) {
    if (!confirm('هل أنت متأكد من حذف هذا الدور التنظيمي؟')) return;
    try {
      const { error: delErr } = await supabase.from('event_roles').delete().eq('id', roleId);
      if (delErr) throw delErr;
      setRoles(roles.filter((r) => r.id !== roleId));
    } catch (err) {
      alert('فشل حذف الدور: ' + err.message);
    }
  }

  // Volunteer update
  async function updateVolunteerStatus(userId, status) {
    try {
      const { error: updErr } = await supabase
        .from('event_volunteers')
        .update({ status })
        .eq('event_id', event.id)
        .eq('user_id', userId);
      if (updErr) throw updErr;

      setVolunteers((prev) =>
        prev.map((v) => (v.user_id === userId ? { ...v, status } : v))
      );
    } catch (err) {
      alert('فشل تحديث حالة المتطوع: ' + err.message);
    }
  }

  // Assign volunteer manually
  async function handleAssignVolunteer() {
    if (!assignUserId) return;
    try {
      const { data, error: insErr } = await supabase
        .from('event_volunteers')
        .insert([{
          event_id: event.id,
          user_id: assignUserId,
          role_id: assignRoleId || null,
          status: 'confirmed',
        }])
        .select('*, profiles(full_name_ar, full_name_en, email, avatar_url), event_roles(name)')
        .single();
      if (insErr) throw insErr;

      setVolunteers([...volunteers, data]);
      setAssignUserId('');
      setAssignRoleId('');
    } catch (err) {
      alert('فشل تعيين العضو: ' + err.message);
    }
  }

  // Save Impact
  async function handleSaveImpact() {
    setSavingImpact(true);
    try {
      const { error: updErr } = await supabase
        .from('events')
        .update({ impact: impactData })
        .eq('id', event.id);
      if (updErr) throw updErr;

      alert('تم حفظ مؤشرات الأثر بنجاح!');
      onRefresh?.();
    } catch (err) {
      alert('فشل حفظ الأثر: ' + err.message);
    } finally {
      setSavingImpact(false);
    }
  }

  // Filtered registrations
  const filteredRegs = registrations.filter((r) => {
    if (regStatusFilter !== 'all' && r.status !== regStatusFilter) return false;
    if (regSearch.trim()) {
      const q = regSearch.toLowerCase();
      return (
        r.full_name?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.phone?.toLowerCase().includes(q) ||
        r.ticket_code?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const capacityStats = calculateEventCapacity(registrations, event?.capacity);
  const avgRating = calculateAverageRating(feedback);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={() => {
        stopScanner();
        onClose();
      }}
      title={event?.title_ar || 'تفاصيل الفعالية'}
      subtitle={event?.title_en || 'إدارة الحضور والأدوار والتذاكر والأثر'}
      width="900px"
    >
      {/* Drawer Action Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          paddingBottom: '1rem',
          marginBottom: '1rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <StatusBadge status={event?.status} />
          {event?.is_public && (
            <span className="badge-gold" style={{ fontSize: '0.78rem', padding: '0.2rem 0.6rem' }}>
              معروضة عاماً
            </span>
          )}
          {event?.registration_open && (
            <span style={{ fontSize: '0.78rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
              التسجيل مفتوح
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <a
            href={`/events/${event?.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <ExternalLink size={14} />
            <span>عرض الصفحة العامة</span>
          </a>

          <button
            type="button"
            onClick={() => {
              stopScanner();
              onEdit?.(event);
            }}
            className="btn-primary"
            style={{ padding: '0.45rem 0.95rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Edit3 size={14} />
            <span>تعديل الفعالية</span>
          </button>
        </div>
      </div>

      {/* Tabs Header */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          marginBottom: '1.5rem',
          overflowX: 'auto',
          paddingBottom: '0.25rem',
        }}
      >
        {[
          { key: 'overview', label: 'نظرة عامة', icon: Clock },
          { key: 'checkin', label: 'محطة الحضور (QR)', icon: QrCode },
          { key: 'registrations', label: `المسجلين (${registrations.length})`, icon: Ticket },
          { key: 'roles', label: `الأدوار والتطوع (${volunteers.length})`, icon: Users },
          { key: 'budget', label: 'الميزانية والمصروفات', icon: DollarSign },
          { key: 'impact', label: 'الأثر والمعرض والتقييمات', icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                if (activeTab === 'checkin' && tab.key !== 'checkin') {
                  stopScanner();
                }
                setActiveTab(tab.key);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.65rem 1rem',
                border: 'none',
                background: isActive ? 'rgba(255, 184, 0, 0.15)' : 'transparent',
                color: isActive ? '#ffd54f' : '#a0a0b2',
                borderBottom: isActive ? '2px solid #ffb800' : '2px solid transparent',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontWeight: isActive ? 800 : 600,
                fontSize: '0.88rem',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div>
          {/* Capacity and Registration Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <div style={statBoxStyle}>
              <div style={statLabelStyle}>إجمالي المسجلين</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffd54f' }}>
                {capacityStats.registered}
                <span style={{ fontSize: '0.85rem', color: '#888', fontWeight: 500 }}>
                  {event.capacity ? ` / ${event.capacity}` : ' (سعة مفتوحة)'}
                </span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginTop: '0.5rem', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(capacityStats.percentFilled, 100)}%`, height: '100%', background: '#ffb800' }} />
              </div>
            </div>

            <div style={statBoxStyle}>
              <div style={statLabelStyle}>نسبة الحضور الفعلي</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#4ade80' }}>
                {capacityStats.attended}
                <span style={{ fontSize: '0.85rem', color: '#888', fontWeight: 500 }}>
                  {capacityStats.registered > 0 ? ` (${Math.round((capacityStats.attended / capacityStats.registered) * 100)}%)` : ''}
                </span>
              </div>
            </div>

            <div style={statBoxStyle}>
              <div style={statLabelStyle}>قائمة الانتظار (Waitlist)</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#facc15' }}>
                {capacityStats.waitlist}
              </div>
            </div>

            <div style={statBoxStyle}>
              <div style={statLabelStyle}>متوسط التقييم العام</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffb800', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Star size={20} fill="#ffb800" color="#ffb800" />
                <span>{avgRating ? avgRating.toFixed(1) : 'لا تقييم بعد'}</span>
              </div>
            </div>
          </div>

          {/* Details & Agenda */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem' }}>
                الوصف ونبذة الفعالية
              </h3>
              <p style={{ color: '#d0d0df', fontSize: '0.92rem', lineHeight: 1.7, marginBottom: '1rem' }}>
                {event.description_ar || event.brief_ar || 'لا يوجد وصف مضاف.'}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.88rem', color: '#a0a0b2' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={16} color="#ffb800" />
                  <span>البدء: {new Date(event.starts_at).toLocaleString('ar-EG')}</span>
                </div>
                {event.ends_at && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={16} color="#ffb800" />
                    <span>الانتهاء: {new Date(event.ends_at).toLocaleString('ar-EG')}</span>
                  </div>
                )}
                {event.venue_ar && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={16} color="#ffb800" />
                    <span>المكان: {event.venue_ar}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Agenda Preview */}
            <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={18} color="#ffb800" />
                <span>جدول الأعمال</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '250px', overflowY: 'auto' }}>
                {Array.isArray(event.schedule) && event.schedule.length > 0 ? (
                  event.schedule.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        background: 'rgba(255, 184, 0, 0.05)',
                        border: '1px solid rgba(255, 184, 0, 0.15)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.85rem',
                      }}
                    >
                      <span style={{ color: '#e0e0ec', fontWeight: 600 }}>{item.activity_ar || item.activity_en}</span>
                      <span style={{ color: '#ffd54f', fontFamily: 'monospace' }}>{item.time_ar || item.time_en}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#888', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                    لم يتم تسجيل فقرات في جدول الأعمال.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CHECK-IN STATION */}
      {activeTab === 'checkin' && (
        <div>
          <div
            style={{
              padding: '1.5rem',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(255, 184, 0, 0.08), rgba(12, 13, 20, 0.95))',
              border: '1px solid rgba(255, 184, 0, 0.25)',
              marginBottom: '1.5rem',
              textAlign: 'center',
            }}
          >
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
              محطة تسجيل حضور المشاركين الفورية
            </h3>
            <p style={{ color: '#b5b5c6', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
              استخدم كاميرا الجهاز لمسح رمز الـ QR من تذكرة الحاضر، أو أدخل رمز التذكرة يدوياً.
            </p>

            {/* Check-in Message Banner */}
            {checkinMessage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  borderRadius: '12px',
                  marginBottom: '1.25rem',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  background:
                    checkinMessage.type === 'success'
                      ? 'rgba(34, 197, 94, 0.15)'
                      : checkinMessage.type === 'warning'
                      ? 'rgba(234, 179, 8, 0.15)'
                      : 'rgba(239, 68, 68, 0.15)',
                  border:
                    checkinMessage.type === 'success'
                      ? '1px solid rgba(34, 197, 94, 0.4)'
                      : checkinMessage.type === 'warning'
                      ? '1px solid rgba(234, 179, 8, 0.4)'
                      : '1px solid rgba(239, 68, 68, 0.4)',
                  color:
                    checkinMessage.type === 'success'
                      ? '#4ade80'
                      : checkinMessage.type === 'warning'
                      ? '#facc15'
                      : '#f87171',
                }}
              >
                {checkinMessage.type === 'success' && <CheckCircle2 size={24} />}
                {checkinMessage.type === 'warning' && <AlertCircle size={24} />}
                {checkinMessage.type === 'error' && <AlertCircle size={24} />}
                <span>{checkinMessage.text}</span>
              </div>
            )}

            {/* Camera Scanner or Manual Entry */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
              {/* Camera Scanner Box */}
              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: '14px',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontWeight: 700, color: '#ffd54f', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
                  مسح رمز الـ QR بالكاميرا
                </div>

                <div
                  id="qr-reader-container"
                  style={{
                    width: '100%',
                    maxWidth: '280px',
                    minHeight: scannerActive ? '260px' : '180px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1rem',
                  }}
                >
                  {!scannerActive && (
                    <div style={{ color: '#888', textAlign: 'center', padding: '1rem' }}>
                      <Camera size={40} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.5 }} />
                      <span>الكاميرا مغلقة</span>
                    </div>
                  )}
                </div>

                {scannerActive ? (
                  <button
                    type="button"
                    onClick={stopScanner}
                    className="btn-secondary"
                    style={{ padding: '0.6rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f87171' }}
                  >
                    <CameraOff size={16} />
                    <span>إيقاف تشغيل الكاميرا</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startScanner}
                    className="btn-primary"
                    style={{ padding: '0.6rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Camera size={16} />
                    <span>تشغيل الكاميرا للمسح</span>
                  </button>
                )}
              </div>

              {/* Manual Ticket Code Entry */}
              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: '14px',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div style={{ fontWeight: 700, color: '#ffd54f', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
                  إدخال يدوي لرمز التذكرة
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleCheckinCode(manualCode);
                  }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
                >
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    placeholder="مثال: ENQ-A1B2C3"
                    dir="ltr"
                    style={{ ...inputStyle, textAlign: 'center', letterSpacing: '2px', fontSize: '1.1rem', fontWeight: 700 }}
                  />
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    <UserCheck size={18} />
                    <span>تسجيل الحضور الفوري</span>
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Recent Check-ins List */}
          <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffd54f', marginBottom: '0.75rem' }}>
              سجل الحضور في هذه الجلسة ({recentCheckins.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
              {recentCheckins.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    background: 'rgba(34, 197, 94, 0.08)',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    fontSize: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <CheckCircle2 size={16} color="#4ade80" />
                    <span style={{ fontWeight: 700, color: '#fff' }}>{item.name}</span>
                    <span style={{ color: '#888', fontFamily: 'monospace' }}>({item.code})</span>
                  </div>
                  <span style={{ color: '#a0a0b2' }}>{item.time}</span>
                </div>
              ))}
              {recentCheckins.length === 0 && (
                <div style={{ color: '#888', fontSize: '0.85rem', textAlign: 'center', padding: '0.75rem' }}>
                  لم يتم تسجيل حضور أي مشارك حتى الآن في هذه الجلسة.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REGISTRATIONS */}
      {activeTab === 'registrations' && (
        <div>
          {/* Filter Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '260px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  value={regSearch}
                  onChange={(e) => setRegSearch(e.target.value)}
                  placeholder="ابحث بالاسم، البريد، الهاتف أو رمز التذكرة..."
                  style={{ ...inputStyle, paddingRight: '2.4rem' }}
                />
                <Search size={16} color="#888" style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>

              <select
                value={regStatusFilter}
                onChange={(e) => setRegStatusFilter(e.target.value)}
                style={{ ...inputStyle, width: '150px' }}
              >
                <option value="all">كل الحالات ({registrations.length})</option>
                <option value="registered">مؤكد ({registrations.filter((r) => r.status === 'registered').length})</option>
                <option value="attended">حاضر ({registrations.filter((r) => r.status === 'attended').length})</option>
                <option value="waitlist">انتظار ({registrations.filter((r) => r.status === 'waitlist').length})</option>
                <option value="cancelled">ملغي ({registrations.filter((r) => r.status === 'cancelled').length})</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              className="btn-secondary"
              style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem' }}
            >
              <Download size={16} />
              <span>تصدير CSV ({filteredRegs.length})</span>
            </button>
          </div>

          {/* Table */}
          <div
            style={{
              borderRadius: '12px',
              border: '1px solid rgba(255, 184, 0, 0.15)',
              overflow: 'hidden',
              background: 'rgba(0,0,0,0.3)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 184, 0, 0.1)', color: '#ffd54f', textAlign: 'right' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>الاسم</th>
                  <th style={{ padding: '0.75rem 1rem' }}>بيانات الاتصال</th>
                  <th style={{ padding: '0.75rem 1rem' }}>رمز التذكرة</th>
                  <th style={{ padding: '0.75rem 1rem' }}>الحالة</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegs.map((reg) => (
                  <tr
                    key={reg.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'background 0.15s',
                    }}
                  >
                    <td style={{ padding: '0.75rem 1rem', color: '#fff', fontWeight: 600 }}>
                      {reg.full_name}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#a0a0b2' }}>
                      <div>{reg.email}</div>
                      {reg.phone && <div style={{ fontSize: '0.8rem', color: '#777' }}>{reg.phone}</div>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#ffd54f' }}>
                      {reg.ticket_code}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <StatusBadge status={reg.status} />
                      {reg.checked_in_at && (
                        <div style={{ fontSize: '0.72rem', color: '#4ade80', marginTop: '0.2rem' }}>
                          حضر: {new Date(reg.checked_in_at).toLocaleTimeString('ar-EG')}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
                        {reg.status === 'waitlist' && (
                          <button
                            type="button"
                            onClick={() => promoteWaitlist(reg.id)}
                            className="btn-secondary"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem', color: '#4ade80' }}
                            title="ترقية إلى مسجل"
                          >
                            ترقية
                          </button>
                        )}
                        {reg.status !== 'attended' && reg.status !== 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => cancelReg(reg.id)}
                            style={{
                              padding: '0.3rem 0.6rem',
                              fontSize: '0.78rem',
                              background: 'rgba(239, 68, 68, 0.15)',
                              color: '#f87171',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                            title="إلغاء التسجيل"
                          >
                            إلغاء
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRegs.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                      لا يوجد مسجلين يطابقون خيارات البحث الحالية.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: ROLES & VOLUNTEERS */}
      {activeTab === 'roles' && (
        <div>
          {/* Roles Definition Section */}
          <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffd54f', marginBottom: '0.75rem' }}>
              الأدوار والاحتياجات التنظيمية (Event Roles)
            </h4>

            {/* Add Role Form */}
            <form onSubmit={handleAddRole} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="اسم الدور (مثال: منظم استقبال، مسؤول صوتيات، تغطية إعلامية)..."
                style={{ ...inputStyle, flex: 2, minWidth: '220px' }}
                required
              />
              <input
                type="number"
                min="1"
                value={newRoleCount}
                onChange={(e) => setNewRoleCount(e.target.value)}
                placeholder="العدد المطلوب"
                style={{ ...inputStyle, width: '120px' }}
                required
              />
              <button
                type="submit"
                disabled={addingRole}
                className="btn-primary"
                style={{ padding: '0.6rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem' }}
              >
                <Plus size={16} />
                <span>إضافة دور</span>
              </button>
            </form>

            {/* Roles Chips */}
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {roles.map((r) => {
                const assignedCount = volunteers.filter((v) => v.role_id === r.id && v.status === 'confirmed').length;
                return (
                  <div
                    key={r.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 184, 0, 0.08)',
                      border: '1px solid rgba(255, 184, 0, 0.25)',
                      fontSize: '0.85rem',
                      color: '#fff',
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>{r.name}</span>
                    <span style={{ color: assignedCount >= r.needed_count ? '#4ade80' : '#ffd54f', fontSize: '0.78rem' }}>
                      ({assignedCount} / {r.needed_count})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteRole(r.id)}
                      style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
              {roles.length === 0 && (
                <div style={{ color: '#888', fontSize: '0.85rem', fontStyle: 'italic' }}>
                  لم يتم تحديد أدوار تنظيمية حتى الآن.
                </div>
              )}
            </div>
          </div>

          {/* Volunteer Roster & Assignment */}
          <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffd54f' }}>
                كتيبة المتطوعين والمنظمين ({volunteers.length})
              </h4>

              {/* Direct Member Assign */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  style={{ ...inputStyle, width: '180px', padding: '0.45rem' }}
                >
                  <option value="">-- اختر عضواً للتكليف --</option>
                  {availableMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name_ar || m.full_name_en}
                    </option>
                  ))}
                </select>

                <select
                  value={assignRoleId}
                  onChange={(e) => setAssignRoleId(e.target.value)}
                  style={{ ...inputStyle, width: '150px', padding: '0.45rem' }}
                >
                  <option value="">-- بدون دور محدد --</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleAssignVolunteer}
                  disabled={!assignUserId}
                  className="btn-secondary"
                  style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
                >
                  تعيين
                </button>
              </div>
            </div>

            {/* Volunteers List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {volunteers.map((v) => (
                <div
                  key={v.user_id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.92rem' }}>
                      {v.profiles?.full_name_ar || v.profiles?.full_name_en || 'عضو'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#a0a0b2' }}>
                      الدور: {v.event_roles?.name || 'عام'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <StatusBadge status={v.status} />

                    {v.status === 'requested' && (
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button
                          type="button"
                          onClick={() => updateVolunteerStatus(v.user_id, 'confirmed')}
                          className="btn-secondary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem', color: '#4ade80' }}
                        >
                          قبول
                        </button>
                        <button
                          type="button"
                          onClick={() => updateVolunteerStatus(v.user_id, 'declined')}
                          style={{
                            padding: '0.3rem 0.6rem',
                            fontSize: '0.78rem',
                            background: 'rgba(239,68,68,0.15)',
                            color: '#f87171',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          رفض
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {volunteers.length === 0 && (
                <div style={{ color: '#888', textAlign: 'center', padding: '1.5rem', fontSize: '0.88rem' }}>
                  لم يتم تسجيل أو تعيين أي متطوع في هذه الفعالية بعد.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: BUDGET & EXPENSES */}
      {activeTab === 'budget' && (
        <div>
          {/* Summary Box */}
          {(() => {
            const totalAllocated = budgets.reduce((acc, b) => acc + Number(b.amount || 0), 0);
            const totalSpent = expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
            const remaining = totalAllocated - totalSpent;
            return (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                }}
              >
                <div style={statBoxStyle}>
                  <div style={statLabelStyle}>الميزانية المعتمدة</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffd54f' }}>
                    {totalAllocated.toLocaleString('ar-EG')} ج.م
                  </div>
                </div>

                <div style={statBoxStyle}>
                  <div style={statLabelStyle}>المصروفات الفعلية</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f87171' }}>
                    {totalSpent.toLocaleString('ar-EG')} ج.م
                  </div>
                </div>

                <div style={statBoxStyle}>
                  <div style={statLabelStyle}>المتبقي من الميزانية</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: remaining >= 0 ? '#4ade80' : '#ef4444' }}>
                    {remaining.toLocaleString('ar-EG')} ج.م
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Expenses List */}
          <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffd54f', marginBottom: '0.75rem' }}>
              بنود المصروفات المسجلة ({expenses.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {expenses.map((ex) => (
                <div
                  key={ex.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.65rem 0.9rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    fontSize: '0.88rem',
                  }}
                >
                  <div>
                    <div style={{ color: '#fff', fontWeight: 600 }}>{ex.title || ex.description}</div>
                    <div style={{ fontSize: '0.75rem', color: '#888' }}>
                      التاريخ: {new Date(ex.incurred_on || ex.created_at).toLocaleDateString('ar-EG')}
                    </div>
                  </div>
                  <div style={{ color: '#f87171', fontWeight: 800, fontFamily: 'monospace' }}>
                    {Number(ex.amount).toLocaleString('ar-EG')} ج.م
                  </div>
                </div>
              ))}
              {expenses.length === 0 && (
                <div style={{ color: '#888', textAlign: 'center', padding: '1rem', fontSize: '0.85rem' }}>
                  لم يتم تسجيل أي مصروفات على هذه الفعالية.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: IMPACT, GALLERY & FEEDBACK */}
      {activeTab === 'impact' && (
        <div>
          {/* Impact Metrics Editor */}
          <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffd54f' }}>
                مؤشرات الأثر والإنجاز (Impact Numbers)
              </h4>
              <button
                type="button"
                onClick={handleSaveImpact}
                disabled={savingImpact}
                className="btn-primary"
                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
              >
                {savingImpact ? 'جاري الحفظ...' : 'حفظ مؤشرات الأثر'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', color: '#aaa', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                  عدد الحضور الفعلي
                </label>
                <input
                  type="number"
                  value={impactData.attendees_count}
                  onChange={(e) => setImpactData({ ...impactData, attendees_count: Number(e.target.value) })}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#aaa', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                  نسبة رضا الحضور
                </label>
                <input
                  type="text"
                  value={impactData.satisfaction_rate}
                  onChange={(e) => setImpactData({ ...impactData, satisfaction_rate: e.target.value })}
                  placeholder="مثال: 95%"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#aaa', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                  مشاريع ريادية تم عرضها
                </label>
                <input
                  type="number"
                  value={impactData.projects_presented}
                  onChange={(e) => setImpactData({ ...impactData, projects_presented: Number(e.target.value) })}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#aaa', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                  شهادات حضور صادرة
                </label>
                <input
                  type="number"
                  value={impactData.certificates_issued}
                  onChange={(e) => setImpactData({ ...impactData, certificates_issued: Number(e.target.value) })}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Attendee Feedback */}
          <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffd54f' }}>
                تقييمات وآراء المشاركين ({feedback.length})
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ffd54f', fontWeight: 800 }}>
                <Star size={18} fill="#ffb800" color="#ffb800" />
                <span>المتوسط: {avgRating ? avgRating.toFixed(1) : '-'} / 5</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '250px', overflowY: 'auto' }}>
              {feedback.map((f) => (
                <div
                  key={f.id}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={14}
                          fill={s <= f.rating ? '#ffb800' : 'none'}
                          color={s <= f.rating ? '#ffb800' : '#4b5563'}
                        />
                      ))}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#888' }}>
                      {new Date(f.created_at).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                  {f.comment && <p style={{ color: '#d0d0df', fontSize: '0.88rem', margin: 0 }}>{f.comment}</p>}
                </div>
              ))}
              {feedback.length === 0 && (
                <div style={{ color: '#888', textAlign: 'center', padding: '1rem', fontSize: '0.85rem' }}>
                  لم يتم تقديم أي تقييمات لهذه الفعالية بعد.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Drawer>
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

const statBoxStyle = {
  padding: '1rem',
  borderRadius: '12px',
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 184, 0, 0.15)',
};

const statLabelStyle = {
  fontSize: '0.8rem',
  color: '#a0a0b2',
  marginBottom: '0.35rem',
};

