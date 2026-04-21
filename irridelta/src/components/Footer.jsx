import React from "react";
import { Link } from "react-router-dom";
import { useSessionStore } from "../store/sessionStore";
import { USER_ROLES } from "../utils/authRoles";

function Footer() {
  const user = useSessionStore((state) => state.user);
  const role = useSessionStore((state) => state.role);
  const isLoading = useSessionStore((state) => state.isLoading);

  const facebookUrl =
    "https://www.facebook.com/p/Irridelta-100064054083065/?locale=es_LA";
  const instagramUrl = "https://instagram.com/irridelta";

  const footerLinks = [
    { name: "Inicio", path: "/" },
    { name: "Nosotros", path: "/nosotros" },
    { name: "Productos", path: "/productos" },
    { name: "Sucursales", path: "/sucursales" },
    { name: "Contacto", path: "/contacto" },
  ];

  if (!isLoading && !user) {
    footerLinks.push({ name: "Iniciar Sesion", path: "/login" });
  }

  if (user && role === USER_ROLES.CLIENTE) {
    footerLinks.push({ name: "Capacitaciones", path: "/capacitaciones" });
    footerLinks.push({ name: "Certificaciones", path: "/certificaciones" });
  }

  if (user && role === USER_ROLES.ADMIN) {
    footerLinks.push({ name: "Admin Productos", path: "/admin/productos" });
    footerLinks.push({
      name: "Admin Capacitaciones",
      path: "/admin/capacitaciones",
    });
    footerLinks.push({
      name: "Admin Certificaciones",
      path: "/admin/certificaciones",
    });
  }

  if (user) {
    footerLinks.push({ name: "Asistente AI", path: "/chatbot" });
  }

  return (
    <footer className="relative w-full bg-gray-800 py-8">
      <div className="mx-auto max-w-7xl px-4 text-center text-gray-400 sm:px-6 lg:px-8">
        <div className="mb-6 flex justify-center">
          <img
            src="/logo-irridelta-nav.png"
            alt="Logo Irridelta"
            className="h-20 w-auto"
          />
        </div>

        <div className="mb-6 flex flex-wrap justify-center gap-4 text-sm font-medium">
          {footerLinks.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className="transition duration-200 hover:text-white"
            >
              {item.name}
            </Link>
          ))}
        </div>

        {!isLoading && !user && (
          <div className="mb-6 flex justify-center">
            <Link
              to="/login"
              className="rounded-lg bg-green-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition duration-200 hover:bg-green-600"
            >
              Iniciar Sesion
            </Link>
          </div>
        )}

        <div className="mb-4 flex justify-center space-x-6">
          <a
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ir al Facebook de Irridelta"
            className="transition duration-200 hover:opacity-75"
          >
            <img
              src="/facebook-logo-blanco.svg"
              alt="Facebook"
              className="h-6 w-6"
            />
          </a>

          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ir al Instagram de Irridelta"
            className="transition duration-200 hover:opacity-75"
          >
            <img
              src="/instagram-logo-blanco.svg"
              alt="Instagram"
              className="h-8 w-8"
            />
          </a>
        </div>

        <p className="text-sm">
          &copy; {new Date().getFullYear()} Irridelta - Todos los derechos
          reservados
        </p>
      </div>
    </footer>
  );
}

export default Footer;
