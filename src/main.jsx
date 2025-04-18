import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import SignIn from './auth/signin.jsx'
import './App.css'
import Dashboard from './pages/Home.jsx'
import TestData from './pages/TestData.jsx'
import VoiceAssistant from './VoiceAssistant.jsx'
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/auth" element={<SignIn />} />
        <Route path="/test" element={<TestData />} />
        <Route path="/voice" element={<VoiceAssistant />} />
      </Routes>
    </Router>
  </StrictMode>
)
