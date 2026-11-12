# SPEC 03 — Página "Acerca de" y formulario de contacto con Resend

> **Status:** Aprobado
> **Depends on:** SPEC 02
> **Date:** 2026-11-11
> **Objective:** Portar `about.jsx` del template `references/resources/templates/home-about/` como la ruta `/acerca-de` y hacer que su formulario de contacto envíe un correo real al equipo mediante una Server Action con Resend.

## Por qué existe este spec

La spec 02 dejó "Acerca de" fuera del alcance y sin enlace en el Nav, porque no existía la página. El template la incluye con un formulario que hoy solo simula el envío (muestra la terminal de éxito sin mandar nada). Este spec fija cómo se porta la página y cómo se conecta el formulario a Resend, incluidos los casos de error, que el template no contempla.

## Scope

**In:**

- Nueva ruta `/acerca-de` con las secciones del template (`about.jsx`):
  - Hero: kicker "▸ ACERCA DE", título "ACERCA DE ARCADE VAULT", párrafo de misión y 3 tarjetas de resaltado con icono pixel (`HEART` magenta, `BROWSER` cyan, `PLANT` green).
  - Divisor decorativo con 24 píxeles animados (`aria-hidden`).
  - Sección de contacto: kicker "▸ CONTACTO", título "CONTÁCTANOS", subtítulo, 3 indicadores ("RESPUESTA EN 24-48H", "SUGERENCIAS BIENVENIDAS", "SIN SPAM, JAMÁS") y formulario.
- Formulario con campos NOMBRE, CORREO ELECTRÓNICO y MENSAJE, botón "▶  ENVIAR MENSAJE", animación `shake` si hay campos vacíos y terminal de éxito "VAULT-OS // TERMINAL" con el botón "ENVIAR OTRO MENSAJE". Textos y estructura idénticos al template.
- Envío real del correo con una Server Action (`app/actions/contact.ts`) y el SDK `resend`.
- Validación en el servidor (campos obligatorios, formato de correo, longitudes máximas) y honeypot contra bots.
- Estado de error en pantalla, con estilo terminal, cuando el envío falla. El formulario conserva lo escrito.
- Estado "enviando" en el botón mientras la acción está en curso.
- Animación `.reveal` en el divisor y en la sección de contacto, reutilizando `Reveal` de la spec 02.
- Nav: añadir "Acerca de" (`/acerca-de`) en la barra y el panel móvil. Orden: Inicio · Biblioteca · Salón de la Fama · Acerca de.
- Añadir a `app/globals.css` las clases del template que falten (`about-*`, `highlight*`, `hl-*`, `contact-*`, `tip*`, `terminal-success`, `term-*`, `shake`, `pxblink`, etc.).
- Documentar las variables de entorno en un `.env.example` (sin valores reales).

**Out of scope (para futuros specs):**

- Rate limit por IP u otro control de abuso persistente (exige infraestructura como Redis o KV).
- Correo de confirmación al visitante (con el remitente de prueba de Resend solo se entrega a la cuenta propia; exige dominio verificado).
- Plantilla HTML del correo. El correo es de texto plano.
- Guardar los mensajes en base de datos o mostrarlos en un panel.
- Verificación del dominio de envío en Resend y configuración de `CONTACT_FROM_EMAIL` en producción.
- CAPTCHA (Turnstile, reCAPTCHA).
- Enlace a "Acerca de" en el footer.
- Tests automatizados (no hay runner configurado).
- Cambios en las pantallas de las specs 01 y 02 más allá del Nav.

## Data model

La feature no introduce datos persistentes. Define el contrato de la Server Action y las variables de entorno.

```ts
// app/actions/contact.ts
"use server";

export type ContactField = "name" | "email" | "msg";

export type ContactState =
  | { status: "idle" }
  | { status: "success"; name: string }                       // nombre ya recortado
  | { status: "error"; message: string; fields?: ContactField[] };

export async function sendContact(
  prev: ContactState,
  formData: FormData,
): Promise<ContactState>;
```

Campos del `FormData`: `name`, `email`, `msg` y el honeypot `website` (debe llegar vacío).

Reglas de validación (en el servidor; el cliente solo aplica el `shake` si hay vacíos):

| Campo | Regla |
| --- | --- |
| `name` | Obligatorio tras `trim()`, máx. 60 caracteres |
| `email` | Obligatorio, formato válido, máx. 120 caracteres |
| `msg` | Obligatorio tras `trim()`, máx. 2000 caracteres |
| `website` (honeypot) | Si trae contenido, la acción devuelve `success` sin enviar nada |

Variables de entorno (ya presentes en `.env.local`):

| Variable | Uso |
| --- | --- |
| `RESEND_API_KEY` | Obligatoria. Clave de la API de Resend. |
| `CONTACT_TO_EMAIL` | Obligatoria. Destino de los mensajes. |
| `CONTACT_FROM_EMAIL` | Opcional. Por defecto `Arcade Vault <onboarding@resend.dev>`. |

Correo enviado:

- `from`: `CONTACT_FROM_EMAIL` o el valor por defecto.
- `to`: `CONTACT_TO_EMAIL`.
- `replyTo`: el correo del visitante.
- `subject`: `[Arcade Vault] Mensaje de {nombre}`.
- `text`: líneas "Nombre", "Correo" y "Mensaje".

Convenciones:

- Todos los textos de la UI se copian del template, en español.
- Los textos de error de la acción también están en español y no exponen detalles internos de Resend ni de las variables de entorno.
- Los valores del visitante nunca se interpolan en el `from`, `to` ni en cabeceras sin quitar saltos de línea (el `subject` se sanea).

## Implementation plan

1. Instalar el SDK (`npm install resend`) y crear `.env.example` con `RESEND_API_KEY`, `CONTACT_TO_EMAIL` y `CONTACT_FROM_EMAIL`. Confirmar que `.env.example` no queda ignorado por `.gitignore` (hoy `.env*` lo ignora; añadir la excepción `!.env.example`). Prueba manual: `npx tsc --noEmit` sin errores.
2. Leer en `node_modules/next/dist/docs/` la guía de Server Actions y formularios (`useActionState`) y las notas de `cacheComponents` antes de escribir código. Prueba manual: ninguna; el resultado es decidir la firma final de la acción.
3. Crear `app/actions/contact.ts` con `sendContact`: validación, honeypot, envío con Resend, captura de errores y estados de `ContactState`. Si falta `RESEND_API_KEY` o `CONTACT_TO_EMAIL`, devuelve error genérico y registra el motivo solo en el servidor. Prueba manual: `npx tsc --noEmit` sin errores.
4. Comparar `app/globals.css` con `references/resources/templates/home-about/styles.css` (desde `.about` hasta el final del bloque de contacto) y añadir solo las clases que falten, incluidas las `@keyframes` `shake` y `pxblink`, el estilo de `textarea` y los `@media` responsivos. Añadir además estilos mínimos para el estado de error de la terminal reutilizando `.terminal-success` con variante de color (`--magenta`). Prueba manual: `npm run dev` arranca y las pantallas existentes no cambian.
5. Crear `app/components/about/highlight-icon.tsx` (Server Component) con los 3 iconos SVG del template. Prueba manual: `npx tsc --noEmit` sin errores.
6. Crear `app/components/about/contact-form.tsx` (Client Component) con `useActionState(sendContact, ...)`, `useFormStatus` o `isPending` para el botón, `shake` cuando el envío cliente detecta campos vacíos (sin llamar a la acción), terminal de éxito con `{nombre.toUpperCase()}`, terminal de error con botón "REINTENTAR" y honeypot `website` oculto (`aria-hidden`, `tabIndex={-1}`, `autoComplete="off"`). "ENVIAR OTRO MENSAJE" vuelve al formulario vacío. Prueba manual: con la acción apuntando a un valor falso, el formulario cambia de estado.
7. Permitir que `Reveal` use un elemento distinto de `<section>` (prop `as`, con `section` por defecto) para el divisor, que en el template es un `div`. No debe cambiar el uso en la landing. Prueba manual: `/` sigue animando las secciones igual.
8. Crear `app/acerca-de/page.tsx` como Server Component con hero, divisor y sección de contacto (usando `ContactForm`), incluyendo `metadata` con el título "Acerca de | Arcade Vault". Prueba manual: `/acerca-de` carga con las dos secciones.
9. Actualizar `app/components/nav.tsx`: añadir "Acerca de" (`/acerca-de`) en la barra y el panel móvil, y marcarlo activo solo en `/acerca-de`. Prueba manual: el enlace aparece y se marca bien en `/acerca-de`; "Inicio" y "Biblioteca" siguen igual.
10. Probar el envío real con las claves de `.env.local`: mensaje válido, campos vacíos, correo inválido, honeypot relleno y clave de Resend inválida. Prueba manual: ver criterios de aceptación.
11. Pulir: revisión a 375 px de ancho (tarjetas de resaltado y rejilla de contacto a 1 columna, sin scroll horizontal) y con `prefers-reduced-motion` (las secciones con `.reveal` son visibles sin animación). Actualizar `CLAUDE.md` con las variables de entorno nuevas y el uso de Resend.

## Acceptance criteria

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `/acerca-de` carga sin errores en la consola y muestra el título "ACERCA DE ARCADE VAULT", las 3 tarjetas de resaltado, el divisor y el título "CONTÁCTANOS".
- [ ] El Nav muestra "Acerca de" (barra y panel móvil) en el orden Inicio · Biblioteca · Salón de la Fama · Acerca de, y solo está activo en `/acerca-de`.
- [ ] Con los tres campos vacíos, al pulsar "▶  ENVIAR MENSAJE" el formulario hace `shake` y no se llama a la Server Action (no hay petición de red).
- [ ] Un mensaje válido llega al correo de `CONTACT_TO_EMAIL` con asunto `[Arcade Vault] Mensaje de {nombre}`, y al pulsar "Responder" el destinatario es el correo del visitante.
- [ ] Tras el envío válido se muestra la terminal "VAULT-OS // TERMINAL" con el texto "MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {NOMBRE EN MAYÚSCULAS}.".
- [ ] "ENVIAR OTRO MENSAJE" vuelve al formulario con los tres campos vacíos.
- [ ] Mientras se envía, el botón está deshabilitado y muestra un texto de "enviando", y no se puede enviar dos veces.
- [ ] Enviar a la acción un correo sin formato válido (saltándose el cliente) devuelve `status: "error"` y no se envía ningún correo.
- [ ] Un mensaje de más de 2000 caracteres o un nombre de más de 60 devuelve error y no envía.
- [ ] Con el honeypot `website` relleno, la UI muestra la terminal de éxito y no se envía ningún correo.
- [ ] Con una `RESEND_API_KEY` inválida o ausente, la UI muestra la terminal de error con texto en español, conserva nombre, correo y mensaje, y el texto del error no contiene la clave ni el mensaje crudo de Resend.
- [ ] "REINTENTAR" en el estado de error vuelve al formulario con los datos intactos.
- [ ] `RESEND_API_KEY` no aparece en el HTML, en el JS del cliente (`.next/static`) ni en la consola del navegador.
- [ ] `.env.example` existe, está versionado y no contiene valores reales.
- [ ] Las secciones con `.reveal` pasan a visibles al entrar en el viewport, y con `prefers-reduced-motion: reduce` son visibles sin scroll previo.
- [ ] A 375 px de ancho no hay scroll horizontal en `/acerca-de`.
- [ ] No hay errores de hidratación en consola al cargar `/acerca-de` con y sin sesión guardada.
- [ ] `/`, `/biblioteca` y `/salon` siguen funcionando sin cambios visuales.

## Decisions

- **Sí:** ruta `/acerca-de`. Coincide con la carpeta ya creada y con las demás rutas en español (`/biblioteca`, `/salon`).
- **No:** `/about`. Rompe la convención de idioma de las rutas.
- **Sí:** Server Action con el SDK `resend`. La clave queda en el servidor, no hay endpoint público que mantener y el SDK ya tipa los errores.
- **No:** Route Handler `/api/contact`. Solo tendría sentido con otro cliente que consuma la API, y no existe.
- **No:** `fetch` directo a la API REST de Resend. Evita una dependencia pero obliga a manejar a mano errores y tipos.
- **Sí:** correo de texto plano con `Reply-To` igual al correo del visitante. Permite contestar directo desde el cliente de correo y es lo mínimo que cubre el pedido.
- **No:** plantilla HTML ni confirmación al visitante. La confirmación no se puede probar con el remitente de prueba (`onboarding@resend.dev` solo entrega a la cuenta propia) y la plantilla no estaba en el template.
- **Sí:** validación en el servidor además del `shake` del cliente. El cliente no es de fiar y la acción es un endpoint público de facto.
- **Sí:** honeypot (`website`) y devolver `success` silencioso a los bots. Es barato y no necesita infraestructura.
- **No:** rate limit en esta spec. En memoria no funciona en serverless y uno persistente exige un servicio externo; se deja para otro spec si aparece spam.
- **Sí:** estado de error en pantalla con estilo terminal y conservación de los datos. El template no lo contempla, pero mostrar siempre éxito aunque Resend falle mentiría al usuario.
- **Sí:** mensajes de error genéricos hacia el cliente y el detalle real solo en el log del servidor. Evita filtrar información de configuración.
- **Sí:** reutilizar `Reveal` de la spec 02 añadiendo una prop `as`, en lugar de duplicar el `IntersectionObserver`. Una sola implementación de la animación.
- **Sí:** CSS plano con las clases del template en `app/globals.css`, igual que en las specs 01 y 02. Es lo más fiel al diseño pedido ("exactamente igual").
- **Sí:** "Acerca de" en el Nav, al final, como en el template. La spec 02 lo dejó fuera solo porque no había página.
- **Sí:** consultar `node_modules/next/dist/docs/` antes de escribir código Next.js (`cacheComponents`, Server Actions) y respetar `/frontend-design`, como indica `CLAUDE.md`.

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Con el remitente de prueba `onboarding@resend.dev`, Resend solo entrega al correo de la cuenta y rechaza otros destinos | `CONTACT_TO_EMAIL` debe ser el correo de la cuenta de Resend mientras no haya dominio verificado. El paso 10 lo prueba y `.env.example` lo documenta. |
| Inyección de cabeceras vía el nombre o el correo en `subject` o `replyTo` | Se validan formato y longitud, y se eliminan saltos de línea del `subject`. El SDK envía JSON, no cabeceras en crudo. |
| Spam sin rate limit | Honeypot más validación. Si hay abuso real, se aborda en otro spec con almacenamiento persistente. |
| `cacheComponents` obliga a tratar las APIs dinámicas de otra forma | El paso 2 lee la documentación local. La página es estática y solo la acción es dinámica, así que no debería haber conflicto. |
| `.env*` está ignorado y `.env.example` no se versionaría | El paso 1 añade la excepción `!.env.example` al `.gitignore`. |
| Colisión de nombres entre clases nuevas y las existentes (`.field`, `.shake`, `.tip`, `.dot`) | El paso 4 compara ambos CSS y añade solo lo que falta, sin sobrescribir reglas existentes. |
| La API de Resend falla o tarda, y el usuario queda esperando | El botón muestra "enviando", el `catch` devuelve el estado de error y el usuario puede reintentar sin perder el texto. |
| Se cuelan claves en el bundle del cliente | La acción vive en un archivo `"use server"` y se lee `process.env` solo ahí. Se verifica con búsqueda en `.next/static` en los criterios de aceptación. |

## What is **not** in this spec

- Rate limit, CAPTCHA u otro control de abuso persistente.
- Correo de confirmación al visitante y plantilla HTML del correo.
- Almacenar los mensajes o mostrarlos en un panel.
- Verificar el dominio de envío en Resend y configurar el remitente de producción.
- Enlace a "Acerca de" en el footer.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propio spec.
