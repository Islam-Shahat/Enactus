# Enactus Qena Portal | منصة إيناكوس قنا

المنصة الرسمية لنشاط **Enactus Qena** بجامعة جنوب الوادي (قنا، مصر).
تطبيق ويب متكامل (React 19 + Vite SPA) يجمع بين الموقع التعريفي العام (عربي افتراضي RTL + إنجليزي LTR) ولوحة تحكم داخلية لإدارة العمليات (`/dashboard/*`)، مدعوماً بـ Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions) واستضافة Vercel.

---

## 1. Environments & Architecture (البيئات والمعمارية)

| البيئة | الروابط والاستضافة | قاعدة البيانات (Supabase) | الملاحظات |
|---|---|---|---|
| **Development (Dev)** | `http://localhost:5173` | مشروع `enactus-dev` | تفعيل `VITE_USE_MOCK_FALLBACK=true` وبيانات تجريبية للمطورين. |
| **Production (Prod)** | `https://enactusqena.org` (Vercel) | مشروع `enactus-prod` | `VITE_USE_MOCK_FALLBACK=false`، تفعيل Turnstile، قيود CSP، وعزل كامل للأسرار. |

### معمارية الأمان:
- **Zero Secrets on Client**: لا توجد أي مفاتيح سرية أو `service_role` في الفرونت إند أو في أي متغير `VITE_*`.
- **RLS Enforced**: تطبيق كامل لسياسات الأمان على مستوى الصف (Row Level Security) لـ 12 دور وصلاحية.
- **Edge Functions**: تعمل في بيئة Deno، مع تدقيق المدخلات بـ Zod، والتحقق من Turnstile ومنع هجمات البوتات والـ Rate Limiting.

---

## 2. Running Locally (التشغيل المحلي)

### المتطلبات الأساسية:
- Node.js 22.12+ (LTS)
- npm 10+

### خطوات التشغيل:
```bash
# 1. تثبيت الحزم المقيدة
npm install

# 2. إعداد المتغيرات البيئية
cp .env.example .env.local

# 3. تشغيل خادم التطوير
npm run dev

# 4. تشغيل الاختبارات والفحص
npm test              # تشغيل اختبارات Vitest (336 اختبار عبر 28 ملف اختبار)
npm run lint          # فحص الكود بواسطة Oxlint
npm run i18n:check    # تدقيق تطابق مفاتيح الترجمة (AR/EN)
npm run build         # بناء حزمة الإنتاج
npm run check:bundle  # تدقيق الميزانية الحجمية للحزم المبنية
```

---

## 3. Operations & Runbooks (أدلة التشغيل القياسية)

### أ) إضافة أول Super Admin (Adding First Super Admin)
1. من لوحة Supabase Dashboard: اذهب إلى **Authentication → Users → Add user**.
2. أدخل البريد الإلكتروني وكلمة مرور معقدة.
3. افتح **SQL Editor** ونفّذ التالي:
   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'super_admin' from auth.users where email = 'YOUR_EMAIL@example.com';
   ```

### ب) تدوير المفاتيح والأسرار (Rotating Keys)
1. **JWT & Anon Key**:
   - من Supabase Dashboard: **Project Settings → API → JWT Settings → Generate new secret**.
   - حدّث `VITE_SUPABASE_PUBLISHABLE_KEY` في Vercel Dashboard وأعد الـ Deploy.
2. **Turnstile Secret Key**:
   - أنشئ مفتاحاً جديداً من Cloudflare Turnstile Dashboard.
   - حدّث `TURNSTILE_SECRET_KEY` في أسرار الـ Edge Functions عبر Supabase CLI:
     ```bash
     npx supabase secrets set TURNSTILE_SECRET_KEY=new_secret
     ```
   - حدّث `VITE_TURNSTILE_SITE_KEY` في Vercel.
3. **Resend API Key**:
   - أنشئ مفتاحاً جديداً من Resend ثم:
     ```bash
     npx supabase secrets set RESEND_API_KEY=re_newkey
     ```

### ج) تدوير ونقل المواسم (Closing & Rotating a Season)
راجع الدليل المفصل في [docs/SEASON_ROLLOVER.md](docs/SEASON_ROLLOVER.md) أو استخدم المعالج المباشر في لوحة التحكم `/dashboard/season` (خاص بـ Super Admin):
1. أرشَفَة الموسم المنتهي بتحويل عضويات الموسم من `active` إلى `alumni` في جدول `memberships`.
2. إلغاء تفعيل الموسم الحالي (`is_active = false`).
3. إدخال الموسم الجديد وتفعيله (`is_active = true`).
4. تظل كافة النقاط والمهام وسجلات الحضور محفوظة باسم موسمها دون أي حذف.

### د) استعادة النسخ الاحتياطية (Restoring a Backup)
راجع الدليل الكامل في [docs/BACKUPS.md](docs/BACKUPS.md):
```bash
# فك تشفير النسخة الاحتياطية المشفرة بـ GPG
gpg --decrypt --passphrase "$BACKUP_PASSPHRASE" --batch backup-latest.sql.gpg > backup-restore.sql

# استعادة النسخة في قاعدة البيانات
psql "$SUPABASE_DB_URL" < backup-restore.sql
```

### هـ) إضافة لجنة جديدة (Adding a Committee)
لإضافة لجنة جديدة إلى الهيكل التنظيمي:
1. افتح **SQL Editor** أو لوحة التحكم `/dashboard/site` (تبويب اللجان):
   ```sql
   insert into public.committees (slug, code, name_ar, name_en, color, icon, sort_order, is_media_team)
   values ('ai', 'AI & INNOVATION', 'لجنة الذكاء الاصطناعي والابتكار', 'AI & Innovation', '#8B5CF6', 'cpu', 8, false);
   ```
2. تنعكس اللجنة تلقائياً في استمارات التقديم ومهام الداشبورد وجداول الحضور والـ Leaderboard.

---

## 4. Tests & Quality Gates (الاختبارات والجودة)
- `supabase/tests/smoke_test_rbac.sql`: اختبارات التدخين الآلية لقواعد الأمان والـ RLS لـ 12 دور.
- `tests/*.test.js`: اختبارات وحدات شاملة (336 اختباراً عبر 28 جناح اختبار) للتحقق من المساعدين والمحولات وخوارزميات QR والنقاط والمهام وأمان الجلسات ومعدل الطلبات وتطابق الترجمات وأمان Markdown.
- CI Workflow (`.github/workflows/ci.yml`): سير عمل آلي في GitHub Actions يُنفذ `npm ci` على بيئة Node 22+ (LTS) ويفحص الكود (`oxlint`)، وتطابق الترجمات (`i18n:check`)، واختبارات الوحدات (`vitest`)، وبناء الحزم (`vite build`)، والميزانية الحجمية (`check:bundle`) قبل أي دمج.

---

## 5. Feature Matrix & Status (مصفوفة حالة الميزات)

| الميزة / المكون | الحالة | تفاصيل الجاهزية والتحقق |
|---|---|---|
| **Supabase Edge Functions** | ✅ مُنفّذ ومُتحقّق منه | 11 دالة (`submit-application`, `convert-application`, `qr-token`, `qr-checkin`, `register-event`, `ticket-lookup`, `contact-form`, `send-email`, `close-session`, `submit-feedback`, `weekly-report`) مع Zod وTurnstile وRate Limiting واختبارات كاملة. |
| **لوحة التحكم (Dashboard UI)** | ✅ مُنفّذ ومُتحقّق منه | 20 شاشة محمية بنظام الصلاحيات `RoleGuard` ومحملة بأسلوب Lazy Loading، مع دعم التصفح الخادمي وكافة حالات الواجهة (Loading, Error, Empty, Forbidden). |
| **الأمان ومعاينة المحتوى** | ✅ مُنفّذ ومُتحقّق منه | معاينة Markdown آمنة بنظام AST وخالية من ثغرات XSS، وحماية معدل طلبات صامدة ضد هجمات السباق مع ملح تشفير إلزامي. |
| **تعدد اللغات والتصميم** | ✅ مُنفّذ ومُتحقّق منه | عربي (RTL افتراضي) وإنجليزي (LTR) بنظام `i18next` وتبديل ديناميكي لاتجاه الصفحة، مع ثيم الفراعنة الداكن والذهبي ودعم الثيم الفاتح. |
| **تصدير البيانات (CSV vs Excel)** | ⚠️ مُنفّذ جزئياً | تصدير CSV مجدول بترميز UTF-8 مع BOM (`src/lib/csvExport.js`) يعمل بكفاءة في 4 شاشات. تصدير `.xlsx` الثنائي المباشر وPDF قيد التطوير. |
| **المهام المجدولة (Cron)** | ⚠️ مُنفّذ جزئياً | سكربت `supabase/optional/cron.sql` ودالة `weekly-report` جاهزة وتعتمد على `pg_cron` و `vault`، وتتطلب تفعيل الامتدادات في لوحة Supabase. |
| **استعادة الفعاليات المحذوفة** | ⚠️ مُنفّذ جزئياً | دوال ومسارات استعادة الفعاليات ومسار التدقيق مُنفذة في الـ Migrations، وبانتظار إضافة الزر التفاعلي في واجهة الداشبورد. |
| **الـ Migrations السحابية** | ⏳ بانتظار التطبيق السحابي | الـ Migrations من 1 إلى 6 مطبقة، بينما الـ Migrations من 7 إلى 21 مختبرة محلياً ولم تُدفع للسحابة التزاماً بقاعدة حدود قاعدة البيانات (DB Boundary). |
| **بوابة الرعاة (Sponsor Portal)** | 📋 مُخطّط لها (Roadmap) | تُدار الرعايات داخلياً عبر `/dashboard/companies` و `/dashboard/agreements`؛ بوابة الخدمة الذاتية المستقلة للرعاة مخطط لها لاحقاً. |
| **شارات التحفيز (Gamification)** | 📋 مُخطّط لها (Roadmap) | توجد شارات الحالات التشغيلية `StatusBadge`؛ شارات الإنجاز ونقاط التنافس الاستحقاقية للأعضاء مخطط لها. |
| **الشهادات الرقمية المؤتمتة** | 📋 مُخطّط لها (Roadmap) | يتم حالياً رصد إحصائية عدد الشهادات المصدرة؛ توليد PDF والتحقق عبر QR على صفحة `/verify` مخطط له. |
