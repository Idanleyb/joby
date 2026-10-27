-- =============================================================================
-- Joby · seed data: launch category taxonomy (PRD §6, v1.1).
-- Runs on `supabase db reset` (local). For staging/production run it once via
-- the SQL editor or `psql -f supabase/seed.sql`. Safe to re-run.
-- =============================================================================

insert into public.categories (slug, name_he, name_en, budget_mandatory, sort_order) values
  ('design',            'עיצוב',                'Design',             false, 1),
  ('programming-tech',  'תכנות וטכנולוגיה',      'Programming & Tech', true,  2),
  ('digital-marketing', 'שיווק דיגיטלי',          'Digital Marketing',  true,  3),
  ('music-audio',       'מוזיקה ואודיו',          'Music & Audio',      false, 4),
  ('business',          'עסקים',                 'Business',           true,  5),
  ('finance',           'פיננסים',               'Finance',            true,  6),
  ('consulting',        'ייעוץ',                 'Consulting',         false, 7),
  ('lawyers',           'עורכי דין',             'Lawyers',            true,  8),
  ('household',         'בית ומשק בית',          'Household',          false, 9),
  ('others',            'שירותים נוספים',        'Others',             false, 10)
on conflict (slug) do update set name_he = excluded.name_he, name_en = excluded.name_en,
  budget_mandatory = excluded.budget_mandatory, sort_order = excluded.sort_order;

insert into public.subcategories (category_id, slug, name_he, name_en, licensed, is_other, sort_order)
select c.id, v.slug, v.name_he, v.name_en, v.licensed, v.is_other, v.sort_order
from (values
  ('design',            'art-illustration',   'איור ואמנות',               'Art & illustration',          false, false, 1),
  ('design',            'video',              'וידאו',                     'Video',                       false, false, 2),
  ('design',            'animation',          'אנימציה',                   'Animation',                   false, false, 3),
  ('programming-tech',  'development',        'פיתוח',                     'Development',                 false, false, 1),
  ('programming-tech',  'data-engineering',   'הנדסת נתונים',              'Data engineering',            false, false, 2),
  ('programming-tech',  'ai-implementation',  'הטמעת AI',                  'AI implementation',           false, false, 3),
  ('digital-marketing', 'content',            'תוכן',                      'Content',                     false, false, 1),
  ('digital-marketing', 'marketing-strategy', 'אסטרטגיה שיווקית',          'Strategy',                    false, false, 2),
  ('digital-marketing', 'social-media',       'רשתות חברתיות',             'Social media',                false, false, 3),
  ('digital-marketing', 'campaigns',          'קמפיינים',                  'Campaigns',                   false, false, 4),
  ('digital-marketing', 'seo',                'קידום אורגני (SEO)',        'SEO',                         false, false, 5),
  ('digital-marketing', 'ai-marketing',       'שיווק מבוסס AI',            'AI marketing',                false, false, 6),
  ('music-audio',       'music-audio',        'מוזיקה ואודיו',             'Music & audio',               false, false, 1),
  ('business',          'sales',              'מכירות',                    'Sales',                       false, false, 1),
  ('business',          'business-strategy',  'אסטרטגיה עסקית',            'Strategy',                    false, false, 2),
  ('business',          'project-management', 'ניהול פרויקטים',            'Project management',          false, false, 3),
  ('finance',           'accounting',         'הנהלת חשבונות',             'Accounting services',         false, false, 1),
  ('consulting',        'coaching',           'אימון (קואצ''ינג)',         'Coaching',                    false, false, 1),
  ('lawyers',           'legal-services',     'שירותים משפטיים',           'Legal services',              true,  false, 1),
  ('household',         'construction',       'בנייה ושיפוצים',            'Construction',                false, false, 1),
  ('household',         'plumbing',           'אינסטלציה',                 'Plumbing',                    false, false, 2),
  ('household',         'painting',           'צביעה',                     'Painting',                    false, false, 3),
  ('household',         'carpentry',          'נגרות',                     'Carpentry',                   false, false, 4),
  ('household',         'repairs-handyman',   'תיקונים והנדימן',           'Repairs & handyman',          false, false, 5),
  ('household',         'car-services',       'שירותי רכב',                'Car services',                false, false, 6),
  ('household',         'electricity',        'חשמל',                      'Electricity',                 false, false, 7),
  ('household',         'mobile-repair',      'תיקון טלפונים ניידים',      'Mobile phone repair',         false, false, 8),
  ('household',         'gardening',          'גינון',                     'Gardening',                   false, false, 9),
  ('household',         'home-decoration',    'עיצוב ועיטוב הבית',         'Home decoration',             false, false, 10),
  ('others',            'medical-services',   'שירותים רפואיים',           'Medical services',            true,  false, 1),
  ('others',            'sport-fitness',      'ספורט וכושר',               'Sport & fitness',             false, false, 2),
  ('others',            'pets',               'חיות מחמד',                 'Pets',                        false, false, 3),
  ('others',            'transportation',     'הסעות (מונית, אוטובוס)',    'Transportation (taxi, bus)',  false, false, 4),
  ('others',            'travel',             'תיירות וטיולים',            'Travel',                      false, false, 5),
  ('others',            'food-catering',      'אוכל וקייטרינג',            'Food & catering',             false, false, 6),
  ('others',            'makeup-hair',        'איפור ושיער',               'Makeup & hair',               false, false, 7),
  ('others',            'other',              'אחר (פרט/י)',               'Other (describe)',            false, true,  99)
) as v(cat, slug, name_he, name_en, licensed, is_other, sort_order)
join public.categories c on c.slug = v.cat
on conflict (slug) do update set name_he = excluded.name_he, name_en = excluded.name_en,
  licensed = excluded.licensed, is_other = excluded.is_other, sort_order = excluded.sort_order;
