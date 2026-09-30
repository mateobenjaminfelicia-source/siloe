// ================================================
//  SILOÉ — Router principal
//  Todas las rutas de la aplicación en un solo lugar.
//  Las rutas privadas redirigen al login si no hay token.
// ================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import CrystalReveal   from './components/UI/CrystalReveal'
import AppBackground  from './components/UI/AppBackground'

// Páginas
import HomePage           from './pages/Home'
import LoginPage          from './pages/Login'
import RegisterPage       from './pages/Register'
import DashboardPage      from './pages/Dashboard'
import EditorPage         from './pages/Editor'
import PresenterPage      from './pages/Presenter'
import CommunityPage      from './pages/Community'
import ProfilePage        from './pages/Profile'
import SharedPresentationPage from './pages/SharedPresentation'
import DonationsPage      from './pages/Donations'
import NotFoundPage       from './pages/NotFound'

// Guarda de rutas privadas
// Si no hay token en localStorage → redirige al login
function PrivateRoute({ children }) {
  const token = localStorage.getItem('siloe_token')
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Routes>

        {/* ── Rutas públicas ── */}
        <Route path="/"         element={<HomePage />} />
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/u/:userId" element={<ProfilePage />} />
        <Route path="/share/:token" element={<SharedPresentationPage />} />
        <Route path="/donations" element={<DonationsPage />} />

        {/* ── Rutas privadas (requieren login) ── */}
        <Route path="/dashboard" element={
          <PrivateRoute><DashboardPage /></PrivateRoute>
        }/>
        <Route path="/editor/:id" element={
          <PrivateRoute><EditorPage /></PrivateRoute>
        }/>
        <Route path="/editor/new" element={
          <PrivateRoute><EditorPage /></PrivateRoute>
        }/>
        <Route path="/present/:id" element={
          <PrivateRoute><PresenterPage /></PrivateRoute>
        }/>

        {/* ── 404 ── */}
        <Route path="/generate" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />

      </Routes>
      </div>

      {/* Fondo compartido de todos los apartados */}
      <AppBackground />

      {/* Efecto cristalino inverso al entrar a cada página */}
      <CrystalReveal />
    </BrowserRouter>
  )
}
