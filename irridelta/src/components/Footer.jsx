// Footer.jsx
import React from 'react';
// IMPORTANTE: Asegúrate de importar Link si estás usando react-router-dom
import { Link } from 'react-router-dom'; 

// Las importaciones de tus logos SVG
import InstagramLogo from "../../public/instagram-logo-blanco.svg";
import FacebookLogo from "../../public/facebook-logo-blanco.svg";
import SettingsLogo from "../../public/settings-logo.svg"; 


function Footer() {
    const facebookUrl = "https://www.facebook.com/p/Irridelta-100064054083065/?locale=es_LA"; 
    const instagramUrl = "https://instagram.com/irridelta";
    // ✅ Define la ruta del panel de administración
    const adminPath = "/admin/productos"; 
    
    // NOTA: Los componentes FacebookIcon e InstagramIcon se han eliminado ya que usas <img src={...} />

    return (
        // CLAVE: w-full para el fondo completo
        <footer className="w-full bg-gray-800 py-6 relative"> {/* Añadido 'relative' para posicionar el ícono de settings */}
            {/* Contenido centrado y espaciado */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-400">

                {/* Contenedor de Íconos de Redes Sociales */}
                <div className="flex justify-center space-x-6 mb-4">
                    
                    {/* Enlace de Facebook (usando tu imagen importada) */}
                    <a 
                        href={facebookUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        aria-label="Ir a Facebook de Irridelta"
                        // Aplicamos el hover para que la interacción sea clara, ya que el logo es una imagen.
                        className="text-gray-400 hover:opacity-75 transition duration-200" 
                    >
                        {/* La clase mr-2 en la imagen no es necesaria aquí, ya que el espaciado lo da 'space-x-6' */}
                        <img src={FacebookLogo} alt="Facebook" className="w-6 h-6" /> 
                    </a>

                    {/* Enlace de Instagram (usando tu imagen importada) */}
                    <a 
                        href={instagramUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        aria-label="Ir a Instagram de Irridelta"
                        className="text-gray-400 hover:opacity-75 transition duration-200"
                    >
                        <img src={InstagramLogo} alt="Instagram" className="w-8 h-8" />
                    </a>

                </div>

                {/* Texto de Copyright (actualizado el año) */}
                <p className="text-sm">
                    © {new Date().getFullYear()} Irridelta - Todos los derechos reservados
                </p>

            </div>

            <Link 
                to={adminPath} 
                className="absolute bottom-1 right-2 p-2 
                           text-gray-600 hover:text-gray-400 transition duration-200 
                           rounded-full" // Estilos discretos
                aria-label="Acceso al panel de administración"
            >
                {/* ⚙️ El logo de Settings */}
                <img src={SettingsLogo} alt="Settings" className=" w-5 h-5" />
            </Link>
        </footer>
    );
}

export default Footer;