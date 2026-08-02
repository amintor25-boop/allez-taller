# ALLEZ Taller — demo de ventas

Sistema de gestión para talleres mecánicos, en versión demostración.
Next.js 16 · React 19 · Tailwind · libSQL (SQLite local en desarrollo, Turso en producción).

## Levantarlo

```bash
npm install
cp .env.example .env.local
npm run demo:sembrar     # crea Taller San Rafael en /d/san-rafael
npm run dev
```

| Comando | Qué hace |
|---|---|
| `npm run demo:sembrar` | Resiembra el demo principal (`san-rafael`) a su estado inicial |
| `npm run demo:sembrar "Taller Pérez"` | Crea un enlace nuevo para un prospecto |
| `npm run demo:inspeccionar` | Vuelca el contenido de todos los demos y comprueba el aislamiento |
| `npm run demo:enlaces` | Lista los enlaces públicos `/o/…` de un demo (para probar en el celular) |

`/admin` es la consola: genera un enlace por prospecto y enseña el registro de
uso —quién abrió el suyo, cuántas visitas, qué tocó—. No lleva contraseña a
propósito: es una herramienta de una sola persona en su propia laptop, y una
contraseña olvidada delante de un prospecto cuesta más de lo que protege.

Cada enlace es una copia aislada con su propio RUC, sus propios clientes y sus
doce meses de historial. Se reinicia solo tras 48 h sin uso, y hay un botón para
hacerlo a mano al pie de **Configuración**.

## Placas para la reunión

`PBH-0472`, `PCX-5518` y `PBK-4407` son los tres vehículos **sin orden abierta** y
**con historial**: sirven para hacer la recepción en vivo delante del prospecto.
Cualquier otra placa del taller ya está adentro y Recepción avisará de eso en vez
de dejar abrir una orden repetida.

La orden preparada para el hallazgo en vivo es la **#0412, Chevrolet Sail
`PBX-1234`**, en diagnóstico.

## El camino de oro

```
1. Tablero                      /d/san-rafael
2. Recepción por placa          escribe PBH-0472 (o PCX-5518 / PBK-4407)
3. Crear la orden               kilometraje · combustible · observación · foto
4. Abrir el Sail PBX-1234       toca la ficha "Pastillas de freno · $86"
5. Enviar presupuesto           el modal se abre sobre el tablero con el QR
6. El prospecto escanea         aprueba desde SU celular
7. La tarjeta viaja sola        a "En reparación", ~3 s después
8. Marcar lista y facturar      comprobante con clave de acceso SRI
```

## Que el QR funcione desde el celular

Un comando, y te dice exactamente qué abrir:

```bash
npm run dev:red
```

Imprime las direcciones de tu red y levanta el servidor escuchando en `0.0.0.0`.
**Entra al tablero por la IP, no por `localhost`** — el QR se genera con la
dirección que uses para entrar. Con `localhost` el QR diría `localhost`, que en un
teléfono apunta al propio teléfono.

### Comprobar antes de ensayar

Desde el celular, en el mismo wifi, abre `http://TU-IP:3000/salud`.
Si sale **"Conectado"** en verde, el QR va a funcionar. Si no carga, revisa en
este orden:

| Punto | Cómo verificarlo | Cómo arreglarlo |
|---|---|---|
| **1. En qué interfaz escucha Next** | `lsof -nP -iTCP:3000 -sTCP:LISTEN` → tiene que decir `*:3000`, no `127.0.0.1:3000` | `npm run dev:red` fuerza `-H 0.0.0.0` |
| **2. Firewall de macOS** | `/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate` y `--listapps \| grep node` | `sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add $(which node) --unblockapp $(which node)` |
| **3. Misma subred** | En el celular: Ajustes → Wi-Fi → (i). Su IP debe empezar igual que la de la laptop (`192.168.2.x`) | Conecta ambos a la MISMA red. Ojo con la de invitados y con 2,4 GHz vs 5 GHz separadas |
| **4. Aislamiento de clientes (AP isolation)** | Si están en la misma subred y aun así no carga, es el router | Desactiva "AP isolation" / "Aislamiento de clientes" en el panel del router, o usa el túnel de abajo |

En esta máquina, los puntos 1 y 2 ya están comprobados y correctos: Next escucha
en `*:3000` y `/usr/local/bin/node` figura autorizado en el firewall.

### Si el router no coopera: túnel temporal

Solo para ensayar. **No es la vía de producción** — eso es Netlify (paso 10).

> **Detrás de un túnel hay que servir la COMPILACIÓN, no `npm run dev`.**
>
> El servidor de desarrollo pide un archivo llamado
> `[turbopack]_browser_dev_hmr-client…js`. Los corchetes viajan codificados
> (`%5B…%5D`) y el túnel no lo entrega: devuelve `HTTP 000`. Sin ese archivo el
> runtime de desarrollo no arranca, **React nunca se activa** y queda una página
> que se ve perfecta y donde ningún botón responde. Se pinta porque el HTML viene
> del servidor; está muerta porque el JavaScript nunca corrió.
>
> Con la compilación de producción no existe ese archivo: 11 piezas, 642 KB,
> ninguna falla.

```bash
# 1. compilar y servir (con `npm run dev` DETENIDO)
npm run build
npx next start -p 3000

# 2. en otra terminal, el túnel
cloudflared tunnel --url http://localhost:3000
```

Si no hay Homebrew, el binario oficial:

```bash
curl -sL -o /tmp/cf.tgz https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz && tar -xzf /tmp/cf.tgz -C ~/.local/bin && chmod +x ~/.local/bin/cloudflared
```

Devuelve una dirección `https://algo-random.trycloudflare.com`. Ponla en
`.env.local` y reinicia el servidor:

```
NEXT_PUBLIC_BASE_URL=https://algo-random.trycloudflare.com
```

Ahora el QR apunta al túnel y funciona desde **cualquier** red, con HTTPS y sin
depender del router. La dirección cambia cada vez que levantas el túnel, así que
hay que actualizar `.env.local` en cada ensayo. **Déjala vacía otra vez** cuando
vuelvas a la red local.

## Publicarlo: Netlify + Turso

Coste cero y sin tarjeta. **No Vercel**: su plan gratuito prohíbe el uso
comercial, y esto es una herramienta de venta.

Netlify no tiene disco donde escribir, así que la base va en Turso. El cliente
que se carga en producción es `@libsql/client/web`, JavaScript puro, para que el
paquete de la función no arrastre binarios nativos —eso lo resuelve
[db.ts](src/lib/db.ts) mirando si la URL empieza por `libsql:` o `https:`.

### 1. Lo único que hay que hacer a mano

Son dos cosas, y las dos son credenciales: no pueden salir de un guion.

**a) Turso.** Entrar a [turso.tech](https://turso.tech), crear la cuenta y una
base llamada `allez-taller`. En su pantalla salen dos datos: la **URL** y un
**token**. Se pegan en `.env.local` —nunca en un chat, nunca en el repositorio;
`.env.local` está en el `.gitignore`:

```
TURSO_DATABASE_URL=libsql://allez-taller-tuusuario.turso.io
TURSO_AUTH_TOKEN=…
```

**b) Netlify.** En una terminal, dentro de esta carpeta:

```bash
npx netlify login
```

Se abre el navegador y se autoriza. La CLI guarda la sesión y ya no vuelve a
pedir nada.

### 2. Todo lo demás, de un comando

```bash
npm run publicar
```

Hace, en este orden, y se para en el primer fallo:

1. comprueba que están las credenciales y la sesión,
2. siembra Turso —3.226 sentencias, 9 viajes— desde tu máquina, sin límite de tiempo,
3. crea el sitio `allez-taller` y enlaza la carpeta,
4. pone las tres variables de entorno (la cuarta se deja vacía a propósito),
5. compila y despliega,
6. comprueba cinco rutas del sitio publicado y cronometra cada una.

Con otro nombre de sitio: `SITIO=taller-mito npm run publicar`.

### 3. Las variables

| Variable | De dónde sale |
|---|---|
| `TURSO_DATABASE_URL` | la pantalla de la base en Turso |
| `TURSO_AUTH_TOKEN` | la misma pantalla |
| `NEXT_PUBLIC_TELEFONO_TALLER` | `+593979279337` |
| `NEXT_PUBLIC_BASE_URL` | **se deja vacía** |

`NEXT_PUBLIC_BASE_URL` es la que decide a dónde apunta el QR, y
[base-url.ts](src/lib/base-url.ts) la resuelve sola desde la cabecera de la
petición: el QR sale con el mismo dominio por el que abriste el tablero. Ponerla
a mano tiene dos trampas — las variables `NEXT_PUBLIC_` se congelan al compilar,
así que cambiarla obliga a volver a desplegar; y si se escribe mal, el QR se ve
perfecto y no lleva a ninguna parte. Eso se descubre con el prospecto delante.

### 4. Comprobar el despliegue

```bash
curl -s https://TU-DOMINIO/salud | grep -o Conectado
curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" https://TU-DOMINIO/d/san-rafael
```

Y con un teléfono fuera del wifi: abrir el tablero, mandar un presupuesto,
escanear el QR y aprobar. Es el único ensayo que prueba lo que importa.

### Por qué esto no se cae contra Turso

Sembrar un demo son **3.226 sentencias en 9 idas a la red**. Una función de
Netlify se corta a los diez segundos, así que eso NO puede correr dentro de la
petición de nadie. Corre en dos sitios y solo en dos:

| Cuándo | Quién espera |
|---|---|
| Al generar el enlace en `/admin` | Tú, una vez por prospecto |
| `npm run demo:sembrar` desde la terminal | Tú, contra Turso, sin límite de tiempo |

El **reinicio de las 48 horas no resiembra**: restaura. Casi nada de lo sembrado
cambia durante una demostración —el historial de doce meses, los vehículos, las
citas y los mecánicos no se tocan—, así que devolver el demo a su estado inicial
es borrar lo que nació en la sesión y reponer unas pocas columnas.

```
sembrar     3.226 sentencias · 9 viajes de red
restaurar      53 sentencias · 1 viaje
```

Comprobado ensuciando el demo a fondo —mover tarjetas, agregar un hallazgo,
enviar el presupuesto, aprobarlo desde el celular, facturar, rechazar otro, dar
de alta un carro nuevo, registrar un repuesto y ajustar existencias— y
comparando contra la foto inicial: **0 diferencias**, y la pieza que agregó el
prospecto sigue ahí con su historial. La lógica está en
[restauracion.ts](src/lib/restauracion.ts).

Lo sembrado se distingue de lo nacido por el identificador: todo lo de la semilla
empieza por el id del demo (`d_abc123-o-418`) y todo lo que crean las rutas lleva
un token al azar (`or_…`, `fa_…`). Comprobado sobre la base: 0 filas sembradas
sin ese prefijo, en las diez tablas.

**Y si alguien teclea a mano un enlace que no existe**, la fila se crea al
instante, la semilla arranca por detrás y la pantalla enseña «Preparando el
taller» con una recarga por `<meta refresh>` —que también funciona sin
JavaScript—. La petición nunca espera a las 3.226 sentencias.

## Inventario: lo único que el prospecto da de alta

El resto de pantallas son de lectura. El inventario no: ahí se registran
repuestos, se ajustan existencias con motivo, y al facturar una orden salen de
bodega los renglones que corresponden a una pieza del catálogo.

- El descuento lo decide [bodega.ts](src/lib/bodega.ts). Empareja por prefijo del
  nombre normalizado y con al menos seis caracteres, así que «Pastillas de freno
  delanteras» descuenta «Pastillas de freno delanteras Sail», pero un renglón de
  mano de obra no toca nada. El stock nunca baja de cero.
- Las salidas van en el **mismo lote** que la factura: o pasan las dos cosas o no
  pasa ninguna.
- **Lo que el prospecto agrega sobrevive al reinicio.** Las piezas sembradas
  llevan `sembrada = 1` y vuelven a su estado inicial; las suyas llevan `0` y se
  quedan, con su historial de movimientos. En una frase: *lo que usted agregó se
  queda; lo demás vuelve a como estaba*.
- Los dos formularios funcionan **sin JavaScript**: son `<form method="post">` de
  verdad y las rutas contestan con un redirect 303. Los disparadores («Nuevo
  repuesto», «Ajustar») son enlaces con `?alta=1` y `?ajuste=<id>`, no `onClick`.

## Recepción sí necesita JavaScript, y está decidido así

Es la única pantalla donde lo esencial depende del guion: el campo de la placa no
está dentro de un `<form>` y la búsqueda vive en un `useEffect` con `fetch`.

**Se queda así a propósito.** La regla de "que funcione sin JavaScript" es para
la PÁGINA DEL CLIENTE: un señor de 55 años, en la vereda, con datos lentos y un
teléfono cualquiera. Recepción la usa el personal del taller, en su propio
equipo. No vale un cambio de fondo en una pantalla que funciona.

Con el guion apagado sigue funcionando todo lo demás: leer el tablero, abrir
cualquier orden, aprobar desde la página del cliente, registrar repuestos,
ajustar existencias, generar enlaces en `/admin` y reiniciar el demo.

## Trampas conocidas

**Nunca corras `npm run build` ni borres `.next` con `npm run dev` vivo.**
Comparten el directorio `.next` y se corrompe el manifiesto de cliente: la app
empieza a responder *Internal Server Error* y los errores que muestra no tienen
nada que ver con el código. Si pasa, se arregla así:

```bash
rm -rf .next
```

…con el servidor de desarrollo **detenido**, y después se vuelve a levantar.

**Variables de entorno vacías no son variables ausentes.** Una línea
`TURSO_DATABASE_URL=` en `.env.local` llega como cadena vacía, no como
`undefined`. Por eso [db.ts](src/lib/db.ts) usa `||` y no `??` para caer al
archivo local.

**Actualizar estado leyendo una variable derivada.** En el ajuste de existencias,
`setCantidad(String(nuevo + 1))` hacía que dos toques seguidos en «+» sumaran uno
solo: los dos manejadores leen el mismo valor viejo. Va con la forma de función,
`setCantidad((c) => …)`. Es la segunda vez que aparece esta clase de error en el
proyecto; la primera fue en el arrastre del tablero.

**Una animación gana al estilo en línea.** La clase `entra` termina en
`transform: none` con `fill-mode: both`, y eso pisaba el `translate(-50%,-50%)`
que centraba la tarjeta del recorrido guiado: en un teléfono se salía por la
derecha con el botón cortado. El centro se calcula en píxeles, nunca con
`left: 50%` más un transform.

**Dos renders en paralelo pidiendo lo mismo.** El layout y la página llaman los
dos a `abrirDemo`, y Next los ejecuta a la vez. Con un enlace nuevo, los dos lo
creaban y el segundo reventaba contra el índice único del slug; con un enlace
vencido, los dos lanzaban la siembra y chocaban contra la clave primaria de
`fotos`. Las dos veces salía un 500 justo en la primera visita del prospecto.
Se resuelve con un mapa de promesas en vuelo, en [demos.ts](src/lib/demos.ts) y
en [semilla.ts](src/lib/semilla.ts).

**Cerrar un menú con `pointerdown` mata el clic.** El oyente que cerraba el menú
«Mover a» no miraba dónde se había tocado: React desmontaba el portal entre el
`pointerdown` y el `click`, así que la opción salía del DOM antes de que su
manejador llegara a correr. El menú se veía, respondía al toque y no hacía nada.
Ahora el oyente ignora lo que caiga dentro de `[role="menu"]` o del botón.

**Nada de `Intl` para dinero ni fechas.** El servidor y el navegador pueden traer
datos de locale distintos y una diferencia de un carácter rompe la hidratación de
React. El formateo es manual en [dominio.ts](src/lib/dominio.ts); Ecuador es
UTC-5 fijo todo el año, así que las fechas se calculan con aritmética.

## El comprobante

La clave de acceso son 49 dígitos de verdad, con dígito verificador módulo 11
([sri.ts](src/lib/sri.ts)), y debajo va un **Code 128** dibujado a mano
([code128.ts](src/lib/code128.ts)): un lector de celular lo lee y devuelve los
mismos 49 dígitos que están escritos encima. Sin librería — son 107 patrones y
una suma ponderada.

El IVA del 15 % ya va **incluido** en los precios que se cotizan, porque así se
cotiza en un taller ecuatoriano («las pastillas son 86»). La factura lo desglosa
hacia atrás: `subtotal = total ÷ 1,15` y el IVA por resta, nunca al revés, para
que las tres cifras cuadren al centavo. **Al cliente se le enseña siempre el
total, nunca el desglose.**

Al pie va la única mención a que esto es un demo: *Documento de demostración ·
sin validez tributaria*. Va ahí porque una clave de acceso bien formada es un
documento tributario, y en ningún otro sitio porque lo que se vende es la
sensación de producto terminado.

## Fotos

Las cuatro fotos de hallazgos viven en `public/fotos/` y se nombran en un solo
lugar: `FOTOS_SEMBRADAS` en [semilla.ts](src/lib/semilla.ts). Para cambiar una,
se reemplaza el archivo y se ajusta la extensión ahí.

**Pendiente:** falta la foto de una correa de distribución dentada. Hoy hay un
marcador gris en su lugar, a propósito.
