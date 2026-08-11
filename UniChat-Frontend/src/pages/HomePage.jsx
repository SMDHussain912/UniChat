import { AppLayout } from '../components/Layout/AppLayout';
import { Sidebar } from '../components/Layout/Sidebar';
import { MainPanel } from '../components/Layout/MainPanel';

export function HomePage({ user }) {
  return (
    <AppLayout>
      <Sidebar user={user} />
      <MainPanel user={user} />
    </AppLayout>
  );
}

export default HomePage;
