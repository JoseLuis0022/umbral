import { landing, seo } from '../copy';

/**
 * Datos estructurados (JSON-LD, schema.org) de la landing. Un solo @graph con
 * cuatro nodos enlazados por @id: el sitio, la aplicación, su autor y las
 * preguntas frecuentes. Las preguntas salen del MISMO copy que pinta el
 * acordeón (`landing.preguntas.lista`): Google exige que el FAQPage coincida
 * con lo visible, y así no pueden separarse.
 */
export function datosEstructurados(url: string) {
  const inicio = `${url}/`;
  const autor = { '@id': `${inicio}#autor` };
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${inicio}#sitio`,
        url: inicio,
        name: seo.sitio,
        description: seo.paginas.inicio.descripcion,
        inLanguage: 'es-MX',
        publisher: autor,
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${inicio}#app`,
        name: seo.sitio,
        description: landing.hero.subtitulo,
        url: inicio,
        applicationCategory: 'DeveloperApplication',
        applicationSubCategory: 'Plataforma web para agentes de Claude Code',
        operatingSystem: 'Web',
        inLanguage: 'es-MX',
        isAccessibleForFree: true,
        license: 'https://opensource.org/licenses/MIT',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', description: 'Código abierto con licencia MIT.' },
        downloadUrl: landing.github,
        softwareHelp: { '@type': 'CreativeWork', url: landing.readme },
        sameAs: [landing.github],
        image: `${url}${seo.imagen.ruta}`,
        screenshot: `${url}/landing/mac-chat.webp`,
        author: autor,
        publisher: autor,
      },
      {
        '@type': 'Person',
        '@id': `${inicio}#autor`,
        name: seo.autor,
        url: seo.urlAutor,
        sameAs: [seo.urlAutor],
        email: `mailto:${landing.contacto}`,
      },
      {
        '@type': 'FAQPage',
        '@id': `${inicio}#preguntas`,
        url: `${inicio}#preguntas`,
        inLanguage: 'es-MX',
        mainEntity: landing.preguntas.lista.map(([pregunta, respuesta]) => ({
          '@type': 'Question',
          name: pregunta,
          acceptedAnswer: { '@type': 'Answer', text: respuesta },
        })),
      },
    ],
  };
}
