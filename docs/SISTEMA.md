# Documentación del sistema ERP Agencia

Este documento describe el funcionamiento completo del sistema: flujos del administrador, esquemas de base de datos, comunicación entre componentes y APIs.

---

## 1. Visión general

El **ERP Agencia** es un sistema de gestión para agencias que permite:

- Gestionar **clientes** (mensuales o por proyecto) y sus **contratos**.
- Mantener un **catálogo de servicios** y **plantillas de paquetes**.
- **Facturar** de forma mensual (ciclo automático) y registrar **pagos**.
- Gestionar **escalamientos** (cambios de alcance) con flujo: crear → aprobar → aplicar → facturar extras.
- Consultar un **dashboard** con acciones prioritarias (vencimientos, facturas vencidas, escalamientos sin facturar, renovaciones).
- Generar **reportes** (ingresos, cuentas por cobrar, renovaciones, carga de trabajo) y **exportar PDF** (contratos y facturas) a Cloudinary.

**Stack:** Next.js 16 (App Router), MongoDB + Mongoose, NextAuth (JWT), Tailwind CSS, Resend (email), Cloudinary (PDFs), Puppeteer (generación de PDF).

---

## 2. Autenticación y acceso

### 2.1 Público (sin sesión)

- **`/login`** — Inicio de sesión (email + contraseña).
- **`/forgot-password`** — Solicitar recuperación de contraseña (envío de email con Resend).
- **`/reset-password?token=...`** — Restablecer contraseña con el token del correo.

### 2.2 Protegido (requiere sesión)

- **Rutas de página:** Todo lo que está bajo **`/admin/*`** usa el layout de admin, que exige `getServerSession`. Si no hay sesión, redirige a `/login`.
- **Rutas de API:** El **middleware** (`middleware.ts`) exige JWT válido para todas las peticiones a **`/api/*`** excepto:
  - `/api/auth/*` (login, forgot-password, reset-password)
  - `/api/seed` (solo en desarrollo; en producción devuelve 403)
  - `/api/billing/overdue` (esta ruta acepta sesión **o** header `Authorization: Bearer CRON_SECRET` / `X-Cron-Secret` para ejecución por cron).

### 2.3 Sesión

- NextAuth con **CredentialsProvider** y estrategia **JWT**.
- Tras login correcto, la sesión expone `user.id`, `user.email`, `user.name`.
- Esa información se usa en las APIs para **AuditLog** (quién realizó cada acción).

---

## 3. Modelos de base de datos (MongoDB / Mongoose)

Las colecciones y sus relaciones se describen a continuación. Todas usan `timestamps` (salvo donde se indica).

### 3.1 AdminUser

Usuarios administradores del sistema.

| Campo      | Tipo   | Requerido | Descripción                    |
|-----------|--------|-----------|--------------------------------|
| email     | String | Sí        | Único, lowercase               |
| password  | String | Sí        | Hash bcrypt                    |
| name      | String | Sí        | Nombre para mostrar            |
| createdAt | Date   | Auto      |                                |
| updatedAt | Date   | Auto      |                                |

**Relaciones:** Referenciado por `Payment.createdBy`, `ScopeChange.requestedBy/approvedBy/appliedBy/rejectedBy`, `AuditLog.userId`, `PasswordResetToken.userId`, `Allocation.userId`.

---

### 3.2 Client

Clientes de la agencia.

| Campo      | Tipo   | Requerido | Descripción                              |
|-----------|--------|-----------|------------------------------------------|
| name      | String | Sí        |                                          |
| email     | String | No        | lowercase                                |
| phone     | String | No        |                                          |
| clientType| Enum   | Sí        | `monthly` \| `project`                   |
| status    | Enum   | No        | `active` \| `inactive` (default: active) |
| createdAt | Date   | Auto      |                                          |
| updatedAt | Date   | Auto      |                                          |

**Índices:** email, clientType, status.

**Relaciones:** Un cliente tiene muchos **Contract**; es referenciado por Contract, Invoice, ScopeChange, Allocation.

**Regla de negocio:** Un cliente de tipo mensual debe tener (idealmente) un contrato activo. Un cliente solo puede tener **un contrato activo** a la vez.

---

### 3.3 Service

Catálogo de servicios ofrecidos.

| Campo      | Tipo   | Requerido | Descripción     |
|-----------|--------|-----------|-----------------|
| name      | String | Sí        |                 |
| description| String| No        |                 |
| category  | String | No        |                 |
| basePrice | Number | Sí        | min: 0          |
| createdAt | Date   | Auto      |                 |
| updatedAt | Date   | Auto      |                 |

**Índices:** name, category.

**Uso:** Referenciado en **Contract** (items), **Invoice** (items), **ScopeChange** (items), **PackageTemplate** (items). En contratos y facturas se guarda **snapshot** (serviceName, unitPrice) para no alterar el histórico.

---

### 3.4 PackageTemplate

Plantillas de paquetes reutilizables (listas de servicios con cantidades y precios).

| Campo       | Tipo     | Requerido | Descripción                          |
|------------|----------|-----------|--------------------------------------|
| name       | String   | Sí        |                                      |
| description| String   | No        |                                      |
| items      | Array    | Sí        | Al menos un item (serviceId, quantity, unitPrice, notes) |
| basePrice  | Number   | Sí        | min: 0                               |
| isActive   | Boolean  | No        | default: true                        |
| createdAt  | Date     | Auto      |                                      |
| updatedAt  | Date     | Auto      |                                      |

**Relaciones:** Referenciado por **Contract.packageTemplateId** (opcional).

---

### 3.5 Contract

Contrato entre la agencia y un cliente. Define los servicios (items) y el precio mensual.

| Campo              | Tipo     | Requerido | Descripción                                      |
|--------------------|----------|-----------|--------------------------------------------------|
| clientId           | ObjectId | Sí        | ref: Client                                      |
| packageTemplateId  | ObjectId | No        | ref: PackageTemplate                             |
| status             | Enum     | No        | `draft` \| `active` \| `expired` \| `cancelled` (default: draft) |
| startDate          | Date     | Sí        |                                                  |
| endDate            | Date     | No        | Debe ser > startDate (validación pre-save)       |
| items              | Array    | Sí        | Al menos un item (ver abajo)                     |
| monthlyPrice       | Number   | Sí        | min: 0 (calculado desde items)                    |
| pdfUrl             | String   | No        | URL del PDF en Cloudinary                        |
| pdfPublicId        | String   | No        | Public ID en Cloudinary                          |
| createdAt / updatedAt | Date  | Auto      |                                                  |

**ContractItem (subdocumento):**  
`serviceId` (ref Service), `serviceName` (snapshot), `quantity`, `unitPrice` (snapshot), `notes`.

**Índices:** clientId, status, startDate, (clientId + status).

**Reglas:** Un cliente solo puede tener un contrato con status `active` a la vez. Los items son inmutables en cuanto a snapshot (serviceName, unitPrice) para no modificar precios históricos.

---

### 3.6 Invoice

Factura asociada a un contrato (mensual o por extras de escalamientos).

| Campo        | Tipo     | Requerido | Descripción                                      |
|-------------|----------|-----------|--------------------------------------------------|
| contractId  | ObjectId | Sí        | ref: Contract                                    |
| clientId    | ObjectId | Sí        | ref: Client                                      |
| invoiceNumber | String | No        | Único, ej. INV-0001 (sparse unique)              |
| issueDate   | Date     | Sí        |                                                  |
| dueDate     | Date     | Sí        | Debe ser > issueDate (validación pre-save)       |
| billingYear | Number   | Sí        | 2000–9999                                        |
| billingMonth| Number   | Sí        | 1–12                                             |
| status      | Enum     | No        | `draft` \| `pending` \| `paid` \| `overdue` \| `cancelled` |
| totals      | Subdoc   | Sí        | subtotal, tax (opc.), total, paidAmount          |
| items       | Array    | Sí        | Al menos un item (ver abajo)                     |
| notes       | String   | No        |                                                  |
| pdfUrl / pdfPublicId | String | No  | Cloudinary                                       |
| createdAt / updatedAt | Date  | Auto      |                                                  |

**InvoiceItem:**  
Incluye serviceId, serviceName, quantity, unitPrice, notes; opcionalmente `scopeChangeId` e `isExtra: true` para líneas que vienen de escalamientos.

**Índices:** contractId, clientId, status, dueDate, invoiceNumber (unique sparse), **(contractId + billingYear + billingMonth) unique** (evita facturas duplicadas por contrato/mes).

**Reglas:** Al registrar un pago, se actualiza `totals.paidAmount`; si `paidAmount >= total`, el status pasa a `paid`. Las facturas con dueDate &lt; hoy y pendientes de pago se marcan como `overdue` (vía endpoint `/api/billing/overdue`, típicamente cron).

---

### 3.7 Payment

Pago registrado contra una factura.

| Campo        | Tipo     | Requerido | Descripción                    |
|-------------|----------|-----------|--------------------------------|
| invoiceId   | ObjectId | Sí        | ref: Invoice                   |
| amount      | Number   | Sí        | min: 0.01                      |
| paymentDate | Date     | Sí        | default: Date.now              |
| paymentMethod | Enum   | Sí        | `cash` \| `transfer` \| `check` \| `other` |
| reference   | String   | No        |                                |
| notes       | String   | No        |                                |
| createdBy   | ObjectId | No        | ref: AdminUser                 |
| createdAt / updatedAt | Date | Auto      |                                |

**Regla:** El registro de pago se hace en **transacción** con la actualización de `Invoice.totals.paidAmount` (y status a `paid` si aplica). No se puede pagar más del pendiente ni registrar pago en factura cancelada.

---

### 3.8 ScopeChange

Escalamiento (cambio de alcance) sobre un contrato: agregar, modificar o quitar ítems.

| Campo         | Tipo     | Requerido | Descripción                                  |
|--------------|----------|-----------|----------------------------------------------|
| contractId   | ObjectId | Sí        | ref: Contract                                |
| clientId     | ObjectId | Sí        | ref: Client                                  |
| status       | Enum     | No        | `pending` \| `approved` \| `applied` \| `rejected` \| `cancelled` |
| requestedDate| Date     | Sí        | default: Date.now                            |
| approvedDate / appliedDate / rejectedDate | Date | No  |                                              |
| requestedBy / approvedBy / appliedBy / rejectedBy | ObjectId | No | ref: AdminUser (trazabilidad)        |
| items        | Array    | Sí        | Al menos un cambio (ver abajo)               |
| description  | String   | Sí        |                                              |
| notes        | String   | No        |                                              |
| invoiced     | Boolean  | No        | default: false                               |
| invoiceId    | ObjectId | No        | ref: Invoice (cuando se factura el extra)    |
| createdAt / updatedAt | Date | Auto      |                                |

**ScopeChangeItem:**  
`action` (`add` \| `modify` \| `remove`), `serviceId`, `serviceName`, `quantity`, `unitPrice`, `notes`, `originalItemIndex` (para modify/remove).

**Índices:** contractId, clientId, status, requestedDate, invoiced, (contractId + status).

**Flujo:** Solo se pueden crear para contratos **activos**. Transiciones: crear (pending) → **approve** → **apply** (modifica `Contract.items` y recalcula `monthlyPrice` en transacción) → opcionalmente **facturar** (POST `/api/invoices/scope-extra`), que crea una factura con items `isExtra: true` y marca el/los ScopeChange como `invoiced` y asigna `invoiceId`.

---

### 3.9 Settings (singleton)

Un solo documento en la colección. Almacena el contador para numeración de facturas.

| Campo        | Tipo   | Requerido | Descripción              |
|-------------|--------|-----------|--------------------------|
| nextSequence| Number | No        | default: 1, min: 1       |
| createdAt / updatedAt | Date | Auto      |                          |

Se usa con **$inc** atómico para generar `invoiceNumber` (INV-0001, INV-0002, …) sin duplicados.

---

### 3.10 AuditLog

Registro de auditoría de acciones (quién, qué, cuándo).

| Campo       | Tipo     | Requerido | Descripción                    |
|------------|----------|-----------|--------------------------------|
| userId     | ObjectId | No        | ref: AdminUser                 |
| action     | Enum     | Sí        | create, update, delete, view, login, logout, export, approve, reject, apply, payment, other |
| resourceType | String | Sí        | ej. client, contract, invoice |
| resourceId | ObjectId | No        |                                |
| description| String   | Sí        |                                |
| metadata   | Mixed    | No        |                                |
| ipAddress  | String   | No        |                                |
| userAgent  | String   | No        |                                |
| createdAt  | Date     | Auto      | (solo createdAt, sin updatedAt) |

Se escribe desde las rutas API (clientes, contratos, pagos, escalamientos, billing, export PDF, forgot/reset password) mediante `logAction()` de `lib/audit.ts`.

---

### 3.11 Allocation

Asignación de porcentaje de tiempo de un usuario (AdminUser) a un contrato o cliente en un mes/año (para reportes de carga de trabajo).

| Campo      | Tipo     | Requerido | Descripción        |
|-----------|----------|-----------|--------------------|
| userId    | ObjectId | Sí        | ref: AdminUser     |
| contractId| ObjectId | No        | ref: Contract      |
| clientId  | ObjectId | No        | ref: Client        |
| percentage| Number   | Sí        | 0–100              |
| year      | Number   | Sí        | 2000–9999          |
| month     | Number   | Sí        | 1–12               |
| notes     | String   | No        |                    |

**Validación pre-save:** La suma de `percentage` para el mismo `userId` en el mismo `year`/`month` no puede superar 100%.

---

### 3.12 PasswordResetToken

Tokens de recuperación de contraseña (válidos 1 hora).

| Campo     | Tipo     | Requerido | Descripción                    |
|----------|----------|-----------|--------------------------------|
| userId   | ObjectId | Sí        | ref: AdminUser                 |
| token    | String   | Sí        | Único (hex 32 bytes)           |
| expiresAt| Date     | Sí        | TTL index (MongoDB borra al expirar) |
| used     | Boolean  | No        | default: false                 |
| createdAt| Date     | Auto      |                                |

---

### 3.13 Role

Modelo de roles con permisos (array de strings). **No está integrado** en la lógica actual: todos los usuarios autenticados tienen acceso completo. Preparado para uso futuro.

---

## 4. Diagrama de relaciones entre entidades

```
AdminUser ──┬── PasswordResetToken (userId)
            ├── Payment (createdBy)
            ├── ScopeChange (requestedBy, approvedBy, appliedBy, rejectedBy)
            ├── AuditLog (userId)
            └── Allocation (userId)

Client ────┬── Contract (clientId)
           ├── Invoice (clientId)
           ├── ScopeChange (clientId)
           └── Allocation (clientId)

Service ───┬── Contract.items (serviceId + snapshot name/price)
           ├── Invoice.items (serviceId + snapshot)
           ├── ScopeChange.items (serviceId + snapshot)
           └── PackageTemplate.items (serviceId)

PackageTemplate ─── Contract (packageTemplateId, opcional)

Contract ───┬── Invoice (contractId)
            ├── ScopeChange (contractId)
            └── Allocation (contractId)

Invoice ────┬── Payment (invoiceId)
            └── ScopeChange (invoiceId, cuando se factura el extra)

ScopeChange ─── Invoice (scopeChangeId en items, cuando isExtra: true)

Settings (singleton) ─── usado por Invoice (nextSequence para invoiceNumber)
```

---

## 5. Flujos del administrador

### 5.1 Entrada al sistema

1. Admin abre la app → redirige a `/admin/dashboard` (si ya hay sesión) o a `/login`.
2. En **Login** ingresa email y contraseña → POST a NextAuth → si son correctos, se crea sesión JWT y se redirige al dashboard.
3. **Recuperar contraseña:** desde login va a `/forgot-password`, ingresa email → POST `/api/auth/forgot-password` → si el email existe en AdminUser, se genera token, se envía correo con Resend y se guarda en PasswordResetToken. Luego abre el enlace en el correo (`/reset-password?token=...`), ingresa nueva contraseña → POST `/api/auth/reset-password` → se actualiza la contraseña del AdminUser y se invalida el token.

### 5.2 Dashboard

- **Página:** `/admin/dashboard`.
- **API:** GET `/api/dashboard/actions`.
- **Comportamiento:** Agrupa y ordena por prioridad:
  1. Facturas **vencidas** (pendientes de pago).
  2. Facturas que **vencen hoy**.
  3. **Escalamientos aplicados** sin facturar.
  4. **Renovaciones** (contratos activos que vencen en los próximos 30 días).

Cada ítem tiene un enlace directo (p. ej. a facturación o al detalle del contrato). Desde el dashboard se puede abrir el modal para facturar escalamientos (scope-extra).

### 5.3 Catálogo: Servicios

- **Página:** `/admin/services`.
- **APIs:** GET/POST `/api/services`, GET/PUT/DELETE `/api/services/[id]`.
- **Flujo:** Listar servicios, crear uno nuevo (nombre, descripción, categoría, precio base), editar o eliminar. Los servicios se usan luego en contratos, plantillas y escalamientos.

### 5.4 Catálogo: Plantillas de paquetes

- **Página:** `/admin/package-templates`.
- **APIs:** GET/POST `/api/package-templates`, GET/PUT/DELETE `/api/package-templates/[id]`.
- **Flujo:** Crear/editar plantillas con nombre, descripción y lista de ítems (servicio, cantidad, precio unitario). Las plantillas son opcionales al crear un contrato (pero permiten reutilizar conjuntos de servicios).

### 5.5 Clientes y contratos

- **Listado:** `/admin/clients` — GET `/api/clients` (filtros: search, clientType, status).
- **Alta:** `/admin/clients/new` — wizard que puede crear **cliente** (POST `/api/clients`) y opcionalmente **contrato** (POST `/api/contracts`) en el mismo flujo.
- **Ficha cliente:** `/admin/clients/[id]` — GET `/api/clients/[id]` (devuelve cliente + sus contratos). Desde ahí se pueden crear contratos (POST `/api/contracts`), editar/cancelar contrato (PUT/DELETE `/api/contracts/[id]`), y generar/ver PDF del contrato (POST `/api/exports/pdf` con type contract).

**Reglas:** Un cliente solo puede tener un contrato **activo** a la vez. El contrato debe tener al menos un ítem; `monthlyPrice` se calcula a partir de los ítems. Al crear/actualizar contrato se guardan snapshots de servicio (serviceName, unitPrice).

### 5.6 Facturación y cobros

- **Bandeja de cobros:** `/admin/billing` — GET `/api/invoices` (filtros: status, overdue). Muestra facturas; se pueden filtrar por estado y vencidas.
- **Registrar pago:** Desde una factura se abre el modal de pago → POST `/api/payments` (invoiceId, amount, paymentDate, paymentMethod, reference, notes). Se ejecuta en **transacción**: se crea el Payment y se actualiza `Invoice.totals.paidAmount`; si paidAmount ≥ total, status pasa a `paid`.
- **Ciclo mensual:** POST `/api/billing/cycle` — recorre todos los contratos **activos**, y para cada uno, si no existe factura para el mes/año actual, crea una Invoice con número secuencial (Settings.nextSequence), issueDate/dueDate (vencimiento +30 días), items copiados del contrato y status pending. Es **idempotente** gracias al índice único (contractId, billingYear, billingMonth).
- **Facturas vencidas:** POST `/api/billing/overdue` — actualiza a status `overdue` las facturas con dueDate &lt; hoy y status pending/draft que aún tengan saldo pendiente. Pensado para ser llamado por un **cron** (diario) con header `Authorization: Bearer CRON_SECRET` o `X-Cron-Secret`.
- **Factura de extras (escalamientos):** Desde el dashboard o desde escalamientos se eligen uno o más ScopeChange en estado **applied** y **invoiced: false**. POST `/api/invoices/scope-extra` con `scopeChangeIds`, opcionalmente issueDate, dueDate, notes. Crea una factura con ítems marcados como `isExtra: true` y `scopeChangeId`, marca esos ScopeChange como `invoiced: true` y les asigna `invoiceId`. Todos los escalamientos deben ser del mismo cliente.

### 5.7 Escalamientos

- **Listado:** `/admin/scope-changes` — GET `/api/scope-changes` (filtros: contractId, clientId, status, invoiced).
- **Nuevo:** `/admin/scope-changes/new` — wizard que pide contrato, descripción y ítems (acción add/modify/remove, servicio, cantidad, precio, y para modify/remove el índice del ítem original). POST `/api/scope-changes`.
- **Aprobar:** POST `/api/scope-changes/[id]/approve` — solo si status es `pending` y el contrato sigue activo. Pasa a `approved` y registra approvedBy/approvedDate.
- **Rechazar:** POST `/api/scope-changes/[id]/reject` — solo si status es `pending`. Pasa a `rejected`, rejectedBy/rejectedDate.
- **Aplicar:** POST `/api/scope-changes/[id]/apply` — solo si status es `approved` y el contrato está activo. En **transacción**: modifica `Contract.items` según las acciones (add/modify/remove), recalcula `monthlyPrice`, y marca el ScopeChange como `applied` con appliedBy/appliedDate. No se puede aplicar si el resultado dejaría el contrato sin ítems.

Después de aplicar, el escalamiento aparece como “sin facturar” hasta que se emite una factura de extras (scope-extra).

### 5.8 Reportes

- **Página:** `/admin/reports` (pestañas).
- **APIs:**
  - GET `/api/reports/revenue` — ingresos por período (year, month). Agregación sobre Invoice (status paid) y Payment.
  - GET `/api/reports/ar` — cuentas por cobrar (facturas pendientes/overdue); opcional `includeOverdue`.
  - GET `/api/reports/renewals` — contratos activos que vencen en los próximos días (param `daysAhead`, default 90).
  - GET `/api/reports/workload` — carga de trabajo por usuario (year, month) usando el modelo Allocation (porcentajes por usuario/mes).

### 5.9 Exportar PDF

- **Uso:** Desde la ficha de cliente (contrato) o desde facturación (factura), se puede “Generar PDF” o “Ver/Regenerar PDF”.
- **API:** POST `/api/exports/pdf` con `{ type: 'contract' | 'invoice', id: string, regenerate?: boolean }`. El servidor renderiza la página de impresión (`/admin/print/contract/[id]` o `/admin/print/invoice/[id]`) con Puppeteer, genera el PDF, lo sube a Cloudinary y guarda `pdfUrl` y `pdfPublicId` en el Contract o Invoice. La respuesta devuelve la URL del PDF.

### 5.10 Configuración

- **Página:** `/admin/settings`. Muestra en solo lectura: próximo número de factura (Settings.nextSequence), enlace a “Cambiar contraseña” (`/forgot-password`) y entorno (desarrollo/producción). No edita variables ni nextSequence desde la UI.

---

## 6. Resumen de APIs (endpoints)

| Método | Ruta | Descripción |
|--------|------|-------------|
| Auth | | |
| GET/POST | `/api/auth/[...nextauth]` | Login, logout, sesión (NextAuth) |
| POST | `/api/auth/forgot-password` | Solicitar reset; envía email (Resend) |
| POST | `/api/auth/reset-password` | Restablecer contraseña con token |
| Clientes | | |
| GET | `/api/clients` | Lista (query: search, clientType, status) |
| POST | `/api/clients` | Crear cliente |
| GET | `/api/clients/[id]` | Cliente + sus contratos |
| PUT | `/api/clients/[id]` | Actualizar cliente |
| DELETE | `/api/clients/[id]` | Desactivar (status inactive) |
| Contratos | | |
| GET | `/api/contracts` | Lista (query: clientId) |
| POST | `/api/contracts` | Crear contrato |
| GET | `/api/contracts/[id]` | Detalle contrato |
| PUT | `/api/contracts/[id]` | Actualizar contrato |
| DELETE | `/api/contracts/[id]` | Cancelar contrato |
| Servicios | | |
| GET | `/api/services` | Lista servicios |
| POST | `/api/services` | Crear servicio |
| GET/PUT/DELETE | `/api/services/[id]` | CRUD servicio |
| Plantillas | | |
| GET | `/api/package-templates` | Lista activas |
| POST | `/api/package-templates` | Crear plantilla |
| GET/PUT/DELETE | `/api/package-templates/[id]` | CRUD plantilla |
| Facturas | | |
| GET | `/api/invoices` | Lista (clientId, status, overdue) |
| GET | `/api/invoices/[id]` | Detalle + pagos |
| POST | `/api/invoices/scope-extra` | Crear factura de extras por escalamientos |
| Pagos | | |
| GET | `/api/payments` | Lista (query: invoiceId) |
| POST | `/api/payments` | Registrar pago (transacción con actualización de Invoice) |
| Billing | | |
| POST | `/api/billing/cycle` | Generar facturas mensuales (contratos activos) |
| POST | `/api/billing/overdue` | Marcar facturas vencidas (sesión o CRON_SECRET) |
| Escalamientos | | |
| GET | `/api/scope-changes` | Lista (contractId, clientId, status, invoiced) |
| POST | `/api/scope-changes` | Crear escalamiento |
| GET/PUT/DELETE | `/api/scope-changes/[id]` | Detalle / actualizar / cancelar |
| POST | `/api/scope-changes/[id]/approve` | Aprobar (pending → approved) |
| POST | `/api/scope-changes/[id]/reject` | Rechazar (pending → rejected) |
| POST | `/api/scope-changes/[id]/apply` | Aplicar (approved → applied, modifica contrato) |
| Reportes | | |
| GET | `/api/reports/revenue` | Ingresos (year, month) |
| GET | `/api/reports/ar` | Cuentas por cobrar |
| GET | `/api/reports/renewals` | Renovaciones (daysAhead) |
| GET | `/api/reports/workload` | Carga de trabajo (year, month) |
| Otros | | |
| GET | `/api/dashboard/actions` | Acciones prioritarias para el dashboard |
| POST | `/api/exports/pdf` | Generar PDF (contract/invoice) y subir a Cloudinary |
| POST | `/api/seed` | Seed inicial (solo desarrollo) |

Todas las rutas anteriores (salvo auth, seed y billing/overdue sin sesión) están protegidas por el middleware que exige JWT válido.

---

## 7. Comunicación frontend–backend

- **Autenticación:** Las peticiones del navegador llevan la cookie de sesión de NextAuth. El middleware valida el JWT en las rutas `/api/*` protegidas y devuelve 401 JSON si no hay token válido.
- **Páginas admin:** El layout de `/admin` hace `getServerSession(authOptions)` en el servidor; si no hay sesión, redirige a `/login`. Las páginas son en su mayoría client components que llaman a `fetch('/api/...')`; las cookies se envían por defecto.
- **Auditoría:** En las rutas API que modifican datos (CRUD clientes, contratos, pagos, escalamientos, billing, export PDF), tras la operación se llama a `logAction()` con `userId` de la sesión, `action`, `resourceType`, `resourceId`, `description` y opcionalmente IP y userAgent. Los errores de envío de email (Resend) o de log no cortan la respuesta al usuario.
- **Transacciones:** Operaciones críticas (registro de pago, apply de escalamiento, ciclo de facturación) usan `mongoose.startSession()` y transacciones para mantener consistencia entre documentos.

---

## 8. Flujo de datos resumido

1. **Alta de cliente mensual:** Cliente (Client) → Contrato (Contract) con ítems (snapshots de Service). Opcionalmente PDF del contrato vía export.
2. **Ciclo mensual:** Billing/cycle crea Invoice por cada contrato activo sin factura para ese mes; usa Settings.nextSequence para invoiceNumber.
3. **Cobro:** Payment se crea y Invoice.totals.paidAmount se actualiza en la misma transacción; si total pagado ≥ total, Invoice.status → paid.
4. **Escalamiento:** ScopeChange (pending) → approve → apply (actualiza Contract.items y monthlyPrice) → factura de extras (Invoice con items isExtra, ScopeChange.invoiced = true).
5. **Overdue:** Cron (o manual) llama a billing/overdue y actualiza Invoice.status a overdue cuando corresponda.

Este documento refleja el estado actual del sistema en funcionamiento (modelos, reglas de negocio, flujos del admin y APIs).

---

## 9. Datos necesarios para probar el sistema completo

Para poder probar todos los flujos y entender la funcionalidad del sistema, conviene tener en la base de datos los siguientes datos, **en este orden**.

### 9.1 Lo que ya proporciona el seed (`npm run seed`)

| Colección   | Qué crea | Para qué sirve |
|-------------|----------|----------------|
| **AdminUser** | 1 usuario (email y password de `.env.local` o por defecto) | Login, recuperar contraseña, y que las APIs tengan `userId` en AuditLog. |
| **Settings**  | 1 documento con `nextSequence: 1` | Numeración de facturas (INV-0001, INV-0002, …). |

Sin esto no puedes entrar al admin ni generar facturas con número.

---

### 9.2 Orden recomendado y datos mínimos

#### Paso 1 — Servicios (catálogo)

**Necesario para:** Contratos, plantillas de paquetes, escalamientos.

Crear al menos **3–4 servicios** desde `/admin/services`, por ejemplo:

| Nombre        | Descripción (opc.) | Precio base |
|---------------|--------------------|-------------|
| Gestión de redes | Community management | 150000 |
| Diseño gráfico   | Piezas para redes   | 80000  |
| Redacción        | Posts y copies      | 60000  |
| Estrategia       | Plan mensual        | 120000 |

Sin servicios no puedes armar ítems de contratos ni de plantillas.

---

#### Paso 2 — Cliente(s) y contrato(s)

**Necesario para:** Dashboard, facturación, reportes, export PDF de contrato.

- Crear al menos **1 cliente** tipo `monthly` (desde `/admin/clients/new` o desde Clientes → Nuevo).
- Para ese cliente, crear **1 contrato** con status **active**, con:
  - **startDate** = primer día del mes actual (o anterior).
  - **endDate** = dentro de 2–3 meses (para ver “renovación próxima” en dashboard/reportes).
  - **Al menos 1 ítem** (elegir servicios del paso 1, cantidad y precio). El sistema calculará `monthlyPrice`.

Opcional: un segundo cliente con contrato **draft** o **active** para probar listados y filtros.

---

#### Paso 3 — Facturas (ciclo mensual y estado)

**Necesario para:** Bandeja de cobros, dashboard (vencen hoy / vencidas), reportes (ingresos, AR), export PDF de factura, pagos.

1. Ejecutar **ciclo de facturación** para el mes actual:  
   Llamar **POST** `/api/billing/cycle` (desde la app, si hay botón, o con Postman/curl estando logueado).  
   Eso crea una **Invoice** por cada contrato **active** que aún no tenga factura para ese mes (número INV-0001, INV-0002, …).

2. Para ver **facturas vencidas** en el dashboard:  
   Tener al menos una factura con `dueDate` **anterior a hoy** y que siga en status `pending` (o `overdue`). Puedes crearla con el ciclo en un mes pasado (cambiando fechas en el backend) o llamar después **POST** `/api/billing/overdue` para marcar como vencidas las que correspondan.

3. Para probar **pagos**:  
   Tener al menos una factura en `pending` y registrar un pago (parcial o total) desde `/admin/billing` → modal de pago. Así ves cambio a `paid` cuando el total pagado cubre el total.

Resumen mínimo: **1 factura pendiente** (para cobros y PDF) y, si quieres, **1 factura pagada** (para reporte de ingresos).

---

#### Paso 4 — Escalamiento (opcional pero recomendado)

**Necesario para:** Flujo completo crear → aprobar → aplicar → facturar extras; dashboard “escalamientos sin facturar”.

1. Tener un **contrato active** con al menos un ítem (del paso 2).
2. Ir a **Escalamientos** → **Nuevo** y crear un escalamiento para ese contrato:
   - Descripción: ej. “Ampliación de horas de diseño”.
   - Al menos un ítem con acción **add** (nuevo servicio o más cantidad) o **modify** (cambiar cantidad/precio de un ítem existente).
3. **Aprobar** el escalamiento (botón en listado o detalle).
4. **Aplicar** el escalamiento (el contrato se actualiza: nuevos/modificados ítems y nuevo `monthlyPrice`).
5. Desde **Dashboard** (o desde Escalamientos), **facturar el extra** (factura de scope-extra). Así aparece una factura con ítems “extras” y el escalamiento queda marcado como facturado.

Con esto ves: alerta “escalamiento sin facturar”, factura de extras y desaparición de la alerta al facturar.

---

#### Paso 5 — Plantilla de paquete (opcional)

**Necesario para:** Probar “crear contrato desde plantilla” y reutilizar conjuntos de servicios.

Desde `/admin/package-templates` crear **1 plantilla** con nombre (ej. “Paquete estándar”) y varios ítems (servicios del paso 1, cantidades y precios). Luego, al dar de alta un nuevo cliente/contrato, podrás elegir esa plantilla para rellenar los ítems.

---

#### Paso 6 — Reportes y configuración

- **Reporte de ingresos:** Necesita facturas con status **paid** (ya cubierto si registraste un pago total en el paso 3).
- **Reporte AR (cuentas por cobrar):** Necesita facturas **pending** o **overdue** con saldo (paso 3).
- **Reporte renovaciones:** Necesita contratos **active** con **endDate** en el futuro (paso 2).
- **Reporte carga de trabajo:** Necesita **Allocation** (porcentaje de tiempo de un AdminUser a contrato/cliente por mes/año). Se pueden crear desde la API o, si la UI lo permite, desde Reportes. Mínimo: 1 asignación para el usuario admin en el mes/año actual.

**Configuración** (`/admin/settings`): Solo requiere que exista **Settings** (ya lo da el seed). Muestra próximo número de factura y enlace a cambiar contraseña.

---

### 9.3 Resumen mínimo para “recorrer todo”

| Qué | Cantidad mínima | Dónde crearlo |
|-----|------------------|---------------|
| AdminUser + Settings | 1 + 1 doc | `npm run seed` |
| Service | 3–4 | `/admin/services` |
| Client (monthly) | 1 | `/admin/clients` o wizard alta |
| Contract (active, con ítems) | 1 | Ficha del cliente o wizard |
| Ejecutar billing/cycle | 1 vez | POST `/api/billing/cycle` (o botón en app si existe) |
| Invoice | 1+ (generadas por el ciclo) | Automático |
| Registrar 1 pago | 1 (total o parcial) | `/admin/billing` → modal pago |
| ScopeChange | 1 (crear → aprobar → aplicar → facturar extra) | `/admin/scope-changes` y dashboard |
| PackageTemplate | 1 (opcional) | `/admin/package-templates` |
| Allocation | 1 (opcional, para reporte workload) | API o UI de reportes si existe |

Con esto puedes: hacer login, ver dashboard con alertas, listar y editar clientes/contratos, ejecutar ciclo de facturación, ver facturas y registrar pagos, probar escalamientos y factura de extras, ver reportes (ingresos, AR, renovaciones y, con Allocation, carga de trabajo), exportar PDF de contrato y de factura, y usar configuración.

### 9.4 Script de seed de demostración

Para inyectar todos estos datos de una vez (sin crear duplicados si ya existen), ejecuta:

```bash
npm run seed        # Primero: crea AdminUser y Settings
npm run seed-demo   # Luego: crea servicios, clientes, contratos, facturas, pagos, escalamientos, plantilla y asignación
```

El script **`scripts/seed-demo.ts`** crea datos con lógica coherente al sistema:

- **Servicios:** 4 (gestión de redes, diseño gráfico, redacción, estrategia digital) con precios base.
- **Clientes:** 2 (uno `monthly`, uno `project`) con email/telefono de demo.
- **Contratos:** 1 activo para el cliente mensual (3 ítems, precio mensual calculado, `endDate` en 2 meses para renovaciones) y 1 en draft para el cliente proyecto.
- **Facturas:** 1 vencida (mes pasado, status `overdue`), 1 pendiente (mes actual), 1 pagada (dos meses atrás) con su **Payment** asociado.
- **Escalamientos:** 1 en status **approved** (para probar “Aplicar” desde la UI) y 1 en status **applied** con `invoiced: false` (para ver la alerta “escalamiento sin facturar” y probar “Facturar extras”).
- **Plantilla:** “Paquete demo estándar” con 3 servicios para probar creación de contrato desde plantilla.
- **Allocation:** Una asignación del admin al contrato/cliente en el mes y año actual (50 %) para el reporte de carga de trabajo.

Si vuelves a ejecutar `npm run seed-demo`, no crea duplicados (comprueba por email de cliente, contrato activo del cliente, facturas por contrato/mes, etc.).
