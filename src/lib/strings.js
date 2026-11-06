import i18n from '../i18n';

export const strings = {
  ar: {
    // Navigation
    navHome: 'الرئيسية',
    navAbout: 'من نحن',
    navCommittees: 'اللجان',
    navTeam: 'الكتيبة والـ Board',
    navEvents: 'الفعاليات',
    navPartners: 'الشركاء والرعاة',
    navSponsor: 'كن راعياً (Sponsorship)',
    navImpact: 'الأثر والتنمية (Impact)',
    navGallery: 'معرض الهوية والميديا',
    navNews: 'الأخبار والبيانات',
    navFaq: 'الأسئلة الشائعة (FAQ)',
    navAlumni: 'شبكة الخريجين (Alumni)',
    navContact: 'اتصل بنا',
    navTerms: 'الشروط والخصوصية',
    navMore: 'المزيد',
    navLogin: 'دخول الأعضاء',
    navDashboard: 'لوحة التحكم',
    navJoin: 'اترك أثرك (سجّل)',

    // Common
    readMore: 'اقرأ المزيد',
    viewAll: 'عرض الكل',
    details: 'التفاصيل',
    back: 'العودة',
    register: 'سجل الآن',
    close: 'إغلاق',
    search: 'بحث',
    send: 'إرسال',
    apply: 'قدّم الآن',
    loading: 'جاري التحميل...',
    comingSoon: 'قريباً',
    comingSoonDesc: 'هذه الوحدة قيد التطوير والتجهيز في المراحل القادمة للمشروع.',

    // Footer
    footerDesc: 'نشاط طلابي تنموي ريادي في جامعة جنوب الوادي بقنا. نعمل على تمكين الشباب وتطوير حلول مستدامة تخدم صعيد مصر وتصعد بنا نحو العالمية.',
    footerQuickLinks: 'روابط سريعة',
    footerCommittees: 'لجان الكتيبة',
    footerContact: 'تواصل معنا',
    footerRights: 'جميع الحقوق محفوظة',
    footerAddress: 'جامعة جنوب الوادي، قنا، مصر',
    footerTimezone: 'توقيت القاهرة (UTC+2)',

    // Auth & Login
    loginTitle: 'بوابة كتيبة إيناكوس قنا',
    loginSubtitle: 'تسجيل الدخول لبوابة الأعضاء ومجلس الإدارة',
    emailLabel: 'البريد الإلكتروني',
    emailPlaceholder: 'islam@gmail.com',
    passwordLabel: 'كلمة المرور',
    passwordPlaceholder: '••••••••',
    loginButton: 'تسجيل الدخول',
    loggingIn: 'جاري تسجيل الدخول...',
    loginGenericError: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    supabaseNotConfigured: 'تكوين Supabase مفقود في البيئة المحلية (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY).',
    forgotPasswordLink: 'نسيت كلمة المرور؟',
    backToLogin: 'العودة لتسجيل الدخول',

    // Password Recovery
    forgotTitle: 'استعادة كلمة المرور',
    forgotSubtitle: 'أدخل بريدك الإلكتروني المسجل لإرسال رابط إعادة التعيين.',
    sendResetLink: 'إرسال رابط التعيين',
    sendingLink: 'جاري الإرسال...',
    resetNotice: 'إذا كان البريد مسجلاً في النظام، فستصلك رسالة تحتوي على تعليمات إعادة التعيين.',
    resetTitle: 'تعيين كلمة مرور جديدة',
    resetSubtitle: 'أدخل كلمة المرور الجديدة لحسابك.',
    newPasswordLabel: 'كلمة المرور الجديدة',
    confirmPasswordLabel: 'تأكيد كلمة المرور',
    updatePasswordButton: 'تحديث كلمة المرور والمتابعة',
    updatingPassword: 'جاري التحديث...',
    passwordsDoNotMatch: 'كلمتا المرور غير متطابقتين.',
    passwordMinLength: 'يجب أن لا تقل كلمة المرور عن 8 أحرف.',
    invalidRecoveryLink: 'رابط استعادة كلمة المرور غير صالح أو منتهي الصلاحية. يرجى طلب رابط جديد.',

    // Account Edge Cases
    accountInactiveTitle: 'الحساب غير مفعّل بعد',
    accountInactiveDesc: 'تم التحقق من بريدك الإلكتروني بنجاح، ولكن حسابك لم يُعيّن له دور أو لجنة بعد. يرجى مراجعة مسؤولي الموارد البشرية وإدارة الفريق.',
    accountSuspendedTitle: 'الحساب معلّق',
    accountSuspendedDesc: 'تم تعليق هذا الحساب مؤقتاً من قِبل إدارة إيناكوس قنا. يرجى مراجعة إدارة الفريق.',
    signOutButton: 'تسجيل الخروج',
    contactSupport: 'تواصل مع الدعم / HR',

    // Dashboard Shell
    dashboardTitle: 'لوحة التحكم',
    dashboardHome: 'الرئيسية',
    dashboardWelcome: 'أهلاً بك يا',
    dashboardWelcomeDesc: 'مرحباً بك في لوحة تحكم كتيبة إيناكوس قنا. يمكنك إدارة المهام والعمليات الموكلة إليك وفق صلاحياتك.',
    notificationsPlaceholder: 'التنبيهات',
    languagePlaceholder: 'اللغة',
    forbiddenTitle: 'غير مصرّح لك بدخول هذه الصفحة',
    forbiddenDesc: 'ليس لديك الصلاحيات الكافية للوصول إلى هذا القسم.',
    notFoundTitle: 'الصفحة غير موجودة',
    notFoundDesc: 'الصفحة التي طلبتها داخل لوحة التحكم غير موجودة.',
    backToDashboard: 'العودة للرئيسية',
  },
  en: {
    // Navigation
    navHome: 'Home',
    navAbout: 'About Us',
    navCommittees: 'Committees',
    navTeam: 'Board & Leaders',
    navEvents: 'Events',
    navPartners: 'Partners & Sponsors',
    navSponsor: 'Become a Sponsor',
    navImpact: 'Impact & SDGs',
    navGallery: 'Media & Gallery',
    navNews: 'News & Press',
    navFaq: 'FAQ',
    navAlumni: 'Alumni Network',
    navContact: 'Contact Us',
    navTerms: 'Terms & Privacy',
    navMore: 'More',
    navLogin: 'Member Login',
    navDashboard: 'Dashboard',
    navJoin: 'Join Us',

    // Common
    readMore: 'Read More',
    viewAll: 'View All',
    details: 'Details',
    back: 'Back',
    register: 'Register Now',
    close: 'Close',
    search: 'Search',
    send: 'Send',
    apply: 'Apply Now',
    loading: 'Loading...',
    comingSoon: 'Coming Soon',
    comingSoonDesc: 'This module is scheduled for implementation in upcoming phases.',

    // Footer
    footerDesc: 'A premier student-led development platform at South Valley University, Qena. Empowering youth and building sustainable ventures that elevate Upper Egypt to the global stage.',
    footerQuickLinks: 'Quick Links',
    footerCommittees: 'Committees',
    footerContact: 'Contact Us',
    footerRights: 'All Rights Reserved',
    footerAddress: 'South Valley University, Qena, Egypt',
    footerTimezone: 'Cairo Local Time (UTC+2)',

    // Auth & Login
    loginTitle: 'Enactus Qena Internal Portal',
    loginSubtitle: 'Sign in to the member and board dashboard',
    emailLabel: 'Email Address',
    emailPlaceholder: 'islam@gmail.com',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    loginButton: 'Sign In',
    loggingIn: 'Signing in...',
    loginGenericError: 'Invalid email or password.',
    supabaseNotConfigured: 'Supabase is not configured in local environment variables.',
    forgotPasswordLink: 'Forgot password?',
    backToLogin: 'Back to Sign In',

    // Password Recovery
    forgotTitle: 'Password Recovery',
    forgotSubtitle: 'Enter your registered email to receive a reset link.',
    sendResetLink: 'Send Reset Link',
    sendingLink: 'Sending...',
    resetNotice: 'If an account exists with this email, a reset link has been dispatched.',
    resetTitle: 'Set New Password',
    resetSubtitle: 'Enter a new password for your account.',
    newPasswordLabel: 'New Password',
    confirmPasswordLabel: 'Confirm Password',
    updatePasswordButton: 'Update Password & Proceed',
    updatingPassword: 'Updating...',
    passwordsDoNotMatch: 'Passwords do not match.',
    passwordMinLength: 'Password must be at least 8 characters.',
    invalidRecoveryLink: 'The recovery link is invalid or expired. Please request a new one.',

    // Account Edge Cases
    accountInactiveTitle: 'Account Not Activated Yet',
    accountInactiveDesc: 'Your account has been authenticated, but no active roles or committee assignments were found. Please contact the HR administrators.',
    accountSuspendedTitle: 'Account Suspended',
    accountSuspendedDesc: 'This account has been temporarily suspended by Enactus Qena administration. Please contact leadership.',
    signOutButton: 'Sign Out',
    contactSupport: 'Contact HR Support',

    // Dashboard Shell
    dashboardTitle: 'Dashboard',
    dashboardHome: 'Dashboard Home',
    dashboardWelcome: 'Welcome,',
    dashboardWelcomeDesc: 'Welcome to Enactus Qena dashboard. Manage your assigned tasks and team operations.',
    notificationsPlaceholder: 'Notifications',
    languagePlaceholder: 'Language',
    forbiddenTitle: 'Access Forbidden',
    forbiddenDesc: 'You do not have the required permissions to view this page.',
    notFoundTitle: 'Page Not Found',
    notFoundDesc: 'The requested dashboard page does not exist.',
    backToDashboard: 'Back to Dashboard',
  },
};

let activeSystemLang = 'ar';

export function setCurrentLang(lang) {
  if (lang === 'ar' || lang === 'en') {
    activeSystemLang = lang;
  }
}

export function getCurrentLang() {
  return activeSystemLang;
}

/** Helper returning translated string according to current or explicit language */
export function t(key, lang = activeSystemLang) {
  if (i18n && i18n.isInitialized && (key.includes('.') || i18n.exists(key))) {
    const val = i18n.t(key, { lng: lang });
    if (val && val !== key) return val;
  }
  const selected = strings[lang] ?? strings.ar;
  return selected[key] ?? strings.ar[key] ?? strings.en[key] ?? key;
}
