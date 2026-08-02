// Publicar es empujar, esperar y COMPROBAR. Las tres cosas o ninguna.
//
//   npm run desplegar "mensaje del commit"
//   npm run desplegar                       (si ya está commiteado)
//
// Netlify compila sola con cada push, así que lo que faltaba era la última
// parte: alguien que verifique que lo publicado responde. Un guardia de entorno
// mal escrito dejó /d/san-rafael en 500 y solo se supo porque se miró a mano.

import { execSync, spawnSync } from 'node:child_process'

const sh = (cmd, opciones = {}) => execSync(cmd, { encoding: 'utf8', ...opciones }).trim()
const rojo = (t) => `\x1b[31m${t}\x1b[0m`
const paso = (t) => console.log(`\n\x1b[1m${t}\x1b[0m`)

const mensaje = process.argv[2]

paso('1. Empujando a GitHub')
if (sh('git status --porcelain')) {
  if (!mensaje) {
    console.error(rojo('  Hay cambios sin commitear y no diste mensaje.'))
    console.error('  npm run desplegar "lo que cambió"')
    process.exit(1)
  }
  execSync('git add -A', { stdio: 'inherit' })
  execSync(`git commit -q -m ${JSON.stringify(mensaje)}`, { stdio: 'inherit' })
}
execSync('git push -q origin main', { stdio: 'inherit' })
const commit = sh('git rev-parse --short HEAD')
console.log(`   ${commit}  ${sh('git log -1 --pretty=%s')}`)

paso('2. Esperando a que Netlify compile')
const sitio = JSON.parse(sh('cat .netlify/state.json')).siteId
const estado = () => {
  const salida = spawnSync(
    'npx',
    ['--no-install', 'netlify', 'api', 'listSiteDeploys', '--data', JSON.stringify({ site_id: sitio })],
    { encoding: 'utf8' },
  ).stdout
  try {
    const d = JSON.parse(salida)[0]
    return { estado: d.state, commit: (d.commit_ref || '').slice(0, 7), id: d.id }
  } catch {
    return { estado: 'desconocido', commit: '', id: '' }
  }
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
let d = estado()
for (let i = 0; i < 60 && !['ready', 'error', 'failed'].includes(d.estado); i++) {
  process.stdout.write(`\r   ${d.estado}…`)
  await esperar(10_000)
  d = estado()
}
console.log(`\r   ${d.estado}  ${d.commit}     `)

if (d.estado !== 'ready') {
  console.error(rojo(`\n  La compilación terminó en "${d.estado}".`))
  console.error(`  Registro: https://app.netlify.com/projects/allez-taller/deploys/${d.id}`)
  process.exit(1)
}

paso('3. Comprobando el sitio publicado')
const v = spawnSync('node', ['scripts/verificar-despliegue.mjs'], { stdio: 'inherit' })
process.exit(v.status ?? 1)
