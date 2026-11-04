// src/lib/businessHelpers.js
// Pure business logic, currency formatters, due status calculations, and CSV export.

export const COMPANY_STAGES = [
  { key: 'lead', label: { ar: 'عميل محتمل', en: 'Lead' }, color: 'rgba(156, 163, 175, 0.2)', text: '#9ca3af' },
  { key: 'contacted', label: { ar: 'تم التواصل', en: 'Contacted' }, color: 'rgba(59, 130, 246, 0.2)', text: '#60a5fa' },
  { key: 'negotiation', label: { ar: 'قيد التفاوض', en: 'Negotiation' }, color: 'rgba(234, 179, 8, 0.2)', text: '#facc15' },
  { key: 'signed', label: { ar: 'تم التوقيع', en: 'Signed' }, color: 'rgba(16, 185, 129, 0.2)', text: '#34d399' },
  { key: 'delivered', label: { ar: 'تم التسليم', en: 'Delivered' }, color: 'rgba(147, 51, 234, 0.2)', text: '#c084fc' },
  { key: 'renewal', label: { ar: 'قيد التجديد', en: 'Renewal' }, color: 'rgba(14, 165, 233, 0.2)', text: '#38bdf8' },
  { key: 'lost', label: { ar: 'ملغي / غير مكتمل', en: 'Lost' }, color: 'rgba(239, 68, 68, 0.2)', text: '#f87171' },
];

export const AGREEMENT_STATUSES = [
  { key: 'draft', label: { ar: 'مسودة', en: 'Draft' }, color: 'rgba(156, 163, 175, 0.2)', text: '#9ca3af' },
  { key: 'active', label: { ar: 'ساري', en: 'Active' }, color: 'rgba(16, 185, 129, 0.2)', text: '#34d399' },
  { key: 'completed', label: { ar: 'مكتمل', en: 'Completed' }, color: 'rgba(59, 130, 246, 0.2)', text: '#60a5fa' },
  { key: 'cancelled', label: { ar: 'ملغي', en: 'Cancelled' }, color: 'rgba(239, 68, 68, 0.2)', text: '#f87171' },
];

export const PAYMENT_STATUSES = [
  { key: 'pending', label: { ar: 'معلق', en: 'Pending' }, color: 'rgba(234, 179, 8, 0.2)', text: '#facc15' },
  { key: 'paid', label: { ar: 'مدفوع ومؤكد', en: 'Paid' }, color: 'rgba(16, 185, 129, 0.2)', text: '#34d399' },
  { key: 'overdue', label: { ar: 'متأخر', en: 'Overdue' }, color: 'rgba(239, 68, 68, 0.2)', text: '#f87171' },
  { key: 'cancelled', label: { ar: 'ملغي', en: 'Cancelled' }, color: 'rgba(156, 163, 175, 0.2)', text: '#9ca3af' },
];

export const PAYMENT_KINDS = {
  deposit: { ar: 'دفعة أولى (مقدم)', en: 'Deposit' },
  installment: { ar: 'قسط', en: 'Installment' },
  final: { ar: 'دفعة نهائية', en: 'Final Payment' },
};

export const PAYMENT_METHODS = {
  cash: { ar: 'نقداً (كاش)', en: 'Cash' },
  bank_transfer: { ar: 'تحويل بنكي', en: 'Bank Transfer' },
  wallet: { ar: 'محفظة إلكترونية (فودافون كاش / إنستاباي)', en: 'E-Wallet / InstaPay' },
  cheque: { ar: 'شيك مصرفي', en: 'Cheque' },
};

export const DELIVERABLE_KINDS = {
  post: { ar: 'منشور (Post)', en: 'Post' },
  story: { ar: 'ستوري (Story)', en: 'Story' },
  reel: { ar: 'فيديو ريلز (Reel)', en: 'Reel' },
  banner: { ar: 'بانر دعائي / رول اب', en: 'Banner / Roll-up' },
  mention: { ar: 'إشارة / تنويه رسمي', en: 'Mention' },
  booth: { ar: 'بوث في الفعالية', en: 'Booth' },
  other: { ar: 'أخرى', en: 'Other' },
};

export const SPONSOR_TIERS = {
  platinum: { ar: 'بلاتيني', en: 'Platinum', color: '#e5e7eb' },
  gold: { ar: 'ذهبي', en: 'Gold', color: '#ffb800' },
  silver: { ar: 'فضي', en: 'Silver', color: '#9ca3af' },
  bronze: { ar: 'برونزي', en: 'Bronze', color: '#cd7f32' },
  custom: { ar: 'مخصص', en: 'Custom', color: '#38bdf8' },
};

/**
 * Format numeric money into EGP representation according to active language.
 * Always renders two decimal places.
 */
export function formatMoney(amount, lang = 'ar') {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  const isAr = lang === 'ar';
  
  try {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);

    return isAr ? `${formatted} ج.م` : `EGP ${formatted}`;
  } catch {
    return isAr ? `${num.toFixed(2)} ج.م` : `EGP ${num.toFixed(2)}`;
  }
}

/**
 * Parses and sanitizes input to standard 2-decimal money string or number.
 */
export function parseMoney(val) {
  if (val === null || val === undefined || val === '') return 0;
  const clean = String(val).replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(clean);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100) / 100;
}

/**
 * Computes payment due status and days difference relative to today.
 */
export function getPaymentDueStatus(dueDateStr, status = 'pending', now = new Date()) {
  if (status === 'paid') return { status: 'paid', daysDiff: 0 };
  if (status === 'cancelled') return { status: 'cancelled', daysDiff: 0 };
  if (!dueDateStr) return { status: 'pending', daysDiff: 0 };

  const target = new Date(dueDateStr);
  target.setHours(0, 0, 0, 0);
  const current = new Date(now);
  current.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - current.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: 'overdue', daysDiff: Math.abs(diffDays) };
  }
  if (diffDays <= 7) {
    return { status: 'due_soon', daysDiff: diffDays };
  }
  return { status: 'upcoming', daysDiff: diffDays };
}

/**
 * Computes deliverable progress percentage (0 - 100%).
 */
export function calculateDeliverableProgress(doneCount = 0, requiredCount = 1) {
  const done = Math.max(0, parseInt(doneCount, 10) || 0);
  const req = Math.max(1, parseInt(requiredCount, 10) || 1);
  const pct = Math.min(100, Math.round((done / req) * 100));
  return {
    done,
    required: req,
    percentage: pct,
    isComplete: done >= req,
  };
}

/**
 * Generate and trigger download of CSV file on client-side.
 * Includes UTF-8 BOM so Arabic letters render without encoding glitches in Excel.
 */
export function exportToCsv(filename, rows, columns) {
  if (!rows || rows.length === 0) return false;

  const headerRow = columns.map((c) => `"${(c.label || '').replace(/"/g, '""')}"`).join(',');

  const bodyRows = rows.map((row) =>
    columns
      .map((col) => {
        let val = typeof col.getValue === 'function' ? col.getValue(row) : row[col.key];
        if (val === null || val === undefined) val = '';
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  const csvContent = '\uFEFF' + [headerRow, ...bodyRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename.replace(/\.csv$/i, '')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}
