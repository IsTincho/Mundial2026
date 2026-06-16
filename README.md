# Prode · Mundial 2026

Web app **mobile-first** que combina un **visor de fixture** con un **prode**: los 72 partidos de la fase de grupos del Mundial 2026, con el pronóstico de un modelo y su nivel de confianza, contrastados contra los resultados reales que vas cargando.

Construida con **React + Vite + TypeScript**. Funciona **100% del lado del cliente** con datos semilla incluidos; no necesita backend ni base de datos. Las cargas se guardan en tu navegador (`localStorage`).

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

- **React 19 + Vite 6 + TypeScript** (build estático, sin servidor).
- Sin dependencias de UI: estilos en CSS plano (`src/styles.css`).
- Mobile-first (pensado para ~390 px), foco de teclado visible y respeta `prefers-reduced-motion`.
- Diseño con concepto de **tablero de estadio de noche**: marcadores en numerales ámbar tipo dot-matrix y chips de veredicto de colores; el resto, sobrio.

## Desarrollo

Requiere Node 18+.

```bash
npm install
npm run dev       # servidor de desarrollo (http://localhost:5173)
npm run build     # type-check + build de producción a dist/
npm run preview   # sirve el build de producción localmente
```

## Estructura

```
prode-mundial-2026/
├── index.html              # entry de Vite (monta #root)
├── vite.config.ts          # config de build (base "/", plugin React)
├── tsconfig.json
├── wrangler.toml           # config de Cloudflare Pages
├── public/
│   └── vista-previa.html   # versión vanilla de un solo archivo (legacy, autocontenida)
└── src/
    ├── main.tsx            # bootstrap de React
    ├── App.tsx             # composición: estado de vista, editor, sync, secciones
    ├── data.ts             # datos semilla (72 partidos, grupos, pronósticos)
    ├── types.ts            # tipos compartidos
    ├── styles.css          # estilos (scoreboard de noche)
    ├── hooks/
    │   └── useResults.ts   # estado de cargas + persistencia en localStorage
    ├── lib/
    │   ├── logic.ts        # lógica pura: veredicto, tabla, tracker, formato
    │   └── sync.ts         # sync beta con TheSportsDB
    └── components/
        ├── Header.tsx · ViewToggle.tsx · Ticket.tsx · Standings.tsx
        ├── Editor.tsx      # carga manual con <dialog> nativo
        ├── Score.tsx       # marcador + chip de veredicto
        └── Toast.tsx
```

> `public/vista-previa.html` es la versión vanilla previa (HTML+CSS+JS inline, un solo archivo). Queda como bonus: se abre con doble clic, sin build. La fuente canónica es la app de React.

## Deploy a Cloudflare Pages

Es un build estático: build command `npm run build`, output `dist`.

**Opción A — conectar el repo (recomendado).** En el dashboard de Cloudflare → **Workers & Pages → Create → Pages → Connect to Git**, elegí este repo y configurá:

- **Framework preset:** Vite
- **Build command:** `npm run build`
- **Build output directory:** `dist`

Cada push a `main` redeploya solo.

**Opción B — por CLI (Wrangler).**

```bash
npm run build
npx wrangler pages deploy dist --project-name=mundial2026
```

Requiere estar logueado (`npx wrangler login`) o exportar `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`.

## Deploy a GitHub Pages

Incluido un workflow en `.github/workflows/deploy.yml` que, en cada push a `main`, hace `npm run build` y publica `dist/` en GitHub Pages. Activalo en **Settings → Pages → Source: GitHub Actions**.

## Uso

Libre. Tomalo, forkealo y cambiá lo que quieras. Licencia MIT.
