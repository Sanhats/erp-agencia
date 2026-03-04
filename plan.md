# 🧠 ROADMAP OFICIAL DE DESARROLLO

## Sistema de Gestión para Agencia (Cobros + Talonarios + Control de Alcance)

---

# 🎯 OBJETIVO DEL SISTEMA

Construir un sistema que:

* Controle estados (no sea un Excel con UI)
* Automatice facturación mensual
* Evite olvidos de cobro
* Mantenga trazabilidad de escalas
* Guíe acciones diarias desde un Dashboard central

El sistema debe comportarse como un **motor de reglas con estados y alertas**, no como una planilla editable.

---

# 🧩 MÓDULOS PRINCIPALES

1. Core Técnico
2. Gestión Comercial (Clientes / Servicios / Contratos)
3. Facturación (Invoices + Payments)
4. Escalamientos (ScopeChanges)
5. Dashboard HOY (motor de acciones)
6. Reportes
7. Export PDF + Cloudinary
8. Operación (Roles + Allocations)
9. Seguridad + Logs

---

# 🚀 ROADMAP POR SPRINTS

---

# 🟦 SPRINT 1 — Fundación Técnica

## Objetivo

Sistema autenticado y base de datos conectada.

## Implementar

* Layout admin + sidebar
* Conexión Mongoose reutilizable
* Modelos base:

  * Client
  * Service
  * Settings (singleton)
  * AdminUser
* Seed admin inicial
* NextAuth Credentials
* Middleware protección rutas privadas

## Definition of Done

* Solo admin accede a rutas privadas
* DB conecta correctamente
* Índices básicos definidos

---

# 🟦 SPRINT 2 — Clientes + Contratos + Plantillas

## Objetivo

Permitir alta correcta de cliente mensual.

## Implementar

* CRUD Services
* CRUD PackageTemplates
* CRUD Clients
* CRUD Contracts
* Wizard Alta Cliente
* Vista ficha cliente
* Render de "Qué incluye" (contract.items)

## Reglas

* Cliente mensual debe tener contrato activo
* Validación de enums obligatoria

## Definition of Done

* Cliente mensual creado correctamente
* Contrato con items embebidos funcional

---

# 🟦 SPRINT 3 — Facturación Base + Pagos

## Objetivo

Permitir registrar pagos correctamente.

## Implementar

* Modelo Invoice
* Modelo Payment
* Endpoint registrar pago (TRANSACCIÓN)
* Campo invoice.totals.paidAmount
* Bandeja Cobros
* Modal Registrar Pago

## Reglas

* Payment + $inc paidAmount en transacción
* Si paidAmount >= total → status = paid

## Definition of Done

* Pago parcial funciona
* Pago total cambia estado automáticamente

---

# 🟦 SPRINT 4 — Billing Cycle + Numeración + Overdue

## Objetivo

Automatizar facturación mensual.

## Implementar

* Endpoint billing/cycle (TRANSACCIÓN)
* Índice único invoice mensual
* Numeración con settings.nextSequence
* Job diario overdue

## Reglas

* Idempotencia obligatoria
* No duplicar facturas

## Definition of Done

* No se crean facturas duplicadas
* Numeración correlativa correcta

---

# 🟦 SPRINT 5 — Escalamientos

## Objetivo

Controlar cambios de alcance con trazabilidad.

## Implementar

* Modelo ScopeChange
* Wizard Escalar servicio
* Endpoint approve
* Endpoint apply (TRANSACCIÓN)

## Apply debe

* Modificar contract.items
* Cambiar status a applied
* No facturar automáticamente

## Definition of Done

* Escala aplicada modifica contrato
* Aparece como pendiente de facturar

---

# 🟦 SPRINT 6 — Facturar Extras + Dashboard HOY

## Objetivo

Construir motor real de acciones.

## Implementar

* Agregar scope_extra lines en invoice
* Marcar scopeChange como invoiced
* Dashboard:

  * Vencen hoy
  * Vencidas
  * Escalas sin facturar
  * Renovaciones
  * Próximas acciones ordenadas

## Definition of Done

* Al facturar extra desaparece alerta
* Dashboard ordena por urgencia

---

# 🟦 SPRINT 7 — Export PDF + Cloudinary

## Objetivo

Exportar información en PDF.

## Implementar

* Páginas /print
* Endpoint /api/exports/pdf
* Headless browser
* Subida a Cloudinary
* Guardar url y publicId en DB

## Definition of Done

* Genera PDF válido
* Se sube correctamente
* Devuelve URL pública

---

# 🟦 SPRINT 8 — Operación + Reportes

## Objetivo

Control operativo y métricas.

## Implementar

* Modelo Role
* Modelo Allocations
* Validación sum <= 100%
* Reportes:

  * Revenue
  * AR (overdue)
  * Renovaciones
  * Workload

## Definition of Done

* Allocations mensuales funcionales
* Reportes con aggregation correctos

---

# 🟦 SPRINT 9 — Seguridad + Hardening

## Objetivo

Sistema listo para producción.

## Implementar

* AuditLog
* PasswordReset completo
* Rate limiting
* Manejo robusto de errores
* Logs estructurados

## Definition of Done

* Reset password seguro
* Transacciones validadas
* Edge cases testeados

---

# 🔐 REGLAS ARQUITECTÓNICAS OBLIGATORIAS

* Transacciones en:

  * Billing cycle
  * Apply scopeChange
  * Registrar payment
* Índice único invoice mensual
* Mantener invoice.totals.paidAmount
* Validar allocations <= 100
* No modificar pricing histórico sin trazabilidad

---

# 🎮 PRINCIPIO UX CENTRAL

El sistema debe siempre responder:

> ¿Qué hago hoy?

Y ofrecer botón directo para resolver.

Si el usuario puede usar solo Dashboard + Cobros y el sistema se mantiene sano, el objetivo está cumplido.

---

# 🧠 NOTA PARA EL AGENTE

Este archivo es la guía oficial del desarrollo.
No implementar features fuera del roadmap sin validación.
Respetar orden de sprints para evitar deuda técnica.
Priorizar integridad de datos sobre velocidad de desarrollo.

---

# 📌 ESTADO ACTUAL

[x] Sprint 1
[x] Sprint 2
[x] Sprint 3
[x] Sprint 4
[x] Sprint 5
[x] Sprint 6
[x] Sprint 7
[x] Sprint 8
[x] Sprint 9

---

Documento vivo. Actualizar solo con criterio técnico claro.
