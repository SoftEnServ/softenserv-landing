import { Injectable, signal } from '@angular/core';

/** Coordina el splash con el header: el logo del navbar se muestra cuando termina la animación. */
@Injectable({ providedIn: 'root' })
export class SplashService {
  readonly done = signal(false);
  /** La ventana con persiana del hero se muestra solo la primera vez por visita. */
  heroIntroPlayed = false;
}
