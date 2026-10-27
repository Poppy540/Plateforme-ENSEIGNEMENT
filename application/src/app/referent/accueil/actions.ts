"use server";

import { redirect } from "next/navigation";
import { exigerReferent } from "@/lib/serveur/acces-referent";
import { marquerAccueilVu } from "@/lib/serveur/pilote";

export async function commencer(): Promise<void> {
  const referent = await exigerReferent();
  await marquerAccueilVu(referent);
  redirect("/referent");
}
