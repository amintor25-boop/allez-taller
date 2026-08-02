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

> **Ya está publicado en https://allez-taller.netlify.app**, con despliegue
> continuo desde `github.com/amintor25-boop/allez-taller`. Cada `git push` a
> `main` publica solo. Lo de abajo es cómo se montó, y por qué de esta forma.

### 1. Compila NETLIFY, no tu Mac

Esto no es una preferencia: es la única forma que funciona.

Se intentó primero el camino corto, `netlify deploy --prod --build`, que compila
en local y sube el resultado. Falló dos veces y por dos motivos distintos:

**Binarios de la máquina equivocada.** Dentro del paquete de la función viajaron
`@libsql/darwin-arm64/index.node` (7,8 MB) y `@img/sharp-darwin-arm64`. Al
cargarlos, Linux mata el proceso: la función respondía 502 con
`error decoding lambda response: invalid character '\x00'`. Ni
`serverExternalPackages` ni `external_node_modules` lo evitan — el adaptador usa
`bundler: "none"` y copia `node_modules` entero, así que «externo» quiere decir
«no lo empaquetes, cópialo», y copió los binarios de Apple Silicon.

**Y aunque se quiten, el enrutado tampoco monta.** La función declara
`routes: [{pattern: "/*"}]`, pero ese contrato de *función interna del framework*
solo lo arma Netlify al compilar. Con `--build` la función ni siquiera se sube
(`funciones: []`); forzándola con `--functions` sube, pero como función de
usuario y nadie la llama.

Compilando en Netlify —Ubuntu, `npm ci` allí— los dos problemas desaparecen de
raíz.

### 2. Cómo se conectó

1. Repositorio en GitHub, privado. El `.gitignore` ya deja fuera `.env.local`,
   `.netlify`, `node_modules` y `data/*.db`.
2. En el panel del sitio → **Continuous deployment** → **Link repository** →
   GitHub → autorizar solo este repositorio.
3. Ajustes: **build command** `npm run build`, **publish directory** `.next`.

Ese último paso pide autorizar la aplicación de GitHub en el navegador; no se
puede hacer por API.

### 3. Las variables

En **Site configuration → Environment variables**:

| Variable | De dónde sale |
|---|---|
| `TURSO_DATABASE_URL` | la pantalla de la base en Turso |
| `TURSO_AUTH_TOKEN` | la misma pantalla |
| `NEXT_PUBLIC_TELEFONO_TALLER` | `+593979279337` |
| `NEXT_PUBLIC_BASE_URL` | **se deja vacía** |

`NEXT_PUBLIC_BASE_URL` es la que decide a dónde apunta el QR, y
[base-url.ts](src/lib/base-url.ts) la resuelve sola desde la cabecera de la
petición. Ponerla a mano tiene dos trampas: las `NEXT_PUBLIC_` se congelan al
compilar, así que cambiarla obliga a volver a desplegar; y si se escribe mal, el
QR se ve perfecto y no lleva a ninguna parte. Eso se descubre con el prospecto
delante.

La base se siembra **desde la terminal**, una vez:

```bash
npm run demo:sembrar     # con TURSO_* en .env.local
```

### 4. Medido en producción

```
nueve pantallas            200, la más lenta 0,73 s
camino de oro completo     8 pasos, el más lento 0,53 s
reinicio de las 48 h       1,12 s  ← con la siembra entera habría sido inviable
sembrar contra Turso       7,18 s desde la laptop
latencia por viaje de red  735 ms hasta aws-us-east-2
```

Falta un solo ensayo, y ese no lo hace ningún comando: **con un teléfono fuera
del wifi**, abrir el tablero, mandar un presupuesto, escanear el QR y aprobar.
Si la tarjeta viaja sola, está listo.

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
