import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { PreferenciasProvider } from './context/PreferenciasContext';
import { ToastProvider } from './components/ui';
import { RutaProtegida } from './components/RutaProtegida';
import { LimiteError } from './components/LimiteError';
import { LayoutApp } from './layouts/LayoutApp';
import Login from './pages/Login';
import Registro from './pages/Registro';
import Verificar from './pages/Verificar';
import Landing from './pages/Landing';
import { Privacidad, Terminos } from './pages/Legal';
import { useAuth } from './context/AuthContext';
import Chat from './pages/Chat';
import Ajustes from './pages/Ajustes';
import Perfil from './pages/Perfil';
import AdminCorpus from './pages/AdminCorpus';
import AdminConversaciones from './pages/AdminConversaciones';
import AdminTablero from './pages/AdminTablero';
import AdminLaboratorio from './pages/AdminLaboratorio';
import NoEncontrada from './pages/NoEncontrada';
import { SistemaDiseno } from './pages/SistemaDiseno';
import { PantallaArranque } from './components/brand/PantallaArranque';

/*
 * Prefijo de las RUTAS, hermano del `base` de vite.config.ts pero distinto:
 * aquel reubica los archivos (el <script>, el CSS, las imágenes), y este
 * reubica las direcciones que el enrutador escribe y lee.
 *
 * Publicada en https://tu-dominio.com/umbral/, la dirección real del chat
 * es /umbral/chat. Sin basename, react-router compara contra "/chat", no
 * reconoce ninguna ruta y toda la app cae en la pantalla de 404; y cada enlace
 * que escribiera apuntaría fuera de la carpeta.
 *
 * Se deriva de import.meta.env.BASE_URL, que Vite rellena con el mismo valor
 * de `base` — así el prefijo se declara UNA vez, en VITE_BASE_URL, y las dos
 * mitades no pueden desincronizarse. Se quita la barra final porque Vite
 * entrega '/umbral/' y react-router espera '/umbral' (en la raíz queda '', que
 * el enrutador trata como sin prefijo).
 */
const BASE_RUTAS = import.meta.env.BASE_URL.replace(/\/$/, '');

/**
 * `/`: sin sesión, la landing (para quien llega desde un enlace y no sabe qué
 * es Umbral); con sesión, directo al chat. Mientras se valida el token no se
 * pinta ninguna de las dos, para no mostrar la landing un instante a quien ya
 * tiene cuenta.
 */
function Inicio() {
  const { sesion, cargando } = useAuth();
  if (cargando) return <div className="h-full w-full bg-bg" />;
  return sesion ? <Navigate to="/chat" replace /> : <Landing />;
}

/**
 * Orden de los proveedores, de fuera hacia dentro:
 *
 *  - `PreferenciasProvider` va primero porque escribe atributos `data-*` en el
 *    elemento raíz: la densidad y el tamaño de texto tienen que estar puestos
 *    antes del primer pintado, o la app arranca con una talla y salta a otra.
 *  - `ChatProvider` cuelga por encima de las rutas, no dentro de /chat, para
 *    que el historial no se recargue cada vez que alguien entra a Ajustes y
 *    vuelve. Depende de `useAuth`, así que va por dentro de `AuthProvider`.
 */
export default function App() {
  return (
    <BrowserRouter basename={BASE_RUTAS}>
      <PreferenciasProvider>
        {/* Encima de todo y fuera de las rutas: se ve una sola vez al abrir. */}
        <PantallaArranque />
        <AuthProvider>
          <ToastProvider>
            <ChatProvider>
              {/* Red de seguridad global: un error de render nunca deja la app en
                  blanco. Cada pantalla tiene además su propio límite en LayoutApp. */}
              <LimiteError variante="pantalla">
                <Routes>
                  <Route path="/login" element={<Login />} />
                  {/* Registro público y el enlace del correo: sin sesión. */}
                  <Route path="/registro" element={<Registro />} />
                  <Route path="/verificar" element={<Verificar />} />
                  {/* La raíz: landing para quien no ha entrado, chat para quien sí. */}
                  <Route path="/" element={<Inicio />} />
                  {/* Páginas legales: públicas, con o sin sesión. */}
                  <Route path="/privacidad" element={<Privacidad />} />
                  <Route path="/terminos" element={<Terminos />} />

                  {/* Referencia viva del sistema de diseño. Fuera del shell y sin
                      sesión: es documentación del equipo, no una pantalla de producto. */}
                  <Route path="/_dev/sistema-diseno" element={<SistemaDiseno />} />

                  {/* UN solo shell para todo: con dos (uno para el chat y otro para
                      lo demás) la cabecera se destruía y reconstruía al cambiar
                      de pantalla, y parpadeaba. LayoutApp decide por la ruta si
                      la pantalla maneja su propio scroll (el chat). */}
                  <Route element={<RutaProtegida><LayoutApp /></RutaProtegida>}>
                    <Route path="/chat" element={<Chat />} />
                    <Route path="/chat/:conversacionId" element={<Chat />} />
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
                      path="/admin/laboratorio"
                      element={<RutaProtegida soloAdmin><AdminLaboratorio /></RutaProtegida>}
                    />

                    <Route path="*" element={<NoEncontrada />} />
                  </Route>
                </Routes>
              </LimiteError>
            </ChatProvider>
          </ToastProvider>
        </AuthProvider>
      </PreferenciasProvider>
    </BrowserRouter>
  );
}
