#!/usr/bin/env bash
# Genera el zip que se le pasa a alguien para instalar la extension.
#
# Deja fuera todo lo que solo sirve para desarrollar: node_modules, los tests,
# la pagina de previsualizacion y la configuracion de npm. Lo que queda es lo
# unico que chrome necesita para cargar la extension.
#
# El zip lleva dentro una carpeta con nombre, no los archivos sueltos: quien lo
# reciba lo descomprime y le queda una carpeta lista para elegir en chrome, en
# vez de veinte archivos desparramados en Descargas.
#
# Uso: ./empaquetar.sh
set -euo pipefail

cd "$(dirname "$0")"

NOMBRE="bot-renfe"
SALIDA="dist"

version=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' manifest.json | head -1 | sed 's/.*"\([^"]*\)"$/\1/')
[ -n "$version" ] || { echo "no se pudo leer la version del manifest" >&2; exit 1; }

# empaquetar algo que no pasa los tests es como minimo de mala educacion
echo "==> tests"
npm test >/dev/null 2>&1 || { echo "los tests no pasan, no se empaqueta" >&2; exit 1; }
echo "    en verde"

echo "==> preparando $NOMBRE $version"
rm -rf "$SALIDA"
destino="$SALIDA/$NOMBRE"
mkdir -p "$destino"

cp manifest.json "$destino/"
cp INSTALL.md "$destino/"
cp -R icons "$destino/"
cp -R src "$destino/"

# las capturas de .DS_Store de macos se cuelan en cualquier cp -R
find "$destino" -name ".DS_Store" -delete

echo "==> comprobando el contenido"
[ -f "$destino/manifest.json" ] || { echo "falta el manifest" >&2; exit 1; }
[ -f "$destino/src/background/service_worker.js" ] || { echo "falta el service worker" >&2; exit 1; }
[ -f "$destino/icons/icon128.png" ] || { echo "faltan los iconos" >&2; exit 1; }

for sobra in node_modules test dev package.json package-lock.json .git; do
  [ -e "$destino/$sobra" ] && { echo "se ha colado $sobra en el paquete" >&2; exit 1; }
done

# cada js que el manifest o el codigo cargan por ruta tiene que existir de verdad:
# una ruta rota aqui solo se ve al cargar la extension, que es tarde
for ruta in src/content/boot.js src/content/index.js src/content/pageScript.js src/popup/popup.html; do
  [ -f "$destino/$ruta" ] || { echo "falta $ruta" >&2; exit 1; }
done
echo "    completo"

echo "==> comprimiendo"
zip="$NOMBRE-$version.zip"
(cd "$SALIDA" && zip -qr "$zip" "$NOMBRE")

echo
echo "listo: $SALIDA/$zip ($(du -h "$SALIDA/$zip" | cut -f1))"
echo "contiene $(unzip -l "$SALIDA/$zip" | tail -1 | awk '{print $2}') archivos"
