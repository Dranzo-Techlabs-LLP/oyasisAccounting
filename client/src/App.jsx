import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import AppLayout from "./layouts/AppLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import PackagesPage from "./pages/PackagesPage";
import CustomersPage from "./pages/CustomersPage";
import CustomerDetailPage from "./pages/CustomerDetailPage";
import BookingsPage from "./pages/BookingsPage";
import BookingDetailPage from "./pages/BookingDetailPage";
import BookingsOverviewPage from "./pages/BookingsOverviewPage";
import AccountsPage from "./pages/AccountsPage";
import TicketSalesPage from "./pages/TicketSalesPage";
import SettingsPage from "./pages/SettingsPage";
import UsersPage from "./pages/UsersPage";
import CalendarPage from "./pages/CalendarPage";
import { FullPageLoader, EmptyState } from "./components/Feedback";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader label="Loading OasisGo Holidays" />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminOnly({ children }) {
  const { user } = useAuth();
  if (user?.role !== "ADMIN") {
    return <EmptyState title="Forbidden" message="Admin role required to access this page." />;
  }
  return children;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="packages" element={<PackagesPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/:customerId" element={<CustomerDetailPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="bookings/:bookingId" element={<BookingDetailPage />} />
        <Route path="overview" element={<BookingsOverviewPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="ticket-sales" element={<TicketSalesPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="settings" element={<AdminOnly><SettingsPage /></AdminOnly>} />
        <Route path="users" element={<AdminOnly><UsersPage /></AdminOnly>} />
      </Route>
    </Routes>
  );
}
