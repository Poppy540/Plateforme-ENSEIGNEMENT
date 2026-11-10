# Gabarits (copiés à la main, jamais tels quels dans un pack)

`pnpm pack:verifier` indique quel gabarit copier, et où. Remplacer `<unité>`, `<famille>` et chaque valeur vide.

| Gabarit                                                                                                      | Copie dans le pack                   | Quand                                                      |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------ | ---------------------------------------------------------- |
| `programme.yaml`                                                                                             | `programmes/<unité>.yaml`            | une unité reçoit son programme                             |
| `agents/professeur.yaml`, `agents/scenariste.yaml`, `agents/evaluateur.yaml`, `agents/production-video.yaml` | `agents/<agent>/<unité>.yaml`        | toute unité qui a un programme (sinon l'import est refusé) |
| `agents/coordinateur.yaml`                                                                                   | `agents/coordinateur/<famille>.yaml` | chaque famille de `familles.yaml`                          |
| `agents/tuteur.yaml`, `agents/support.yaml`, `agents/conformite.yaml`, `agents/recruteur.yaml`               | `agents/<agent>/pays.yaml`           | une fois par pays                                          |

Les variables sont celles des prompts (`agents/<agent>/prompt.md`) ; les valeurs calculées à l'exécution (chapitres, durée, version du référentiel) ne s'écrivent pas. `SERIE` peut rester vide pour une unité sans série.
