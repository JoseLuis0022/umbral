/**
 * Avisos de "ya terminó" para las tareas largas: un sonido corto y, si la
 * persona lo permitió, una notificación del sistema.
 *
 *  - El sonido se SINTETIZA con Web Audio (dos notas, 0.45 s): no hay archivo
 *    que descargar ni que se pueda romper.
 *  - El navegador solo deja pedir permiso de notificaciones como respuesta a un
 *    clic. Por eso `pedirPermisoAvisos` se llama al ENVIAR una tarea larga, no
 *    al cargar la página (un permiso pedido de la nada casi siempre se niega).
 */

let audio: AudioContext | null = null;

export function sonarTermino(ok = true) {
  try {
    const Contexto = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Contexto) return;
    audio ??= new Contexto();
    void audio.resume();
    const ahora = audio.currentTime;
    // Éxito: quinta ascendente (agradable, "listo"). Falla: dos notas que bajan.
    const notas = ok ? [659.25, 987.77] : [523.25, 392.0];
    notas.forEach((frecuencia, i) => {
      const osc = audio!.createOscillator();
      const volumen = audio!.createGain();
      osc.type = 'sine';
      osc.frequency.value = frecuencia;
      const t = ahora + i * 0.14;
      volumen.gain.setValueAtTime(0, t);
      volumen.gain.linearRampToValueAtTime(0.14, t + 0.015);
      volumen.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      osc.connect(volumen).connect(audio!.destination);
      osc.start(t);
      osc.stop(t + 0.34);
    });
  } catch {
    /* sin audio disponible: el aviso visual basta */
  }
}

export function avisosPermitidos(): boolean {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted';
}

/** Llamar DENTRO de un clic. Solo pregunta una vez: si ya contestó, no insiste. */
export function pedirPermisoAvisos() {
  if (typeof Notification === 'undefined' || Notification.permission !== 'default') return;
  void Notification.requestPermission().catch(() => undefined);
}

export function notificar(titulo: string, cuerpo: string, alAbrir?: () => void) {
  if (!avisosPermitidos()) return;
  try {
    // `tag`: dos tareas que terminan juntas no apilan avisos repetidos de la misma conversación.
    const aviso = new Notification(titulo, { body: cuerpo, tag: cuerpo, icon: `${import.meta.env.BASE_URL}favicon.svg` });
    aviso.onclick = () => {
      window.focus();
      alAbrir?.();
      aviso.close();
    };
  } catch {
    /* algunos navegadores solo notifican desde un service worker */
  }
}
