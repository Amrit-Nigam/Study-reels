import { Landing } from '@/pages/Landing'
import { Route, Routes } from 'react-router-dom'
import { VideoGenerator } from '@/pages/VideoGenerator'
import Maintenance from '@/pages/Maintenance'

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/create" element={<VideoGenerator />} />
      <Route path="/maintenance" element={<Maintenance />} />
      <Route path="*" element={<Landing />} />
    </Routes>
  )
}

export default AppRoutes
