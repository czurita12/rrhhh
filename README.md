# Portal RRHH — Vacaciones y Permisos

Sistema básico para practicar: registro/login de usuarios, base de datos, roles
(empleado/admin), y un flujo real de solicitud → aprobación.

## Stack

- **Backend:** Node.js + Express
- **Base de datos:** SQLite (archivo `data/rrhh.db`, se crea solo)
- **Auth:** contraseñas con bcrypt + sesiones (cookies)
- **Frontend:** HTML/CSS/JS simple, sin frameworks

## Cómo funciona

- Cualquiera se puede **registrar** como empleado (`registro.html`).
- Cada empleado tiene 15 días de vacaciones al año (fijo, para simplificar).
- El empleado puede **solicitar vacaciones o permisos** eligiendo fechas.
- Un **administrador** ve todas las solicitudes y las aprueba o rechaza.
- El saldo de vacaciones se calcula automáticamente según lo aprobado en el año.

No hay una pantalla para "crear admin" a propósito (por seguridad, no cualquiera
debería poder auto-nombrarse administrador). Se crea con un script, ver abajo.

## Instalación local

Necesitas [Node.js](https://nodejs.org) instalado (versión 18 o superior).

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar el archivo de variables de entorno
cp .env.example .env
# (opcional pero recomendado: edita .env y cambia SESSION_SECRET por otro texto)

# 3. Arrancar el servidor
npm start
```

Abre **http://localhost:3000** en tu navegador.

## Crear un usuario administrador

Primero regístrate normalmente desde `registro.html` (quedas como "empleado").
Luego, en la terminal, conviértete en admin:

```bash
node scripts/crear-admin.js tu-correo@ejemplo.com
```

Cierra sesión y vuelve a iniciar sesión: ahora entrarás al panel de admin.

También puedes crear un admin nuevo directamente (sin haberte registrado antes):

```bash
node scripts/crear-admin.js admin@empresa.com miPasswordSegura123
```

## Estructura del proyecto

```
rrhh-app/
├── backend/
│   ├── server.js              # arranca Express, configura sesiones y rutas
│   ├── database.js            # conexión SQLite + creación de tablas
│   ├── routes/
│   │   ├── auth.js            # registro, login, logout
│   │   ├── usuarios.js        # perfil propio, listado (admin)
│   │   └── solicitudes.js     # crear/ver/aprobar solicitudes
│   └── middleware/
│       └── auth.js            # protege rutas (login / rol admin)
├── frontend/
│   ├── index.html             # login
│   ├── registro.html
│   ├── dashboard.html         # panel del empleado
│   ├── admin.html             # panel del administrador
│   ├── css/style.css
│   └── js/api.js
├── scripts/
│   └── crear-admin.js
├── data/                      # aquí se crea rrhh.db (no se sube a git)
├── .env.example
└── package.json
```

## Desplegar en Hostinger (Business hosting)

Tu plan Business soporta Node.js. Pasos generales:

1. Sube tu código a un repositorio de **GitHub** (recomendado) o prepara un `.zip`
   del proyecto (sin `node_modules` ni `data/*.db` — Hostinger instala las
   dependencias por ti).
2. En **hPanel** → busca la sección de **Node.js** (o "Website" → crear sitio Node.js).
3. Conecta tu repositorio de GitHub, o sube el `.zip`.
4. Configura:
   - **Archivo de arranque:** `backend/server.js`
   - **Variables de entorno:** agrega `SESSION_SECRET` con un valor propio y secreto.
     `PORT` normalmente lo asigna Hostinger automáticamente.
5. Hostinger instalará las dependencias (`npm install`) y arrancará la app.
6. La carpeta `data/` se crea sola la primera vez que corre el servidor — SQLite
   no necesita que crees una base de datos aparte.
7. Cuando esté corriendo, entra a la URL que te da Hostinger, regístrate, y
   usa `node scripts/crear-admin.js` **desde la terminal SSH/CLI de tu hosting**
   (Hostinger te da acceso a terminal en el panel de Node.js) para crear tu admin.

**Nota:** si más adelante quieres una base de datos "más fuerte" (MySQL o
PostgreSQL, que Hostinger también soporta), este proyecto es un buen punto de
partida para migrar — la lógica de negocio (rutas, validaciones) no cambia
mucho, solo cambiarías `database.js` por una conexión a ese motor.

## Próximos pasos para seguir aprendiendo

- Días de vacaciones según antigüedad (en vez de fijo)
- Notificaciones por email cuando se aprueba/rechaza una solicitud
- Exportar reporte de vacaciones en PDF
- Editar/cancelar una solicitud pendiente
- Subir foto de perfil
- Tests automáticos (Jest)
