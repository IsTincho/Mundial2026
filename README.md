# Prode · Mundial 2026

Web app **mobile-first** que combina un **visor de fixture** con un **prode**: los 72 partidos de la fase de grupos del Mundial 2026, con el pronóstico de un modelo y su nivel de confianza, contrastados contra los resultados reales que vas cargando.

Construida con **React + Vite + TypeScript**. Funciona **100% del lado del cliente** con datos semilla incluidos; no necesita backend ni base de datos. Las cargas se guardan en tu navegador (`localStorage`).

## Qué hace

- **Fixture completo**: 72 partidos, 12 grupos (A–L), 3 fechas. Tres vistas: **por fecha**, **por grupo** y **fase final** (bracket).
- **Paginación**: navegás fecha por fecha (o grupo por grupo) con un pager, en vez de un scroll infinito.
- **Dos densidades**: vista de **tarjetas** (broadcast, con confianza y veredicto) o **lista densa** para escanear rápido.
- **Filtros y categorías**: chips por **estado** (en vivo / pendientes / exactos / ganados / fallados, con contador), por **confianza** (candidatos a empate, conf < 6), por **confederación** (UEFA, CONMEBOL, …) y **búsqueda** por equipo o grupo.
- **Prode con veredicto** por partido:
  - 🎯 **Exacto**: el marcador pronosticado es idéntico al real.
  - ✅ **Ganador**: acerté el resultado (gana local / empate / gana visita) aunque no el marcador.
  - ❌ **Fallado**: el resultado fue otro.
  - ⏳ **Pendiente**: todavía no hay resultado.
  - 🔴 **En vivo**: partido en juego.
- **Tracker de aciertos** en el header: ganadores acertados, marcadores exactos y % corriente, calculado **solo sobre los partidos con resultado**.
- **Tabla por grupo** autocalculada (3 puntos por ganar, 1 por empatar). Desempate por **diferencia de gol → goles a favor → orden oficial del grupo**. Resalta los **dos primeros** (clasifican, en verde) y marca el **tercero** (candidato a mejor tercero, en ámbar punteado).
- **Fase final proyectada**: bracket de 32 que se arma **desde la tabla en vivo** (1º y 2º de cada grupo + los 8 mejores terceros, sembrados por campaña). En cada cruce avanza el de mejor siembra. Es una **proyección** que se recalcula al cargar resultados — no son predicciones de marcador del knockout.
- **Carga manual de resultados**: tocás un partido, cargás el marcador real y se guarda en tu navegador. Tabla, bracket y aciertos se recalculan **al instante**.

## Diseño

Dirección **broadcast editorial**: fondo *ink black*, acento **cian eléctrico**, tipografía display condensada (**Anton**) + grotesk (**Hanken Grotesk**) + mono tabular (**JetBrains Mono**) para los números. Fuentes self-hosted vía `@fontsource` (sin CDN, funciona offline). Mobile-first, foco visible, respeta `prefers-reduced-motion`.

## Cómo cargar y actualizar resultados

1. Tocá cualquier partido (la "tira de ticket").
2. Escribí los goles del local y de la visita.
3. **Guardar**. El veredicto del partido, la tabla del grupo y el tracker se actualizan solos.

Para corregir o deshacer:

- **Borrar mi carga**: si vos cargaste ese resultado, lo borra y el partido vuelve a su dato base (resultado semilla o pendiente).
- **Restaurar dato del modelo**: si el partido ya traía un resultado semilla, repone ese valor en el formulario.
- **Reiniciar todo** (en el pie): borra de una todas tus cargas y vuelve a los datos del modelo.

Tus cargas se guardan en `localStorage` bajo la clave `prode2026:results` (un mapa `id de partido → [goles local, goles visita]`). El estado en memoria es el que manda para dibujar; el `localStorage` es solo persistencia y está envuelto en `try/catch`, así que si el navegador lo bloquea la app sigue andando igual (sin recordar entre sesiones).

## Resultados en vivo (TheSportsDB, sin backend)

La app **se conecta sola** a [TheSportsDB](https://www.thesportsdb.com) (con la *test key* pública `123`, sin backend ni claves propias) y refresca cada ~45 s:

- **En vivo real**: lee `strStatus` de los partidos del día. El chip "En vivo" aparece **solo si la API dice que el partido está en juego**, con su marcador en curso. (Ya no hay un flag "en vivo" hardcodeado.)
- **Finales automáticos**: cuando un partido termina, su marcador final rellena el partido **si estaba pendiente** — así la transición en-vivo → final no se pierde.
- **Nunca pisa** un resultado semilla ni una carga tuya, y **no persiste** en `localStorage`: es una capa de solo-lectura por encima de tus datos.
- Tiene timeout y **cae en silencio** si la red falla o el torneo no tiene cobertura (queda Pendiente).
- El botón **"Buscar resultados (beta)"** sigue disponible para forzar un autocompletado puntual de pendientes.

> La cobertura del Mundial 2026 en la API puede variar; la app degrada con elegancia si no hay datos.

## Stack

- **React 19 + Vite 7 + TypeScript** (build estático, sin servidor).
- Sin dependencias de UI: estilos en CSS plano (`src/styles.css`). Fuentes self-hosted (`@fontsource`).
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
    ├── main.tsx            # bootstrap de React + carga de fuentes
    ├── App.tsx             # composición: vistas, filtros, paginación, sync
    ├── data.ts             # datos semilla: 72 partidos, grupos, confederaciones, ranking
    ├── types.ts            # tipos compartidos
    ├── styles.css          # estilos (broadcast editorial)
    ├── hooks/
    │   └── useResults.ts   # estado de cargas + persistencia en localStorage
    ├── lib/
    │   ├── logic.ts        # lógica pura: veredicto, tabla, tracker, formato
    │   ├── filters.ts      # filtros y categorías (estado, confianza, zona, búsqueda)
    │   ├── bracket.ts      # clasificados + bracket proyectado desde la tabla
    │   └── sync.ts         # sync beta con TheSportsDB
    └── components/
        ├── Header.tsx · TopBar.tsx · FilterBar.tsx · Pager.tsx
        ├── MatchCard.tsx · MatchRow.tsx · Standings.tsx · Bracket.tsx
        ├── Editor.tsx      # carga manual con <dialog> nativo
        ├── Score.tsx       # chip de veredicto
        └── Toast.tsx
```

> `public/vista-previa.html` es la versión vanilla previa (HTML+CSS+JS inline, un solo archivo). Queda como bonus: se abre con doble clic, sin build. La fuente canónica es la app de React.

## Deploy

En vivo en **Cloudflare Pages**: <https://mundial2026-5qr.pages.dev>

El repo está conectado por Git al proyecto de CF Pages, así que **cada push a `main` redeploya solo** (build `npm run build`, output `dist`, Node fijado en `.node-version`).

Deploy manual por CLI (opcional):

```bash
npm run deploy   # build + wrangler pages deploy dist --project-name=mundial2026-5qr
```

Requiere `npx wrangler login` o `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`.

### Preview social

`public/og.png` (1200×630) es la imagen de preview para Discord/WhatsApp/Twitter, generada con `npm run og` (script `scripts/make-og.mjs`). Las URLs absolutas en los meta `og:`/`twitter:` de `index.html` apuntan al dominio de CF Pages.

## Uso

Libre. Tomalo, forkealo y cambiá lo que quieras. Licencia MIT.
