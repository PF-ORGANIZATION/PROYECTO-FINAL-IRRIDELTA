import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { useSessionStore } from "./store/sessionStore";

import { ProductProvider } from "./features/products/ProductContext";

import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import Home from "./features/public/pages/Home";
import About from "./features/public/pages/About";
import Products from "./features/products/pages/Products";
import Branches from "./features/public/pages/Branches";
import Contact from "./features/public/pages/Contact";
import Login from "./features/auth/pages/Login";
import Register from "./features/auth/pages/Register";
import ForgotPassword from "./features/auth/pages/ForgotPassword";
import ResetPassword from "./features/auth/pages/ResetPassword";
import AdminProducts from "./features/products/pages/AdminProducts";
import Capacitaciones from "./features/learning/pages/Capacitaciones";
import CapacitacionDetalle from "./features/learning/pages/CapacitacionDetalle";
import CapacitacionModulo from "./features/learning/pages/CapacitacionModulo";
import CapacitacionModuloExam from "./features/learning/pages/CapacitacionModuloExam";
import Certificaciones from "./features/certifications/pages/Certificaciones";
import CertificationExam from "./features/certifications/pages/CertificationExam";
import AdminCapacitacionesList from "./features/learning/pages/AdminCapacitacionesList";
import AdminCapacitacionEditor from "./features/learning/pages/AdminCapacitacionEditor";
import AdminCertificaciones from "./features/certifications/pages/AdminCertificaciones";
import AdminKB from "./features/kb/pages/AdminKB";
import { getDefaultPathByRole, USER_ROLES } from "./features/auth/authRoles";
import Chatbot from "./features/chatbot/pages/Chatbot";

const WHATSAPP_NUMBER = "5491162856483";

function ProtectedRoute({ element: Component, allowedRoles = [], ...rest }) {
  const user = useSessionStore((state) => state.user);
  const role = useSessionStore((state) => state.role);
  const isLoading = useSessionStore((state) => state.isLoading);

  if (isLoading) {
    return <div className="p-8 text-center">Cargando sesion...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to={getDefaultPathByRole(role)} replace />;
  }

  return React.createElement(Component, rest);
}

function App() {
  const setSession = useSessionStore((state) => state.setSession);
  const clearSession = useSessionStore((state) => state.clearSession);

  useEffect(() => {
    let isMounted = true;

    const syncSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("No se pudo obtener la sesion actual", error);
        if (isMounted) {
          clearSession();
        }
        return;
      }

      if (isMounted) {
        if (session) {
          setSession(session);
        } else {
          clearSession();
        }
      }
    };

    syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        if (session) {
          setSession(session);
        } else {
          clearSession();
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [clearSession, setSession]);

  const whatsappLink = (productName) =>
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      `Hola, estoy interesado en el producto: ${productName}. Por favor, dame mas informacion.`
    )}`;

  return (
    <ProductProvider>
      <Router>
        <div className="flex min-h-screen flex-col font-inter">
          <Navbar />

          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route
                path="/productos"
                element={<Products whatsappLink={whatsappLink} />}
              />
              <Route path="/nosotros" element={<About />} />
              <Route path="/sucursales" element={<Branches />} />
              <Route path="/contacto" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/registro" element={<Register />} />
              <Route path="/olvide-contrasena" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/capacitaciones"
                element={
                  <ProtectedRoute
                    element={Capacitaciones}
                    allowedRoles={[USER_ROLES.CLIENTE]}
                  />
                }
              />
              <Route
                path="/capacitaciones/:capacitacionId"
                element={
                  <ProtectedRoute
                    element={CapacitacionDetalle}
                    allowedRoles={[USER_ROLES.CLIENTE]}
                  />
                }
              />
              <Route
                path="/capacitaciones/:capacitacionId/modulos/:moduloIndex"
                element={
                  <ProtectedRoute
                    element={CapacitacionModulo}
                    allowedRoles={[USER_ROLES.CLIENTE]}
                  />
                }
              />
              <Route
                path="/capacitaciones/:capacitacionId/modulos/:moduloIndex/examen"
                element={
                  <ProtectedRoute
                    element={CapacitacionModuloExam}
                    allowedRoles={[USER_ROLES.CLIENTE]}
                  />
                }
              />
              <Route
                path="/certificaciones"
                element={
                  <ProtectedRoute
                    element={Certificaciones}
                    allowedRoles={[USER_ROLES.CLIENTE]}
                  />
                }
              />
              <Route
                path="/certificaciones/:certificationId"
                element={
                  <ProtectedRoute
                    element={CertificationExam}
                    allowedRoles={[USER_ROLES.CLIENTE]}
                  />
                }
              />
              <Route
                path="/admin/productos"
                element={
                  <ProtectedRoute
                    element={AdminProducts}
                    allowedRoles={[USER_ROLES.ADMIN]}
                  />
                }
              />
              <Route
                path="/admin/capacitaciones"
                element={
                  <ProtectedRoute
                    element={AdminCapacitacionesList}
                    allowedRoles={[USER_ROLES.ADMIN]}
                  />
                }
              />
              <Route
                path="/admin/capacitaciones/nueva"
                element={
                  <ProtectedRoute
                    element={AdminCapacitacionEditor}
                    allowedRoles={[USER_ROLES.ADMIN]}
                  />
                }
              />
              <Route
                path="/admin/capacitaciones/:capacitacionId/editar"
                element={
                  <ProtectedRoute
                    element={AdminCapacitacionEditor}
                    allowedRoles={[USER_ROLES.ADMIN]}
                  />
                }
              />
              <Route
                path="/admin/certificaciones"
                element={
                  <ProtectedRoute
                    element={AdminCertificaciones}
                    allowedRoles={[USER_ROLES.ADMIN]}
                  />
                }
              />
              <Route
                path="/admin/kb"
                element={
                  <ProtectedRoute
                    element={AdminKB}
                    allowedRoles={[USER_ROLES.ADMIN]}
                  />
                }
              />
              <Route
                path="*"
                element={<div className="p-8 text-center">404 - Pagina no encontrada</div>}
              />
            </Routes>
          </main>

          <Chatbot />
          <Footer />
        </div>
      </Router>
    </ProductProvider>
  );
}

export default App;
