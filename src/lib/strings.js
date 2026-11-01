export const strings = {
  ar: {
    // Auth & Login
    loginTitle: 'بوابة كتيبة إيناكوس قنا',
    loginSubtitle: 'تسجيل الدخول لبوابة الأعضاء ومجلس الإدارة',
    emailLabel: 'البريد الإلكتروني',
    emailPlaceholder: 'name@enactus-qena.org',
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
    dashboardHome: 'الرئيسية',
    dashboardWelcome: 'أهلاً بك يا',
    dashboardWelcomeDesc: 'مرحباً بك في لوحة تحكم كتيبة إيناكوس قنا. يمكنك إدارة المهام والعمليات الموكلة إليك وفق صلاحياتك.',
    notificationsPlaceholder: 'التنبيهات',
    languagePlaceholder: 'اللغة',
    comingSoon: 'قريباً',
    comingSoonDesc: 'هذه الوحدة قيد التطوير والتجهيز في المراحل القادمة للمشروع.',
    forbiddenTitle: 'غير مصرّح لك بدخول هذه الصفحة',
    forbiddenDesc: 'ليس لديك الصلاحيات الكافية للوصول إلى هذا القسم.',
    notFoundTitle: 'الصفحة غير موجودة',
    notFoundDesc: 'الصفحة التي طلبتها داخل لوحة التحكم غير موجودة.',
    backToDashboard: 'العودة للرئيسية',
    loading: 'جاري التحميل...',
  },
  en: {
    // Auth & Login
    loginTitle: 'Enactus Qena Internal Portal',
    loginSubtitle: 'Sign in to the member and board dashboard',
    emailLabel: 'Email Address',
    emailPlaceholder: 'name@enactus-qena.org',
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
    dashboardHome: 'Dashboard Home',
    dashboardWelcome: 'Welcome,',
    dashboardWelcomeDesc: 'Welcome to Enactus Qena dashboard. Manage your assigned tasks and team operations.',
    notificationsPlaceholder: 'Notifications',
    languagePlaceholder: 'Language',
    comingSoon: 'Coming Soon',
    comingSoonDesc: 'This module is scheduled for implementation in upcoming phases.',
    forbiddenTitle: 'Access Forbidden',
    forbiddenDesc: 'You do not have the required permissions to view this page.',
    notFoundTitle: 'Page Not Found',
    notFoundDesc: 'The requested dashboard page does not exist.',
    backToDashboard: 'Back to Dashboard',
    loading: 'Loading...',
  },
};

/** Helper returning Arabic text by default */
export function t(key) {
  return strings.ar[key] ?? strings.en[key] ?? key;
}

