// Textos en inglés (idioma principal). Las claves deben existir también en es.ts.
export const en = {
  meta: {
    title: 'Software Engineering Services | Servicios de Ingeniería en Software',
    description: 'Software development and system solutions for businesses and individuals: we gather your requirements and build the solution.',
  },
  nav: {
    back: 'Back', home: 'Home', services: 'Services', projects: 'Projects', process: 'How we work', cta: "Let's talk",
    menu: 'Open menu', toLight: 'Switch to light mode', toDark: 'Switch to dark mode',
    light: 'Light mode', dark: 'Dark mode', language: 'Language',
  },
  hero: {
    eyebrow: 'Custom Development and Systems',
    titleA: 'Your requirements into ', titleHl: 'solutions that work', titleB: '.',
    lead: 'We listen to you, then we define, to build and deliver your product.',
    cta: 'Tell us about your project', ctaSecondary: 'See projects',
    code: { varName: 'solution', type: 'Solution', fn: 'build', req: 'Requirements', arch: 'architecture', archVal: 'scalable', quality: 'quality', qualityVal: 'tested', comment: '// ✓ Ready for your business' },
  },
  services: {
    eyebrow: 'Services', title: 'These are the areas we work in',
    lead: 'Each one is part of a whole, but they are separate specialties.',
    items: [
      { title: 'Requirements gathering', text: 'We understand your process and turn it into clear, prioritized and measurable requirements.' },
      { title: 'Web applications', text: 'Modern, fast portals, platforms and websites that work on any device.' },
      { title: 'Management systems', text: 'Inventory, sales, scheduling and internal processes built around how you operate.' },
      { title: 'Integrations & APIs', text: 'We connect your tools: ERP, payment gateways, email and third-party services.' },
    ],
  },
  projects: {
    eyebrow: 'Projects', title: 'Get to know us through the solutions we build.',
    touchHint: 'Tap a project to see its demo',
    lead: 'A sample of the kinds of systems we design and develop for our clients.',
    filterLabel: 'Filter projects by status',
    filters: { todos: 'All', en_progreso: 'In progress', completado: 'Completed', planificado: 'Planned' },
    status: { en_progreso: 'In progress', completado: 'Completed', planificado: 'Planned' },
    progress: 'Progress', error: "We couldn't load the projects right now. Please try again in a few minutes.",
    empty: 'There are no projects in this category yet.',
    client: { empresa: 'For businesses', persona: 'For individuals' }, demo: 'View demo →',
    prev: 'Previous projects', next: 'Next projects',
  },
  process: {
    eyebrow: 'How we work', title: 'A simple, transparent process',
    steps: [
      { title: 'We listen', text: 'A kickoff meeting to understand your needs, your users and your goals.' },
      { title: 'We define', text: 'We document requirements, scope and timelines in a clear proposal.' },
      { title: 'We build', text: 'Development in stages, with visible progress and your ongoing feedback.' },
      { title: 'We deliver', text: 'Launch, training and support so the solution keeps growing.' },
    ],
  },
  contact: {
    eyebrow: 'Contact', title: 'A project in mind? A specific problem to solve?',
    lead: "Just tell us what you need, describing your case and your contact details. We'll get back to you shortly to prepare a solution that fits your needs.",
    directly: 'Or write to us directly', copy: 'Copy email', copied: 'Copied!',
    perks: ['A proposal with clear scope and timelines', 'For businesses and individuals'],
    email: 'Email', emailPlaceholder: 'name@company.com',
    message: 'Message', messagePlaceholder: 'Who are you? Tell us more!',
    errEmail: 'Enter a valid email, e.g. name@company.com', errMessage: 'Please write at least 10 characters',
    errSend: "We couldn't send your message. Please try again.",
    send: 'Send message', sending: 'Sending…',
    okTitle: 'Thank you!', okText: "We'll receive your message. We'll reply to the email", again: 'Send another message',
  },
};

export type Dict = typeof en;
