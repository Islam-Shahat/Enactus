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
npx supabase db push         # يطبّق الملفات الستة بالترتيب
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

## 6) اللي اتجرّب فعلًا
اتشغّلت الـ 6 migrations + الـ seed على PostgreSQL 16 محلي مع نسخة مبسّطة من `auth`/`storage`، وعدّى **69 اختبار صلاحيات** (زائر، عضو، ميديا، HR، PR، مالية، رئيس، super_admin): فحص التسريب بين الأدوار، منع تعديل الدفتر، حساب الأرصدة، تقدّم الـ deliverables، والـ audit. **ما اتجرّبش على مشروع Supabase حقيقي**، فشغّل `db push` على الـ dev وراجع الـ Advisors قبل أي حاجة، وبالأخص سياسات الـ Storage.

## 7) اللي لسه ناقص (الخطوة الجاية)
1. **Edge Functions:** `submit-application`، `convert-application` (يعمل حساب Auth + عضوية)، `qr-token` / `qr-checkin`، `register-event`، `contact-form` (كلهم مع Turnstile).
2. شاشات الداشبورد (Layout + Sidebar من `DASHBOARD_NAV` + أول صفحات: تقديمات، مهام، حضور).
3. i18n (`react-i18next`) وتبديل `lang/dir` ديناميك.
4. Sponsor Portal، Gamification (badges)، Certificates، تصدير Excel/PDF.
5. `supabase/optional/cron.sql` بعد تفعيل `pg_cron`.

## 8) تنبيهات أمان
- لا تضع `service_role` في أي متغير يبدأ بـ `VITE_`.
- slug لجنة الميديا لازم يفضل `media` (السياسات بتعتمد عليه).
- بعد أي جدول جديد: فعّل RLS واكتب policies وأضف GRANT صريح (الـ default privileges بتختلف حسب إعدادات Data API).
- اعمل backup دوري (GitHub Action بـ `pg_dump`) لأن الخطة المجانية مفيهاش backups يومية.
