# ERP Agencia

Sistema de gestión para agencia (Cobros + Talonarios + Control de Alcance)

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+ 
- MongoDB (local o remoto)

### Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
cp .env.local.example .env.local
```

Editar `.env.local` con tus valores:
```
MONGODB_URI=mongodb://localhost:27017/erp-agencia
NEXTAUTH_SECRET=tu-secret-key-aqui
NEXTAUTH_URL=http://localhost:3000
APP_BASE_URL=http://localhost:3000
ADMIN_EMAIL=admin@agencia.com
ADMIN_PASSWORD=admin123

# Recuperación de contraseña (Resend)
RESEND_API_KEY=re_xxxx
RESEND_FROM="ERP Agencia <onboarding@resend.dev>"

# Cron job para marcar facturas vencidas (opcional)
CRON_SECRET=tu-secret-para-cron
```

3. Ejecutar seed para crear usuario admin:
```bash
npm run seed
```

O usar el endpoint API (solo en desarrollo):
```bash
curl -X POST http://localhost:3000/api/seed
```

4. Iniciar servidor de desarrollo:
```bash
npm run dev
```

5. Abrir [http://localhost:3000/login](http://localhost:3000/login)

## 📋 Credenciales por Defecto

- Email: `admin@agencia.com`
- Password: `admin123`

**⚠️ IMPORTANTE:** Cambiar estas credenciales en producción.

**Email de recuperación:** Si el correo no se envía, asegúrate de que `RESEND_FROM` en `.env.local` esté entre comillas dobles (ej. `RESEND_FROM="ERP Agencia <onboarding@resend.dev>"`). Sin comillas, el valor puede cortarse y Resend rechaza el envío.

## 🏗️ Estructura del Proyecto

```
erp-agencia/
├── app/                    # Next.js App Router
│   ├── (admin)/           # Rutas protegidas admin
│   ├── (auth)/            # Rutas públicas auth
│   └── api/               # API routes
├── components/            # Componentes React
├── lib/                   # Utilidades y configuraciones
├── models/                # Modelos Mongoose
└── scripts/               # Scripts de utilidad
```

## 📄 Resumen por página

Breve descripción de cada pantalla: qué hace y qué acciones permite.

### Autenticación (rutas públicas)

| Ruta | Descripción | Qué puedes hacer |
|------|-------------|-------------------|
| **`/login`** | Inicio de sesión | Ingresar email y contraseña. Tras validar, redirige al dashboard. Enlace a “Olvidé mi contraseña”. |
| **`/forgot-password`** | Recuperar contraseña | Ingresar email; si existe en el sistema se envía un correo (Resend) con enlace para restablecer. Mensaje de éxito siempre (por privacidad). |
| **`/reset-password?token=...`** | Restablecer contraseña | Llegas desde el enlace del email. Introduces nueva contraseña y confirmación; se valida el token y se actualiza la contraseña del admin. |

### Panel de administración (requiere sesión)

| Ruta | Descripción | Qué puedes hacer |
|------|-------------|-------------------|
| **`/admin/dashboard`** | Resumen y alertas | Ver **alertas urgentes**: facturas vencidas y facturas que vencen hoy (con enlaces a Bandeja de Cobros). Ver **acciones pendientes**: escalamientos aplicados sin facturar (botón “Facturar” abre modal para facturar extras) y renovaciones próximas (contratos que vencen en 30 días). Ver **todas las acciones** ordenadas por urgencia. |
| **`/admin/clients`** | Listado de clientes | Buscar por nombre o email; filtrar por tipo (Mensual / Proyecto) y estado (Activo / Inactivo). Crear nuevo cliente (“+ Nuevo Cliente”). Entrar al detalle de un cliente (clic en la fila). |
| **`/admin/clients/new`** | Alta de cliente | Wizard en pasos: (1) Datos del cliente (nombre, email, teléfono, tipo). (2) Usar o no plantilla de paquete; si usas, elegir plantilla y opcionalmente ajustar ítems. (3) Fechas del contrato y confirmación. Crea cliente + contrato (activo o borrador). |
| **`/admin/clients/[id]`** | Detalle de cliente | Ver datos del cliente (nombre, email, teléfono, tipo, estado). Ver contrato activo (fechas, precio mensual) y generar/ver PDF del contrato. Ver ítems del contrato y precio mensual. Ver historial de contratos (tabla con fechas, estado, precio). |
| **`/admin/services`** | Catálogo de servicios | Listar servicios (nombre, descripción, categoría, precio base). Crear, editar y eliminar servicios. Los servicios se usan en contratos y plantillas. |
| **`/admin/package-templates`** | Plantillas de paquete | Listar plantillas (nombre, descripción, ítems, precio base). Crear y editar plantillas: elegir servicios, cantidad y precio por ítem. Activar/desactivar. Sirven para crear contratos desde “Nuevo cliente” sin definir ítems uno a uno. |
| **`/admin/billing`** | Bandeja de cobros | Ver facturas con filtros por estado (Todos, Pendiente, Pagada, Vencida, Borrador) y “Solo vencidas”. Resumen: cantidad de pendientes, vencidas y pagadas. Por cada factura: registrar pago (modal con monto, fecha, método, referencia), generar/ver PDF. La URL acepta `?status=overdue` (desde el dashboard). |
| **`/admin/scope-changes`** | Escalamientos | Listar solicitudes de cambio de alcance con filtros por estado y por “facturado / no facturado”. Aprobar o rechazar pendientes. Aplicar los aprobados (modal confirma y actualiza contrato). Los aplicados sin facturar aparecen en el dashboard para “Facturar extras”. Crear nuevo escalamiento (“+ Nuevo escalamiento”). |
| **`/admin/scope-changes/new`** | Nuevo escalamiento | Wizard: elegir contrato, agregar/modificar/eliminar ítems (servicio, cantidad, precio), descripción y notas. Envía la solicitud en estado “pendiente” para luego aprobar desde la lista. |
| **`/admin/reports`** | Reportes | Cuatro pestañas: **Ingresos** (año/mes, facturado vs cobrado, pagos recientes). **Cuentas por cobrar (AR)** (por cliente, total adeudado, facturas y rangos de antigüedad). **Renovaciones** (próximos 90 días por mes, contratos sin fecha fin). **Carga de trabajo** (año/mes, asignación por usuario y por cliente, sobre/sub asignación). |
| **`/admin/settings`** | Configuración | Ver próximo número de factura (secuencia). Enlace para cambiar contraseña (va a `/forgot-password`). Ver entorno (Desarrollo / Producción). |

### Impresión (vista para imprimir o PDF)

| Ruta | Descripción | Qué puedes hacer |
|------|-------------|-------------------|
| **`/admin/print/contract/[id]`** | Vista de contrato | Página pensada para imprimir o guardar como PDF: muestra datos del cliente, del contrato y ítems. Se accede desde el detalle del cliente (tras generar PDF) o con el ID del contrato. |
| **`/admin/print/invoice/[id]`** | Vista de factura | Página para imprimir factura: datos del cliente, factura, ítems y pagos. Se accede desde la Bandeja de Cobros (generar/ver PDF) o con el ID de la factura. |

### Datos de prueba

Para cargar datos de demostración (servicios, clientes, contratos, facturas, pagos, escalamientos, plantilla, asignación) y probar el flujo completo:

```bash
npm run seed        # Crea admin y configuración (una vez)
npm run seed-demo   # Inserta datos de prueba (idempotente)
```

Detalle en `docs/SISTEMA.md` (sección 9).

### Cómo se generan las facturas

- **Ciclo mensual (facturación recurrente):** Desde la app se llama **POST** `/api/billing/cycle`. Eso recorre todos los **contratos activos** y, por cada uno que aún no tenga factura para el mes/año actual, crea una factura con número secuencial (INV-0001, INV-0002…), ítems copiados del contrato y vencimiento a 30 días. Es idempotente: no duplica facturas por contrato/mes.
- **Factura de extras (escalamientos):** En el dashboard o en Escalamientos se eligen uno o más escalamientos en estado **aplicado** y **sin facturar**. Al hacer "Facturar", se llama **POST** `/api/invoices/scope-extra` y se crea una factura con esos ítems como extras; los escalamientos quedan marcados como facturados.
- No hay creación manual de factura suelta: las facturas salen del ciclo o de la factura de extras.

### Limpiar la base de datos

Para borrar todos los datos de negocio y dejar solo admin y configuración:

```bash
npm run seed-reset
```

Elimina: pagos, facturas, asignaciones, escalamientos, contratos, clientes, servicios, plantillas, logs de auditoría y tokens de reset. **Mantiene** AdminUser y Settings. Luego puedes ejecutar `npm run seed-demo` para volver a cargar datos de prueba.

Para vaciar también admin y configuración:

```bash
npx tsx scripts/seed-reset.ts --all
```

## 📚 Roadmap

Ver `plan.md` para el roadmap completo de desarrollo.

## 🔐 Seguridad

- Las rutas `/admin/*` están protegidas por sesión en el layout
- Las rutas `/api/*` (excepto `/api/auth/*`, `/api/seed`, `/api/billing/overdue`) exigen JWT válido vía middleware
- El endpoint `/api/billing/overdue` acepta sesión de usuario o header `Authorization: Bearer <CRON_SECRET>` / `X-Cron-Secret` para ejecución por cron
- NextAuth maneja la autenticación con JWT
- Passwords hasheados con bcryptjs
