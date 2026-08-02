/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Hay un package-lock.json en el directorio padre; sin esto Turbopack toma
  // ese como raíz del proyecto y avisa en cada build.
  turbopack: { root: import.meta.dirname },
  // Evita que el empaquetador toque el binario nativo de libSQL.
  // En desarrollo se carga el cliente de archivo; en Netlify, @libsql/client/web (JS puro).
  serverExternalPackages: ['@libsql/client', 'libsql'],
}

export default nextConfig
