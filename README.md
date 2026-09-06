# Portal RRHH — Vacaciones y Permisos

Sistema básico para practicar: registro/login de usuarios, base de datos, roles
(empleado/admin), y un flujo real de solicitud → aprobación.

## Novedades de esta versión

- **Colores de marca**: negro + rojo (`#ED1C24`, tomado del logo)
- **Logo** integrado en login, registro, y ambos paneles
- **Vacaciones por antigüedad**: ya no son 15 días fijos por año calendario.
  Ahora cada empleado acumula **15 días por cada año completo** desde su fecha
  de ingreso (configurable por persona vía `dias_por_anio` en la base de datos).
  El saldo usado se calcula sobre el histórico completo, no por año calendario.
- **Crear administrador sin SSH**: página `/configurar-admin.html` protegida
  por una clave secreta (`ADMIN_SETUP_KEY`), pensada para hostings donde no
  quieres habilitar acceso por terminal.

## Cómo funciona el cálculo de vacaciones

Ejemplo: alguien ingresó el 2023-06-01. Hoy (2026-09-06) ya cumplió su
aniversario de este año (2026-06-01 ya pasó), así que tiene **3 años
cumplidos** → 3 × 15 = **45 días acumulados** en total desde que entró. Si ya
usó 10 días aprobados en el pasado, le quedan 35 disponibles.

La lógica vive en `backend/utils/vacaciones.js` — ahí puedes ajustar la regla
si más adelante quieres, por ejemplo, dar más días según el puesto o el área.

## Crear tu administrador

### Opción A — Sin SSH (recomendado para hosting compartido)

1. Configura la variable de entorno `ADMIN_SETUP_KEY` en tu hosting (una clave
   larga y secreta que solo tú conozcas).
2. Entra a `https://tu-dominio.com/configurar-admin.html`
3. Escribe esa clave + el email de la cuenta que quieres promover (o los datos
   para crear una nueva directamente como admin).

Esta página está protegida: sin la clave correcta, nadie puede usarla. Si no
defines `ADMIN_SETUP_KEY` en el servidor, la función queda deshabilitada por
completo (devuelve error siempre).

### Opción B — Localmente en tu Mac, por terminal

```bash
node scripts/crear-admin.js tu-correo@ejemplo.com
```

## Instalación local

```bash
npm install
cp .env.example .env
# Edita .env: cambia SESSION_SECRET y ADMIN_SETUP_KEY por valores propios
npm start
```

Abre **http://localhost:3000**.

## Estructura del proyecto

```
rrhh-app/
├── backend/
│   ├── server.js
│   ├── database.js            # crea la carpeta data/ sola si no existe
│   ├── utils/
│   │   └── vacaciones.js      # lógica de antigüedad y saldo
│   ├── routes/
│   │   ├── auth.js            # registro, login, logout, configurar-admin
│   │   ├── usuarios.js
│   │   └── solicitudes.js
│   └── middleware/auth.js
├── frontend/
│   ├── index.html
│   ├── registro.html
│   ├── dashboard.html
│   ├── admin.html
│   ├── configurar-admin.html  # página especial para crear admin sin SSH
│   ├── css/style.css          # paleta negro + rojo de marca
│   ├── js/api.js
│   └── img/logo.png
├── scripts/crear-admin.js     # alternativa local por terminal
├── data/                      # aquí se crea rrhh.db (no se sube a git)
├── .env.example
└── package.json
```

## Desplegar cambios (recordatorio del flujo)

```bash
git add .
git commit -m "Descripción del cambio"
git push
```

Si tu hosting está conectado a GitHub (como Hostinger con auto-deploy), el
sitio se actualiza solo con cada push.

## Próximos pasos para seguir aprendiendo

- Notificaciones por email al aprobar/rechazar
- Exportar reporte de vacaciones en PDF
- Editar/cancelar una solicitud pendiente
- Distintos `dias_por_anio` según el puesto
- Tests automáticos (Jest)
