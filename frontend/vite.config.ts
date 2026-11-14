import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode, isSsrBuild }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    /*
     * Prefijo público de la aplicación.
     *
     * En la raíz de un dominio vale '/' y no hay nada que pensar. Pero esta app
     * también se publica dentro de una subcarpeta (por ejemplo
     * https://tu-dominio.com/umbral/), y ahí TODO cambia de sitio: el
     * <script> del index, el CSS, las fuentes, las imágenes. Compilado con base
     * '/', el navegador pediría /assets/index.js en la raíz del dominio —
     * fuera de la carpeta— y la página quedaría en blanco.
     *
     * Se toma de VITE_BASE_URL para que el mismo código compile en los dos
     * destinos sin editar nada. Debe empezar y terminar con barra.
     * El enrutador lo lee de vuelta con import.meta.env.BASE_URL (ver App.tsx),
     * así que basta con poner la variable en un único lugar.
     */
    base: env.VITE_BASE_URL || '/',
    // Las URL absolutas de Open Graph, canonical y JSON-LD (VITE_URL_PUBLICA) las
    // escribe scripts/prerender.mjs en cada HTML, después de compilar.
    plugins: [react()],
    /*
     * En desarrollo, todo lo que empieza con /api se reenvía al backend
     * (FastAPI en el puerto 8000). Así el navegador cree que front y back son
     * el mismo origen y no hace falta CORS — igual que en el VPS, donde el
     * reverse proxy servirá los dos bajo el mismo dominio.
     *
     * El stream SSE del chat también pasa por aquí sin problema.
     */
    server: {
      proxy: {
        '/api': { target: env.VITE_API_PROXY || 'http://localhost:8000' },
      },
    },
    build: {
      // `vite build --ssr` (el prerender, ver src/prerender/) compila para Node
      // a otra carpeta: ni copia public/ ni parte en trozos lo que Node importa
      // de node_modules.
      copyPublicDir: !isSsrBuild,
      rollupOptions: isSsrBuild
        ? {}
        : {
            output: {
              // El visor de PDF y el renderizador de markdown pesan más que la app
              // entera y solo hacen falta en pantallas concretas. Separarlos en sus
              // propios trozos deja que el navegador cachee el núcleo (React y el
              // enrutador) entre despliegues, y que la carga inicial del chat no
              // arrastre pdf.js.
              manualChunks: {
                react: ['react', 'react-dom', 'react-router-dom'],
                movimiento: ['framer-motion'],
                markdown: ['react-markdown', 'remark-gfm'],
                pdf: ['react-pdf'],
              },
            },
          },
    },
  }
})
