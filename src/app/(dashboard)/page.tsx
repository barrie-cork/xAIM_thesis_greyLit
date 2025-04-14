import { Dashboard } from '@/components/dashboard/Dashboard';
import { requireAuth } from '@/lib/auth/server';

export default async function DashboardPage() {
  const session = await requireAuth();
  
  return <Dashboard userId={session.user.id} />;
}
