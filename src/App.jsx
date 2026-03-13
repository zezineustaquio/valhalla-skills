import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SkillTree from './components/SkillTree';
import Admin from './components/Admin';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SkillTree />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}
