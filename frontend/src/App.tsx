import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { RequestPage } from './pages/RequestPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { EnvironmentsPage } from './pages/EnvironmentsPage';
import { HistoryPage } from './pages/HistoryPage';
import { DocsPage } from './pages/DocsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/collections" replace />} />
          <Route path="request" element={<RequestPage />} />
          <Route path="collections" element={<CollectionsPage />} />
          <Route path="environments" element={<EnvironmentsPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="docs" element={<DocsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
