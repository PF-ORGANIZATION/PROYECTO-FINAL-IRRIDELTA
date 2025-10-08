import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

// Importamos el Proveedor del Contexto de Productos
import { ProductProvider } from "./context/ProductContext"; 

// Componentes y Páginas de la aplicación
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import About from "./pages/About";
import Products from "./pages/Products"; // Página pública de productos
import Branches from "./pages/Branches";
import Contact from "./pages/Contact";
import Login from './pages/Login'; 
import AdminProducts from './pages/AdminProducts'; // ABM de productos y categorías

// URL base de WhatsApp (reemplaza 'TUNUMERO' por el número real)
const WHATSAPP_NUMBER = '5491162856483'; 

// --- PROTECCIÓN DE RUTA (HOC) ---
function ProtectedRoute({ element: Element, isLoggedIn, ...rest }) {
    return isLoggedIn ? <Element {...rest} /> : <Navigate to="/login" replace />;
}

// --- COMPONENTE PRINCIPAL ---
function App() {
    // 1. SOLO mantenemos estados de INTERFAZ y AUTENTICACIÓN
    const [isLoggedIn, setIsLoggedIn] = useState(false); 
    
    // 2. ELIMINAMOS: initialProducts, initialCategories, y los estados products/categories.
    // 3. ELIMINAMOS: saveProduct, deleteProduct, saveCategory, deleteCategory.

    // Genera el enlace de WhatsApp (se puede pasar como prop a las rutas que lo necesiten)
    const whatsappLink = (productName) => 
        `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hola, estoy interesado en el producto: ${productName}. Por favor, dame más información.`)}`;


    return (
        // 4. Envolvemos toda la aplicación en el ProductProvider
        <ProductProvider> 
            <Router>
                <div className="min-h-screen flex flex-col font-inter">
                    <Navbar isLoggedIn={isLoggedIn} />

                    <main className="flex-grow">
                        <Routes>
                            <Route path="/" element={<Home />} />
                            
                            {/* 5. La página de productos ahora obtiene datos del Contexto (ya no necesita props de datos) */}
                            <Route 
                                path="/productos" 
                                element={<Products whatsappLink={whatsappLink} />} 
                            />
                            
                            <Route path="/nosotros" element={<About />} />
                            <Route path="/sucursales" element={<Branches />} />
                            <Route path="/contacto" element={<Contact />} />
                            
                            <Route path="/login" element={<Login setIsLoggedIn={setIsLoggedIn} />} />

                            {/* RUTA PROTEGIDA para la administración */}
                            <Route 
                                path="/admin/productos" 
                                element={
                                    <ProtectedRoute 
                                        element={AdminProducts} 
                                        isLoggedIn={isLoggedIn} 
                                        // 6. ELIMINAMOS todas las props de datos y CRUD. 
                                        // AdminProducts ahora usará useProducts() para obtener y modificar datos.
                                    />
                                } 
                            />
                            
                            {/* Redireccionamiento o página 404 simple */}
                            <Route path="*" element={<div className="p-8 text-center">404 - Página no encontrada</div>} />
                        </Routes>
                    </main>

                    <Footer />
                </div>
            </Router>
        </ProductProvider>
    );
}

export default App;


