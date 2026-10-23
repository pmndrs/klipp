import { Outlet, useParams } from 'react-router';

import { findExample } from '../registry';

import { Sidebar } from './Sidebar';
import { SourceLink } from './SourceLink';

export function Layout() {
  const { category, slug } = useParams();
  const standalone = findExample(category, slug)?.standalone === true;

  return (
    <div className="app">
      <Sidebar />
      <main className="viewer">
        <Outlet />
        {!standalone && <SourceLink />}
      </main>
    </div>
  );
}
