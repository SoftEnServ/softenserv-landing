# Dominio y correo: softenserv.cl

## 1. Apuntar softenserv.cl a tu servidor (NIC Chile + Cloudflare)

NIC Chile no administra registros DNS: solo apunta el dominio a unos servidores de nombre. La forma más simple y
gratuita es usar Cloudflare, que además puede darle HTTPS a tu servidor.

1. Crea una cuenta en <https://dash.cloudflare.com>, elige **Add a domain**, escribe `softenserv.cl` y selecciona el plan **Free**.
2. Cloudflare te entrega **dos servidores de nombre**, por ejemplo `ana.ns.cloudflare.com` y `bob.ns.cloudflare.com`.
3. En <https://www.nic.cl>, entra a **Mis dominios → softenserv.cl → Servidores de nombre (DNS)**, reemplaza los
   que haya por los dos de Cloudflare y guarda. El cambio puede tardar algunas horas.
4. En Cloudflare, **DNS → Records**, crea estos registros con la IP pública de tu servidor (por ejemplo el VPS de Clouding):

   | Tipo | Nombre | Valor |
   |---|---|---|
   | A | `@` | IP de tu servidor |
   | CNAME | `www` | `softenserv.cl` |

   Con **Proxy status: Proxied** (nube naranja), Cloudflare entrega HTTPS a los visitantes y oculta la IP del servidor.
   Mientras el servidor solo sirva HTTP (puerto 80, como el `docker-compose.yml` actual), usa en
   **SSL/TLS → Overview** el modo **Flexible**; cuando le pongas un certificado al servidor, cambia a **Full (strict)**.

Este paso no afecta el correo: el correo usa registros distintos (MX). Puedes cambiar la IP del servidor cuando
quieras, en el registro `A`.

## 2. Email con tu dominio (contacto@softenserv.cl → tu Gmail)

Cloudflare Email Routing es gratis: recibe los correos enviados a tu dominio y los reenvía a tu Gmail. Antes, el dominio ya debe usar los servidores de nombre de Cloudflare (paso 1).

1. En Cloudflare, abre **softenserv.cl → Email → Email Routing**.
2. Revisa los registros que va a agregar y pulsa **Add records and enable**. Si el dominio ya tenía registros MX, Cloudflare pregunta si borrarlos: tienen que borrarse, porque mientras existan no puede activar el servicio.
3. Ve a **Routing rules → Custom addresses → Create address**:
   - Custom address: `contacto` (queda `contacto@softenserv.cl`)
   - Action: **Send to an email**
   - Destination: `softenserv@gmail.com`

   Pulsa **Save**.
4. Cloudflare envía un correo de verificación a tu Gmail. Ábrelo y pulsa **Verify email address**. En Email Routing, el destino debe aparecer como **Verified**.
5. Pulsa **Add records and finish**: Cloudflare agrega solo los registros MX y SPF necesarios (es solo la primera vez).
6. Opcional: activa **Catch-all address → Send to an email → softenserv@gmail.com**. Así también te llegan los correos enviados a direcciones mal escritas, como `contato@softenserv.cl`.
7. **Prueba:** desde otra cuenta (no desde softenserv@gmail.com), envía un correo a `contacto@softenserv.cl`. Debe llegarte al Gmail en menos de un minuto. Revisa también Spam la primera vez.

Recién cuando la prueba funcione, cambia el email de la página (y al que llegan los mensajes del formulario) en la base de datos:

```sql
UPDATE site_settings SET contact_email = 'contacto@softenserv.cl';
```

**Responder como contacto@softenserv.cl (opcional):** Cloudflare solo recibe y no envía. Para que tus respuestas salgan con el dominio, crea una cuenta gratuita en Brevo, verifica `softenserv.cl` (agrega en Cloudflare los registros DNS que Brevo te indique) y copia sus datos SMTP. Luego, en Gmail: **Configuración → Cuentas e importación → Enviar como → Añadir otra dirección**, con `contacto@softenserv.cl` y el servidor SMTP, usuario y clave de Brevo.
