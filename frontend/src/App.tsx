import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { RequestPage } from './pages/RequestPage';
import { InterceptorPage } from './pages/InterceptorPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { EnvironmentsPage } from './pages/EnvironmentsPage';
import { HistoryPage } from './pages/HistoryPage';
import { DocsPage } from './pages/DocsPage';
import { NotesPage } from './pages/NotesPage';
import { TasksPage } from './pages/TasksPage';
import { ApiClientsPage } from './pages/ApiClientsPage';
import { WebSocketPage } from './pages/WebSocketPage';
import { GraphQLPage } from './pages/GraphQLPage';
import { GrpcPage } from './pages/GrpcPage';
import { SmtpPage } from './pages/SmtpPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/api-clients" replace />} />
          <Route path="api-clients" element={<ApiClientsPage />} />
          <Route path="request" element={<RequestPage />} />
          <Route path="websocket" element={<WebSocketPage />} />
          <Route path="graphql" element={<GraphQLPage />} />
          <Route path="grpc" element={<GrpcPage />} />
          <Route path="smtp" element={<SmtpPage />} />
          <Route path="interceptor" element={<InterceptorPage />} />
          <Route path="collections" element={<CollectionsPage />} />
          <Route path="collections/:collectionId" element={<CollectionsPage />} />
          <Route path="environments" element={<EnvironmentsPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="docs" element={<DocsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
