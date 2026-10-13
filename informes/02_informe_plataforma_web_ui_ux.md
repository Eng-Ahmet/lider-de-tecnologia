# 🖥️ Informe 02: Especificación de la Plataforma Web y Experiencia de Usuario (UI / UX)
## Plataforma Ciudadana y Panel de Operaciones: ¡Tu voz ha llegado! — CalleFix AI
> **Ámbito:** Ayuntamiento de Málaga • Plataforma Web Angular 22 & Tailwind CSS  
> **Fecha:** Convocatoria Hackathon Líderes Digitales 2026

---

## 1. Filosofía de Diseño y Sistema Visual (Design System)

La interfaz de usuario ha sido concebida bajo el estándar **Modern Glassmorphic Dark UI**, priorizando un impacto visual de primer nivel (*Efecto WOW*), ergonomía en dispositivos táctiles móviles y contraste accesible (cumpliendo pautas WCAG AA):

* **Paleta de Colores Curada:**
  - Fondo Base: Azul noche profundo (`#020617` / `#0f172a`).
  - Acentos Primarios: Azul cielo y cian municipal (`#0284c7`, `#38bdf8`).
  - Alertas y Estados:
    - `Submitted`: Ámbar brillante (`#f59e0b`).
    - `UnderReview`: Púrpura eléctrico (`#a855f7`).
    - `InProgress`: Azul zafiro (`#3b82f6`).
    - `Resolved`: Esmeralda vibrante (`#10b981`).
* **Tipografía Moderna:**
  - **Outfit (Google Fonts):** Encabezados, cifras estadísticas y logotipos.
  - **Plus Jakarta Sans (Google Fonts):** Párrafos, formularios y tablas de datos.
* **Microinteracciones y Efectos:** Efectos de hover suaves, estados de carga con pulsos luminosos, transiciones CSS aceleradas por GPU y tarjetas de cristal con borde iluminado (`backdrop-blur-xl`).

---

## 2. Capturas de Pantalla y Flujos de la Interfaz

### 2.1. Panel Principal de Operaciones (Dashboard) — `/dashboard`
El panel centraliza las métricas en tiempo real conectándose directamente a la base de datos PostgreSQL:

```
+-----------------------------------------------------------------------------------------+
|  [Logo ¡Tu voz ha llegado! 4880]       [📊 Panel]  [📋 Incidencias]  [🗺️ Mapa]  [👑 Admin] |
+-----------------------------------------------------------------------------------------+
|                                                                                         |
|  📢 PANEL DE CONTROL MUNICIPAL — CIUDAD DE MÁLAGA                                      |
|  Visualiza incidentes reportados, tiempos de resolución y ahorro por duplicados.        |
|                                                                                         |
|  +--------------------+ +--------------------+ +--------------------+ +---------------+ |
|  |  TOTAL INCIDENCIAS | |  MIS REPORTES      | |  EN CURSO / REVIS. | |  RESUELTAS    | |
|  |  [ 12 ]            | |  [ 3 ]             | |  [ 5 ]             | |  [ 4 ]        | |
|  +--------------------+ +--------------------+ +--------------------+ +---------------+ |
|                                                                                         |
|  +-------------------------------------------+ +--------------------------------------+ |
|  |  🔥 AHORRO MUNICIPAL POR DUPLICADOS       | |  🗺️ MAPA INTERACTIVO DE MÁLAGA       | |
|  |  15 avisos unificados (-35% costes)       | |  (Pines agrupados con Leaflet)       | |
|  +-------------------------------------------+ +--------------------------------------+ |
|                                                                                         |
+-----------------------------------------------------------------------------------------+
```

*Descripción de la interfaz:*
- Tarjetas métricas superiores con conteos exactos de incidencias.
- Gráficos de desglose por categoría (Baches, Pavimento dañado, Señalización, Semáforos).
- Resumen de ahorro presupuestario derivado del algoritmo de clustering de 40 metros.
- Mini-mapa interactivo centrado en Málaga con marcadores diferenciados por color de severidad.

---

### 2.2. Formulario de Notificación en 1 Clic — `/reports/new`
El formulario más ágil del sector público, completable en menos de 1 minuto desde el teléfono móvil:

```
+-----------------------------------------------------------------------------------------+
|  ← Volver al catálogo                                                                   |
|  📢 Reportar Nueva Incidencia Vial                                                      |
|  Registra un desperfecto con geolocalización precisa y fotografía para operarios.      |
|                                                                                         |
|  [⚡ Cargar Muestra Rápida: Bache Calle Larios | Señal Teatinos | Grieta Alameda]       |
|                                                                                         |
|  1. FOTOGRAFÍA DE LA INCIDENCIA (Evidencia Visual para Operarios Municipales)           |
|  +-----------------------------------------------------------------------------------+  |
|  |             📸 Haz clic o arrastra una fotografía para adjuntarla                 |  |
|  |             (Evidencia ferial sin alteración por IA)                             |  |
|  +-----------------------------------------------------------------------------------+  |
|                                                                                         |
|  2. UBICACIÓN: ESPAÑA ➔ PROVINCIA ➔ MUNICIPIO ➔ DIRECCIÓN                              |
|  [ País: 🇪🇸 España ]  [ Provincia: Málaga ]  [ Municipio: Málaga (Centro) ]            |
|  [ Línea de Dirección: Calle Marqués de Larios, 14       ] [📍 Usar Mi Ubicación GPS]  |
|                                                                                         |
|  [🗺️ Mapa Leaflet OpenStreetMap Gratuito con Pin Desplazable]                           |
|  Coordenadas: 36.71982, -4.42139 | Botón: 🎯 Centro de Málaga                           |
|                                                                                         |
|  3. DETALLES DE LA INCIDENCIA                                                           |
|  [ Categoría: 🕳️ Bache en calzada ]  [ Prioridad: Alta ]                               |
|  [ Título: Hundimiento en pavimento ]                                                   |
|  [ Descripción: Provoca riesgo de tropiezo a peatones frente a parada... ]              |
|                                                                                         |
|                                        [ Cancelar ]  [ 📢 Registrar Incidencia Munic. ] |
+-----------------------------------------------------------------------------------------+
```

*Elementos destacados:*
- **Aislamiento fotográfico:** Se eliminó cualquier procesado o clasificación automática de la foto por IA.
- **Geolocalización GPS instantánea:** Botón `📍 Usar Mi Ubicación Actual` que detecta la latitud/longitud del navegador y autocompleta el nombre de la calle.
- **Cartografía 100% Gratuita:** Utiliza capas estándar de OpenStreetMap sin coste de API ni límites comerciales.

---

### 2.3. Catálogo y Filtros de Incidencias — `/reports`
* Vista en cuadrícula (*responsive grid*) con tarjetas interactivas.
* Filtros rápidos por:
  - Todas las incidencias vs. "Mis Reportes" (propios del usuario logueado).
  - Estado del ciclo de vida (`Submitted`, `UnderReview`, `InProgress`, `Resolved`).
  - Categoría de desperfecto y nivel de urgencia.
* Etiqueta de aviso de duplicados: `🔥 3 Avisos Vecinales Agrupados`.

---

### 2.4. Ficha de Detalle y Trazabilidad — `/reports/:id`
* **Visor fotográfico ampliado:** Con etiqueta de evidencia pericial para cuadrillas.
* **Mini-mapa Leaflet** con la posición exacta y coordenadas decimales (5 dígitos).
* **Historial de Auditoría de Estados:**
  - Registro cronológico inmutable de cada cambio de fase.
  - Nombre del técnico municipal que autorizó el cambio (`Marta Gómez - Técnico Municipal`).
  - Notas técnicas y estimación de tiempo de reparación.
* **Panel de Vecinos Agrupados:** Desglose de cada aviso individual que compone el reporte agrupado.

---

### 2.5. Asistente Municipal Flotante (Málaga 010 / 092)
* Cajón desplegable en la esquina inferior derecha (`🏛️ Asistente Municipal Málaga`).
* **Barra de Marcación Rápida:**
  - `📞 010 (Línea Málaga)`
  - `🚨 092 (Policía Local)`
  - `🚑 112 (Emergencias)`
* **Respuestas ultracortas:** Creadas para resolver dudas sobre a quién acudir en **menos de 35 palabras**.
* **Estado de Error Visual:** Si la conexión con el microservicio se interrumpe, el asistente muestra un panel con borde rojo y texto claro:
  > *"⚠️ Fallo de Conexión con IA: No se pudo conectar con el servicio municipal. Por favor llame al 010 o al 092."*

---

## 3. Adaptabilidad Responsive Móvil (Mobile First)

| Dispositivo | Resolución Testeada | Comportamiento UI |
|---|---|---|
| **Smartphone Estándar** | 375px × 667px (iPhone SE / Android) | Menú hamburguesa plegable, mapa adaptativo a 240px de altura, botones táctiles grandes (≥ 44px de altura mínima). |
| **Smartphone Grande** | 412px × 915px (Samsung Galaxy / Pixel) | Cuadrícula a 1 columna fluida, chat flotante optimizado a ancho completo con margen. |
| **Tablet** | 768px × 1024px (iPad / Tab) | Cuadrícula de catálogo a 2 columnas, mini-mapa en panel lateral. |
| **Escritorio / Portátil** | 1920px × 1080px (Full HD) | Disposición a 3 columnas, barra de navegación completa con conmutador de roles demo. |
