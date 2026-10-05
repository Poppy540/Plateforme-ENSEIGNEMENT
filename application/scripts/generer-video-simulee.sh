#!/usr/bin/env bash
# Régénère la vidéo de démonstration utilisée par le mode MODE_VIDEO=simulation (ADR 0026) :
# 6 secondes, 240p, fond uni, silence, quelques kilo-octets, en WebM (VP9) et MP4 (H.264).
# Aucune personne, aucune voix.
set -euo pipefail
cd "$(dirname "$0")/.."
ffmpeg -loglevel error -y -f lavfi -i "color=c=0x1d4e89:s=426x240:d=6:r=10" \
  -f lavfi -i "anullsrc=r=22050:cl=mono" -t 6 -c:v libx264 -preset veryslow -crf 38 \
  -pix_fmt yuv420p -c:a aac -b:a 16k -movflags +faststart -shortest \
  public/simulation/video-simulee-240p.mp4
ffmpeg -loglevel error -y -f lavfi -i "color=c=0x1d4e89:s=426x240:d=6:r=10" \
  -f lavfi -i "anullsrc=r=48000:cl=mono" -t 6 -c:v libvpx-vp9 -b:v 0 -crf 50 -deadline good \
  -c:a libopus -b:a 16k -shortest \
  public/simulation/video-simulee-240p.webm
