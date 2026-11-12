# 0117 — `memory.md` court, historique à part

- **Date** : 2026-11-12 · **Statut** : appliqué (Jalon 23, étape 2)

## Contexte

`memory.md` faisait 304 lignes : 45 décisions datées, des hypothèses et questions ouvertes devenues en partie fausses, 139 entrées de journal, et un paragraphe « Prochaine étape » qui répétait les mêmes attentes depuis dix jalons. Relu au début de chaque session, il coûtait du temps et risquait de faire agir sur une information périmée.

## Décision

1. **`docs/historique.md`** reçoit, tels quels, les décisions datées, les hypothèses, les questions ouvertes et le journal des jalons. Rien n'est réécrit ni retiré ; les nouvelles entrées du journal s'y ajoutent en tête.
2. **`memory.md`** devient une page de travail d'environ 100 lignes. Il **garde les cinq rubriques demandées par le prompt du propriétaire** (`docs/prompt-claude-code.md`), en version courte et à jour :
   - décisions validées, avec date : principes en vigueur et décisions D1 à D16, avec leur ADR ;
   - hypothèses à vérifier : seulement celles encore ouvertes ;
   - questions ouvertes : seulement celles encore ouvertes ;
   - état d'avancement : où en est le projet ;
   - prochaine étape.

   Il y ajoute la méthode de travail avec le propriétaire, les règles qui ne bougent pas, l'environnement et les pièges connus.

3. Ce qui attend le propriétaire n'est plus recopié : `memory.md` renvoie à `docs/attentes-proprietaire.md` (ADR 0116).

## Conséquences

- À chaque étape, la ligne du journal va dans `docs/historique.md` ; `memory.md` ne change que si l'état, une règle, un piège ou la prochaine étape change.
- Les pièges éparpillés dans le journal sont regroupés dans une seule section.
