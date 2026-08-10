import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth.jsx'
import AppLayout from './layouts/AppLayout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Vehicles from './pages/Vehicles.jsx'
import Locations from './pages/Locations.jsx'
import Payments from './pages/Payments.jsx'
import Contracts from './pages/Contracts.jsx'
import Expenses from './pages/Expenses.jsx'
import PlaceholderPage from './pages/PlaceholderPage.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="vehicles" element={<Vehicles />} />
            <Route path="locations" element={<Locations />} />
            <Route path="contracts" element={<Contracts />} />
            <Route path="payments" element={<Payments />} />
            <Route
              path="recebimentos"
              element={<PlaceholderPage title="Recebimentos" description="Controle de pagamentos e recebimentos com fluxo financeiro claro." />}
            />
            <Route
              path="caucoes"
              element={<PlaceholderPage title="Cauções" description="Registre garantias e cauções com histórico e saldos." />}
            />
            <Route path="despesas" element={<Expenses />} />
            <Route
              path="manutencao"
              element={<PlaceholderPage title="Manutenção" description="Acompanhe revisões e alertas de quilometragem." />}
            />
            <Route
              path="historico"
              element={<PlaceholderPage title="Histórico" description="Acesse registros de operações e relatórios de desempenho." />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </HashRouter>
  )
}

export default App
