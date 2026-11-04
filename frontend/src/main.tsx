import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Autoalojada: la app es interna y no debe depender de una petición al CDN de
// Google en cada carga. Solo los subsets latin y latin-ext, redonda y cursiva
// REAL — el markdown del agente usa énfasis todo el tiempo y la oblicua
// sintética que dibuja el navegador cuando falta la cursiva se nota.
import './assets/fuentes/fuente.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
