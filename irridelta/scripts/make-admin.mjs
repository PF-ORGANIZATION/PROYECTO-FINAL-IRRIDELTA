import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

for (const envFile of [".env", ".env.admin.local"]) {
  const envPath = path.join(projectRoot, envFile);

  if (existsSync(envPath)) {
    config({ path: envPath, override: true });
  }
}

const [email] = process.argv.slice(2);

if (!email || email === "--help" || email === "-h") {
  console.log(`
Uso:
  npm run make-admin -- usuario@dominio.com

Variables requeridas:
  SUPABASE_SERVICE_ROLE_KEY

Variables opcionales:
  SUPABASE_URL

Notas:
  - Si SUPABASE_URL no existe, se usa VITE_SUPABASE_URL.
  - Puedes guardar la service role key en .env.admin.local
`);
  process.exit(email ? 0 : 1);
}

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error(
    "Falta SUPABASE_URL o VITE_SUPABASE_URL en variables de entorno."
  );
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error(
    "Falta SUPABASE_SERVICE_ROLE_KEY. Guardala en .env.admin.local o exportala en la terminal."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const {
  data: { users },
  error: listError,
} = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});

if (listError) {
  console.error("No se pudieron listar los usuarios:", listError.message);
  process.exit(1);
}

const user = users.find(
  (candidate) => candidate.email?.toLowerCase() === email.toLowerCase()
);

if (!user) {
  console.error(`No se encontro el usuario con email ${email}.`);
  process.exit(1);
}

const { data, error: updateError } = await supabase.auth.admin.updateUserById(
  user.id,
  {
    app_metadata: {
      ...user.app_metadata,
      role: "admin",
    },
  }
);

if (updateError) {
  console.error("No se pudo actualizar el rol:", updateError.message);
  process.exit(1);
}

console.log(`Usuario ${data.user.email} actualizado como admin.`);
console.log("Nuevo app_metadata:", data.user.app_metadata);
