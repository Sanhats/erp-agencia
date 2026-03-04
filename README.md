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
RESEND_FROM=ERP Agencia <onboarding@resend.dev>

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

## 📚 Roadmap

Ver `plan.md` para el roadmap completo de desarrollo.

## 🔐 Seguridad

- Las rutas `/admin/*` están protegidas por sesión en el layout
- Las rutas `/api/*` (excepto `/api/auth/*`, `/api/seed`, `/api/billing/overdue`) exigen JWT válido vía middleware
- El endpoint `/api/billing/overdue` acepta sesión de usuario o header `Authorization: Bearer <CRON_SECRET>` / `X-Cron-Secret` para ejecución por cron
- NextAuth maneja la autenticación con JWT
- Passwords hasheados con bcryptjs
