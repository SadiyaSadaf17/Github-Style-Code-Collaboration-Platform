import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

// Socket Context
import { SocketProvider } from './contexts/SocketContext';

// Layout
import RootLayout from './components/RootLayout';

// Pages
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Signup from './components/Signup';
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

// Error Page (Optional but recommended)
const ErrorPage = () => (
  <div className="flex flex-col items-center justify-center min-h-screen">
    <h1 className="text-4xl font-bold">404</h1>
    <p>Page not found</p>
  </div>
);

function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <RootLayout />,
      errorElement: <ErrorPage />,
      children: [
        {
          index: true, // Default page at "/"
          element: <Dashboard />
        },
        {
          path: "login",
          element: <Login />
        },
        {
          path: "signup",
          element: <Signup />
        },
        {
          path: "new", // Create repository
          element: <CreateRepo />
        },
        {
          path: "profile/:username", // Dynamic profile route
          element: <Profile />
        },
        {
          path: "repo/:repoId", // Repository explorer route
          element: <RepoExplorer />
        },
        {
          path: "repo/:repoId/blob/*", // File viewer route
          element: <FileViewer />
        },
        {
          path: "repo/:repoId/issues/:issueId", // Issue detail route
          element: <IssueDetail />
        },
        {
          path: "repo/:repoId/pull/:prId", // Pull request detail route
          element: <PullRequestDetail />
        },
        {
          path: "notifications", // Notifications route
          element: <Notification />
        },
        {
          path: "issues", // Issues list route
          element: <Issues />
        },
        {
          path: "pulls", // Pull requests list route
          element: <PullRequests />
        },
        {
          path: "marketplace", // Marketplace route
          element: <Marketplace />
        },
        {
          path: "explore", // Explore repositories route
          element: <Home />
        },
        {
          path: "settings", // Settings route
          element: <Settings />
        }
      ]
    }
  ]);

  return (
    <SocketProvider>
      <RouterProvider router={router} />
    </SocketProvider>
  );
}

export default App;