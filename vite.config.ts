import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@/assets": path.resolve(__dirname, "./src/assets"),
      "@/configs": path.resolve(__dirname, "./src/configs"),
      "@/hooks": path.resolve(__dirname, "./src/hooks"),
      "@/services": path.resolve(__dirname, "./src/services"),
      "@/interfaces": path.resolve(__dirname, "./src/interfaces"),
      "@/components": path.resolve(__dirname, "./src/views/components"),
      "@/layouts": path.resolve(__dirname, "./src/views/layouts"),
      "@/pages": path.resolve(__dirname, "./src/views/pages"),
      "@/utils": path.resolve(__dirname, "./src/utils"),
    },
  },
})