import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { Landing } from './layout/Landing';

import './index.css';
import './landing.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Landing />
  </StrictMode>,
);
