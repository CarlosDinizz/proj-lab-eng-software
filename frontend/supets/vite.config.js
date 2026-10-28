import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import jsconfigPaths from "vite-jsconfig-paths"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), jsconfigPaths()],
  server: {
    proxy: {
      "/cidadao": "http://localhost:8081",
      "/ong": "http://localhost:8081",
      "/ocorrencia": "http://localhost:8081",
    },
  },
})
