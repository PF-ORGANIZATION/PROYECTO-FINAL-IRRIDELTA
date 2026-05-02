import { USER_ROLES } from "../features/auth/authRoles";

export function getNavItems(user, role) {
  const items = [
    { name: "Inicio", path: "/" },
    { name: "Nosotros", path: "/nosotros" },
    { name: "Productos", path: "/productos" },
    { name: "Sucursales", path: "/sucursales" },
    { name: "Contacto", path: "/contacto" },
  ];

  if (user && role === USER_ROLES.CLIENTE) {
    items.push({ name: "Capacitaciones", path: "/capacitaciones" });
    items.push({ name: "Certificaciones", path: "/certificaciones" });
  }

  if (user && role === USER_ROLES.ADMIN) {
    items.push({
      name: "Admin",
      children: [
        { name: "Productos", path: "/admin/productos" },
        { name: "Capacitaciones", path: "/admin/capacitaciones" },
        { name: "Certificaciones", path: "/admin/certificaciones" },
        { name: "Admin KB", path: "/admin/kb" },
      ],
    });
  }

  return items;
}

export function getFooterLinks(user, role) {
  const items = [
    { name: "Inicio", path: "/" },
    { name: "Nosotros", path: "/nosotros" },
    { name: "Productos", path: "/productos" },
    { name: "Sucursales", path: "/sucursales" },
    { name: "Contacto", path: "/contacto" },
  ];

  if (!user) {
    items.push({ name: "Iniciar Sesion", path: "/login" });
  }

  if (user && role === USER_ROLES.CLIENTE) {
    items.push({ name: "Capacitaciones", path: "/capacitaciones" });
    items.push({ name: "Certificaciones", path: "/certificaciones" });
  }

  if (user && role === USER_ROLES.ADMIN) {
    items.push({ name: "Admin Productos", path: "/admin/productos" });
    items.push({ name: "Admin Capacitaciones", path: "/admin/capacitaciones" });
    items.push({ name: "Admin Certificaciones", path: "/admin/certificaciones" });
    items.push({ name: "Admin KB", path: "/admin/kb" });
  }

  if (user) {
    items.push({ name: "Asistente AI", path: "/chatbot" });
  }

  return items;
}
