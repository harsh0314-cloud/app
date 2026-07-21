import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function ProtectedAdminRoute({ children }) {
  const { user, isAuthenticated } = useAuthStore();

  // If not logged in, or if logged in but NOT an admin, kick them out
  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  // If they are an admin, show the page
  return children;
}