export const USER_ROLES = {
  ADMIN: "admin",
  CLIENTE: "cliente",
};

export function getUserRole(user) {
  const rawRole = user?.app_metadata?.role ?? null;
  const normalizedRole =
    typeof rawRole === "string" ? rawRole.toLowerCase() : null;

  if (normalizedRole === USER_ROLES.ADMIN) {
    return USER_ROLES.ADMIN;
  }

  if (user) {
    return USER_ROLES.CLIENTE;
  }

  return null;
}

export function getDefaultPathByRole(role) {
  if (role === USER_ROLES.ADMIN) {
    return "/admin/productos";
  }

  if (role === USER_ROLES.CLIENTE) {
    return "/capacitaciones";
  }

  return "/";
}
