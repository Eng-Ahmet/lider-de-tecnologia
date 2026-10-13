# 📢 Road Incident Reporting System — CalleFix AI (Tu voz ha llegado)

> **Plataforma Smart City de Notificación de Incidencias Urbanas con IA, Geolocalización Real y Agrupación Espacial**  
> *Edición Hackathon Líderes Digitales • Málaga 2026*

---

## 1. Arquitectura del Proyecto y Asignación de Puertos Aislados

Para garantizar que esta aplicación esté **completamente aislada** de cualquier otro proyecto, contenedor de Docker o base de datos ejecutándose en la misma máquina o servidor, se han configurado **puertos dedicados únicos y no conflictivos**, verificados mediante inspección de red previa:

| Servicio | Puerto Dedicado | Puerto Interno (Docker) | Estado / Protocolo |
|---|---|---|---|
| **Frontend Web (Angular 22 + Tailwind CSS)** | **`4880`** | `80` (Nginx) | HTTP / Verificado libre |
| **Backend API (Node.js + Express + TypeScript)** | **`3880`** | `3880` | REST API / Verificado libre |
| **Base de Datos (PostgreSQL 16)** | **`5488`** | `5432` | TCP / PostgreSQL / Verificado libre |

- **Red Aislada de Docker:** `callefix-isolated-network` (bridge independiente para evitar cruce con otros contenedores).
- **Volúmenes Nombrados Específicos:** `callefix-pgdata` y `callefix-uploads`.
- **Nombres de Contenedores:** `callefix-frontend`, `callefix-backend`, `callefix-db`.

---

## 2. Esquema de Base de Datos y Autenticación de Usuarios

### 2.1 Esquema de Usuario (`User`)
La tabla de usuarios mantiene separados los perfiles de los reportes viales:

```sql
CREATE TABLE users (
  id VARCHAR(64) PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone_number TEXT,
  role VARCHAR(32) NOT NULL DEFAULT 'User', -- 'User' | 'Administrator'
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 Seguridad y Autenticación
- **Contraseñas Seguras:** Hasheadas con `bcryptjs` (salt rounds = 10). Nunca se almacenan contraseñas en texto plano.
- **Autenticación:** Tokens JWT (JSON Web Tokens) firmados con clave secreta aislada (`JWT_SECRET`) y caducidad de 7 días.
- **Control de Acceso Basado en Roles (RBAC):**
  - **`User` (Vecino):** Puede crear reportes, ver incidencias públicas, ver y filtrar sus propios reportes (`Mis Reportes`), y recibir notificaciones por email.
  - **`Administrator` (Técnico Municipal):** Tiene permisos para modificar el estado del ciclo de vida (`Submitted → UnderReview → InProgress → Resolved`), asignar cuadrillas, registrar notas de auditoría y gestionar todos los incidentes.

### 2.3 Cuentas Pre-configuradas para Evaluación Rápida:
- **Administrador Municipal:**
  - Email: `admin@callefix.malaga.es`
  - Contraseña: `Admin123!`
  - Rol: `Administrator` (Marta Gómez - Técnica Municipal)
- **Ciudadano / Vecino:**
  - Email: `vecino@malaga.es`
  - Contraseña: `Vecino123!`
  - Rol: `User` (Carlos Moreno)

---

## 3. Esquema de Reportes de Incidencias Viales

```sql
CREATE TABLE reports (
  id VARCHAR(64) PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(64) NOT NULL, -- pothole, damaged_road, traffic_accident, blocked_road, damaged_sign, other_hazard
  address TEXT NOT NULL,
  neighborhood VARCHAR(64),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'Submitted', -- Submitted, UnderReview, InProgress, Resolved
  priority VARCHAR(32) NOT NULL DEFAULT 'Medium', -- Low, Medium, High, Critical
  user_id VARCHAR(64) NOT NULL REFERENCES users(id),
  user_full_name TEXT,
  user_email TEXT,
  image_url TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  status_history JSONB DEFAULT '[]'::jsonb,
  duplicate_count INT DEFAULT 1,
  cluster_id VARCHAR(64),
  ai_confidence DOUBLE PRECISION,
  ai_detected_category VARCHAR(64),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  submissions JSONB DEFAULT '[]'::jsonb
);
```

---

## 4. Panel Principal (Dashboard) con Estadísticas Reales

El panel calcula todas las estadísticas **directamente a partir de registros reales de la base de datos**:

1. **Total de Incidencias:** Conteo global de incidentes viales.
2. **Mis Reportes:** Conteo de reportes creados por el usuario actualmente autenticado (`userId === currentUserId`).
3. **Nuevas o Pendientes:** Incidentes con estado `Submitted`.
4. **En Investigación / Curso:** Incidentes en estado `UnderReview` o `InProgress`.
5. **Resueltas:** Incidentes completados (`Resolved`).
6. **Urgentes o Críticas:** Incidentes clasificados con prioridad `High` o `Critical`.
7. **Duplicados Agrupados (Ahorro Municipal):** Total de avisos unificados por el algoritmo de clustering de 40 metros.
8. **Mapa Geográfico Interactivo:** Visualización en mapa de Málaga con círculos de agrupación de 40m y pines por color.

---

## 5. Ubicación Geográfica Real y Búsqueda de Direcciones

La localización es el núcleo del sistema:
- **Búsqueda de Dirección Real:** Integración con la API de geocodificación **Nominatim / OpenStreetMap** con sugerencias en vivo mientras se escribe.
- **Mapa Interactivo con Marcador Desplazable:** El usuario puede hacer clic en cualquier calle de Málaga o arrastrar el marcador para fijar coordenadas exactas con precisión milimétrica.
- **Geolocalización GPS:** Botón `📍 Usar mi ubicación actual (GPS)` mediante la API HTML5 `navigator.geolocation`.
- **Geocodificación Inversa:** Al mover el pin, el sistema convierte automáticamente las coordenadas en una dirección legible.

---

## 6. Flujo de Creación de Reportes y Validación

1. El usuario accede al formulario en `/reports/new`.
2. Sube una fotografía (almacenada en Cloudflare R2 o en almacenamiento local seguro).
3. Puede ejecutar el **Escáner con IA** (`Analizar con IA`) que clasifica el tipo de anomalía y calcula la confianza diagnóstica.
4. Selecciona la dirección real o usa el mapa interactivo/GPS.
5. **Validación:** Se validan título, descripción, categoría, dirección y coordenadas tanto en frontend como en backend.
6. **Determinación Segura del Propietario:** El backend extrae el `userId` **exclusivamente del token JWT verificado**, nunca de parámetros enviados por el cliente.
7. **Detección de Duplicados Espacial:** Si el problema está a menos de 40 metros de una incidencia abierta del mismo tipo, se agrupa automáticamente elevando la prioridad del caso.
8. Tras la creación, el sistema actualiza de inmediato las estadísticas del panel.

---

## 7. Ciclo de Vida y Auditoría de Estados

```
[ Submitted ] ──► [ UnderReview ] ──► [ InProgress ] ──► [ Resolved ]
```

- Cada cambio de estado genera una entrada en el **Historial de Auditoría (`statusHistory`)** con:
  - Usuario que realizó el cambio (`changedByName`, `changedByUserId`).
  - Estado anterior y nuevo estado.
  - Marca de tiempo precisa.
  - Observaciones técnicas de la cuadrilla.
- **Protección de Rol:** Solo los usuarios con rol `Administrator` pueden alterar el estado. Los ciudadanos tienen acceso de solo lectura al historial.
- **Notificación por Email:** Al cambiar el estado a `Resolved`, se envía un correo a todos los vecinos vinculados a la incidencia.

---

## 8. Frontend con Tailwind CSS

El frontend ha sido configurado con **Tailwind CSS**, Google Fonts (`Outfit` y `Plus Jakarta Sans`) y un diseño en modo oscuro con estética glassmorphic, pines interactivos Leaflet y microanimaciones de escaneo por radar.

---

## 9. Instrucciones de Ejecución

### Opción A: Con Docker Compose (Entorno Aislado Completo)
```bash
docker-compose up --build
```
- **Frontend:** [http://localhost:4880](http://localhost:4880)
- **Backend API:** [http://localhost:3880](http://localhost:3880)
- **Base de Datos PostgreSQL:** Puerto aislado `5488`

---

### Opción B: Ejecución Local en Desarrollo

#### 1. Iniciar el Backend (Puerto 3880):
```bash
cd backend
npm install
npm run dev
```

#### 2. Iniciar el Frontend (Puerto 4880):
```bash
cd frontend
npm install
npm start -- --port 4880
```
- Abrir navegador en: [http://localhost:4880](http://localhost:4880)
- API en: [http://localhost:3880](http://localhost:3880)
- Endpoint de salud: [http://localhost:3880/api/health](http://localhost:3880/api/health)
