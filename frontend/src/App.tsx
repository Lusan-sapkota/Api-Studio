import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SecurityNotificationProvider } from './contexts/SecurityNotificationContext';
import { AppLayout } from './layouts/AppLayout';
import AuthGuard from './components/AuthGuard';
import ErrorBoundary from './components/ErrorBoundary';
import NetworkErrorHandler from './components/NetworkErrorHandler';
import OfflineMode from './components/OfflineMode';
import { SessionTimeoutWarning } from './components/SessionTimeoutWarning';

// Main application pages
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

// Authentication pages
import { LoginPage } from './pages/LoginPage';
import { BootstrapPage } from './pages/BootstrapPage';
import { FirstTimeSetupPage } from './pages/FirstTimeSetupPage';
import { OTPVerificationPage } from './pages/OTPVerificationPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { PasswordResetPage } from './pages/PasswordResetPage';
import { InvitationPage } from './pages/InvitationPage';
import { CollaboratorSetupPage } from './pages/CollaboratorSetupPage';
import { ProfileSettingsPage } from './pages/ProfileSettingsPage';
import AuthLoadingPage from './pages/AuthLoadingPage';
import { useAuth } from './contexts/AuthContext';

function App() {
  return (
    <ErrorBoundary>
      <NetworkErrorHandler>
        <OfflineMode>
          <BrowserRouter>
            <AuthProvider>
              <SecurityNotificationProvider>
                <AppContent />
              </SecurityNotificationProvider>
            </AuthProvider>
          </BrowserRouter>
        </OfflineMode>
      </NetworkErrorHandler>
    </ErrorBoundary>
  );
}

function AppContent() {
  const { logout } = useAuth();

  return (
    <>
      <SessionTimeoutWarning 
        onLogout={logout}
        onExtendSession={() => {
          // Session extension is handled by the component
        }}
      />
      <Routes>
            {/* Authentication routes - accessible without login */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/bootstrap" element={<BootstrapPage />} />
            <Route path="/setup" element={<FirstTimeSetupPage />} />
            <Route path="/verify-otp" element={<OTPVerificationPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<PasswordResetPage />} />
            <Route path="/invitation" element={<InvitationPage />} />
            <Route path="/collaborator-setup" element={<CollaboratorSetupPage />} />
            <Route path="/auth-loading" element={<AuthLoadingPage />} />

            {/* Protected application routes */}
            <Route 
              path="/" 
              element={
                <AuthGuard>
                  <AppLayout />
                </AuthGuard>
              }
            >
              <Route index element={<Navigate to="/api-clients" replace />} />
              
              {/* Core application pages - accessible to all authenticated users */}
              <Route path="api-clients" element={<ApiClientsPage />} />
              <Route path="request" element={<RequestPage />} />
              <Route path="websocket" element={<WebSocketPage />} />
              <Route path="graphql" element={<GraphQLPage />} />
              <Route path="grpc" element={<GrpcPage />} />
              <Route path="smtp" element={<SmtpPage />} />
              <Route path="interceptor" element={<InterceptorPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="docs" element={<DocsPage />} />
              
              {/* Editor and above - content creation/modification */}
              <Route 
                path="collections" 
                element={
                  <AuthGuard requiredRole="editor">
                    <CollectionsPage />
                  </AuthGuard>
                } 
              />
              <Route 
                path="collections/:collectionId" 
                element={
                  <AuthGuard requiredRole="editor">
                    <CollectionsPage />
                  </AuthGuard>
                } 
              />
              <Route 
                path="environments" 
                element={
                  <AuthGuard requiredRole="editor">
                    <EnvironmentsPage />
                  </AuthGuard>
                } 
              />
              <Route 
                path="notes" 
                element={
                  <AuthGuard requiredRole="editor">
                    <NotesPage />
                  </AuthGuard>
                } 
              />
              <Route 
                path="tasks" 
                element={
                  <AuthGuard requiredRole="editor">
                    <TasksPage />
                  </AuthGuard>
                } 
              />
              
              {/* User settings - accessible to all authenticated users */}
              <Route path="profile" element={<ProfileSettingsPage />} />
              
              {/* Admin only routes */}
              <Route 
                path="settings" 
                element={
                  <AuthGuard requiredRole="admin">
                    <SettingsPage />
                  </AuthGuard>
                } 
              />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </>
      );
    }

export default App;
