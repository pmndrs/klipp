import { Leva } from 'leva';
import { useCallback, useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes, useParams } from 'react-router';

import { Landing } from './layout/Landing';
import { Layout } from './layout/Layout';
import { SceneRoute } from './layout/SceneRoute';
import { Welcome } from './layout/Welcome';
import { useShortcut } from './scene/useShortcut';

/** `R` leaves only a square scene and Leva on screen, for recording clips. */
function useRecordingMode(): void {
  const [recording, setRecording] = useState(false);
  useShortcut(
    'KeyR',
    useCallback(() => setRecording((on) => !on), []),
  );

  useEffect(() => {
    document.documentElement.classList.toggle('recording', recording);
  }, [recording]);
}

/** Examples used to live at `/:category/:slug`, so links to them keep working. */
function ExampleRedirect() {
  const { category, slug } = useParams();
  return <Navigate replace to={`/examples/${category}/${slug}`} />;
}

export function App() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 64rem)').matches);
  useRecordingMode();

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 64rem)');
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return (
    <HashRouter>
      <Leva
        collapsed={isMobile}
        titleBar={{ position: isMobile ? { x: 0, y: 60 } : undefined }}
        theme={{ sizes: { rootWidth: '20rem' } }}
      />
      <Routes>
        <Route index element={<Landing />} />
        <Route path="examples" element={<Layout />}>
          <Route index element={<Welcome />} />
          <Route path=":category/:slug" element={<SceneRoute />} />
        </Route>
        <Route path=":category/:slug" element={<ExampleRedirect />} />
      </Routes>
    </HashRouter>
  );
}
