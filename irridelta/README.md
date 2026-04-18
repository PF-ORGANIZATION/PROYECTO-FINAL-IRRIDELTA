# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


# IRRIDELTA

Repositorio de la aplicación web IRRIDELTA: una SPA desarrollada con React y Vite para mostrar productos, gestionar un panel de administración y conectarse a una base de datos Supabase.

## 📌 Descripción

Esta aplicación ofrece:

- Una web pública con páginas de Inicio, Productos, Nosotros, Sucursales y Contacto.
- Integración con Supabase para cargar productos y categorías.
- Un panel de administración protegido por login para crear, editar y eliminar productos y categorías.
- Enlace de contacto por WhatsApp desde la página de productos.

## 🧩 Tecnologías principales

- React 18
- Vite
- Tailwind CSS
- React Router DOM
- Supabase JS
- ESLint
- Formspree (para el formulario de contacto)

## 🚀 Estructura del proyecto

- `src/App.jsx` - Ruteo principal y protecciones de ruta.
- `src/supabaseClient.js` - Cliente de Supabase.
- `src/context/ProductContext.jsx` - Contexto para productos y categorías.
- `src/pages/` - Páginas públicas y panel admin.
- `src/components/` - Componentes de interfaz como Navbar, Footer y ProductCard.
- `src/admin/` - Formularios y listas de administración.

## ⚙️ Requisitos

- Node.js 18 o superior
- npm
- Cuenta de Supabase con una base de datos configurada

## 🧪 Variables de entorno

Crea un archivo `.env` en `irridelta/` con estas variables:

```env
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_KEY=tu_supabase_anon_key
VITE_LOGIN_USERNAME=admin
VITE_LOGIN_PASSWORD=1234
```

> Si usas otro método de autenticación o deseas un login más robusto, puedes mejorar la página `src/pages/Login.jsx`.

## 🛠️ Instalación y ejecución

Desde la carpeta `irridelta/`:

```bash
npm install
npm run dev
```

Luego abre la dirección que indique Vite (por ejemplo `http://localhost:5173`).

## 📦 Scripts disponibles

- `npm run dev` - Inicia el servidor de desarrollo.
- `npm run build` - Genera el build de producción.
- `npm run preview` - Previsualiza el build de producción.
- `npm run lint` - Ejecuta ESLint sobre el proyecto.
- `npm run make-admin -- usuario@dominio.com` - Asigna el rol `admin` a un usuario existente en Supabase.

## Roles de usuario

- Los usuarios autenticados son tratados como `cliente` por defecto.
- Un usuario solo pasa a ser `admin` si tiene `app_metadata.role = "admin"` en Supabase Auth.
- Para promover un usuario, crea un archivo `.env.admin.local` con:

```env
SUPABASE_URL=tu_supabase_url
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

- También puedes usar `.env.admin.example` como guía.
- Luego ejecuta:

```bash
npm run make-admin -- usuario@dominio.com
```

## 📝 Base de datos esperada en Supabase

Tablas sugeridas:

- `categorias`
  - `id`
  - `nombre`

- `productos`
  - `id`
  - `nombre`
  - `descripcion`
  - `imagen_url`
  - `id_categoria`

La app usa join para mostrar la categoría asociada a cada producto.

## 🔐 Panel de administración

- Ruta de login: `/login`
- Ruta admin protegida: `/admin/productos`
- El login actual compara usuario y contraseña con las variables de entorno.

## 📌 Notas adicionales

- El número de WhatsApp se define en `src/App.jsx` en la constante `WHATSAPP_NUMBER`.
- El panel admin incluye CRUD para productos y categorías mediante `ProductContext`.
- Si quieres agregar autenticación real, adapta `Login.jsx` y `App.jsx` para usar la autenticación de Supabase.

## 🤝 Cómo contribuir

1. Haz un fork del repositorio.
2. Crea una branch para tu cambio.
3. Envía un pull request con una descripción clara.
