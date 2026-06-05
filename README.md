# Plan de Células - App Web

MVP funcional para administrar células de iglesia con:

- Login con Supabase Auth
- Roles: admin, leader, auxiliar, viewer
- Registro de células
- Integrantes por célula
- Control de asistencia
- Informes de reunión
- Necesidades y seguimiento
- Calendario de temas
- Biblioteca de materiales
- Panel de usuarios para administradores

## Stack

- React + Vite
- Supabase: Auth, PostgreSQL, RLS
- Cloudflare Pages para despliegue gratuito

## 1. Crear proyecto en Supabase

1. Entra a Supabase y crea un nuevo proyecto.
2. Ve a `SQL Editor`.
3. Copia todo el contenido de `supabase/schema.sql`.
4. Ejecútalo con `Run`.

## 2. Configurar autenticación

Para pruebas, puedes ir a:

`Authentication > Providers > Email`

Y decidir si deseas confirmar correos. Para desarrollo rápido, puedes desactivar la confirmación por correo.

## 3. Crear el archivo de variables

Copia `.env.example` y renómbralo como `.env.local`:

```bash
cp .env.example .env.local
```

Coloca tus credenciales de Supabase:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU-ANON-KEY
```

Las encuentras en:

`Project Settings > API`

## 4. Instalar y correr localmente

```bash
npm install
npm run dev
```

Abre la URL local que te muestre Vite.

## 5. Crear el primer administrador

1. Abre la app.
2. Crea tu usuario.
3. Vuelve a Supabase > SQL Editor.
4. Ejecuta:

```sql
update public.profiles
set role = 'admin'
where email = 'TU-CORREO@EJEMPLO.COM';
```

5. Cierra sesión y vuelve a entrar.

## 6. Desplegar en Cloudflare Pages

1. Sube el proyecto a GitHub.
2. En Cloudflare ve a `Workers & Pages`.
3. Crea una app de Pages importando tu repositorio.
4. Configura:

- Framework preset: Vite
- Build command: `npm run build`
- Build output directory: `dist`

5. Agrega variables de entorno:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

6. Despliega.

Tu app quedará con una URL parecida a:

```txt
https://plan-celulas.pages.dev
```

## Recomendaciones de seguridad

- No subas `.env.local` a GitHub.
- No publiques datos sensibles en materiales abiertos.
- Usa el módulo de roles para que solo administradores puedan crear células, temas y materiales.
- Las necesidades confidenciales siguen visibles para el administrador y el líder de la célula. Si necesitas privacidad más estricta por caso pastoral, se debe crear una tabla especial con permisos más cerrados.

## Próximas mejoras sugeridas

- Exportar informes a PDF.
- Gráficas de asistencia mensual.
- Filtros por zona, líder y fecha.
- Subida directa de archivos a Supabase Storage.
- Notificaciones por correo o WhatsApp.
- App móvil tipo PWA.

## Actualización v4 - Células CRUD completo

Esta versión incluye el módulo de Células completo:

- Crear célula
- Ver detalle de célula
- Editar célula
- Eliminar célula como administrador
- Buscar células
- Filtrar por estatus y líder
- Ver resumen de células e integrantes
- Agregar integrantes
- Editar integrantes
- Activar/desactivar integrantes
- Eliminar integrantes

Si ya habías ejecutado `supabase/schema.sql`, ejecuta también:

```sql
supabase/cells_crud_upgrade.sql
```

Ese archivo actualiza la política de seguridad para que el líder asignado pueda eliminar integrantes de su propia célula.
