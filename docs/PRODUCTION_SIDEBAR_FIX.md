# Sidebar en producción

La compilación `next build --webpack` no tenía plugin PostCSS de Tailwind. El
desarrollo usaba un loader exclusivo de Turbopack. Producción conservaba el CSS
manual, pero no generaba utilidades: faltaban `flex`, `fixed`, `md:flex`,
`md:block` y `sr-only`. La sidebar ocupaba todo el ancho y aparecía el texto
«Toggle Sidebar» destinado a lectores de pantalla.

Se añade `@tailwindcss/postcss` 4.3.3 y `postcss.config.mjs`, usando la misma
configuración en desarrollo y producción. Se retira el loader exclusivo del
config de Turbopack para evitar procesar CSS dos veces. No cambia el diseño.

El build verifica los selectores en el CSS emitido y falla si faltan o si quedan
directivas Tailwind sin transformar. Validación: typecheck, lint, build Webpack
y comprobación del CSS generado. Sin inspección visual por la preferencia previa
de no utilizar navegador. No se modifican Auth, correo, base de datos ni secretos.
