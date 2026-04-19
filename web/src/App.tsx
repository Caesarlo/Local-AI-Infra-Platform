import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { RequireAuth } from '@/components/RequireAuth'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Models from '@/pages/Models'
import Keys from '@/pages/Keys'
import Usage from '@/pages/Usage'
import Logs from '@/pages/Logs'
import Audit from '@/pages/Audit'
import CardExample from '@/pages/CardExample'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/card-example" element={<CardExample />} />

        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/models" element={<Models />} />
          <Route path="/models/config/new" element={<Models />} />
          <Route path="/models/config/:id/edit" element={<Models />} />
          <Route path="/keys" element={<Keys />} />
          <Route path="/keys/new" element={<Keys />} />
          <Route path="/keys/:id/edit" element={<Keys />} />
          <Route path="/usage" element={<Usage />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/audit" element={<Audit />} />
        </Route>
      </Routes>
      <Toaster position="bottom-right" richColors />
    </BrowserRouter>
  )
}
