# Prode · Mundial 2026

Web app **estática y mobile-first** que combina un **visor de fixture** con un **prode**: los 72 partidos de la fase de grupos del Mundial 2026, con el pronóstico de un modelo y su nivel de confianza, contrastados contra los resultados reales que vas cargando.

Funciona **100% offline** con los datos semilla incluidos. No tiene build step, ni frameworks, ni dependencias: es HTML + CSS + JS plano.

## Qué hace

- **Fixture completo**: 72 partidos, 12 grupos (A–L), 3 fechas. Toggle entre vista **por fecha** y **por grupo**.
- **Prode con veredicto** por partido:
  - 🎯 **Exacto**: el marcador pronosticado es idéntico al real.
  - ✅ **Ganador**: acerté el resultado (gana local / empate / gana visita) aunque no el marcador.
  - ❌ **Fallado**: el resultado fue otro.
  - ⏳ **Pendiente**: todavía no hay resultado.
  - 🔴 **En vivo**: partido en juego.
- **Tracker de aciertos** en el header: ganadores acertados, marcadores exactos y % corriente, calculado **solo sobre los partidos con resultado**.
- **Tabla por grupo** autocalculada (3 puntos por ganar, 1 por empatar). Desempate por **diferencia de gol → goles a favor → orden oficial del grupo**. Resalta los **dos primeros** (clasifican, en verde) y marca el **tercero** (candidato a mejor tercero, en ámbar punteado).
- **Carga manual de resultados**: tocás un partido, cargás el marcador real y se guarda en tu navegador. La tabla y los aciertos se recalculan **al instante**.

## Cómo cargar y actualizar resultados

1. Tocá cualquier partido (la "tira de ticket").
2. Escribí los goles del local y de la visita.
3. **Guardar**. El veredicto del partido, la tabla del grupo y el tracker se actualizan solos.

Para corregir o deshacer:

- **Borrar mi carga**: si vos cargaste ese resultado, lo borra y el partido vuelve a su dato base (resultado semilla o pendiente).
- **Restaurar dato del modelo**: si el partido ya traía un resultado semilla, repone ese valor en el formulario.
- **Reiniciar todo** (en el pie): borra de una todas tus cargas y vuelve a los datos del modelo.

Tus cargas se guardan en `localStorage` bajo la clave `prode2026:results` (un mapa `id de partido → [goles local, goles visita]`). El estado en memoria es el que manda para dibujar; el `localStorage` es solo persistencia y está envuelto en `try/catch`, así que si el navegador lo bloquea la app sigue andando igual (sin recordar entre sesiones).

## Resultados en vivo (API opcional, beta)

El botón **"Buscar resultados (beta)"** intenta autocompletar partidos **pendientes** desde [TheSportsDB](https://www.thesportsdb.com) (con la *test key* pública `123`). Es una mejora progresiva, no una dependencia:

- **Nunca** pisa un resultado semilla ni una carga tuya: solo rellena partidos sin resultado.
- Tiene timeout y **cae en silencio** a la carga manual si la red falla o la cobertura del torneo no está disponible.
- La cobertura del Mundial 2026 en la API puede no ser confiable; tomalo como experimental.

## Stack

- `index.html` · `styles.css` · `app.js` · `data.js` — sitio estático, sin build.
- **Vanilla JS**, sin frameworks ni CDNs.
- Mobile-first (pensado para ~390 px), foco de teclado visible y respeta `prefers-reduced-motion`.
- Diseño con concepto de **tablero de estadio de noche**: marcadores en numerales ámbar tipo dot-matrix y chips de veredicto de colores; el resto, sobrio.

## Sobre las predicciones

Los pronósticos salen de una **simulación Montecarlo** recalibrada con la forma real de la Fecha 1, que fue rarísima (alrededor de un 40% de empates y varios candidatos pinchando). Como regla práctica: los partidos con **confianza menor a 6 son candidatos fuertes a empate**.

## Estructura de archivos

```
prode-mundial-2026/
├── index.html      # estructura y shell de la UI
├── styles.css      # estilos (scoreboard de noche)
├── app.js          # lógica: estado, veredictos, tabla, editor, sync beta
├── data.js         # datos semilla (72 partidos, grupos, pronósticos)
├── vista-previa.html # build de un solo archivo (HTML+CSS+JS inline) para abrir/compartir directo
├── LICENSE         # MIT
└── README.md
```

> `vista-previa.html` es un bundle autocontenido de los 4 archivos de arriba: mismo código, todo inline. Sirve para abrirlo con doble clic o mandarlo por chat sin servir la carpeta. La fuente canónica es la versión modular.

## Cómo publicarlo en GitHub

Desde la carpeta del proyecto, con [`gh`](https://cli.github.com/) instalado y logueado:

```bash
git init
git add .
git commit -m "Prode Mundial 2026: fixture + predicciones del modelo"

# Confirmá que estás logueado:
gh auth status        # si no, corré: gh auth login

# Repo PÚBLICO + push en un solo paso:
gh repo create prode-mundial-2026 --public --source=. --remote=origin --push
```

Si preferís no usar `gh`, creá el repo a mano en github.com y después:

```bash
git remote add origin <URL_DEL_REPO>
git branch -M main
git push -u origin main
```

## Deploy a Cloudflare Pages (opcional)

Es un sitio estático, así que el deploy es directo.

- **Desde el dashboard de Pages**: conectá el repo de GitHub con **build command: (ninguno)** y **output directory: `/`**.
- **Por CLI**:

  ```bash
  npx wrangler pages deploy . --project-name prode-mundial-2026
  ```

## Uso

Libre. Tomalo, forkealo y cambiá lo que quieras.
