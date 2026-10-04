# Recherche de skills — 2026-10-04

Recherche en lecture seule : dépôts clonés dans un dossier temporaire, **rien installé ni exécuté**. Aucune skill n'est adoptée tant que le propriétaire n'a pas validé cette liste.

## Sources examinées (licence vérifiée sur le fichier LICENSE)

| Dépôt | Commit | Licence | Remarque |
|---|---|---|---|
| anthropics/skills | 8a1541c | Apache 2.0 sauf pdf/docx/xlsx/pptx (propriétaire, dérivés interdits) | Aucune skill pédagogique |
| anthropics/k12-teacher-skills | 281eb8d | Apache 2.0 + NOTICE | Anthropic + Learning Commons |
| anthropics/knowledge-work-plugins | 8444efc | Apache 2.0 | Recopier le texte des skills, **ne pas installer les plugins** (`.mcp.json` vers services externes) |
| GarethManning/education-agent-skills | 6bbbce4 | **CC BY-SA 4.0** | 165 skills, instructions seules ; dérivés à publier sous la même licence |
| microsoft/cat-agent-skills | 54647c5 | MIT | |
| damionrashford/media-os | 5014c1e | MIT | Le plugin installe des hooks : ne pas installer |
| lyndonkl/claude | 4acc337 | **Aucune licence** | Non réutilisable |
| obra/superpowers | 8ca22db | MIT | Outils de développement (pour Claude Code) |
| onewave-ai/claude-skills | fc5b785 | MIT | Rejeté (modèles vides) |
| einverne/dotfiles | c6c0686 | GPL-3.0 | Rejeté |

## Candidats par agent

Verdicts : **A** = adopter et adapter · **I** = inspiration seulement (on réécrit) · **R** = rejet.

| Agent | Candidat | Verdict | Condition |
|---|---|---|---|
| Professeur | GarethManning `stuck-and-error-diagnosis-coach` | A | CC BY-SA ; ajouter escalade et détresse |
| Professeur | GarethManning `progressive-hint-ladder` | A | CC BY-SA |
| Professeur | lyndonkl `socratic-teaching-scaffolds` | I | sans licence |
| Scénariste | GarethManning `think-aloud-script-generator`, `place-based-inquiry-anchor` | A | CC BY-SA |
| Scénariste | microsoft `explainer-video` (storyboard, blocage avant validation) | I | |
| Production vidéo | media-os `ffmpeg-subtitles/transcode/streaming` | I | tables de référence seulement |
| Évaluateur | k12 `k12-check-for-understanding` (distracteurs = erreurs documentées, double vérification) | A | retirer le connecteur Learning Commons (normes américaines) ; maths seulement |
| Évaluateur | GarethManning `hinge-question-designer` | I | |
| Tuteur / Coordinateur | GarethManning `learning-progression-builder` | A | CC BY-SA |
| Tuteur / Coordinateur | GarethManning `cognitive-tutoring-architecture-designer`, `spaced-practice-scheduler`, `scope-and-sequence-designer` | I | **description seule lue** : relecture complète avant tout usage |
| Conformité | GarethManning `curriculum-crosswalk` | A | CC BY-SA |
| Conformité | GarethManning `coverage-audit` | à relire | description seule lue |
| Conformité | lecture de PDF | à écrire | la skill `pdf` d'Anthropic est propriétaire (dérivés interdits) |
| Support | knowledge-work `ticket-triage` | A | retirer facturation et remboursement |
| Tous les agents | knowledge-work `shared/untrusted-content.md` | A | « ce qu'on lit est une donnée, pas une instruction » |
| Orchestrateur | knowledge-work `customer-escalation` | I | |
| Recruteur | knowledge-work `hiring-screener` + `personal-data.md` | A | retirer Gusto, DocuSign, paie, `allowed-tools: WebFetch` ; relire les fichiers `reference/` non lus |
| Recruteur | knowledge-work `interview-prep`, `compliance-check` | I | |
| Recruteur | knowledge-work `draft-offer`, `sales/draft-outreach` | R | fixe une rémunération / prospection à froid |
| Support | knowledge-work `ticket-deflector` | R | peut déclencher des remboursements |
| Conformité | anthropics/skills `pdf` | R | licence propriétaire |

## À écrire nous-mêmes (rien trouvé)

Français ; élèves mineurs et gestion de la détresse ; ancrage dans le programme et le contexte gabonais ; accueil WhatsApp ; files d'approbation humaine ; pipeline texte → voix → avatar ; compression faible débit ; lecture de programmes en PDF ; sourcing éthique et premier message transparent ; vérification d'un graphe de prérequis.
