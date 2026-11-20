import { Component, computed, inject, signal } from '@angular/core';
import { I18nService } from '../../core/i18n.service';

/**
 * Maquetas (mocks) de cada proyecto del portafolio, con marcas y datos ficticios.
 * Los estilos comunes (.m-*) están en demo.ts; aquí solo hay contenido y algo de interacción.
 */
abstract class Mock {
  protected i18n = inject(I18nService);
  tr = (en: string, es: string) => (this.i18n.lang() === 'es' ? es : en);
  money = (n: number) => '$' + n.toLocaleString(this.i18n.lang() === 'es' ? 'es-CL' : 'en-US');
}

// ------------------------------------------------------------------ Portal de clientes
@Component({
  selector: 'demo-portal',
  template: `
    <div class="m-app" style="--ac:#3b6fd8; --ac-soft:#e8effc">
      <nav class="m-side">
        <div class="m-brand"><span class="m-logo">N</span> Northwind</div>
        @for (n of nav(); track $index) { <button class="m-nav" [class.is-on]="$index === 0">{{ n }}</button> }
      </nav>
      <main class="m-main">
        <div class="m-top">
          <div><h1>{{ tr('Hi, María', 'Hola, María') }} 👋</h1><p class="m-sub">{{ tr('Here is what is happening with your account.', 'Esto es lo que pasa con tu cuenta.') }}</p></div>
          <div style="display:flex; gap:10px; align-items:center"><button class="m-btn">+ {{ tr('New order', 'Nuevo pedido') }}</button><span class="m-avatar">MR</span></div>
        </div>
        <div class="m-kpis">
          <div class="m-kpi"><small>{{ tr('Open orders', 'Pedidos abiertos') }}</small><strong>4</strong><em class="m-muted">{{ tr('2 arriving this week', '2 llegan esta semana') }}</em></div>
          <div class="m-kpi"><small>{{ tr('Pending invoices', 'Facturas pendientes') }}</small><strong>{{ money(1240) }}</strong><em class="down">{{ tr('1 due in 3 days', '1 vence en 3 días') }}</em></div>
          <div class="m-kpi"><small>{{ tr('Support tickets', 'Tickets de soporte') }}</small><strong>1</strong><em class="up">{{ tr('Answered 2h ago', 'Respondido hace 2 h') }}</em></div>
        </div>
        <div class="m-grid2">
          <section class="m-card">
            <h2>{{ tr('Recent orders', 'Pedidos recientes') }} <small>{{ tr('View all', 'Ver todos') }} →</small></h2>
            <div class="m-scroll"><table class="m-table">
              <thead><tr><th>{{ tr('Order', 'Pedido') }}</th><th>{{ tr('Date', 'Fecha') }}</th><th>{{ tr('Status', 'Estado') }}</th><th class="num">Total</th></tr></thead>
              <tbody>
                @for (o of orders(); track o.id) {
                  <tr><td><strong>#{{ o.id }}</strong></td><td>{{ o.date }}</td><td><span class="pill" [class]="'pill pill--' + o.kind">{{ o.status }}</span></td><td class="num">{{ money(o.total) }}</td></tr>
                }
              </tbody>
            </table></div>
          </section>
          <section class="m-card">
            <h2>{{ tr('Support', 'Soporte') }} <span class="pill pill--info">{{ tr('Open', 'Abierto') }}</span></h2>
            <p style="font-weight:600; font-size:.92rem">{{ tr('Invoice #F-2291 shows a wrong address', 'La factura #F-2291 tiene la dirección incorrecta') }}</p>
            <p class="m-muted" style="margin:6px 0 14px">{{ tr('Ticket #318 · opened yesterday', 'Ticket #318 · abierto ayer') }}</p>
            <div style="background:#f6f8fb; border-radius:10px; padding:12px; font-size:.86rem">
              <strong style="font-size:.8rem; color:#3b6fd8">{{ tr('Support team', 'Equipo de soporte') }}</strong>
              <p style="margin-top:4px">{{ tr('We have corrected the address. The new invoice is now available in Invoices.', 'Ya corregimos la dirección. La nueva factura está disponible en Facturas.') }}</p>
            </div>
            <button class="m-btn m-btn--ghost" style="margin-top:14px; width:100%; justify-content:center">{{ tr('Reply', 'Responder') }}</button>
          </section>
        </div>
      </main>
    </div>
  `,
})
export class PortalMock extends Mock {
  nav = computed(() => [this.tr('Dashboard', 'Inicio'), this.tr('Orders', 'Pedidos'), this.tr('Invoices', 'Facturas'), this.tr('Support', 'Soporte'), this.tr('Profile', 'Perfil')]);
  orders = computed(() => [
    { id: 10482, date: '12/11', status: this.tr('In transit', 'En camino'), kind: 'info', total: 389000 },
    { id: 10477, date: '08/11', status: this.tr('Preparing', 'Preparando'), kind: 'warn', total: 152500 },
    { id: 10461, date: '30/10', status: this.tr('Delivered', 'Entregado'), kind: 'ok', total: 74900 },
    { id: 10455, date: '27/10', status: this.tr('Delivered', 'Entregado'), kind: 'ok', total: 512300 },
    { id: 10431, date: '15/10', status: this.tr('Cancelled', 'Anulado'), kind: 'bad', total: 23990 },
  ]);
}

// ------------------------------------------------------------------ Sistema de inventario
@Component({
  selector: 'demo-inventory',
  template: `
    <div class="m-app" style="--ac:#2f9e6e; --ac-soft:#e3f5ec">
      <nav class="m-side">
        <div class="m-brand"><span class="m-logo">S</span> StockFlow</div>
        @for (n of nav(); track $index) { <button class="m-nav" [class.is-on]="$index === 1">{{ n }}</button> }
      </nav>
      <main class="m-main">
        <div class="m-top">
          <div><h1>{{ tr('Inventory', 'Inventario') }}</h1><p class="m-sub">{{ tr('Stock across all warehouses, updated in real time.', 'Stock de todas las bodegas, actualizado en tiempo real.') }}</p></div>
          <div class="m-tabs">
            @for (w of warehouses; track w) { <button class="m-tab" [class.is-on]="wh() === w" (click)="wh.set(w)">{{ w }}</button> }
          </div>
        </div>
        <div class="m-kpis">
          <div class="m-kpi"><small>{{ tr('Active SKUs', 'SKU activos') }}</small><strong>1.284</strong></div>
          <div class="m-kpi"><small>{{ tr('Low stock', 'Stock bajo') }}</small><strong>{{ low() }}</strong><em class="down">{{ tr('needs reorder', 'requiere reposición') }}</em></div>
          <div class="m-kpi"><small>{{ tr('Pending transfers', 'Traslados pendientes') }}</small><strong>3</strong></div>
          <div class="m-kpi"><small>{{ tr('Stock value', 'Valor del stock') }}</small><strong>{{ money(48650000) }}</strong></div>
        </div>
        <div class="m-grid2">
          <section class="m-card">
            <h2>{{ tr('Products', 'Productos') }} · {{ wh() }} <small>{{ tr('Export', 'Exportar') }} ↓</small></h2>
            <div class="m-scroll"><table class="m-table">
              <thead><tr><th>{{ tr('Product', 'Producto') }}</th><th>SKU</th><th>Stock</th><th>{{ tr('Status', 'Estado') }}</th></tr></thead>
              <tbody>
                @for (p of rows(); track p.sku) {
                  <tr>
                    <td><strong>{{ p.name }}</strong></td><td class="m-muted">{{ p.sku }}</td>
                    <td><div style="display:flex; align-items:center; gap:10px"><div class="m-bar" style="width:110px"><span [style.width.%]="p.pct" [style.background]="p.pct < 20 ? '#dc2626' : p.pct < 40 ? '#d97706' : ''"></span></div>{{ p.qty }}</div></td>
                    <td><span [class]="'pill pill--' + (p.pct < 20 ? 'bad' : p.pct < 40 ? 'warn' : 'ok')">{{ p.pct < 20 ? tr('Critical', 'Crítico') : p.pct < 40 ? tr('Low', 'Bajo') : 'OK' }}</span></td>
                  </tr>
                }
              </tbody>
            </table></div>
          </section>
          <section class="m-card">
            <h2>{{ tr('Reorder alerts', 'Alertas de reposición') }} <span class="pill pill--bad">{{ low() }}</span></h2>
            <ul class="m-list">
              @for (p of alerts(); track p.sku) {
                <li><span><strong>{{ p.name }}</strong><br><span class="m-muted">{{ tr('Suggested order', 'Pedido sugerido') }}: {{ p.order }} u.</span></span><button class="m-btn" style="padding:6px 12px">{{ tr('Order', 'Pedir') }}</button></li>
              }
            </ul>
          </section>
        </div>
      </main>
    </div>
  `,
})
export class InventoryMock extends Mock {
  warehouses = ['Santiago', 'Valparaíso', 'Concepción'];
  wh = signal('Santiago');
  nav = computed(() => [this.tr('Overview', 'Resumen'), this.tr('Inventory', 'Inventario'), this.tr('Transfers', 'Traslados'), this.tr('Suppliers', 'Proveedores'), this.tr('Reports', 'Reportes')]);
  private base = computed(() => [
    { name: this.tr('Steel screws M6', 'Tornillos acero M6'), sku: 'TR-M6-100', max: 5000 },
    { name: this.tr('LED panel 60×60', 'Panel LED 60×60'), sku: 'LD-6060', max: 300 },
    { name: this.tr('Copper cable 2.5 mm', 'Cable cobre 2,5 mm'), sku: 'CB-25-RL', max: 800 },
    { name: this.tr('Safety gloves', 'Guantes de seguridad'), sku: 'GS-PR-L', max: 1200 },
    { name: this.tr('PVC pipe 110 mm', 'Tubo PVC 110 mm'), sku: 'PV-110-3', max: 450 },
    { name: this.tr('Wall plugs 8 mm', 'Tarugos 8 mm'), sku: 'TG-08-500', max: 9000 },
  ]);
  /** Cada bodega tiene niveles distintos (determinísticos, para que la maqueta sea estable). */
  rows = computed(() => {
    const seed = this.warehouses.indexOf(this.wh()) + 1;
    return this.base().map((p, i) => {
      const pct = Math.round(((i * 37 + seed * 53) % 90) + 6);
      return { ...p, pct, qty: Math.round((p.max * pct) / 100), order: Math.round(p.max * 0.6) };
    });
  });
  alerts = computed(() => this.rows().filter((p) => p.pct < 40));
  low = computed(() => this.alerts().length * 3);
}

// ------------------------------------------------------------------ Agenda para profesionales
@Component({
  selector: 'demo-scheduling',
  template: `
    <div class="m-app" style="--ac:#7c5cd6; --ac-soft:#efeafb">
      <nav class="m-side">
        <div class="m-brand"><span class="m-logo">T</span> Turnly</div>
        @for (n of nav(); track $index) { <button class="m-nav" [class.is-on]="$index === 0">{{ n }}</button> }
      </nav>
      <main class="m-main">
        <div class="m-top">
          <div><h1>{{ tr('My agenda', 'Mi agenda') }}</h1><p class="m-sub">Dra. Camila Torres · {{ tr('Psychologist', 'Psicóloga') }} · {{ tr('Week of Nov 16', 'Semana del 16 de nov.') }}</p></div>
          <div style="display:flex; gap:8px"><button class="m-btn m-btn--ghost">‹</button><button class="m-btn m-btn--ghost">{{ tr('Today', 'Hoy') }}</button><button class="m-btn m-btn--ghost">›</button></div>
        </div>
        <div class="m-grid2" style="grid-template-columns: 1.7fr 1fr">
          <section class="m-card" style="padding:14px">
            <div class="cal">
              <span></span>
              @for (d of days(); track $index) { <strong class="cal__day">{{ d }}</strong> }
              @for (h of hours; track h; let r = $index) {
                <span class="cal__h">{{ h }}:00</span>
                @for (d of days(); track $index; let c = $index) {
                  <span class="cal__cell">
                    @if (apptAt(c, r); as a) { <span class="cal__ev" [style.background]="a.color">{{ a.name }}<small>{{ a.what }}</small></span> }
                  </span>
                }
              }
            </div>
          </section>
          <section class="m-card">
            <h2>{{ tr('Book an appointment', 'Reservar una hora') }}</h2>
            <div style="display:grid; gap:14px">
              <label class="m-field">{{ tr('Service', 'Servicio') }}
                <select class="m-input"><option>{{ tr('Individual session · 50 min', 'Sesión individual · 50 min') }}</option><option>{{ tr('Couples session · 80 min', 'Sesión de pareja · 80 min') }}</option></select>
              </label>
              <div class="m-field">{{ tr('Available times · Thursday', 'Horas disponibles · jueves') }}
                <div class="m-tabs">
                  @for (s of slots; track s) { <button class="m-tab" [class.is-on]="slot() === s" (click)="slot.set(s)">{{ s }}</button> }
                </div>
              </div>
              <button class="m-btn" style="justify-content:center">{{ tr('Confirm', 'Confirmar') }} {{ slot() }}</button>
            </div>
            <div class="mail">
              <small class="m-muted">✉ {{ tr('Automatic reminder · 24 h before', 'Recordatorio automático · 24 h antes') }}</small>
              <p><strong>{{ tr('Your appointment is tomorrow', 'Tu hora es mañana') }}</strong></p>
              <p class="m-muted">{{ tr('Thursday at', 'Jueves a las') }} {{ slot() }} · Dra. Camila Torres. {{ tr('Reply C to confirm or X to cancel.', 'Responde C para confirmar o X para anular.') }}</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  `,
  styles: `
    .cal { display: grid; grid-template-columns: 52px repeat(5, 1fr); font-size: .78rem; }
    .cal__day { text-align: center; padding: 6px 0 10px; font-size: .8rem; color: #374151; }
    .cal__h { color: #9ca3af; padding: 4px 6px 0 0; text-align: right; border-top: 1px solid #f0f1f3; height: 46px; }
    .cal__cell { border-top: 1px solid #f0f1f3; border-left: 1px solid #f6f6f8; height: 46px; padding: 3px; }
    .cal__ev { display: block; height: 100%; border-radius: 7px; padding: 4px 7px; color: #fff; font-weight: 600; font-size: .74rem; line-height: 1.25; overflow: hidden; }
    .cal__ev small { display: block; font-weight: 400; opacity: .9; font-size: .68rem; }
    .mail { margin-top: 18px; padding: 12px 14px; border-radius: 10px; background: #f7f5fd; border: 1px dashed #cfc3f1; display: grid; gap: 4px; font-size: .84rem; }
  `,
})
export class SchedulingMock extends Mock {
  hours = [9, 10, 11, 12, 14, 15, 16, 17];
  slots = ['10:00', '11:00', '15:00', '16:00', '17:00'];
  slot = signal('15:00');
  nav = computed(() => [this.tr('Agenda', 'Agenda'), this.tr('Patients', 'Pacientes'), this.tr('Services', 'Servicios'), this.tr('Reminders', 'Recordatorios'), this.tr('Settings', 'Ajustes')]);
  days = computed(() => this.i18n.lang() === 'es' ? ['Lun 16', 'Mar 17', 'Mié 18', 'Jue 19', 'Vie 20'] : ['Mon 16', 'Tue 17', 'Wed 18', 'Thu 19', 'Fri 20']);
  private appts = computed(() => [
    { c: 0, r: 0, name: 'Javier P.', what: this.tr('Individual', 'Individual'), color: '#7c5cd6' },
    { c: 0, r: 2, name: 'Ana & Luis', what: this.tr('Couples', 'Pareja'), color: '#d9784a' },
    { c: 1, r: 1, name: 'Sofía M.', what: this.tr('First visit', 'Primera vez'), color: '#2f9e6e' },
    { c: 1, r: 5, name: 'Pedro R.', what: this.tr('Individual', 'Individual'), color: '#7c5cd6' },
    { c: 2, r: 3, name: 'Valentina G.', what: this.tr('Online', 'Online'), color: '#3b6fd8' },
    { c: 3, r: 0, name: 'Tomás L.', what: this.tr('Individual', 'Individual'), color: '#7c5cd6' },
    { c: 3, r: 4, name: 'Carla V.', what: this.tr('Follow-up', 'Control'), color: '#2f9e6e' },
    { c: 4, r: 2, name: 'Diego F.', what: this.tr('Online', 'Online'), color: '#3b6fd8' },
    { c: 4, r: 6, name: 'Marta S.', what: this.tr('Individual', 'Individual'), color: '#7c5cd6' },
  ]);
  apptAt = (c: number, r: number) => this.appts().find((a) => a.c === c && a.r === r) ?? null;
}

// ------------------------------------------------------------------ Integración con ERP
@Component({
  selector: 'demo-erp',
  template: `
    <div class="m-app" style="--ac:#e07a3a; --ac-soft:#fdeee4">
      <nav class="m-side">
        <div class="m-brand"><span class="m-logo">⇄</span> SyncBridge</div>
        @for (n of nav(); track $index) { <button class="m-nav" [class.is-on]="$index === 0">{{ n }}</button> }
      </nav>
      <main class="m-main">
        <div class="m-top">
          <div><h1>{{ tr('Synchronization', 'Sincronización') }}</h1><p class="m-sub">{{ tr('Online store ⇄ ERP · every 5 minutes', 'Tienda online ⇄ ERP · cada 5 minutos') }}</p></div>
          <button class="m-btn">↻ {{ tr('Sync now', 'Sincronizar ahora') }}</button>
        </div>
        <section class="m-card">
          <div class="flow">
            <div class="flow__node"><span>🛒</span><strong>{{ tr('Online store', 'Tienda online') }}</strong><small class="m-muted">{{ tr('Orders · customers', 'Pedidos · clientes') }}</small></div>
            <div class="flow__pipe"><i></i><i></i><i></i></div>
            <div class="flow__node flow__node--hub"><span>⇄</span><strong>SyncBridge</strong><small>{{ tr('Healthy', 'Operativo') }} ●</small></div>
            <div class="flow__pipe flow__pipe--rev"><i></i><i></i><i></i></div>
            <div class="flow__node"><span>🏢</span><strong>ERP</strong><small class="m-muted">{{ tr('Invoices · stock', 'Facturas · stock') }}</small></div>
          </div>
        </section>
        <div class="m-kpis">
          <div class="m-kpi"><small>{{ tr('Orders synced today', 'Pedidos sincronizados hoy') }}</small><strong>248</strong><em class="up">▲ 12%</em></div>
          <div class="m-kpi"><small>{{ tr('Invoices issued', 'Facturas emitidas') }}</small><strong>231</strong></div>
          <div class="m-kpi"><small>{{ tr('Last sync', 'Última sincronización') }}</small><strong>{{ tr('2 min ago', 'hace 2 min') }}</strong></div>
          <div class="m-kpi"><small>{{ tr('Errors (24 h)', 'Errores (24 h)') }}</small><strong>2</strong><em class="down">{{ tr('retrying', 'reintentando') }}</em></div>
        </div>
        <section class="m-card">
          <h2>{{ tr('Activity log', 'Registro de actividad') }} <small>{{ tr('Live', 'En vivo') }} ●</small></h2>
          <div class="m-scroll"><table class="m-table">
            <thead><tr><th>{{ tr('Time', 'Hora') }}</th><th>{{ tr('Entity', 'Entidad') }}</th><th>{{ tr('Direction', 'Dirección') }}</th><th>{{ tr('Detail', 'Detalle') }}</th><th>{{ tr('Result', 'Resultado') }}</th></tr></thead>
            <tbody>
              @for (l of log(); track $index) {
                <tr><td class="m-muted">{{ l.t }}</td><td><strong>{{ l.e }}</strong></td><td>{{ l.d }}</td><td>{{ l.x }}</td><td><span [class]="'pill pill--' + l.k">{{ l.r }}</span></td></tr>
              }
            </tbody>
          </table></div>
        </section>
      </main>
    </div>
  `,
  styles: `
    .flow { display: grid; grid-template-columns: 1fr 1.2fr 1fr 1.2fr 1fr; align-items: center; gap: 8px; padding: 8px 0; }
    .flow__node { display: grid; justify-items: center; gap: 4px; padding: 16px 10px; border: 1px solid #e5e7eb; border-radius: 14px; text-align: center; font-size: .86rem; }
    .flow__node span { font-size: 1.5rem; }
    .flow__node--hub { background: #e07a3a; border-color: #e07a3a; color: #fff; }
    .flow__node--hub strong { color: #fff; }
    .flow__pipe { position: relative; height: 4px; background: #fdeee4; border-radius: 4px; overflow: hidden; }
    .flow__pipe i { position: absolute; top: 0; width: 18px; height: 4px; border-radius: 4px; background: #e07a3a; animation: flow 1.8s linear infinite; }
    .flow__pipe i:nth-child(2) { animation-delay: .6s; } .flow__pipe i:nth-child(3) { animation-delay: 1.2s; }
    .flow__pipe--rev i { animation-direction: reverse; }
    @keyframes flow { from { left: -20px; } to { left: 100%; } }
    @media (max-width: 700px) { .flow { grid-template-columns: 1fr; } .flow__pipe { height: 26px; width: 4px; justify-self: center; } .flow__pipe i { display: none; } }
  `,
})
export class ErpMock extends Mock {
  nav = computed(() => [this.tr('Sync status', 'Estado'), this.tr('Mappings', 'Mapeos'), this.tr('Schedules', 'Programación'), this.tr('Logs', 'Registros'), this.tr('Settings', 'Ajustes')]);
  log = computed(() => [
    { t: '14:35:02', e: this.tr('Order', 'Pedido') + ' #88213', d: this.tr('Store → ERP', 'Tienda → ERP'), x: this.tr('Sale created', 'Venta creada'), r: 'OK', k: 'ok' },
    { t: '14:35:02', e: this.tr('Invoice', 'Factura') + ' F-55120', d: this.tr('ERP → Store', 'ERP → Tienda'), x: this.tr('Invoice attached to order', 'Factura asociada al pedido'), r: 'OK', k: 'ok' },
    { t: '14:30:01', e: 'SKU LD-6060', d: this.tr('ERP → Store', 'ERP → Tienda'), x: this.tr('Stock 42 → 38', 'Stock 42 → 38'), r: 'OK', k: 'ok' },
    { t: '14:30:01', e: this.tr('Customer', 'Cliente') + ' 77.412.9xx-x', d: this.tr('Store → ERP', 'Tienda → ERP'), x: this.tr('Missing tax ID', 'Falta RUT'), r: this.tr('Retrying', 'Reintento'), k: 'warn' },
    { t: '14:25:00', e: this.tr('Order', 'Pedido') + ' #88207', d: this.tr('Store → ERP', 'Tienda → ERP'), x: this.tr('Sale created', 'Venta creada'), r: 'OK', k: 'ok' },
    { t: '14:20:00', e: this.tr('Price list', 'Lista de precios'), d: this.tr('ERP → Store', 'ERP → Tienda'), x: this.tr('ERP timeout', 'ERP no responde'), r: 'Error', k: 'bad' },
  ]);
}

// ------------------------------------------------------------------ Dashboard de reportes
@Component({
  selector: 'demo-reports',
  template: `
    <div class="m-app" style="--ac:#0f8b8d; --ac-soft:#e0f3f3">
      <nav class="m-side">
        <div class="m-brand"><span class="m-logo">◔</span> Insight</div>
        @for (n of nav(); track $index) { <button class="m-nav" [class.is-on]="$index === 0">{{ n }}</button> }
      </nav>
      <main class="m-main">
        <div class="m-top">
          <div><h1>{{ tr('Business overview', 'Resumen del negocio') }}</h1><p class="m-sub">{{ tr('Last 12 months · updated 5 min ago', 'Últimos 12 meses · actualizado hace 5 min') }}</p></div>
          <div class="m-tabs">
            @for (p of periods(); track $index) { <button class="m-tab" [class.is-on]="period() === $index" (click)="period.set($index)">{{ p }}</button> }
          </div>
        </div>
        <div class="m-kpis">
          <div class="m-kpi"><small>{{ tr('Revenue', 'Ingresos') }}</small><strong>{{ money(842300000) }}</strong><em class="up">▲ 18,4%</em></div>
          <div class="m-kpi"><small>{{ tr('Gross margin', 'Margen bruto') }}</small><strong>34,2%</strong><em class="up">▲ 2,1 pp</em></div>
          <div class="m-kpi"><small>{{ tr('New customers', 'Clientes nuevos') }}</small><strong>1.932</strong><em class="up">▲ 9%</em></div>
          <div class="m-kpi"><small>{{ tr('Average ticket', 'Ticket promedio') }}</small><strong>{{ money(48900) }}</strong><em class="down">▼ 1,3%</em></div>
        </div>
        <div class="m-grid2">
          <section class="m-card">
            <h2>{{ tr('Monthly revenue', 'Ingresos mensuales') }} <small>{{ tr('millions', 'millones') }}</small></h2>
            <svg viewBox="0 0 600 220" class="chart" role="img" [attr.aria-label]="tr('Monthly revenue', 'Ingresos mensuales')">
              @for (g of [0, 1, 2, 3]; track g) { <line x1="30" x2="590" [attr.y1]="20 + g * 55" [attr.y2]="20 + g * 55" stroke="#f0f1f3"/> }
              <path [attr.d]="area()" fill="#0f8b8d" fill-opacity=".1"/>
              <polyline [attr.points]="line()" fill="none" stroke="#0f8b8d" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
              @for (p of pts(); track $index) { <circle [attr.cx]="p.x" [attr.cy]="p.y" r="3.5" fill="#fff" stroke="#0f8b8d" stroke-width="2"/> }
              @for (m of months(); track $index) { <text [attr.x]="40 + $index * 50" y="214" font-size="11" fill="#9ca3af" text-anchor="middle">{{ m }}</text> }
            </svg>
          </section>
          <section class="m-card">
            <h2>{{ tr('Sales by region', 'Ventas por región') }}</h2>
            <ul class="m-list">
              @for (r of regions; track r.n) {
                <li style="display:grid; grid-template-columns: 96px 1fr 40px; align-items:center"><span>{{ r.n }}</span><div class="m-bar"><span [style.width.%]="r.v"></span></div><strong style="text-align:right">{{ r.v }}%</strong></li>
              }
            </ul>
            <h2 style="margin-top:22px">{{ tr('Top products', 'Productos más vendidos') }}</h2>
            <ul class="m-list">
              @for (p of top(); track $index) { <li><span>{{ $index + 1 }}. {{ p.n }}</span><strong>{{ money(p.v) }}</strong></li> }
            </ul>
          </section>
        </div>
      </main>
    </div>
  `,
  styles: `.chart { width: 100%; height: auto; display: block; }`,
})
export class ReportsMock extends Mock {
  period = signal(2);
  periods = computed(() => [this.tr('30 days', '30 días'), this.tr('Quarter', 'Trimestre'), this.tr('12 months', '12 meses')]);
  nav = computed(() => [this.tr('Overview', 'Resumen'), this.tr('Sales', 'Ventas'), this.tr('Customers', 'Clientes'), this.tr('Products', 'Productos'), this.tr('Exports', 'Exportar')]);
  months = computed(() => this.i18n.lang() === 'es'
    ? ['dic', 'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov']
    : ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov']);
  private values = [52, 48, 55, 61, 58, 66, 71, 69, 77, 82, 79, 91];
  pts = computed(() => this.values.map((v, i) => ({ x: 40 + i * 50, y: 185 - (v - 40) * 3 })));
  line = computed(() => this.pts().map((p) => `${p.x},${p.y}`).join(' '));
  area = computed(() => `M40,185 L${this.line().replace(/ /g, ' L')} L590,185 Z`);
  regions = [{ n: 'Metropolitana', v: 46 }, { n: 'Valparaíso', v: 18 }, { n: 'Biobío', v: 14 }, { n: 'Los Lagos', v: 9 }, { n: 'Otras', v: 13 }];
  top = computed(() => [
    { n: this.tr('Annual plan · Pro', 'Plan anual · Pro'), v: 128400000 },
    { n: this.tr('Starter kit', 'Kit de inicio'), v: 96200000 },
    { n: this.tr('Premium support', 'Soporte premium'), v: 71900000 },
    { n: this.tr('Monthly plan · Basic', 'Plan mensual · Básico'), v: 54300000 },
  ]);
}

// ------------------------------------------------------------------ Sitio web emprendedor
@Component({
  selector: 'demo-website',
  template: `
    <div class="site">
      <header class="site__nav">
        <strong class="site__brand">Luma <span>Cerámica</span></strong>
        <nav>
          <a>{{ tr('Shop', 'Tienda') }}</a><a>{{ tr('About', 'Nosotros') }}</a><a>{{ tr('Workshops', 'Talleres') }}</a><a>{{ tr('Contact', 'Contacto') }}</a>
        </nav>
        <span class="site__cart">🛍 {{ cart() }}</span>
      </header>
      <section class="site__hero">
        <div>
          <span class="site__kicker">{{ tr('Handmade in Valparaíso', 'Hecho a mano en Valparaíso') }}</span>
          <h1>{{ tr('Ceramics for slow mornings', 'Cerámica para mañanas sin apuro') }}</h1>
          <p>{{ tr('Mugs, plates and vases made one by one, in small batches and with natural glazes.', 'Tazas, platos y floreros hechos uno a uno, en series pequeñas y con esmaltes naturales.') }}</p>
          <a class="m-btn" style="--ac:#b0643b">{{ tr('See the collection', 'Ver la colección') }}</a>
        </div>
        <div class="site__art" aria-hidden="true"><i></i><i></i><i></i></div>
      </section>
      <section class="site__shop">
        <h2>{{ tr('New collection', 'Nueva colección') }}</h2>
        <div class="site__grid">
          @for (p of products(); track p.n) {
            <article class="prod">
              <div class="prod__img" [style.background]="p.bg"><span [style.background]="p.fg" [style.border-radius]="p.shape"></span></div>
              <h3>{{ p.n }}</h3>
              <div class="prod__row"><span>{{ money(p.price) }}</span><button class="m-btn" style="--ac:#b0643b; padding:6px 12px" (click)="cart.set(cart() + 1)">+ {{ tr('Add', 'Agregar') }}</button></div>
            </article>
          }
        </div>
      </section>
      <section class="site__contact">
        <div>
          <h2>{{ tr('Custom orders', 'Pedidos personalizados') }}</h2>
          <p class="m-muted">{{ tr('Weddings, restaurants or gifts: tell us what you have in mind.', 'Matrimonios, restaurantes o regalos: cuéntanos qué tienes en mente.') }}</p>
        </div>
        <form class="site__form" (submit)="$event.preventDefault()">
          <input class="m-input" [placeholder]="tr('Your email', 'Tu email')">
          <textarea class="m-input" rows="3" [placeholder]="tr('What would you like?', '¿Qué te gustaría?')"></textarea>
          <button class="m-btn" style="--ac:#b0643b; justify-content:center">{{ tr('Send', 'Enviar') }}</button>
        </form>
      </section>
      <footer class="site__foot">© 2026 Luma Cerámica · Valparaíso, Chile</footer>
    </div>
  `,
  styles: `
    .site { background: #fbf7f2; color: #3d2f27; min-height: calc(100dvh - 38px); }
    .site h1, .site h2, .site h3 { color: #3d2f27; }
    .site__nav { display: flex; align-items: center; gap: 24px; padding: 18px 6vw; border-bottom: 1px solid #efe4d8; }
    .site__brand { font: 800 1.2rem/1 var(--font-title, Manrope, sans-serif); }
    .site__brand span { color: #b0643b; font-weight: 600; }
    .site__nav nav { display: flex; gap: 22px; margin-left: auto; font-size: .9rem; }
    .site__nav nav a { color: #6b5547; cursor: pointer; }
    .site__cart { font-weight: 700; font-size: .9rem; }
    .site__hero { display: grid; grid-template-columns: 1.1fr .9fr; gap: 40px; align-items: center; padding: 56px 6vw; }
    .site__hero > div:first-child { display: grid; gap: 16px; justify-items: start; }
    .site__kicker { color: #b0643b; font-weight: 700; font-size: .82rem; letter-spacing: .05em; font-variant-caps: small-caps; }
    .site__hero h1 { font-size: clamp(2rem, 4vw, 3rem); line-height: 1.1; }
    .site__hero p { color: #6b5547; max-width: 460px; }
    .site__art { position: relative; height: 260px; border-radius: 28px; background: #f1e3d3; overflow: hidden; }
    .site__art i { position: absolute; bottom: 30px; border-radius: 40% 40% 14px 14px; }
    .site__art i:nth-child(1) { left: 16%; width: 90px; height: 120px; background: #b0643b; }
    .site__art i:nth-child(2) { left: 42%; width: 70px; height: 170px; background: #e7c9a9; border-radius: 50% 50% 18px 18px; }
    .site__art i:nth-child(3) { left: 66%; width: 100px; height: 80px; background: #7d8f74; }
    .site__shop { padding: 10px 6vw 40px; display: grid; gap: 20px; }
    .site__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 18px; }
    .prod { background: #fff; border-radius: 16px; padding: 12px; display: grid; gap: 10px; box-shadow: 0 1px 2px rgba(61,47,39,.06); }
    .prod__img { height: 150px; border-radius: 12px; display: grid; place-items: center; }
    .prod__img span { width: 70px; height: 80px; }
    .prod h3 { font-size: .95rem; }
    .prod__row { display: flex; justify-content: space-between; align-items: center; font-weight: 700; }
    .site__contact { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; padding: 40px 6vw; background: #f1e3d3; align-items: start; }
    .site__contact > div { display: grid; gap: 10px; }
    .site__form { display: grid; gap: 10px; }
    .site__foot { padding: 20px 6vw; font-size: .8rem; color: #8a7465; }
    @media (max-width: 760px) { .site__hero, .site__contact { grid-template-columns: 1fr; } .site__nav nav { display: none; } .site__cart { margin-left: auto; } }
  `,
})
export class WebsiteMock extends Mock {
  cart = signal(0);
  products = computed(() => [
    { n: this.tr('"Bruma" mug', 'Taza "Bruma"'), price: 14900, bg: '#efe4d8', fg: '#b0643b', shape: '12px 12px 22px 22px' },
    { n: this.tr('"Duna" plate', 'Plato "Duna"'), price: 18900, bg: '#e9efe6', fg: '#7d8f74', shape: '50%' },
    { n: this.tr('"Faro" vase', 'Florero "Faro"'), price: 32900, bg: '#f4e6dc', fg: '#e7c9a9', shape: '45% 45% 14px 14px' },
    { n: this.tr('"Ola" bowl', 'Bowl "Ola"'), price: 16900, bg: '#e6edf2', fg: '#6f8fa6', shape: '14px 14px 50% 50%' },
  ]);
}
