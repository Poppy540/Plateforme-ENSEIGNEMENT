#!/usr/bin/env bash
# Allège les captures de démonstration (PNG en palette de 128 couleurs, sans tramage) : texte net,
# fichiers environ trois fois plus légers. Usage : bash scripts/compresser-captures.sh ../docs/demo/jalon-2
set -euo pipefail
dossier="${1:?dossier de captures attendu}"
for image in "$dossier"/*.png; do
  ffmpeg -loglevel error -y -i "$image" \
    -vf "split[a][b];[a]palettegen=max_colors=128:stats_mode=full[p];[b][p]paletteuse=dither=none" \
    "$image.tmp.png"
  mv "$image.tmp.png" "$image"
done
