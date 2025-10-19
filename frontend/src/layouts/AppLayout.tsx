import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  return (
    <div className="h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto scrollbar-thin bg-neutral-50 dark:bg-background-dark">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
