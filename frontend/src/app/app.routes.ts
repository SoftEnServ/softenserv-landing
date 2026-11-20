import { Routes } from '@angular/router';
import { Landing } from './components/landing/landing';
import { Contact } from './components/contact/contact';

/** La landing tiene todas las secciones con scroll; contacto es una página aparte. */
export const routes: Routes = [
  { path: '', component: Landing },
  { path: 'contact', component: Contact },
  // Páginas de demostración: las muestra App (ver core/subdomain.ts); aquí solo se evita la redirección
  { path: 'demo/:slug', children: [] },
  { path: '**', redirectTo: '' },
];
