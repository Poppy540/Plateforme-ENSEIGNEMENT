import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { FournisseurAuthentification } from "./fournisseur";
import { cleServiceSupabase, configurationSupabase } from "../configuration";

// Production : Supabase Auth envoie le code (SMS via le fournisseur configuré dans Supabase, ou email)
// et le vérifie. Les limites d'essais et d'envois sont appliquées par Supabase.
function client() {
  const { url, clePublique } = configurationSupabase();
  return createClient(url, clePublique, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const fournisseurSupabase: FournisseurAuthentification = {
  async envoyerCode(identifiant) {
    const { error } =
      identifiant.type === "telephone"
        ? await client().auth.signInWithOtp({ phone: identifiant.valeur })
        : await client().auth.signInWithOtp({ email: identifiant.valeur });
    if (error) throw new Error(`Envoi du code impossible (${error.status ?? "?"}).`);
  },
  async verifierCode(identifiant, code) {
    const { data, error } =
      identifiant.type === "telephone"
        ? await client().auth.verifyOtp({ phone: identifiant.valeur, token: code, type: "sms" })
        : await client().auth.verifyOtp({ email: identifiant.valeur, token: code, type: "email" });
    if (error || !data.user) return null;
    return data.user.id;
  },
  async supprimerCompte(utilisateur) {
    const { url } = configurationSupabase();
    const admin = createClient(url, cleServiceSupabase(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await admin.auth.admin.deleteUser(utilisateur);
    if (error) throw new Error(`Suppression du compte impossible (${error.status ?? "?"}).`);
  },
};
