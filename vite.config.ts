import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// CF Pages sirve en la raíz del dominio (*.pages.dev) → base "/".
// GitHub Pages (project site) sirve en /<repo>/ → el workflow exporta
// PAGES_BASE para que los assets resuelvan bien en ese subpath.
export default defineConfig({
  base: process.env.PAGES_BASE || "/",
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
    // No inlinear las banderas SVG como data-URI: que sean archivos sueltos y
    // el navegador baje solo las que se muestran (no las ~250 del paquete).
    assetsInlineLimit: 0,
  },
});
