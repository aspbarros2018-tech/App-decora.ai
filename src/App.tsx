import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import CourseDetails from './pages/CourseDetails';
import CheckoutStep1 from './pages/CheckoutStep1';
import CheckoutStep2 from './pages/CheckoutStep2';
import CheckoutStep3 from './pages/CheckoutStep3';
import CheckoutStep4 from './pages/CheckoutStep4';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Review from './pages/Review';
import CategoryDetails from './pages/CategoryDetails';
import Study from './pages/Study';
import ReviewList from './pages/ReviewList';
import PdfMaterials from './pages/PdfMaterials';
import PdfReader from './pages/PdfReader';
import RecoverPassword from './pages/RecoverPassword';
import AdminImport from './pages/AdminImport';
import AdminMaterials from './pages/AdminMaterials';
import Contact from './pages/Contact';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/recuperar-senha" element={<RecoverPassword />} />
        <Route path="/curso" element={<CourseDetails />} />
        <Route path="/checkout/1" element={<CheckoutStep1 />} />
        <Route path="/checkout/2" element={<CheckoutStep2 />} />
        <Route path="/checkout/3" element={<CheckoutStep3 />} />
        <Route path="/checkout/4" element={<CheckoutStep4 />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/perfil" element={<Profile />} />
        <Route path="/revisao" element={<Review />} />
        <Route path="/revisao/lista" element={<ReviewList />} />
        <Route path="/categoria-detalhes" element={<CategoryDetails />} />
        <Route path="/estudo" element={<Study />} />
        <Route path="/materiais" element={<PdfMaterials />} />
        <Route path="/pdf" element={<PdfReader />} />
        <Route path="/admin/import" element={<AdminImport />} />
        <Route path="/admin/materials" element={<AdminMaterials />} />
        <Route path="/contato" element={<Contact />} />
      </Routes>
    </Router>
  );
}
