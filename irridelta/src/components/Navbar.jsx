import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HiMenu, HiX } from 'react-icons/hi'; 

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation(); 

  // Definiciones de estilos para consistencia
  const navBg = 'bg-gray-800'; 
  const primaryColor = 'text-green-400'; 
  const baseLinkClasses = 'px-3 py-2 rounded-md text-sm font-medium transition duration-150 ease-in-out';
  const defaultLinkClasses = 'text-gray-300 hover:bg-gray-700 hover:text-green-400'; 
  const activeLinkClasses = 'bg-gray-900 text-green-400'; 

  const navItems = [
    { name: "Inicio", path: "/" },
    { name: "Nosotros", path: "/nosotros" },
    { name: "Productos", path: "/productos" },
    { name: "Sucursales", path: "/sucursales" },
    { name: "Contacto", path: "/contacto" }
  ];

  const getLinkClasses = (path) => {
    const isActive = location.pathname === path;
    return `${baseLinkClasses} ${isActive ? activeLinkClasses : defaultLinkClasses}`;
  };

  return (
    // CLAVE: w-full para que el fondo ocupe 100%
    <nav className={`w-full ${navBg} shadow-lg sticky top-0 z-50`}>
      {/* Contenedor interno: max-w-7xl CENTRA el contenido de la barra */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo/Título */}
          <div className="flex-shrink-0">
            <Link to={"/"}>
            <img className='logo-irridelta' src="../logo-irridelta-nav.png" alt="Logo Irridelta" />
            </Link>
          </div>
          
          {/* Menú de navegación (Desktop) */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navItems.map((item) => (
                <Link key={item.name} to={item.path} className={getLinkClasses(item.path)}>
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Botón de Menú Hamburguesa (Mobile) */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span className="sr-only">Abrir menú principal</span>
              {isOpen ? ( <HiX className="block h-6 w-6" aria-hidden="true" /> ) : ( <HiMenu className="block h-6 w-6" aria-hidden="true" /> )}
            </button>
          </div>
        </div>
      </div>

      {/* Menú Móvil */}
      {isOpen && (
        <div className="md:hidden" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => (
              <Link key={item.name} to={item.path} className={`block text-base ${getLinkClasses(item.path)}`} onClick={() => setIsOpen(false)}>
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
