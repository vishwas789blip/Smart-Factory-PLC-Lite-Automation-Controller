import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { WsProvider } from './contexts/WsContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import DevicesPage from './pages/DevicesPage'
import DeviceDetailPage from './pages/DeviceDetailPage'
import SensorsPage from './pages/SensorsPage'
import ActuatorsPage from './pages/ActuatorsPage'
import AutomationsPage from './pages/AutomationsPage'
import AutomationBuilderPage from './pages/AutomationBuilderPage'
import SchedulesPage from './pages/SchedulesPage'
import EnergyAnalyticsPage from './pages/EnergyAnalyticsPage'
import MachineAnalyticsPage from './pages/MachineAnalyticsPage'
import AIPage from './pages/AIPage'
import AlertsPage from './pages/AlertsPage'
import AuditPage from './pages/AuditPage'
import SettingsPage from './pages/SettingsPage'
import SimulatorPage from './pages/SimulatorPage'

function ProtectedRoutes() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <WsProvider>
      <Layout>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/devices/:id" element={<DeviceDetailPage />} />
          <Route path="/sensors" element={<SensorsPage />} />
          <Route path="/actuators" element={<ActuatorsPage />} />
          <Route path="/automations" element={<AutomationsPage />} />
          <Route path="/automations/builder" element={<AutomationBuilderPage />} />
          <Route path="/schedules" element={<SchedulesPage />} />
          <Route path="/analytics/energy" element={<EnergyAnalyticsPage />} />
          <Route path="/analytics/machines" element={<MachineAnalyticsPage />} />
          <Route path="/ai" element={<AIPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/simulator" element={<SimulatorPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </WsProvider>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
