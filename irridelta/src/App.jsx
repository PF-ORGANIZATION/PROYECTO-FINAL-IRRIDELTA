import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { useSessionStore } from "./store/sessionStore";

import { ProductProvider } from "./context/ProductContext";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import About from "./pages/About";
import Products from "./pages/Products";
import Branches from "./pages/Branches";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import AdminProducts from "./pages/AdminProducts";
import Capacitaciones from "./pages/Capacitaciones";
import Certificaciones from "./pages/Certificaciones";
import CertificationExam from "./pages/CertificationExam";
import AdminCapacitaciones from "./pages/AdminCapacitaciones";
import AdminCertificaciones from "./pages/AdminCertificaciones";
import AdminKB from "./pages/AdminKB";
import { getDefaultPathByRole, USER_ROLES } from "./utils/authRoles";
import Chatbot from "./pages/Chatbot";

const WHATSAPP_NUMBER = "5491162856483";

function ProtectedRoute({ element: Element, allowedRoles = [], ...rest }) {
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

  return <Element {...rest} />;
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
                    element={AdminCapacitaciones}
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
                path="/chatbot"
                element={
                  <ProtectedRoute
                    element={Chatbot}
                  />
                }
              />
              <Route
                path="*"
                element={<div className="p-8 text-center">404 - Pagina no encontrada</div>}
              />
            </Routes>
          </main>

          <Footer />
        </div>
      </Router>
    </ProductProvider>
  );
}

export default App;
