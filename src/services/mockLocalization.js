// Localizes mock fallback arrays when Supabase tables are empty or mock fallback is active.

const ENGLISH_EVENTS = {
  'nc-orientation-2026': {
    title: 'National Competition NC 2026 Orientation Camp',
    date: '15 Nov 2026',
    time: '10:00 AM - 04:00 PM',
    location: 'Grand Conference Hall - South Valley University, Qena',
    category: 'Official Conferences',
    brief: 'Kickoff meeting for national entrepreneurship competition readiness across Egyptian universities, reviewing Qena venture feasibility.',
    description: 'Enactus South Valley University organizes its largest annual conference launching the strategic roadmap for Enactus Egypt National Competition.',
  },
  'social-entrepreneurship-bootcamp': {
    title: 'Upper Egypt Social Innovation Bootcamp',
    date: '02 Dec 2026',
    time: '09:00 AM - 05:00 PM (2-Day Bootcamp)',
    location: 'Conferences & Training Center - Qena Campus',
    category: 'Workshops & Bootcamps',
    brief: 'Intensive training camp delivered by Arab Union certified mentors to coach students on developmental business models and pitching.',
    description: 'A realistic simulation experience building startups that tackle ecological challenges in Upper Egypt, granting certified accreditations.',
  },
  'dendera-heritage-exhibition': {
    title: 'Dendera Green Heritage Fair',
    date: '20 Sep 2026',
    time: 'Completed Successfully',
    location: 'Dendera Temple Plaza & Sustainability Center, Qena',
    category: 'Field Exhibitions',
    brief: 'Showcasing the results of Herfa project empowering rural women in eco-friendly pottery and ceramics.',
    description: 'A community festival bringing together hundreds of citizens and artisans to exhibit revitalized handicrafts, supporting over 150 productive families.',
  },
  'recruitment-launch-2026': {
    title: 'Annual Recruitment Drive: Leave Your Mark',
    date: '10 Oct 2026',
    time: 'Completed',
    location: 'Central Campus Plaza - South Valley University',
    category: 'Recruitment & Talent',
    brief: 'Welcoming over 1,200 applications from SVU students across all faculties and conducting initial interviews.',
    description: 'Campus-wide festival distributing brochures and discovery cards featuring the Pharaohs mascots, welcoming students across all colleges.',
  },
};

const ENGLISH_NEWS = {
  'partnership-arab-union-announced': {
    title: 'Strategic Partnership Protocol Signed with Arab Union for Training',
    date: '24 Oct 2026',
    category: 'Strategic Alliances',
    excerpt: 'In a milestone move to empower Upper Egypt youth, Enactus SVU signed a premier training and development agreement with the Arab Union for Training.',
    content: 'Enactus Qena administration officially announced the signing of a strategic cooperation agreement with the Arab Union for Training under the banner "Together, We Create Greater Impact". The protocol provides certified capacity building in sustainable project management, digital marketing, leadership, and stage presentation to gear up for the national championship.',
  },
  'sponsors-cohort-2026-revealed': {
    title: 'Official 2026 Sponsors Cohort Revealed for Enactus Qena',
    date: '22 Oct 2026',
    category: 'Sponsorship & Support',
    excerpt: 'The team officially revealed its cohort of strategic sponsors: VERANDA, Arab Union for Training, Al-Awael Skills, and Al-Reda Printing.',
    content: 'Enactus Qena unveiled its official corporate partners for the 2026 season, celebrating mutual trust with prominent Qena institutions. Sponsors provide comprehensive logistical support including event hospitality at VERANDA, certified training with Arab Union, skills development with Al-Awael, and printing with Al-Reda.',
  },
  'dendera-jersey-reveal': {
    title: 'Official Jersey Reveal Inspired by Dendera: From Qena to the World',
    date: '15 Oct 2026',
    category: 'Visual Identity',
    excerpt: 'Blending Dendera architectural motifs with Enactus gold and charcoal, the official 2026 team kit launched to viral reception across social media.',
    content: 'Under the motto "From Upper Egypt, where history was written in stone.. taking our vision across borders", Enactus Qena unveiled its 2026 official kit featuring the majestic columns of Dendera Temple.',
  },
  'nabta-project-milestone': {
    title: 'Nabta Project Upcycles 50 Tons of Sugarcane Agro-Waste in Qena',
    date: '05 Oct 2026',
    category: 'Project Milestones',
    excerpt: 'Enactus Qena students successfully converted tons of sugarcane waste into eco-friendly boards and organic fertilizer, creating rural green income.',
    content: 'Nabta project recorded an outstanding ecological and economic milestone this agricultural season, empowering dozens of farmers in Qena to monetize sugarcane agro-waste as an alternative to burning.',
  },
};

const ENGLISH_BOARD = {
  'محمد عبد الرحيم القنائي': {
    name: 'Mohamed Abdelrahim',
    role: 'Team President',
    faculty: 'Faculty of Engineering - SVU',
    bio: 'A strategic leader guiding the Enactus Qena battalion with a vision inspired by Dendera Temple to take Upper Egypt impact to global competition.',
  },
  'ياسمين أشرف النجار': {
    name: 'Yasmine Ashraf',
    role: 'Vice President',
    faculty: 'Faculty of Commerce - SVU',
    bio: 'Operations and finance strategist overseeing inter-committee synergy and execution of strategic milestones.',
  },
  'طارق حسام الدين': {
    name: 'Tarek Hossam',
    role: 'General Secretary',
    faculty: 'Faculty of Computers & AI',
    bio: 'Responsible for institutional documentation, organizational affairs, and technical infrastructure.',
  },
  'أحمد خالد إبراهيم': {
    name: 'Ahmed Khaled',
    role: 'Head of Project Management',
    faculty: 'Faculty of Engineering',
    bio: 'Leading market research, feasibility studies, and village fieldwork for sustainable social ventures.',
  },
  'فادي إبراهيم': {
    name: 'Fadi Ibrahim',
    role: 'Head of MultiMedia & Creative',
    faculty: 'Faculty of Specific Education',
    bio: 'Creative director orchestrating 3D visual campaigns, cinematic films, and viral branding.',
  },
  'نورهان عادل كمال': {
    name: 'Nourhan Adel',
    role: 'Head of Human Resources',
    faculty: 'Faculty of Commerce',
    bio: 'Cultivating battalion culture, talent evaluations, and mentorship for over 200 members.',
  },
};

export function localizeEventsMock(events = [], lang = 'ar') {
  if (lang === 'ar') return events;
  return events.map((evt) => {
    const en = ENGLISH_EVENTS[evt.slug];
    if (!en) return evt;
    return {
      ...evt,
      title: en.title || evt.englishTitle || evt.title,
      englishTitle: en.title || evt.englishTitle,
      date: en.date || evt.date,
      time: en.time || evt.time,
      location: en.location || evt.location,
      category: en.category || evt.category,
      brief: en.brief || evt.brief,
      description: en.description || evt.description,
    };
  });
}

export function localizeNewsMock(news = [], lang = 'ar') {
  if (lang === 'ar') return news;
  return news.map((item) => {
    const en = ENGLISH_NEWS[item.slug];
    if (!en) return item;
    return {
      ...item,
      title: en.title || item.title,
      date: en.date || item.date,
      category: en.category || item.category,
      excerpt: en.excerpt || item.excerpt,
      content: en.content || item.content,
    };
  });
}

export function localizeBoardMock(board = [], lang = 'ar') {
  if (lang === 'ar') return board;
  return board.map((member) => {
    const en = ENGLISH_BOARD[member.name];
    if (!en) return member;
    return {
      ...member,
      name: en.name || member.name,
      role: en.role || member.englishRole || member.role,
      englishRole: en.role || member.englishRole,
      faculty: en.faculty || member.faculty,
      bio: en.bio || member.bio,
    };
  });
}

export const FACULTIES = [
  { ar: 'كلية التجارة', en: 'Faculty of Commerce' },
  { ar: 'كلية الهندسة', en: 'Faculty of Engineering' },
  { ar: 'كلية الحاسبات والمعلومات', en: 'Faculty of Computers & AI' },
  { ar: 'كلية العلوم', en: 'Faculty of Science' },
  { ar: 'كلية الآداب', en: 'Faculty of Arts' },
  { ar: 'كلية التربية', en: 'Faculty of Education' },
  { ar: 'كلية الزراعة', en: 'Faculty of Agriculture' },
  { ar: 'كلية الطب البشري', en: 'Faculty of Medicine' },
  { ar: 'كلية العلاج الطبيعي', en: 'Faculty of Physical Therapy' },
  { ar: 'كلية التمريض', en: 'Faculty of Nursing' },
  { ar: 'كلية الصيدلة', en: 'Faculty of Pharmacy' },
  { ar: 'كلية طب الأسنان', en: 'Faculty of Dentistry' },
  { ar: 'كلية الآثار بقنا', en: 'Faculty of Archaeology' },
  { ar: 'كلية الحقوق', en: 'Faculty of Law' },
  { ar: 'كلية التربية النوعية', en: 'Faculty of Specific Education' },
  { ar: 'أخرى', en: 'Other' },
];

export const ACADEMIC_YEARS = [
  { ar: 'الفرقة الأولى', en: '1st Year (Freshman)' },
  { ar: 'الفرقة الثانية', en: '2nd Year (Sophomore)' },
  { ar: 'الفرقة الثالثة', en: '3rd Year (Junior)' },
  { ar: 'الفرقة الرابعة', en: '4th Year (Senior 1)' },
  { ar: 'الفرقة الخامسة / دراسات عليا', en: '5th Year / Postgraduate' },
];

export const RECRUITMENT_COMMITTEES = [
  { ar: 'إدارة المشاريع التنموية (PM)', en: 'Project Management (PM)' },
  { ar: 'المالتي ميديا والتصميم (MultiMedia)', en: 'MultiMedia & Design' },
  { ar: 'العلاقات العامة والشراكات (PR)', en: 'Public Relations (PR)' },
  { ar: 'لجنة التنظيم واللوجستيات (OC)', en: 'Organizing Committee (OC)' },
  { ar: 'الموارد البشرية والتطوير (HR)', en: 'Human Resources (HR)' },
  { ar: 'فرسان المنصة والعرض (Presentation)', en: 'Presentation Team' },
  { ar: 'صناع المحتوى والسوشيال ميديا (Social Media)', en: 'Social Media & Content' },
];

