import { Dict } from './en';

// Textos en español. TypeScript avisa si falta alguna clave respecto de en.ts.
export const es: Dict = {
  meta: {
    title: 'Software Engineering Services | Servicios de Ingeniería en Software',
    description: 'Desarrollo de software y soluciones de sistemas para empresas y personas: levantamos tus requerimientos y construimos la solución.',
  },
  nav: {
    back: 'Volver', home: 'Inicio', services: 'Servicios', projects: 'Proyectos', process: 'Cómo trabajamos', cta: 'Charlemos',
    menu: 'Abrir menú', toLight: 'Cambiar a modo claro', toDark: 'Cambiar a modo oscuro',
    light: 'Modo claro', dark: 'Modo oscuro', language: 'Idioma',
  },
  hero: {
    eyebrow: 'Desarrollo y Sistemas a medida',
    titleA: 'Tus requerimientos en ', titleHl: 'soluciones que funcionan', titleB: '.',
    lead: 'Te escuchamos, luego definimos para construir y entregar tu producto.',
    cta: 'Cuéntanos tu proyecto', ctaSecondary: 'Ver proyectos',
    code: { varName: 'solucion', type: 'Solucion', fn: 'construir', req: 'Requerimientos', arch: 'arquitectura', archVal: 'escalable', quality: 'calidad', qualityVal: 'probada', comment: '// ✓ Lista para tu negocio' },
  },
  services: {
    eyebrow: 'Servicios', title: 'Estas son las áreas en las que nos desenvolvemos',
    lead: 'Cada una de ellas es parte de un todo, pero son especialidades por separado.',
    items: [
      { title: 'Levantamiento de requerimientos', text: 'Entendemos tu proceso y lo traducimos en requerimientos claros, priorizados y medibles.' },
      { title: 'Aplicaciones web', text: 'Portales, plataformas y sitios modernos, rápidos y adaptados a cualquier dispositivo.' },
      { title: 'Sistemas de gestión', text: 'Inventario, ventas, agendas y procesos internos hechos a la medida de tu operación.' },
      { title: 'Integraciones y APIs', text: 'Conectamos tus herramientas: ERP, pasarelas de pago, correo y servicios externos.' },
    ],
  },
  projects: {
    eyebrow: 'Proyectos', title: 'Conócenos por las soluciones que construimos.',
    touchHint: 'Toca un proyecto para ver su demo',
    lead: 'Una muestra del tipo de sistemas que diseñamos y desarrollamos para nuestros clientes.',
    filterLabel: 'Filtrar proyectos por estado',
    filters: { todos: 'Todos', en_progreso: 'En progreso', completado: 'Completados', planificado: 'Planificados' },
    status: { en_progreso: 'En progreso', completado: 'Completado', planificado: 'Planificado' },
    progress: 'Avance', error: 'No pudimos cargar los proyectos en este momento. Intenta nuevamente en unos minutos.',
    empty: 'No hay proyectos en esta categoría todavía.',
    client: { empresa: 'Para empresas', persona: 'Para personas' }, demo: 'Ver demo →',
    prev: 'Proyectos anteriores', next: 'Proyectos siguientes',
  },
  process: {
    eyebrow: 'Cómo trabajamos', title: 'Un proceso simple y transparente',
    steps: [
      { title: 'Escuchamos', text: 'Reunión inicial para entender tu necesidad, tus usuarios y tus objetivos.' },
      { title: 'Definimos', text: 'Documentamos requerimientos, alcance, plazos y una propuesta clara.' },
      { title: 'Construimos', text: 'Desarrollo por etapas con avances visibles y tu retroalimentación constante.' },
      { title: 'Entregamos', text: 'Puesta en marcha, capacitación y soporte para que la solución siga creciendo.' },
    ],
  },
  contact: {
    eyebrow: 'Contacto', title: '¿Algún proyecto en mente? ¿Algún problema específico que solucionar?',
    lead: 'Sólo cuéntanos qué necesitas referenciando tu caso y tus datos. Te responderemos a la brevedad para preparar una solución acorde a tus necesidades.',
    directly: 'O escríbenos directamente', copy: 'Copiar correo', copied: '¡Copiado!',
    perks: ['Propuesta con alcance y plazos claros', 'Para empresas y personas'],
    email: 'Correo', emailPlaceholder: 'nombre@empresa.cl',
    message: 'Mensaje', messagePlaceholder: '¿Quién eres? ¡Cuéntanos más!',
    errEmail: 'Correo no válido, ej.: nombre@empresa.cl', errMessage: 'Escribe al menos 10 caracteres',
    errSend: 'No pudimos enviar tu mensaje. Intenta nuevamente.',
    send: 'Enviar mensaje', sending: 'Enviando…',
    okTitle: '¡Gracias!', okText: 'Recibiremos tu mensaje. Responderemos al email', again: 'Enviar otro mensaje',
  },
};
