import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Link } from 'react-router-dom';
import RootLayout from './components/RootLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AuthBootstrap from './components/AuthBootstrap';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import Signup from './components/Signup';
import OAuthCallback from './components/OAuthCallback';
import CreateRepo from './components/CreateRepo';
import Profile from './components/Profile';
import RepoExplorer from './components/RepoExplorer';
import FileViewer from './components/FileViewer';
import Notification from './components/Notification';
import Home from './components/Home';
import IssueDetail from './components/IssueDetail';
import PullRequestDetail from './components/PullRequestDetail';
import Issues from './components/Issues';
import PullRequests from './components/PullRequests';
import Marketplace from './components/Marketplace';
import Settings from './components/Settings';
import SearchResults from './components/SearchResults';

const ErrorPage = () => (
  <div className="flex flex-col items-center justify-center min-h-screen gap-4">
    <h1 className="text-4xl font-bold">Something went wrong</h1>
    <p className="text-gray-600">Try refreshing the page or sign in again.</p>
    <Link to="/" className="text-[#0969da] hover:underline">
      Back to dashboard
    </Link>
  </div>
);

const NotFoundPage = () => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
    <h1 className="text-4xl font-bold">404</h1>
    <p className="text-gray-600">Page not found</p>
    <Link to="/" className="text-[#0969da] hover:underline">
      Go to dashboard
    </Link>
  </div>
);

function App() {
  const router = createBrowserRouter([
    {
      path: '/',
      element: (
        <>
          <AuthBootstrap />
          <RootLayout />
        </>
      ),
      errorElement: <ErrorPage />,
      children: [
        { path: 'login', element: <Login /> },
        { path: 'signup', element: <Signup /> },
        { path: 'oauth/callback', element: <OAuthCallback /> },
        { path: 'forgot-password', element: <ForgotPassword /> },
        { path: 'reset-password', element: <ResetPassword /> },
        { path: 'explore', element: <Home /> },
        { path: 'search', element: <SearchResults /> },
        {
          index: true,
          element: (
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          ),
        },
        {
          path: 'new',
          element: (
            <ProtectedRoute>
              <CreateRepo />
            </ProtectedRoute>
          ),
        },
        {
          path: 'settings',
          element: (
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          ),
        },
        {
          path: 'notifications',
          element: (
            <ProtectedRoute>
              <Notification />
            </ProtectedRoute>
          ),
        },
        {
          path: 'issues',
          element: (
            <ProtectedRoute>
              <Issues />
            </ProtectedRoute>
          ),
        },
        {
          path: 'pulls',
          element: (
            <ProtectedRoute>
              <PullRequests />
            </ProtectedRoute>
          ),
        },
        { path: 'profile/:username', element: <Profile /> },
        {
          path: 'repo/:repoId/issues/:issueId',
          element: (
            <ProtectedRoute>
              <IssueDetail />
            </ProtectedRoute>
          ),
        },
        {
          path: 'repo/:repoId/pull/:prId',
          element: (
            <ProtectedRoute>
              <PullRequestDetail />
            </ProtectedRoute>
          ),
        },
        {
          path: 'repo/:repoId/blob/*',
          element: (
            <ProtectedRoute>
              <FileViewer />
            </ProtectedRoute>
          ),
        },
        {
          path: 'repo/:repoId',
          element: (
            <ProtectedRoute>
              <RepoExplorer />
            </ProtectedRoute>
          ),
        },
        { path: 'marketplace', element: <Marketplace /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ]);

  return <RouterProvider router={router} />;
}

export default App;
