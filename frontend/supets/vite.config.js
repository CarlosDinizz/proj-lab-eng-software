import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import jsconfigPaths from "vite-jsconfig-paths"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), jsconfigPaths()],
  server: {
    proxy: {
      "/community": "http://localhost:8081",
      // Com a barra no fim: "/ocorrencias/..." são páginas do front e não podem ir para o back
      "/ocorrencia/": "http://localhost:8081",
    },
  },
})
