import { getSession } from '@/lib/auth/server';
import { LandingPage } from '@/components/landing/LandingPage';
import { Dashboard } from '@/components/dashboard/Dashboard';

export default async function Home() {
  const session = await getSession();
  
  // If not authenticated, show landing page
  if (!session) {
    return <LandingPage />;
  }
  
  // If authenticated, show dashboard
  return <Dashboard userId={session.user.id} />;
}
