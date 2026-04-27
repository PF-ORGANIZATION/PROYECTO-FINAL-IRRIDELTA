import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { HiMenu, HiX } from "react-icons/hi";
import { ChevronDown } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useSessionStore } from "../store/sessionStore";
import { USER_ROLES } from "../utils/authRoles";

function Navbar() {
  const { logOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [isMobileAdminMenuOpen, setIsMobileAdminMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const adminMenuRef = useRef(null);
  const user = useSessionStore((state) => state.user);
  const role = useSessionStore((state) => state.role);
  const isLoading = useSessionStore((state) => state.isLoading);

  const navBg = "bg-gray-800";
  const baseLinkClasses =
    "rounded-md px-3 py-2 text-sm font-medium transition duration-150 ease-in-out";
  const defaultLinkClasses = "text-gray-300 hover:bg-gray-700 hover:text-green-400";
  const activeLinkClasses = "bg-gray-900 text-green-400";
  const ctaPath = "/login";
  const ctaLabel = "Iniciar Sesion";
  const isCtaActive = location.pathname === ctaPath;

  const navItems = [
    { name: "Inicio", path: "/" },
    { name: "Nosotros", path: "/nosotros" },
    { name: "Productos", path: "/productos" },
    { name: "Sucursales", path: "/sucursales" },
    { name: "Contacto", path: "/contacto" },
  ];

  if (user && role === USER_ROLES.CLIENTE) {
    navItems.push({ name: "Capacitaciones", path: "/capacitaciones" });
    navItems.push({ name: "Certificaciones", path: "/certificaciones" });
  }

  if (user && role === USER_ROLES.ADMIN) {
    navItems.push({
      name: "Admin",
      children: [
        { name: "Productos", path: "/admin/productos" },
        { name: "Capacitaciones", path: "/admin/capacitaciones" },
        { name: "Certificaciones", path: "/admin/certificaciones" },
        { name: "Admin KB", path: "/admin/kb" },
      ],
    });
  }
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target)) {
        setIsAdminMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setIsAdminMenuOpen(false);
    setIsMobileAdminMenuOpen(false);
  }, [location.pathname]);

  const isPathActive = (targetPath) => {
    if (targetPath === "/") {
      return location.pathname === targetPath;
    }

    return (
      location.pathname === targetPath ||
      location.pathname.startsWith(`${targetPath}/`)
    );
  };

  const getLinkClasses = (path) => {
    const isActive = isPathActive(path);
    return `${baseLinkClasses} ${isActive ? activeLinkClasses : defaultLinkClasses}`;
  };

  const adminItems =
    role === USER_ROLES.ADMIN
      ? [
          { name: "Productos", path: "/admin/productos" },
          { name: "Capacitaciones", path: "/admin/capacitaciones" },
          { name: "Certificaciones", path: "/admin/certificaciones" },
          { name: "Admin KB", path: "/admin/kb" },
        ]
      : [];

  const isAdminSectionActive = adminItems.some(
    (item) => isPathActive(item.path)
  );

  const handleSignOut = async () => {
    await logOut();
    setIsOpen(false);
    setIsAdminMenuOpen(false);
    setIsMobileAdminMenuOpen(false);
    navigate("/login", { replace: true });
  };

  const ctaClasses = `rounded-lg px-5 py-2 text-sm font-semibold shadow-md transition duration-200 ${
    isCtaActive
      ? "bg-green-700 text-white"
      : "bg-green-500 text-white hover:bg-green-600"
  }`;

  const signOutClasses =
    "rounded-lg bg-red-500 px-5 py-2 text-sm font-semibold text-white shadow-md transition duration-200 hover:bg-red-600";

  return (
    <nav className={`sticky top-0 z-50 w-full ${navBg} shadow-lg`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex-shrink-0">
            <Link to="/">
              <img
                className="logo-irridelta"
                src="../logo-irridelta-nav.png"
                alt="Logo Irridelta"
              />
            </Link>
          </div>

          <div className="hidden items-center gap-4 md:flex">
            <div className="flex items-baseline space-x-4">
              {navItems.map((item) => {
                if (item.children) {
                  return (
                    <div key={item.name} className="relative" ref={adminMenuRef}>
                      <button
                        type="button"
                        onClick={() => setIsAdminMenuOpen((prev) => !prev)}
                        className={`${baseLinkClasses} inline-flex items-center gap-2 ${
                          isAdminSectionActive || isAdminMenuOpen
                            ? activeLinkClasses
                            : defaultLinkClasses
                        }`}
                        aria-expanded={isAdminMenuOpen}
                        aria-haspopup="menu"
                      >
                        {item.name}
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${
                            isAdminMenuOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {isAdminMenuOpen && (
                        <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                          {item.children.map((child) => {
                            const isActive = isPathActive(child.path);

                            return (
                              <Link
                                key={child.name}
                                to={child.path}
                                className={`block px-4 py-3 text-sm transition ${
                                  isActive
                                    ? "border-l-2 border-green-500 bg-green-50 font-semibold text-green-700"
                                    : "text-gray-700 hover:bg-gray-50 hover:text-green-600"
                                }`}
                              >
                                {child.name}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link key={item.name} to={item.path} className={getLinkClasses(item.path)}>
                    {item.name}
                  </Link>
                );
              })}
            </div>

            {!isLoading && !user && (
              <Link to={ctaPath} className={ctaClasses}>
                {ctaLabel}
              </Link>
            )}

            {!isLoading && user && (
              <button onClick={handleSignOut} className={signOutClasses}>
                Cerrar sesion
              </button>
            )}
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
              aria-controls="mobile-menu"
              aria-expanded={isOpen}
            >
              <span className="sr-only">Abrir menu principal</span>
              {isOpen ? (
                <HiX className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <HiMenu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden" id="mobile-menu">
          <div className="space-y-1 px-2 pb-4 pt-2 sm:px-3">
            {navItems.map((item) => {
              if (item.children) {
                return (
                  <div
                    key={item.name}
                    className="overflow-hidden rounded-xl border border-gray-700 bg-gray-900/50"
                  >
                    <button
                      type="button"
                      onClick={() => setIsMobileAdminMenuOpen((prev) => !prev)}
                      className={`flex w-full items-center justify-between px-4 py-3 text-left text-base font-medium transition ${
                        isAdminSectionActive
                          ? "bg-gray-900 text-green-400"
                          : "text-gray-300 hover:bg-gray-700 hover:text-green-400"
                      }`}
                      aria-expanded={isMobileAdminMenuOpen}
                    >
                      {item.name}
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${
                          isMobileAdminMenuOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isMobileAdminMenuOpen && (
                      <div className="border-t border-gray-700 bg-white">
                        {item.children.map((child) => {
                          const isActive = isPathActive(child.path);

                          return (
                            <Link
                              key={child.name}
                              to={child.path}
                              className={`block px-4 py-3 text-sm transition ${
                                isActive
                                  ? "border-l-2 border-green-500 bg-green-50 font-semibold text-green-700"
                                  : "text-gray-700 hover:bg-gray-50 hover:text-green-600"
                              }`}
                              onClick={() => setIsOpen(false)}
                            >
                              {child.name}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`block text-base ${getLinkClasses(item.path)}`}
                  onClick={() => setIsOpen(false)}
                >
                  {item.name}
                </Link>
              );
            })}

            {!isLoading && !user && (
              <Link
                to={ctaPath}
                className="mt-3 block rounded-lg bg-green-500 px-4 py-3 text-center text-sm font-semibold text-white shadow-md transition duration-200 hover:bg-green-600"
                onClick={() => setIsOpen(false)}
              >
                {ctaLabel}
              </Link>
            )}

            {!isLoading && user && (
              <button
                onClick={handleSignOut}
                className="mt-3 block w-full rounded-lg bg-red-500 px-4 py-3 text-center text-sm font-semibold text-white shadow-md transition duration-200 hover:bg-red-600"
              >
                Cerrar sesion
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
