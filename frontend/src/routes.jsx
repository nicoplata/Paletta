import { lazy } from 'react';
import LayoutGeneral from './layouts/LayoutGeneral';
import App from './App';

const SelectorColegiosHome = lazy(() => import('./components/SelectorColegiosHome'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));

const routes = [
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: '/',
        element: <LayoutGeneral />,
        children: [
          {
            index: true,
            element: <SelectorColegiosHome />
          }
        ]
      },
      {
        path: '/admin',
        element: <Dashboard />
      }
    ]
  }
];

export default routes;
