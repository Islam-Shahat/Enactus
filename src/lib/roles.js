// UI-only role helpers. The REAL enforcement is Row Level Security in the database;
// hiding a button here is a convenience, never a security measure.

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  PRESIDENT: 'president',
  VICE_PRESIDENT: 'vice_president',
  HR: 'hr_admin',
  FINANCE: 'finance_admin',
  PR: 'pr_admin',
  MEDIA: 'media_admin',
  OC: 'oc_admin',
  COMMITTEE_HEAD: 'committee_head',
  COORDINATOR: 'coordinator',
  MEMBER: 'member',
};

export const ROLE_LABELS = {
  super_admin: { ar: 'مدير النظام', en: 'System Admin' },
  president: { ar: 'الرئيس', en: 'President' },
  vice_president: { ar: 'نائب الرئيس', en: 'Vice President' },
  hr_admin: { ar: 'الموارد البشرية', en: 'HR' },
  finance_admin: { ar: 'المالية', en: 'Finance' },
  pr_admin: { ar: 'العلاقات العامة', en: 'PR' },
  media_admin: { ar: 'الميديا', en: 'Media' },
  oc_admin: { ar: 'اللجنة المنظمة', en: 'Organizing Committee' },
  committee_head: { ar: 'رئيس لجنة', en: 'Committee Head' },
  coordinator: { ar: 'منسق', en: 'Coordinator' },
  member: { ar: 'عضو', en: 'Member' },
};

const EXEC = [ROLES.PRESIDENT, ROLES.VICE_PRESIDENT];

/**
 * Sidebar / route config for the dashboard. `allow: null` = any signed-in member.
 * Keep it in sync with the RBAC matrix in docs/SETUP.md.
 */
export const DASHBOARD_NAV = [
  { key: 'home', path: '/dashboard', label: { ar: 'الرئيسية', en: 'Home' }, allow: null },
  { key: 'announcements', path: '/dashboard/announcements', label: { ar: 'الإعلانات', en: 'Announcements' }, allow: null },
  { key: 'notifications', path: '/dashboard/notifications', label: { ar: 'الإشعارات', en: 'Notifications' }, allow: null },
  { key: 'tasks', path: '/dashboard/tasks', label: { ar: 'المهام', en: 'Tasks' }, allow: null },
  { key: 'attendance', path: '/dashboard/attendance', label: { ar: 'الحضور', en: 'Attendance' }, allow: null },
  { key: 'points', path: '/dashboard/points', label: { ar: 'النقاط', en: 'Points' }, allow: null },
  { key: 'leaderboard', path: '/dashboard/leaderboard', label: { ar: 'المتصدرون', en: 'Leaderboard' }, allow: null },
  { key: 'members', path: '/dashboard/members', label: { ar: 'الأعضاء', en: 'Members' }, allow: [ROLES.HR, ...EXEC, ROLES.COMMITTEE_HEAD] },
  { key: 'applications', path: '/dashboard/applications', label: { ar: 'طلبات التقديم', en: 'Applications' }, allow: [ROLES.HR, ...EXEC, ROLES.COMMITTEE_HEAD] },
  { key: 'companies', path: '/dashboard/companies', label: { ar: 'الشركات', en: 'Companies' }, allow: [ROLES.PR, ROLES.FINANCE, ROLES.MEDIA, ROLES.OC, ...EXEC] },
  { key: 'agreements', path: '/dashboard/agreements', label: { ar: 'الاتفاقيات', en: 'Agreements' }, allow: [ROLES.PR, ROLES.FINANCE, ...EXEC] },
  { key: 'payments', path: '/dashboard/payments', label: { ar: 'الدفعات', en: 'Payments' }, allow: [ROLES.PR, ROLES.FINANCE, ...EXEC] },
  { key: 'finance', path: '/dashboard/finance', label: { ar: 'المالية والإحصائيات', en: 'Finance Overview' }, allow: [ROLES.FINANCE, ROLES.PR, ...EXEC] },
  { key: 'posts', path: '/dashboard/posts', label: { ar: 'المحتوى والبوستات', en: 'Content' }, allow: [ROLES.MEDIA, ROLES.PR, ROLES.COMMITTEE_HEAD, ...EXEC] },
  { key: 'events', path: '/dashboard/events', label: { ar: 'الفعاليات', en: 'Events' }, allow: [ROLES.OC, ROLES.COMMITTEE_HEAD, ROLES.HR, ROLES.PR, ROLES.MEDIA, ...EXEC] },
  { key: 'site', path: '/dashboard/site', label: { ar: 'محتوى الموقع', en: 'Site content' }, allow: [ROLES.MEDIA, ROLES.PR, ROLES.HR, ...EXEC] },
  { key: 'settings', path: '/dashboard/settings', label: { ar: 'الإعدادات', en: 'Settings' }, allow: [ROLES.HR, ...EXEC] },
  { key: 'audit', path: '/dashboard/audit', label: { ar: 'سجل العمليات', en: 'Audit log' }, allow: [ROLES.PRESIDENT] },
  { key: 'season', path: '/dashboard/season', label: { ar: 'تدوير المواسم', en: 'Seasons & Rollover' }, allow: [] }, // super_admin only
  { key: 'roles', path: '/dashboard/roles', label: { ar: 'الصلاحيات', en: 'Roles' }, allow: [] }, // super_admin only
];

/**
 * Filter navigation items based on user roles and super_admin flag.
 * - allow: null -> everyone authenticated can see
 * - allow: [] -> super_admin only
 * - allow: [roles...] -> user must have at least one allowed role (or be super_admin)
 */
export function filterNavItems(navItems, userRoles = [], isSuperAdmin = false) {
  if (isSuperAdmin) return [...navItems];
  const roleNames = userRoles.map((r) => (typeof r === 'string' ? r : r.role));

  return navItems.filter((item) => {
    if (item.allow === null) return true;
    if (Array.isArray(item.allow) && item.allow.length === 0) return isSuperAdmin;
    return item.allow.some((allowedRole) => roleNames.includes(allowedRole));
  });
}
