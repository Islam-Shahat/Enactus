-- =====================================================================
-- SEED (dev + first production bootstrap). Safe to re-run.
-- NOTE: the committee slug 'media' is referenced by RLS policies
--       (media team members can see deliverables and manage posts).
--       Do not rename it.
-- =====================================================================

insert into public.seasons (name, starts_on, ends_on, is_active)
select '2026/2027', date '2026-09-01', date '2027-06-30', true
where not exists (select 1 from public.seasons);

insert into public.committees (slug, name_ar, name_en, description_ar, description_en, color, icon, sort_order) values
  ('hr',     'الموارد البشرية', 'Human Resources', 'استقطاب الأعضاء وتقييمهم ومتابعة الحضور والنقاط.', 'Recruiting, evaluating and following up on members, attendance and points.', '#16A34A', 'users',     1),
  ('pr',     'العلاقات العامة والرعاة', 'PR & Sponsorship', 'التواصل مع الشركات وإدارة الشراكات والرعايات.', 'Managing companies, partnerships and sponsorships.', '#2563EB', 'handshake', 2),
  ('media',  'الميديا', 'Media', 'صناعة المحتوى وإدارة الصفحات وتنفيذ التزامات الشراكات.', 'Content creation, social pages and partnership deliverables.', '#7C3AED', 'camera',    3),
  ('oc',     'اللجنة المنظمة', 'Organizing Committee', 'تنظيم الفعاليات واللوجستيات.', 'Events and logistics.', '#EA580C', 'calendar',  4),
  ('finance','المالية', 'Finance', 'متابعة الدفعات والمصروفات والميزانيات.', 'Payments, expenses and budgets.', '#CA8A04', 'wallet',    5)
on conflict (slug) do nothing;

insert into public.settings (key, value, is_public) values
  ('applications_open', 'true'::jsonb, true),
  ('site_name',         '{"ar": "إنكتوس قنا", "en": "Enactus Qena"}'::jsonb, true)
on conflict (key) do nothing;

insert into public.point_rules (code, name_ar, name_en, type, value, is_auto, description) values
  ('absence_unexcused', 'غياب بدون عذر',        'Unexcused absence',   'penalty', 5, true,  'Applied automatically when a session is closed.'),
  ('late_arrival',      'تأخير عن الحضور',      'Late arrival',        'penalty', 1, true,  null),
  ('task_late',         'تأخير في تسليم تاسك',  'Late task',           'penalty', 2, true,  null),
  ('task_early',        'تسليم تاسك مبكر',      'Early task',          'bonus',   2, true,  null),
  ('outstanding_work',  'مجهود متميز',          'Outstanding work',    'bonus',   5, false, 'Given manually by a head or HR.')
on conflict (code) do nothing;

-- PLACEHOLDERS: numbers come from the current design; replace the labels/values with your real ones from the dashboard.
insert into public.site_stats (key, value, suffix, label_ar, label_en, sort_order) values
  ('impact_pct',   100,   '%', 'أثر حقيقي',        'Real impact',        1),
  ('projects',     150,   '+', 'مشروع ومبادرة',    'Projects',           2),
  ('members',      3500,  '+', 'مستفيد',           'Beneficiaries',      3),
  ('volunteers',   11700, '+', 'ساعة تطوع',        'Volunteer hours',    4)
on conflict (key) do nothing;
