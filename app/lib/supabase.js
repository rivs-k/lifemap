import { createClient } from "@supabase/supabase-js";

// Lues depuis .env.local. Le préfixe NEXT_PUBLIC_ les rend accessibles au
// navigateur — nécessaire ici puisque l'auth se fait depuis des composants client.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const cleAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !cleAnon) {
  throw new Error(
    "Clés Supabase manquantes. Renseigne NEXT_PUBLIC_SUPABASE_URL et " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local, puis redémarre `npm run dev`.",
  );
}

// Client unique et partagé pour toute l'application.
export const supabase = createClient(url, cleAnon);
