import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();

if (!url || !serviceKey || !email) {
  console.error("Define NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y BOOTSTRAP_ADMIN_EMAIL en tu entorno.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const { error } = await supabase.rpc("bootstrap_first_admin", { admin_email: email });
if (error) {
  console.error(`No se pudo preparar la primera administradora: ${error.message}`);
  process.exit(1);
}
console.log("Primera administradora configurada. El script solo funciona si aún no existe otra administradora activa.");
