# دليل تدوير المواسم وتجديد النشاط (Season Rollover Runbook)

هذا الدليل يوضح الإجراء القياسي المعتمد لنقل نشاط إيناكوس قنا (Enactus Qena) من موسم حالي إلى موسم جديد بكل أمان وبدون حذف أي بيانات تاريخية (Non-Destructive Rollover).

---

## 1. المبادئ الأساسية في تصميم قاعدة البيانات
1. **النقاط والسجلات محفوظة لكل موسم**:
   - جدول `point_entries` وجدول `member_scores` و`attendance_sessions` و`tasks` مرتبطة جميعها بعمود `season_id`.
   - أرصدة الأعضاء ولوحة المتصدرين التاريخية لا تُمحى؛ تظل محفوظة باسم موسمها.
2. **اللجان عامة ومستمرة (Global Committees)**:
   - جدول `committees` لا يحتاج لإعادة إنشاء أو نسخ؛ العضوية هي التي ترتبط بالموسم عبر جدول `memberships`.
3. **حفظ تاريخ العضوية (Alumni Transition)**:
   - الأعضاء السابقون لا يُحذفون؛ بل تتحول حالة عضويتهم في الموسم المنتهي من `active` إلى `alumni` في جدول `memberships`، وتُحفظ سجلاتهم للمستقبل.
4. **موسم واحد نشط في نفس اللحظة (Single Active Season Constraint)**:
   - يوجد Unique Partial Index في Postgres يضمن وجود صف واحد فقط يحمل `is_active = true`:
     ```sql
     create unique index seasons_one_active_idx on public.seasons (is_active) where is_active;
     ```

---

## 2. الخطوات اليدوية عبر SQL (أو عبر صفحة /dashboard/season)

### الخطوة الأولى: تعطيل استقبال التقديمات مؤقتاً
```sql
update public.settings
set value = 'false'::jsonb
where key = 'applications_open';
```

### الخطوة الثانية: تحويل عضويات الموسم القديم إلى خريجين (Alumni)
```sql
-- استبدال 'OLD_SEASON_ID' بمعرف الموسم الحالي
update public.memberships
set status = 'alumni'
where season_id = (select id from public.seasons where is_active = true)
  and status = 'active';
```

### الخطوة الثالثة: إلغاء تفعيل الموسم القديم وإنشاء وتفعيل الموسم الجديد
```sql
-- 1. إلغاء تفعيل الموسم الحالي
update public.seasons
set is_active = false
where is_active = true;

-- 2. إدخال الموسم الجديد وتفعيله
insert into public.seasons (name, starts_on, ends_on, is_active)
values ('2027/2028', date '2027-09-01', date '2028-06-30', true);
```

### الخطوة الرابعة: ترحيل أو تعيين قيادات الموسم الجديد
يمكن للرئيس أو الـ Super Admin إدخال عضويات القيادات الجديدة للموسم الجديد:
```sql
-- مثال: تعيين عضو في لجنة للموسم الجديد
insert into public.memberships (user_id, season_id, committee_id, position, status, joined_at)
values (
  'USER_UUID',
  (select id from public.seasons where is_active = true),
  'COMMITTEE_UUID',
  'head',
  'active',
  current_date
);
```

### الخطوة الخامسة: إعادة فتح التقديمات للموسم الجديد
```sql
update public.settings
set value = 'true'::jsonb
where key = 'applications_open';
```

---

## 3. قائمة التحقق بعد التدوير (Post-Rollover Verification Checklist)
- [ ] الدخول إلى `/dashboard` والتأكد من ظهور اسم الموسم الجديد في التوب بار.
- [ ] التأكد من أن جدول المهام وجدول الحضور يبدأان نظيفين للموسم الجديد.
- [ ] فحص صفحة `/dashboard/leaderboard` للتأكد من إمكانية استعراض متصدري الموسم القديم واختيار الموسم الجديد من القائمة المنسدلة.
- [ ] فحص صفحة الخريجين العامة `/alumni` والتأكد من ظهور أعضاء الموسم السابق كخريجين.

