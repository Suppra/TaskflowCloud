import { createBrowserRouter } from 'react-router-dom';
import AuthLayout from '@/layouts/AuthLayout';
import MainLayout from '@/layouts/MainLayout';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import ProjectsPage from '@/pages/ProjectsPage';
import ProjectDetailPage from '@/pages/ProjectDetailPage';
import BoardPage from '@/pages/BoardPage';
import NotificationsPage from '@/pages/NotificationsPage';
import ReportsPage from '@/pages/ReportsPage';
import SettingsPage from '@/pages/SettingsPage';

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/login',    element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <MainLayout />,
    children: [
      { index: true,    path: '/',                                            element: <DashboardPage /> },
      { path: '/dashboard',                                                   element: <DashboardPage /> },
      { path: '/projects',                                                    element: <ProjectsPage /> },
      { path: '/projects/:projectId',                                         element: <ProjectDetailPage /> },
      { path: '/projects/:projectId/boards/:boardId',                         element: <BoardPage /> },
      { path: '/notifications',                                               element: <NotificationsPage /> },
      { path: '/reports',                                                     element: <ReportsPage /> },
      { path: '/settings',                                                    element: <SettingsPage /> },
    ],
  },
  {
    path: '*',
    element: (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-blue-500 mb-4">404</h1>
          <p className="text-slate-400">Página no encontrada</p>
        </div>
      </div>
    ),
  },
]);
