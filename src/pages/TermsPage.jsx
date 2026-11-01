import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, FileText, ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="page-container-padding" style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <div className="container" style={{ maxWidth: '850px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <span className="badge-gold font-cinzel" style={{ marginBottom: '1rem' }}>
            PRIVACY & TERMS
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3.4rem)', fontWeight: 900, marginBottom: '1rem', color: '#fff' }}>
            سياسة الخصوصية <span className="gold-gradient-text">وشروط الاستخدام</span>
          </h1>
          <p style={{ fontSize: '1.05rem', color: '#c5c5d8', lineHeight: 1.8 }}>
            نلتزم في نشاط Enactus جامعة جنوب الوادي بحماية بيانات جميع الطلاب المتقدمين والشركاء بأعلى معايير الأمان والسرية.
          </p>
        </div>

        {/* Content Card */}
        <div
          className="glass-panel gold-border-glow responsive-panel-p"
          style={{
            borderRadius: '24px',
            padding: '3rem 2.5rem',
            background: 'linear-gradient(145deg, rgba(22, 24, 34, 0.95), rgba(12, 13, 18, 0.98))',
            display: 'flex',
            flexDirection: 'column',
            gap: '2.5rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <Lock size={22} color="#ffb800" />
              <h2 style={{ fontSize: 'clamp(1.15rem, 2.5vw, 1.4rem)', fontWeight: 800, color: '#fff', margin: 0 }}>
                1. سرية وحماية بيانات فورم التقديم (Recruitment Form)
              </h2>
            </div>
            <p style={{ color: '#c5c5d6', fontSize: '0.98rem', lineHeight: 1.8, margin: 0 }}>
              البيانات الشخصية التي يدخلها الطالب في استمارة التقديم (الاسم، الكلية، رقم الهاتف، واللجنة المرغوبة) تُعامل بسرية تامة ومطلقة. لا يتم الاطلاع عليها إلا من قِبل أعضاء ومسؤولي لجنة الموارد البشرية (HR) بغرض تنظيم المقابلات الشخصية والتواصل، ولا يتم مشاركتها أو بيعها لأي طرف ثالث تحت أي ظرف.
            </p>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <ShieldCheck size={22} color="#ffb800" />
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                2. الالتزام بلائحة جامعة جنوب الوادي
              </h2>
            </div>
            <p style={{ color: '#c5c5d6', fontSize: '0.98rem', lineHeight: 1.8, margin: 0 }}>
              يخضع نشاط إيناكوس قنا للضوابط واللوائح المعتمدة للأنشطة الطلابية بجامعة جنوب الوادي، ونلتزم بالحفاظ على البيئة الجامعية الإيجابية والتعاون مع إدارة رعاية الشباب وعمادات الكليات.
            </p>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <FileText size={22} color="#ffb800" />
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                3. الملكية الفكرية وحقوق الهوية البصرية
              </h2>
            </div>
            <p style={{ color: '#c5c5d6', fontSize: '0.98rem', lineHeight: 1.8, margin: 0 }}>
              جميع التصاميم البصرية، الشعارات، الصور ثلاثية الأبعاد (كتيبة الفراعنة، قميص معبد دندرة، البوسترات الرسمية) هي ملكية فكرية حصرية لـ Enactus Qena University ولا يجوز استخدامها لأغراض تجارية غير مصرح بها دون موافقة خطية مسبقة من مجلس الإدارة.
            </p>
          </div>

          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#888' }}>
              آخر تحديث: أكتوبر 2026 • Enactus South Valley University
            </span>
            <Link to="/" className="btn-secondary" style={{ padding: '0.6rem 1.4rem', fontSize: '0.88rem' }}>
              <span>العودة للرئيسية</span>
              <ArrowLeft size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
