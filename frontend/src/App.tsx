import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { RoleSelectPage } from './pages/RoleSelectPage'
import { PatientPage } from './pages/PatientPage'
import { DoctorPage } from './pages/DoctorPage'
import { AdminPage } from './pages/AdminPage'
import './styles/medical.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/demo" element={<RoleSelectPage />} />
        <Route path="/patient" element={<PatientPage />} />
        <Route path="/doctor" element={<DoctorPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
