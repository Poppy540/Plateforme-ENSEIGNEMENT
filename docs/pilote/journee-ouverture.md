# Journée d'ouverture de la classe pilote : liste du jour J

**Pour** : le propriétaire, l'enseignant de la classe, le correspondant de l'établissement et l'équipe de veille. **Statut** : préparée par Claude Code (Jalon 19, étape 3), à relire avec l'établissement. Complète la [procédure du pilote](procedure.md) (« Pendant », séance de découverte).

**Répétée automatiquement** à chaque contrôle (`tests/bout-en-bout/journee-ouverture.spec.ts`), avec des données fictives :

- la classe est créée avec une capacité de 30 ;
- l'enseignant active son accès, et le référent valide un chapitre et son quiz ;
- 30 élèves s'inscrivent, attendent l'accord de leur parent, rejoignent la classe, ouvrent le chapitre et font le quiz, 6 à la fois ;
- un 31e élève trouve la classe pleine, et l'équipe est alertée ;
- l'enseignant voit les chiffres d'ensemble, sans aucun nom.

Dernière mesure, pendant un contrôle complet en local : 30 élèves en 31 s, environ 6 s par élève hors temps de lecture. La répétition utilise un chapitre de 5e qu'aucun autre test ne cite : le niveau importe peu, ce sont les gestes qui comptent.

**Ce que la répétition apprend** : un élève ne peut rien faire tant que son parent n'a pas accepté le lien reçu par SMS. C'est le point le plus fragile de la journée : un parent injoignable, un numéro mal saisi, un SMS qui n'arrive pas. D'où la règle ci-dessous : **les inscriptions et les accords se font avant le jour J.**

## Une à deux semaines avant

- [ ] Les accords papier de participation sont rendus ; seuls ces élèves participent ([procédure](procedure.md), « Avant »).
- [ ] La classe est créée dans l'administration (« Classes du pilote ») avec la **capacité** annoncée par l'établissement. Les deux codes, celui de l'enseignant et celui de la classe, sont transmis à l'enseignant par un canal sûr.
- [ ] L'enseignant a activé son accès avec son code.
- [ ] Le référent a validé les chapitres du pilote et leurs quiz : tableau de bord du pilote, condition 4.
- [ ] La [fiche élève](fiche-eleve.md) est imprimée, une par élève, avec l'adresse du site.

## La veille (ou quelques jours avant)

- [ ] **Inscriptions à la maison ou en classe** : chaque élève crée son compte avec le numéro de **son** parent. Le parent accepte depuis le lien reçu par SMS.
- [ ] Le correspondant de l'établissement **compare** la liste des accords papier et le nombre d'élèves inscrits. L'administration voit des nombres, jamais des noms.
- [ ] Les élèves qui n'ont pas reçu de lien : vérifier le numéro saisi avec eux ; si besoin, supprimer le compte (« Mes données ») et recommencer.
- [ ] L'équipe de veille est prévenue et joignable ; ses deux téléphones reçoivent bien l'alerte d'essai (condition 9).

## Le matin

- [ ] Le site répond : `pnpm verifier:site https://<adresse>` doit afficher « Site conforme ».
- [ ] Le tableau de bord du pilote affiche « Pilote en cours » ; aucun critère « atteint » ; la file humaine est vide.
- [ ] L'accès des élèves est **ouvert** (interrupteur de l'administration).
- [ ] L'enseignant a le **code de la classe** à écrire au tableau, et la fiche élève.

## Pendant la séance (environ 1 heure)

1. **10 min** : l'enseignant présente le pilote. Les professeurs sont des IA, elles le disent ; le travail reste celui de l'élève ; on peut s'arrêter quand on veut.
2. **10 min** : chaque élève se connecte, puis saisit le **code de la classe** dans « Mon espace ».
3. **25 min** : premier chapitre, une question au professeur IA, puis le quiz. Le quiz ne se fait qu'une fois : prendre son temps.
4. **10 min** : « Mon plan de révision » ; se déconnecter si le téléphone est partagé.
5. **5 min** : questions ; où trouver de l'aide (page « Aide »).

Pendant ce temps, l'équipe de veille garde la file humaine ouverte (`/administration`).

| Si…                                      | Alors                                                                                                                                                                       |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| « Cette classe est complète »            | La capacité est atteinte. Une alerte arrive dans la file humaine. Vérifier le code et la capacité, puis la relever si l'effectif annoncé était faux (« Classes du pilote ») |
| « Code de classe inconnu »               | Code mal recopié. S'il a fuité, en créer un nouveau (« Nouveau code de classe ») : l'ancien cesse de marcher, les élèves déjà rattachés le restent                          |
| « Trop d'essais de code aujourd'hui »    | 10 codes faux pour ce compte aujourd'hui : l'élève réessaiera demain, ou rejoindra la classe plus tard                                                                      |
| « En attente de l'accord de ton parent » | Le parent n'a pas encore accepté. L'élève ne peut pas encore suivre les cours : le noter et le rattraper après la séance                                                    |
| Pas de réseau                            | Les pages déjà ouvertes se relisent ; le quiz attend le retour du réseau                                                                                                    |
| Un élève exprime une détresse            | L'agent l'oriente vers un adulte et alerte l'équipe de veille ; appliquer la [procédure de détresse](procedure-detresse.md), sans attendre                                  |

## Le soir

- [ ] L'enseignant ouvre sa vue de classe : nombre d'élèves inscrits, chapitres commencés, quiz passés. Rien n'est affiché sous 5 élèves.
- [ ] L'équipe consulte la file humaine et le tableau de bord ; elle note la journée au **journal du pilote**, sans nom ni donnée d'élève.
- [ ] Les élèves restés en attente d'accord sont signalés au correspondant de l'établissement, sans nom dans la plateforme.
