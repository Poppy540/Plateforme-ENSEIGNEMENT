# Valeurs des agents pour ce pays

Chaque fichier remplit les `{{VARIABLES}}` du prompt de l'agent (`agents/<agent>/prompt.md`). Une variable absente ou vide bloque l'agent (erreur de configuration). Exemples : `referentiels/gabon/agents/` (pilote) et `referentiels/zz-fictif/agents/` (pays fictif de test).

| Fichier | Variables |
|---|---|
| `professeur/<unite>.yaml` | MATIERE, NIVEAU, SERIE, PAYS, EXAMEN, PREREQUIS, PROFIL_NIVEAU, METHODE_MATIERE, CONTEXTE_LOCAL, NOM_AVATAR, PERSONA, REFERENT, DATE, VERSION |
| `scenariste/<unite>.yaml` | MATIERE, NIVEAU, SERIE, PAYS, PROFIL_NIVEAU, CONTEXTE_LOCAL, PERSONA, REFERENT, DATE, VERSION |
| `evaluateur/<unite>.yaml` | MATIERE, NIVEAU, SERIE, PAYS, EXAMEN, PROFIL_NIVEAU, REFERENT, DATE, VERSION |
| `production-video/<unite>.yaml` | `fiche_avatar` (avatar synthétique, aucune personne réelle sans autorisation) |
| `tuteur/pays.yaml`, `support/pays.yaml`, `conformite/pays.yaml` | PAYS, REFERENT, DATE, VERSION |
| `coordinateur/<famille>.yaml` | FAMILLE, MATIERES_FAMILLE, PAYS, REFERENTIEL, REFERENT, DATE, VERSION ; `skill_famille` facultatif |
| `recruteur/pays.yaml` | PROJET, PAYS, RESPONSABLE, MATIERES_CIBLES, PROFIL_RECHERCHE, DATE, VERSION (le reste vient de `recrutement.yaml`) |

Les valeurs calculées à l'exécution (liste des chapitres validés, chapitre en cours, durée, version du référentiel) ne s'écrivent pas ici.
