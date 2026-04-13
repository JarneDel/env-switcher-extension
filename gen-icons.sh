#!/usr/bin/env bash
set -e

SVG="/home/jarne/WebstormProjects/env-switcher/public/vite.svg"
OUT="/home/jarne/WebstormProjects/env-switcher/public"

for size in 16 32 48 64 128 512; do
  inkscape --export-type=png \
           --export-width="$size" \
           --export-height="$size" \
           --export-filename="$OUT/icon${size}.png" \
           "$SVG"
  echo "✓ icon${size}.png"
done

# Build favicon.ico (multi-resolution: 16, 32, 48)
magick "$OUT/icon16.png" "$OUT/icon32.png" "$OUT/icon48.png" "$OUT/favicon.ico"
echo "✓ favicon.ico"

