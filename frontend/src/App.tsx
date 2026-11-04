import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { PreferenciasProvider } from './context/PreferenciasContext';
import { ToastProvider } from './components/ui';
import { RutaProtegida } from './components/RutaProtegida';
import { LayoutApp } from './layouts/LayoutApp';
import Login from './pages/Login';
import Chat from './pages/Chat';
import AlDia from './pages/AlDia';
import AlDiaDetalle from './pages/AlDiaDetalle';
import Ajustes from './pages/Ajustes';
import Perfil from './pages/Perfil';
import AdminCorpus from './pages/AdminCorpus';
import AdminConversaciones from './pages/AdminConversaciones';
import AdminTablero from './pages/AdminTablero';
import AdminBoletines from './pages/AdminBoletines';
import AdminLaboratorio from './pages/AdminLaboratorio';
import NoEncontrada from './pages/NoEncontrada';
import { SistemaDiseno } from './pages/SistemaDiseno';

/*
 * Prefijo de las RUTAS, hermano del `base` de vite.config.ts pero distinto:
 * aquel reubica los archivos (el <script>, el CSS, las imágenes), y este
 * reubica las direcciones que el enrutador escribe y lee.
 *
 * Publicada en https://tu-dominio.com/Umbral/, la dirección real del chat
 * es /Umbral/chat. Sin basename, react-router compara contra "/chat", no
 * reconoce ninguna ruta y toda la app cae en la pantalla de 404; y cada enlace
 * que escribiera apuntaría fuera de la carpeta.
 *
 * Se deriva de import.meta.env.BASE_URL, que Vite rellena con el mismo valor
 * de `base` — así el prefijo se declara UNA vez, en VITE_BASE_URL, y las dos
 * mitades no pueden desincronizarse. Se quita la barra final porque Vite
 * entrega '/Umbral/' y react-router espera '/Umbral' (en la raíz queda '', que
 * el enrutador trata como sin prefijo).
 */
const BASE_RUTAS = import.meta.env.BASE_URL.replace(/\/$/, '');

/**
 * Orden de los proveedores, de fuera hacia dentro:
 *
 *  - `PreferenciasProvider` va primero porque escribe atributos `data-*` en el
 *    elemento raíz: la densidad y el tamaño de texto tienen que estar puestos
 *    antes del primer pintado, o la app arranca con una talla y salta a otra.
 *  - `ChatProvider` cuelga por encima de las rutas, no dentro de /chat, para
 *    que el historial no se recargue cada vez que alguien entra a una guía y
 *    vuelve. Depende de `useAuth`, así que va por dentro de `AuthProvider`.
 */
export default function App() {
  return (
    <BrowserRouter basename={BASE_RUTAS}>
      <PreferenciasProvider>
        <AuthProvider>
          <ToastProvider>
            <ChatProvider>
              <Routes>
                <Route path="/login" element={<Login />} />

                {/* Referencia viva del sistema de diseño. Fuera del shell y sin
                    sesión: es documentación del equipo, no una pantalla de producto. */}
                <Route path="/_dev/sistema-diseno" element={<SistemaDiseno />} />

                {/* El chat ancla su entrada abajo y maneja su propio scroll, así
                    que recibe el alto completo del shell. El resto de pantallas
                    scrollea el contenedor de contenido. */}
                <Route element={<RutaProtegida><LayoutApp scrollPropio /></RutaProtegida>}>
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/chat/:conversacionId" element={<Chat />} />
                </Route>

                <Route element={<RutaProtegida><LayoutApp /></RutaProtegida>}>
                  <Route path="/" element={<Navigate to="/chat" replace />} />
                  <Route path="/al-dia" element={<AlDia />} />
                  <Route path="/al-dia/:guiaId" element={<AlDiaDetalle />} />
                  <Route path="/ajustes" element={<Ajustes />} />
                  <Route path="/perfil" element={<Perfil />} />

                  <Route
                    path="/admin/tablero"
                    element={<RutaProtegida soloAdmin><AdminTablero /></RutaProtegida>}
                  />
                  <Route
                    path="/admin/corpus"
                    element={<RutaProtegida soloAdmin><AdminCorpus /></RutaProtegida>}
                  />
                  <Route
                    path="/admin/conversaciones"
                    element={<RutaProtegida soloAdmin><AdminConversaciones /></RutaProtegida>}
                  />
                  <Route
                    path="/admin/al-dia"
                    element={<RutaProtegida soloAdmin><AdminBoletines /></RutaProtegida>}
                  />
                  <Route
                    path="/admin/laboratorio"
                    element={<RutaProtegida soloAdmin><AdminLaboratorio /></RutaProtegida>}
                  />

                  <Route path="*" element={<NoEncontrada />} />
                </Route>
              </Routes>
            </ChatProvider>
          </ToastProvider>
        </AuthProvider>
      </PreferenciasProvider>
    </BrowserRouter>
  );
}
