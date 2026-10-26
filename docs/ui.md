# Interfaz compartida

El panel de Renfe y el popup usan el mismo árbol de componentes (`src/shared/ui.js`) y la misma hoja de estilos (`src/shared/ui.css`). Las diferencias se limitan al contenedor y a la acción disponible en cada contexto.

- Cabecera: símbolo propio y nombre; reinicio y minimización como controles circulares.
- Estado: cápsula blanca con radio completo y borde iluminado. El icono Lucide se recorta al glifo blanco dentro de un disco de color con degradado, reflejo superior y sombra interior. El fondo de la cápsula conserva su gris blanco neutro.
- Último intento: reloj y tiempo compacto (`12s`, `2min`, `1h`); la explicación está en el tooltip y el nombre accesible.
- Selección: horas y número de tren en filas blancas, dentro de un contenedor hundido. Se puede quitar una selección desde ambas superficies.
- Intervalo y acción: un único contenedor blanco con el ajuste de 2 a 60 segundos a la izquierda y el botón principal a la derecha. El botón usa una proporción compacta, esquinas redondas y la paleta **Atardecer**: albaricoque, coral y ciruela, con reflejos blancos suaves.
- Acción principal: buscar o reanudar en la página; abrir Renfe desde el popup. Mientras se busca, ambas superficies muestran la misma parada con la paleta **Rubor**: degradado rosa coral claro y texto e icono granates (`#8d4156`).
- Opciones: diagnóstico y ayuda en un desplegable. La información técnica no ocupa el estado principal.

La marca vectorial original está en `icons/bot-renfe.svg`; el trazado se define en `src/shared/icons.js`. Usa cuatro elementos geométricos en una cuadrícula de 32 px, con trazo uniforme y extremos redondos. No contiene imágenes, filtros ni texturas.

Los iconos de interfaz proceden de Lucide 0.468.0, se incluyen localmente y conservan su licencia en `src/shared/lucide.LICENSE`. Inter 4.1 se incluye en `src/shared/fonts/` junto a su licencia OFL; se registra con FontFace para que también funcione dentro del Shadow DOM. No hay peticiones a servidores de fuentes.

`dev/components.html` permite revisar los estados ampliados usando los componentes y estilos reales de la extensión.
