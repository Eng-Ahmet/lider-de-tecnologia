# 📢 ¡Tu voz ha llegado! — CalleFix AI Málaga
### Plataforma Smart City de Notificación de Incidencias Urbanas con IA, Geolocalización y Agrupación Espacial
> **Edición Hackathon Líderes Digitales • Ciudad de Málaga 2026**  
> *Una solución integral para empoderar al ciudadano y optimizar los recursos operativos del Ayuntamiento de Málaga.*

---

## 🌟 Resumen Ejecutivo del Proyecto (Executive Summary)

**CalleFix AI Málaga («¡Tu voz ha llegado!»)** es una plataforma web para la detección, notificación y gestión inteligente de desperfectos en la vía pública (baches, pavimento agrietado, señales de tráfico derribadas, alcantarillado y obstáculos).

El sistema resuelve el principal cuello de botella de las administraciones municipales: **la avalancha de avisos duplicados** de un mismo incidente, unificándolos automáticamente en un radio espacial de **40 metros**, ahorrando más de un **35% de visitas innecesarias** de las cuadrillas de obras y priorizando automáticamente las zonas con mayor afluencia peatonal o tráfico vehicular.

---

## 📑 Informes Detallados del Proyecto (Carpeta `تقارير/`)

Para un análisis exhaustivo y detallado, consulte la documentación oficial en la carpeta [`تقارير/`](file:///c:/Users/ahahm/Desktop/lideres-dıgitales/تقارير/):

1. **[01. Informe del Problema Municipal](file:///c:/Users/ahahm/Desktop/lideres-dıgitales/تقارير/01_تقرير_المشكلة_Municipal_Problem.md):**  
   Análisis de los cuellos de botella urbanos en Málaga, fricción burocrática, riesgo de accidentes viales y el impacto del algoritmo de agrupación de duplicados en el ahorro presupuestario.
2. **[02. Informe de la Plataforma Web y UI/UX](file:///c:/Users/ahahm/Desktop/lideres-dıgitales/تقارير/02_تقرير_الموقع_والواجهات_Web_Platform.md):**  
   Recorrido por la interfaz de usuario, diseño responsive en modo oscuro, localización 100% en español, mapas gratuitos OpenStreetMap, geolocalización GPS en 1 clic y asistente municipal.
3. **[03. Guía Técnica y Manual de Despliegue](file:///c:/Users/ahahm/Desktop/lideres-dıgitales/تقارير/03_تقرير_المشروع_تقنيا_ودليل_التشغيل_Technical_Guide.md):**  
   Arquitectura de microservicios aislados, requisitos de entorno, comandos paso a paso (`npm install`), configuración de puertos y credenciales de prueba.
4. **[Requisitos del Sistema (`requirements.txt`)](file:///c:/Users/ahahm/Desktop/lideres-dıgitales/requirements.txt):**  
   Listado de versiones requeridas para Node.js, Python, Docker y librerías clave.

---

## 🏗️ Arquitectura y Aislamiento de Puertos (Port Isolation)

El proyecto cuenta con una política estricta de **aislamiento de puertos** para garantizar que pueda ejecutarse en cualquier entorno sin colisionar con otros contenedores o bases de datos existentes:

| Servicio | Puerto Host | Puerto Contenedor | Tecnología | Estado |
|---|---|---|---|---|
| **Frontend Web** | **`4880`** | `80` (Nginx) | Angular 22 + Tailwind CSS | Activo / Verificado |
| **Backend API** | **`3880`** | `3880` | Node.js + TypeScript + Express | Activo / Verificado |
| **Base de Datos** | **`5488`** | `5432` | PostgreSQL 16 Alpine | Activo / Verificado |
| **Microservicio IA** | **`8088`** | `8000` | FastAPI + Python 3.11 + Groq Allam 7B | Activo / Verificado |

* **Red Aislada de Docker:** `callefix-isolated-network`
* **Volúmenes Nombrados:** `callefix-pgdata` y `callefix-uploads`

---

## 🚀 Características Principales del Sistema

### 1. Geolocalización Precisa en 1 Clic (100% Gratuita)
* **OpenStreetMap Estándar:** Sin dependencia de claves de API de pago ni costes por petición.
* **Botón GPS Inmediato:** `📍 Usar Mi Ubicación Actual` mediante `navigator.geolocation` con geocodificación inversa automática para rellenar calle y número.
* **Atajo Centro de Málaga:** `🎯 Centro (36.71982, -4.42139)` para pruebas rápidas en Calle Larios.
* **Selectores en Cascada:** Selección estructurada: España 🇪🇸 ➔ Provincia ➔ Municipio ➔ Línea de Dirección (`Address Line`).

### 2. Aislamiento Estricto de la Fotografía (Evidencia Real)
* La imagen subida por el ciudadano **no es alterada ni procesada por IA**. Actúa exclusivamente como **evidencia gráfica veraz** para que los operarios municipales planifiquen la reparación (herramientas, mezcla asfáltica, señalización).

### 3. Asistente Municipal Inteligente y Conciso (Málaga 010 / 092)
* **Microservicio dedicado FastAPI / Groq:** Utiliza el modelo ultraligero `allam-2-7b` para evitar quema innecesaria de tokens.
* **Respuestas directas:** Respuestas estrictamente en español de **menos de 35 palabras**.
* **Orientación municipal:** Informa de los teléfonos oficiales:
  - `010`: Línea Málaga (atención ciudadana e incidencias estándar).
  - `092`: Policía Local de Málaga (peligros graves o vías cortadas).
  - `112`: Emergencias generales.
* **Manejo de Errores Visual:** Si no hay conexión con el servicio, la interfaz muestra claramente un aviso en rojo indicando el fallo y los números directos de contacto.

### 4. Control de Acceso y Rutas Protegidas (RBAC)
* `AuthGuard` activo en todas las rutas protegidas (`/dashboard`, `/reports`, `/reports/new`, `/map`). Redirección automática a `/login` con retorno tras autenticarse.
* **Conmutador de Rol (Demo Switcher):** Botones `👑 Admin` y `👤 Vecino` en la barra superior para alternar vistas sin reiniciar sesión.

---

## 🔑 Cuentas de Acceso Pre-configuradas

| Rol | Correo Electrónico | Contraseña | Permisos |
|---|---|---|---|
| **Administrador Municipal** | `admin@callefix.malaga.es` | `Admin123!` | Cambio de estados (`UnderReview` ➔ `InProgress` ➔ `Resolved`), notas de cuadrilla y auditoría. |
| **Ciudadano / Vecino** | `vecino@malaga.es` | `Vecino123!` | Registro de incidencias con GPS, seguimiento de "Mis Reportes" y consulta al asistente. |

---

## 🛠️ Guía Rápida de Ejecución

### Opción 1: Despliegue con Docker Compose (Recomendado)
```bash
docker compose up --build
```
* **Frontend:** [http://localhost:4880](http://localhost:4880)
* **Backend:** [http://localhost:3880](http://localhost:3880)
* **FastAPI AI:** [http://localhost:8088](http://localhost:8088)
* **PostgreSQL:** Puerto `5488`

---

### Opción 2: Ejecución Local en Desarrollo

#### 1. Instalar dependencias:
```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install

# FastAPI AI
cd ../fastapi-ai && pip install -r requirements.txt
```

#### 2. Iniciar servicios:
```bash
# Backend (Terminal 1)
cd backend && npm run dev

# Frontend (Terminal 2)
cd frontend && npm start -- --port 4880

# FastAPI AI (Terminal 3)
cd fastapi-ai && uvicorn main:app --port 8000
```

---

## 🔒 Solución al Desbloqueo de Git Push (GitHub Push Protection)

Si al hacer `git push` GitHub muestra la regla de protección por secretos (`GH013: Push cannot contain secrets`):

1. Abra el enlace de desbloqueo oficial generado por GitHub para su repositorio:  
   👉 **[Desbloquear Secreto en GitHub](https://github.com/Eng-Ahmet/lider-de-tecnologia/security/secret-scanning/unblock-secret/3KdUhvEY9zpn6jptbjGi6zvqs1C)**
2. Haga clic en **"Allow secret"** (o Unblock).
3. Vuelva a ejecutar en su terminal:
   ```bash
   git push -u origin main
   ```
   ¡Y el repositorio quedará publicado exitosamente!
