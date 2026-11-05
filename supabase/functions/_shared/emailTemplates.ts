// supabase/functions/_shared/emailTemplates.ts
// Shared inline-styled, responsive HTML email templates for Deno runtime.

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function wrapEmailLayout({
  content,
  lang = 'ar',
  preheader = '',
}: {
  content: string;
  lang?: 'ar' | 'en';
  preheader?: string;
}): string {
  const isAr = lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const font = isAr
    ? "'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    : "'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif";

  return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Enactus Qena</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0c10; font-family: ${font}; color: #f5f5f7; direction: ${dir}; -webkit-font-smoothing: antialiased;">
  ${preheader ? `<span style="display:none;font-size:1px;color:#0b0c10;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</span>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0c10; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #141620; border: 1px solid rgba(255, 184, 0, 0.25); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #181b28 0%, #0d0e15 100%); padding: 24px; border-bottom: 2px solid #ffb800; text-align: center;">
              <div style="font-family: 'Cinzel', Georgia, serif; font-size: 20px; font-weight: 900; color: #ffd54f; letter-spacing: 2px;">
                ENACTUS <span style="color: #ffb800; font-size: 13px; font-weight: 700; background: rgba(255,184,0,0.15); padding: 2px 8px; border-radius: 4px; vertical-align: middle;">QENA</span>
              </div>
              <div style="font-size: 12px; color: #a3a3b2; margin-top: 4px;">
                ${isAr ? 'منصة العمليات الداخلية' : 'Internal Operations Portal'}
              </div>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 28px; line-height: 1.6; font-size: 15px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0d0e15; padding: 20px 24px; border-top: 1px solid rgba(255, 255, 255, 0.08); text-align: center; font-size: 12px; color: #737380;">
              <p style="margin: 0 0 6px 0;">
                © 2026 Enactus Qena University - South Valley University.
              </p>
              <p style="margin: 0;">
                ${isAr ? 'تم إرسال هذا الإشعار تلقائياً من نظام إدارة العمليات.' : 'Automated operational notification.'}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderPaymentReminderHtml(data: {
  companyName: string;
  agreementTitle?: string;
  amount: number;
  dueDate: string;
  isOverdue?: boolean;
  dashboardUrl?: string;
  lang?: 'ar' | 'en';
}): string {
  const isAr = data.lang !== 'en';
  const url = data.dashboardUrl || 'https://enactus-qena.org/dashboard/finance';
  const formattedAmount = `${Number(data.amount).toLocaleString(isAr ? 'ar-EG-u-nu-latn' : 'en-US')} ${isAr ? 'ج.م' : 'EGP'}`;

  const headingText = data.isOverdue
    ? (isAr ? 'تنبيه: دفعة مالية متأخرة' : 'Alert: Overdue Payment')
    : (isAr ? 'تذكير: موعد استحقاق دفعة مالية' : 'Reminder: Upcoming Due Payment');

  const statusBadge = data.isOverdue
    ? `<span style="display: inline-block; background-color: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid #ef4444; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 12px;">${isAr ? 'متأخرة' : 'Overdue'}</span>`
    : `<span style="display: inline-block; background-color: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid #f59e0b; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 12px;">${isAr ? 'مستحقة قريباً' : 'Due Soon'}</span>`;

  const content = `
    <h2 style="margin: 0 0 16px 0; color: #ffd54f; font-size: 20px; font-weight: 800;">
      ${headingText}
    </h2>
    <div style="margin-bottom: 20px;">
      ${statusBadge}
    </div>
    <p style="color: #d1d5db; margin: 0 0 20px 0;">
      ${
        isAr
          ? 'نود تذكيركم بوجود دفعة مالية مستحقة وفقاً لبيانات الاتفاقية الموقعة.'
          : 'This is a scheduled reminder regarding a contract payment due in the system.'
      }
    </p>

    <table role="presentation" width="100%" cellpadding="10" cellspacing="0" style="background-color: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 184, 0, 0.2); border-radius: 10px; margin-bottom: 24px;">
      <tr>
        <td style="color: #9ca3af; width: 35%;">${isAr ? 'الشركة / الشريك' : 'Company / Partner'}</td>
        <td style="color: #ffffff; font-weight: 700;">${escapeHtml(data.companyName)}</td>
      </tr>
      <tr>
        <td style="color: #9ca3af;">${isAr ? 'الاتفاقية' : 'Agreement'}</td>
        <td style="color: #ffffff;">${escapeHtml(data.agreementTitle || '')}</td>
      </tr>
      <tr>
        <td style="color: #9ca3af;">${isAr ? 'القيمة المطلوبة' : 'Amount Due'}</td>
        <td style="color: #ffb800; font-weight: 800; font-size: 16px;">${formattedAmount}</td>
      </tr>
      <tr>
        <td style="color: #9ca3af;">${isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</td>
        <td style="color: #ffffff; font-weight: 700;">${escapeHtml(data.dueDate)}</td>
      </tr>
    </table>

    <div style="text-align: center; margin: 28px 0 16px 0;">
      <a href="${escapeHtml(url)}" style="background: linear-gradient(135deg, #d48800 0%, #ffb800 100%); color: #000000; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 800; display: inline-block;">
        ${isAr ? 'فتح تفاصيل المالية بالداشبورد' : 'View in Finance Dashboard'}
      </a>
    </div>
  `;

  return wrapEmailLayout({
    content,
    lang: isAr ? 'ar' : 'en',
    preheader: `${headingText} - ${data.companyName} (${formattedAmount})`,
  });
}

export function renderWeeklyReportHtml(data: {
  committeeName?: string;
  stats: { attendanceRate: number; tasksDone: number; tasksLate: number; pointsAwarded: number };
  weekLabel?: string;
  dashboardUrl?: string;
  lang?: 'ar' | 'en';
}): string {
  const isAr = data.lang !== 'en';
  const url = data.dashboardUrl || 'https://enactus-qena.org/dashboard';

  const content = `
    <h2 style="margin: 0 0 8px 0; color: #ffd54f; font-size: 20px; font-weight: 800;">
      ${isAr ? 'التقرير الأسبوعي للأداء والعمليات' : 'Weekly Operations & Performance Report'}
    </h2>
    <p style="color: #ffb800; font-size: 14px; margin: 0 0 20px 0; font-weight: 600;">
      ${escapeHtml(data.committeeName || (isAr ? 'جميع اللجان' : 'All Committees'))} · ${escapeHtml(data.weekLabel || '')}
    </p>

    <table role="presentation" width="100%" cellpadding="8" cellspacing="0" style="margin-bottom: 24px;">
      <tr>
        <td width="50%" style="padding: 6px;">
          <div style="background-color: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 184, 0, 0.2); border-radius: 10px; padding: 16px; text-align: center;">
            <div style="font-size: 12px; color: #9ca3af; margin-bottom: 4px;">${isAr ? 'نسبة الحضور' : 'Attendance Rate'}</div>
            <div style="font-size: 22px; font-weight: 900; color: #10b981;">${data.stats.attendanceRate}%</div>
          </div>
        </td>
        <td width="50%" style="padding: 6px;">
          <div style="background-color: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 184, 0, 0.2); border-radius: 10px; padding: 16px; text-align: center;">
            <div style="font-size: 12px; color: #9ca3af; margin-bottom: 4px;">${isAr ? 'المهام المنجزة' : 'Tasks Done'}</div>
            <div style="font-size: 22px; font-weight: 900; color: #3b82f6;">${data.stats.tasksDone}</div>
          </div>
        </td>
      </tr>
      <tr>
        <td width="50%" style="padding: 6px;">
          <div style="background-color: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 184, 0, 0.2); border-radius: 10px; padding: 16px; text-align: center;">
            <div style="font-size: 12px; color: #9ca3af; margin-bottom: 4px;">${isAr ? 'مهام متأخرة' : 'Late Tasks'}</div>
            <div style="font-size: 22px; font-weight: 900; color: #ef4444;">${data.stats.tasksLate}</div>
          </div>
        </td>
        <td width="50%" style="padding: 6px;">
          <div style="background-color: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 184, 0, 0.2); border-radius: 10px; padding: 16px; text-align: center;">
            <div style="font-size: 12px; color: #9ca3af; margin-bottom: 4px;">${isAr ? 'النقاط الممنوحة' : 'Points Awarded'}</div>
            <div style="font-size: 22px; font-weight: 900; color: #ffd54f;">${data.stats.pointsAwarded}</div>
          </div>
        </td>
      </tr>
    </table>

    <div style="text-align: center; margin: 24px 0 12px 0;">
      <a href="${escapeHtml(url)}" style="background: linear-gradient(135deg, #d48800 0%, #ffb800 100%); color: #000000; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 800; display: inline-block;">
        ${isAr ? 'فتح لوحة التحكم' : 'Open Dashboard'}
      </a>
    </div>
  `;

  return wrapEmailLayout({
    content,
    lang: isAr ? 'ar' : 'en',
    preheader: `${isAr ? 'تقرير الأداء الأسبوعي' : 'Weekly Operations Report'} - ${data.committeeName || ''}`,
  });
}

export function renderAnnouncementDigestHtml(data: {
  announcements: Array<{ title: string; body?: string; published_at?: string }>;
  dashboardUrl?: string;
  lang?: 'ar' | 'en';
}): string {
  const isAr = data.lang !== 'en';
  const url = data.dashboardUrl || 'https://enactus-qena.org/dashboard/announcements';

  const itemsHtml = data.announcements
    .map(
      (item) => `
    <div style="background-color: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 184, 0, 0.2); border-radius: 10px; padding: 16px; margin-bottom: 12px;">
      <div style="color: #ffd54f; font-weight: 800; font-size: 16px; margin-bottom: 6px;">
        ${escapeHtml(item.title)}
      </div>
      <div style="color: #d1d5db; font-size: 14px; line-height: 1.5; margin-bottom: 8px;">
        ${escapeHtml(item.body ? (item.body.length > 200 ? item.body.substring(0, 200) + '...' : item.body) : '')}
      </div>
      <div style="font-size: 12px; color: #9ca3af;">
        ${escapeHtml(item.published_at || '')}
      </div>
    </div>`
    )
    .join('');

  const content = `
    <h2 style="margin: 0 0 16px 0; color: #ffd54f; font-size: 20px; font-weight: 800;">
      ${isAr ? 'موجز الإعلانات والتوجيهات الجديدة' : 'Announcements & Updates Digest'}
    </h2>
    <p style="color: #d1d5db; margin: 0 0 20px 0;">
      ${
        isAr
          ? 'نشارككم أحدث الإعلانات الصادرة عن إدارة النشاط واللجان:'
          : 'Here are the latest announcements and operational updates:'
      }
    </p>

    ${itemsHtml || `<p style="color: #9ca3af;">${isAr ? 'لا توجد إعلانات جديدة حالياً.' : 'No new announcements.'}</p>`}

    <div style="text-align: center; margin: 28px 0 12px 0;">
      <a href="${escapeHtml(url)}" style="background: linear-gradient(135deg, #d48800 0%, #ffb800 100%); color: #000000; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 800; display: inline-block;">
        ${isAr ? 'عرض كافة الإعلانات' : 'View All Announcements'}
      </a>
    </div>
  `;

  return wrapEmailLayout({
    content,
    lang: isAr ? 'ar' : 'en',
    preheader: isAr ? 'موجز الإعلانات والتحديثات' : 'New announcements digest',
  });
}

