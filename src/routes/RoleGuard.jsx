import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Forbidden() {
  return (
    <div style={{ padding: '4rem', textAlign: 'center' }}>
      <h2>غير مصرّح لك بدخول هذه الصفحة</h2>
      <p>You do not have permission to view this page.</p>
    </div>
  );
}

/**
 * Route usage:  <Route element={<RoleGuard allow={['hr_admin','president']} />}> ... </Route>
 * Inline usage: <RoleGuard allow={['finance_admin']}>...</RoleGuard>
 * UI convenience only. The database (RLS) is what actually protects the data.
 */
export default function RoleGuard({ allow = [], children }) {
  const { hasRole, loading } = useAuth();
  if (loading) return null;
  if (!hasRole(allow)) return <Forbidden />;
  return children ?? <Outlet />;
}
