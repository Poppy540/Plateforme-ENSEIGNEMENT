import Link from "next/link";
import { exigerAdministrateur } from "@/lib/serveur/acces-administration";
import { invitationsReferents, optionsInvitation } from "@/lib/serveur/invitations";
import { annuler } from "./actions";
import { FormulaireInvitation } from "./formulaire-invitation";

// Invitations des enseignants-référents (ADR 0066) : création, liste sans les codes, annulation.

const formatDate = new Intl.DateTimeFormat("fr", { dateStyle: "short", timeStyle: "short" });
const ETATS: Record<string, string> = {
  en_attente: "en attente",
  utilisee: "utilisée",
  expiree: "expirée",
  annulee: "annulée",
};

export default async function PageInvitations() {
  const administrateur = await exigerAdministrateur();
  const [options, invitations] = await Promise.all([
    optionsInvitation(administrateur),
    invitationsReferents(administrateur),
  ]);
  const libelle = new Map(options.flatMap((o) => o.familles.map((f) => [f.code, f.libelle])));

  return (
    <main className="conteneur">
      <p>
        <Link href="/administration">← Administration</Link>
      </p>
      <h1>Inviter un enseignant-référent</h1>
      <p className="note">
        À faire après votre décision de recrutement. Le référent se connecte d&apos;abord sur la
        plateforme avec son numéro, puis saisit le code sur la page « Accès enseignant-référent ».
        Un code ne sert qu&apos;une fois.
      </p>
      {options.map((o) => (
        <section key={o.referentiel} aria-labelledby={`ref-${o.referentiel}`}>
          <h2 id={`ref-${o.referentiel}`}>Référentiel {o.referentiel}</h2>
          <FormulaireInvitation option={o} />
        </section>
      ))}

      <h2>Invitations ({invitations.length})</h2>
      {invitations.length === 0 && <p>Aucune invitation pour l&apos;instant.</p>}
      <ul className="liste-cartes">
        {invitations.map((i) => (
          <li key={i.id} className="carte">
            <strong>{i.familles.map((f) => libelle.get(f) ?? f).join(", ")}</strong>
            <span>
              {i.referentiel} — <strong>{ETATS[i.etat] ?? i.etat}</strong>
              {i.referent ? ` par ${i.referent}` : ""}
            </span>
            <span className="note">
              Créée le {formatDate.format(i.cree_le)}
              {i.etat === "en_attente" ? ` ; expire le ${formatDate.format(i.expire_le)}` : ""}
            </span>
            {i.etat === "en_attente" && (
              <form action={annuler}>
                <input type="hidden" name="id" value={i.id} />
                <button type="submit" className="secondaire">
                  Annuler cette invitation
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
