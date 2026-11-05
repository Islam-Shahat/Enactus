# دليل التشغيل: Backend (Supabase) + ربطه بالفرونت (React + Vite)

## 1) إنشاء المشاريع
1. أنشئ مشروعين على Supabase: `enactus-dev` و `enactus-prod`.
2. من **Authentication → Providers/Settings**: اقفل **Allow new users to sign up** (الحسابات بتتعمل من الأدمن أو Edge Function بس).
3. فعّل **Leaked password protection** لو متاحة، وخلّي مدة الـ JWT قصيرة (الافتراضي كفاية).

## 2) تطبيق الـ Migrations
```bash
npm i -D supabase            # أو ثبّت الـ CLI
npx supabase init            # في جذر المشروع (جنب package.json)
# انسخ مجلد supabase/migrations و seed.sql من هذا الحزمة داخل مجلد supabase عندك
npx supabase login
npx supabase link --project-ref <DEV_PROJECT_REF>
npx supabase db push         # يطبّق ملفات الـ migrations بالترتيب (21 ملفاً)
# بعدها الصق محتوى supabase/seed.sql في SQL Editor ونفّذه
```
بعد `db push` شغّل Advisors (Dashboard → Advisors) وراجع أي تحذيرات.

## 3) إنشاء أول Super Admin
1. Dashboard → Authentication → Users → **Add user** (إيميلك وباسورد قوي).
2. في SQL Editor:
```sql
insert into public.user_roles (user_id, role)
select id, 'super_admin' from auth.users where email = 'YOUR_EMAIL';
```
3. باقي الأدمنز: إنت (super_admin) بس اللي بتمنح الأدوار (`user_roles`)، والرئيس يقدر يشوفها.

## 4) ربط الفرونت
```bash
npm i @supabase/supabase-js @tanstack/react-query react-router-dom
```
انسخ مجلد `frontend/src` فوق `src` عندك (الملفات كلها جديدة ومش بتكتب فوق حاجة موجودة)، وانسخ `.env.example` إلى `.env.local` واملأه.

في `main.jsx`:
```jsx
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './context/AuthContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>,
);
```
> لو عندك بالفعل `BrowserRouter` أو `ThemeContext` provider، خلي الـ `AuthProvider` جوّاهم وما تكررش.

في الـ Routes (الداشبورد lazy):
```jsx
const DashboardHome = lazy(() => import('./pages/dashboard/DashboardHome'));

<Route element={<ProtectedRoute />}>
  <Route path="/dashboard" element={<DashboardHome />} />
  <Route element={<RoleGuard allow={['hr_admin', 'president', 'vice_president']} />}>
    <Route path="/dashboard/applications" element={<Applications />} />
  </Route>
</Route>
```

### استبدال الـ mock تدريجيًا (صفحة صفحة)
```jsx
import mockEvents from '../data/events';       // اللي عندك حاليًا
import { useEvents } from '../hooks/usePublicContent';

const { data: events = [] } = useEvents(mockEvents);   // نفس الـ mock كـ fallback
```
- لو الجدول فاضي أو Supabase مش متظبط ← يرجع الـ mock تلقائي.
- الأعمدة في الداتا بيز بالشكل `title_ar / title_en`. استخدم `pick(row, 'title', lang)` من `services/helpers.js` أو حوّل الشكل في الـ service.

## 5) مصفوفة الصلاحيات (RBAC)
(super_admin يعدّي أي فحص.) ✅ إدارة كاملة · 👁 قراءة · ➕ تسجيل فقط · — ممنوع

| الجدول / الوحدة | president / vice | hr_admin | finance_admin | pr_admin | media_admin / media | oc_admin | committee_head | member |
|---|---|---|---|---|---|---|---|---|
| ملفات الأعضاء الخاصة (تليفون/إيميل) | 👁✅ | ✅ | — | — | — | — | 👁 أعضاء لجنته | بياناته فقط |
| الأدوار `user_roles` | 👁 | 👁 | — | — | — | — | — | دوره فقط (القراءة) |
| طلبات التقديم | ✅ | ✅ | — | — | — | — | 👁 اللي اختاروا لجنته | — |
| المهام | ✅ | ✅ | — | — | — | — | ✅ لجنته | مهامه + مهام لجنته (يغيّر الحالة فقط) |
| الحضور / الأعذار | ✅ | ✅ | — | — | — | 👁 | ✅ لجنته | حضوره + تقديم عذر |
| النقاط (إضافة) | ✅ | ✅ | — | — | — | — | ✅ لأعضاء لجنته | يشوف نقاطه ويعترض |
| إلغاء نقطة (void) | ✅ | ✅ | — | — | — | — | — | — |
| الـ Leaderboard (مجاميع فقط) | 👁 | 👁 | 👁 | 👁 | 👁 | 👁 | 👁 | 👁 |
| الشركات | 👁 | — | 👁 | ✅ | 👁 | 👁 | — | — (إلا أعضاء الميديا 👁) |
| جهات اتصال الشركات / الملاحظات | ✅ | — | — | ✅ | — | — | — | — |
| الاتفاقيات (فيها قيم مالية) | ✅ | — | 👁 | ✅ | **—** | — | — | — |
| الدفعات | ✅ | — | ✅ | ➕ تسجيل | — | — | — | — |
| حذف دفعة | super_admin فقط |
| الـ Deliverables | 👁✅ | — | 👁 | ✅ | 👁 | — | — | أعضاء الميديا 👁 |
| البوستات | ✅ | — | — | 👁 | ✅ | — | ✅ لجنته | أعضاء الميديا: مسودة/مراجعة فقط |
| المصروفات | ✅ اعتماد | — | ✅ اعتماد | — | — | ➕ | ➕ طلب | — |
| الميزانيات | ✅ | — | ✅ | — | — | — | 👁 لجنته | — |
| الفعاليات | ✅ | 👁 | — | 👁 | 👁 | ✅ | ✅ لو لجنته منظمة | 👁 العامة |
| محتوى الموقع (شركاء/فريق/أخبار/إحصائيات) | ✅ | فريق | — | شركاء | أخبار/جاليري/إحصائيات | — | — | — |
| إعدادات (`applications_open`) | ✅ | ✅ هذا المفتاح فقط | — | — | — | — | — | — |
| Audit log | president (قراءة) | — | — | — | — | — | — | — |

ملاحظات:
- أدمن واحد مش بيشوف أرقام التانيين: الميديا مثلاً يشوف الـ deliverables واسم الشركة لكن **مفيش وصول لجدول الاتفاقيات** (فيه القيم).
- النقاط: `point_entries` سجل **append-only** (مفيش حذف ولا تعديل، الإلغاء بـ `voided_at`)، و`member_scores` بيتحدث تلقائيًا بـ trigger.
- `session_secrets` (أسرار الـ QR) مفيش أي policy عليها: بيقراها الـ Edge Function فقط.

## 6) ما تم اختباره والتحقق منه فعليًا (Verified in Test Environment)
1. **قاعدة البيانات والـ RLS**:
   - تم تشغيل 21 ملف Migration متسلسل + الـ Seed على بيئة اختبار محلية.
   - التحقق من سياسات الأمان (RLS) لـ 12 دوراً، ومنع التسريب بين اللجان والمسؤولين، وتأمين سجل النقاط (Append-only)، وعزل أسرار الجلسات (`session_secrets`).
2. **اختبارات الوحدات (Unit Tests)**:
   - اجتياز **336 اختباراً آلياً عبر 28 جناح اختبار (Test Suites)** بنسبة نجاح 100%، تغطي كافة خوارزميات توليد وفحص أكواد التذاكر، وحسابات النقاط، وتوليد توكنات الـ QR، وصلاحيات الـ RBAC، وأمان معاينة الـ Markdown، وحماية معدل الطلبات (Rate Limiting)، وتطابق ملفات الترجمة (i18n Parity)، وسير عمل النسخ الاحتياطي وفك التشفير.
3. **الجودة والبناء (CI & Build)**:
   - تدقيق الكود بالكامل بدون أخطاء عبر `oxlint`.
   - نجاح البناء الإنتاجي `npm run build` مع الالتزام التام بميزانية الحزم `npm run check:bundle` واستيفاء متطلبات محرك التشغيل Node 22+ (LTS).

## 7) مصفوفة حالة الميزات (Feature Implementation Matrix)

تم تدقيق ومراجعة كافة ميزات المنصة وتصنيفها بدقة كالآتي:

### أولاً: ميزات مُنفّذة ومُتحقّق منها بالكامل (Implemented & Verified)
- **Supabase Edge Functions (11 دالة)**:
  - `submit-application`: استقبال طلبات الانضمام مع التحقق من Turnstile وRate Limiting وفحص Zod.
  - `convert-application`: تحويل المتقدم المقبول إلى عضو رسمي (إنشاء حساب Auth + عضوية Season + نقاط ترحيبية).
  - `register-event`: تسجيل حضور الفعاليات مع توليد أكواد تذاكر آمنة ومقاومة للتصادم وتدقيق Turnstile.
  - `ticket-lookup`: استعلام التذاكر بالرمز مع Rate Limiting وحماية البيانات الشخصية.
  - `qr-token`: توليد توكنات جلسات الحضور المشفرة والمتغيرة زمنياً لمنظمي OC.
  - `qr-checkin`: مسح وتسجيل الحضور الميداني مع منع التكرار والتحقق من صلاحية المنظم.
  - `contact-form`: استمارة التواصل العامة مع Turnstile وRate Limiting وإرسال الإشعارات عبر Resend.
  - `send-email`: إرسال رسائل بريد إلكتروني موثوقة داخلياً عبر Resend API.
  - `close-session`: إغلاق وأرشفة جلسات الحضور (خاص بـ Super Admin).
  - `submit-feedback`: استقبال استبيانات الرأي العامة مع Rate Limiting.
  - `weekly-report`: إعداد ملخص النشاط الأسبوعي محمي بـ Bearer Token ومُهيأ للتشغيل الدوري.
- **شاشات لوحة التحكم الداخلية (20 شاشة في `/dashboard/*`)**:
  - تحميل كسول بالكامل (`React.lazy`) لحماية سرعة الموقع العام.
  - حماية المسارات والصلاحيات بواسطة `RoleGuard` و `AuthContext`.
  - إعادة استخدام متكاملة لمكونات المنظومة: `DataTable`, `StatCard`, `ConfirmDialog`, `StatusBadge`, `Drawer`, `Skeleton`, `EmptyState`.
  - دعم التصفح الخادمي (Server-side Pagination عبر `range()`) وإدارة الكاش بواسطة TanStack React Query.
  - شاشات: الرئيسية، التقديمات، الأعضاء، الحضور، جلسة الحضور، النقاط، المهام، الفعاليات، الشركات، الاتفاقيات، المالية، المنشورات، إدارة محتوى الموقع (CMS)، سجل العمليات (Audit Log)، تدوير المواسم، التحليلات، الإعلانات، الإشعارات، الملف الشخصي، الإعدادات.
- **الواجهة العامة والأمان وتعدد اللغات**:
  - تصميم فرعوني داكن وذهبي متوافق مع الهوية البصرية، ويدعم التبديل للثيم الفاتح.
  - دعم كامل للغتين العربية (افتراضي RTL) والإنجليزية (LTR) مع تبديل ديناميكي لـ `dir` و `lang`.
  - معاينة آمنة للـ Markdown عبر AST Sanitization مع منع تام لثغرات XSS وتنفيذ السكربتات والروابط الخبيثة.
  - تحصين حماية معدل الطلبات (Atomic In-Memory Rate Limiting) مع إلزامية وجود ملح التشفير (Salt).
  - خط أنابيب فحص الجودة الآلي (.github/workflows/ci.yml) وسير عمل النسخ الاحتياطي المشفر مع فحص الاستعادة (.github/workflows/backup.yml).

### ثانياً: ميزات مُنفّذة جزئياً (Partially Implemented)
- **تصدير البيانات (Data Export)**:
  - *المنفذ*: تصدير CSV مجدول ومتوافق مع العربية بترميز UTF-8 مع BOM (`src/lib/csvExport.js`) يعمل ومختبر في 4 شاشات (التقديمات، الأعضاء، الحضور، المالية).
  - *المتبقي*: تصدير ملفات Excel الثنائية المباشرة بصيغة `.xlsx` والتقارير المطبوعة بصيغة PDF.
- **المهام المجدولة (Cron Jobs)**:
  - *المنفذ*: سكريبت `supabase/optional/cron.sql` والدالة `weekly-report` مجهزة للاستدعاء عبر Vault Bearer Token.
  - *المتبقي*: تفعيل ملحقات `pg_cron` و `pg_net` و `vault` يدوياً على لوحة تحكم Supabase السحابية وربط الأسرار.
- **استعادة الفعاليات المحذوفة (Event Recovery)**:
  - *المنفذ*: دوال قاعدة البيانات ومسارات استعادة الفعاليات وسجل التعديلات في Migrations.
  - *المتبقي*: زر تفاعلي مباشر داخل درج تفاصيل الفعالية (Event Drawer) في واجهة الداشبورد.

### ثالثاً: ما ينتظر التطبيق السحابي (Unverified on Remote Database)
- **ملفات الـ Migrations (من 7 إلى 21)**:
  - تم فحصها محلياً واجتياز اختبارات الـ SQL والـ RLS، ولكن **لم تُطبّق على قاعدة بيانات المشروع السحابية البعيدة بعد** التزاماً بقاعدة حدود قاعدة البيانات الصارمة (DB Boundary - القاعدة 1 و 12).
- **نشر دوال الـ Edge Functions**:
  - تم اكتمال كود الـ 11 دالة واختباره محلياً، وينتظر النشر اليدوي من قِبل المطور عبر Supabase CLI.

### رابعاً: ميزات مخطط لها في خارطة الطريق (Planned / Roadmap)
- **بوابة الرعاة (Sponsor Portal)**: بوابة مخصصة للمؤسسات الشريكة تتيح لهم تسجيل الدخول الذاتي لمتابعة بنود الرعاية والـ Deliverables وسجل الدفعات (تُدار حالياً داخلياً فقط عبر `/dashboard/companies` و `/dashboard/agreements` واستمارة عامة `/sponsor`).
- **شارات الإنجاز والتحفيز (Gamification Badges)**: نظام شارات استحقاقية وجوائز للأعضاء الأكثر تفاعلاً (توجد حالياً شارات الحالة التشغيلية `StatusBadge.jsx` فقط).
- **الشهادات الرقمية المؤتمتة (Certificates)**: توليد آلي لشهادات الحضور والمشاركة بصيغة PDF قابلة للتحميل مع رمز QR للتحقق العام عبر صفحة `/verify` (توجد حالياً إحصائية رقمية لعدد الشهادات الصادرة فقط).
- **تصدير Excel ثنائي و PDF (Native XLSX & PDF Export)**: إتاحة تنزيل الجداول كملفات Excel مصفوفة وتقارير PDF منسقة للطباعة.

## 8) تنبيهات أمان
- لا تضع `service_role` في أي متغير يبدأ بـ `VITE_`.
- slug لجنة الميديا لازم يفضل `media` (السياسات بتعتمد عليه).
- بعد أي جدول جديد: فعّل RLS واكتب policies وأضف GRANT صريح (الـ default privileges بتختلف حسب إعدادات Data API).
- اعمل backup دوري (GitHub Action بـ `pg_dump`) لأن الخطة المجانية مفيهاش backups يومية.
