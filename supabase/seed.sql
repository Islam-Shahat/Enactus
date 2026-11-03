-- =====================================================================
-- SEED (dev + first production bootstrap). Safe to re-run.
-- NOTE: committees flagged is_media_team (multimedia, social) get the media-team
--       permissions in RLS (see deliverables / posts policies).
-- Requires migration 20261102091614_public_content_fields.sql (code / is_media_team).
-- =====================================================================

insert into public.seasons (name, starts_on, ends_on, is_active)
select '2026/2027', date '2026-09-01', date '2027-06-30', true
where not exists (select 1 from public.seasons);

-- The 7 real committees of the site (slugs match the public website routes).
-- Rich page content (duties, skills, quote...) is loaded by dev_seed_public.sql
-- or edited later from the dashboard.
insert into public.committees (slug, code, name_ar, name_en, color, icon, sort_order, is_media_team) values
  ('pm',           'PM',           'إدارة المشاريع التنموية',    'Project Management',               '#16A34A', 'sprout',         1, false),
  ('multimedia',   'MULTI MEDIA',  'المالتي ميديا والتصميم',     'MultiMedia & Creative',            '#7C3AED', 'clapperboard',   2, true),
  ('pr',           'PR',           'العلاقات العامة والشراكات',  'Public Relations & Partnerships',  '#2563EB', 'handshake',      3, false),
  ('oc',           'OC',           'لجنة التنظيم واللوجستيات',   'Organizing Committee',             '#EA580C', 'calendar-check', 4, false),
  ('hr',           'HR',           'الموارد البشرية والتطوير',   'Human Resources & Talent',         '#0D9488', 'users',          5, false),
  ('presentation', 'PRESENTATION', 'فرسان المنصة والعرض',        'Presentation & Pitching',          '#DC2626', 'mic',            6, false),
  ('social',       'SOCIAL MEDIA', 'صناع المحتوى والسوشيال ميديا','Social Media & Marketing',         '#DB2777', 'megaphone',      7, true)
on conflict (slug) do update set
  code = excluded.code, name_ar = excluded.name_ar, name_en = excluded.name_en,
  color = excluded.color, icon = excluded.icon, sort_order = excluded.sort_order,
  is_media_team = excluded.is_media_team;

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
