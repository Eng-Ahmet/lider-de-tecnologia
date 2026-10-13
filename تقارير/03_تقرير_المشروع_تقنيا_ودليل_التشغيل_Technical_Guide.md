# ⚙️ التقرير الثالث: الدليل التقني الشامل ودليل التشغيل والمستلزمات
## Guía Técnica de Arquitectura, Requisitos y Despliegue
### اسم المشروع: ¡Tu voz ha llegado! — CalleFix AI Málaga

---

## 1. البنية التقنية العامة (System Architecture)

تم بناء المشروع وفق معمارية الخدمات المنعزلة (Isolated Microservices & Decoupled Architecture) لضمان عدم حدوث أي تضارب مع أي مشاريع أخرى على نفس الخادم:

```
+-----------------------------------------------------------------------------------+
|                            CALLEFIX AI MALAGA PLATFORM                            |
+-----------------------------------------------------------------------------------+
                                          |
          +-------------------------------+-------------------------------+
          |                               |                               |
          v                               v                               v
+--------------------+          +--------------------+          +--------------------+
|  Angular 22 (SPA)  | <----->  | Node.js / Express  | <----->  |  FastAPI AI Micro  |
|   Frontend Web     |  REST    |   Backend Core     |  HTTP    |  (LangChain/Groq)  |
|   (Port 4880)      |          |   (Port 3880)      |          |   (Port 8088)      |
+--------------------+          +--------------------+          +--------------------+
          |                               |
          | OSM Standard Tiles            | SQL (pg driver)
          v                               v
+--------------------+          +--------------------+
|   OpenStreetMap    |          |   PostgreSQL 16    |
| (100% Free / Maps) |          |  (Port 5488 Aisl.) |
+--------------------+          +--------------------+
```

### خريطة المنافذ المعزولة (Isolated Ports Allocation):
| الخدمة البرمجية | التقنية المستخدمة | منفذ المضيف (Host Port) | منفذ الحاوية (Container Port) | الوظيفة |
|---|---|---|---|---|
| **الواجهة الأمامية (Frontend)** | Angular 22 + Tailwind CSS | **`4880`** | `80` (Nginx) | واجهة المواطن والمسؤول البلدي |
| **الواجهة الخلفية (Backend)** | Node.js + TypeScript + Express | **`3880`** | `3880` | إدارة الحسابات، التقارير، وقواعد البيانات |
| **قاعدة البيانات (Database)** | PostgreSQL 16 Alpine | **`5488`** | `5432` | تخزين البلاغات، المستخدمين، وسجل التغييرات |
| **خدمة الذكاء الاصطناعي (AI)** | FastAPI + Python 3.11 + Groq | **`8088`** | `8000` | المساعد البلدي التوجيهي (010 / 092) |

---

## 2. المستلزمات والمتطلبات الأساسية للتشغيل (Prerequisites)

قبل البدء في تشغيل المشروع، تأكد من توافر البرمجيات التالية على جهازك:

1. **بيئة Node.js:**
   - الإصدار المطلوب: `Node.js >= 20.x` (يفضل v22 LTS).
   - مدير الحزم: `npm >= 10.x` أو `pnpm`.
   - للتحقق من التثبيت:
     ```bash
     node -v
     npm -v
     ```
2. **بيئة Python (لتشغيل خدمة الذكاء الاصطناعي محلياً):**
   - الإصدار المطلوب: `Python >= 3.10.x` (يفضل 3.11 أو 3.12).
   - مدير الحزم: `pip`.
   - للتحقق من التثبيت:
     ```bash
     python --version
     pip --version
     ```
3. **بيئة Docker و Docker Compose (اختياري للتشغيل الموحد بالحاويات):**
   - `Docker Desktop` على Windows / Mac أو `docker-ce` على Linux.
   - `docker compose version >= 2.20`

---

## 3. خطوات تثبيت الاعتماديات (Step-by-Step Installation)

### الخطوة 1: استنساخ المستودع والدخول للمجلد
```bash
git clone git@github.com:Eng-Ahmet/lider-de-tecnologia.git
cd lider-de-tecnologia
```

### الخطوة 2: تثبيت حزم الواجهة الخلفية (Backend)
```bash
cd backend
npm install
```
*الحزم الأساسية المثبتة:* `express`, `pg`, `bcryptjs`, `jsonwebtoken`, `multer`, `tsx`, `typescript`.

### الخطوة 3: تثبيت حزم الواجهة الأمامية (Frontend)
```bash
cd ../frontend
npm install
```
*الحزم الأساسية المثبتة:* `@angular/core@22`, `@angular/router`, `leaflet`, `tailwindcss`, `rxjs`.

### الخطوة 4: تثبيت متطلبات خدمة الذكاء الاصطناعي (FastAPI AI)
```bash
cd ../fastapi-ai
pip install -r requirements.txt
```
*الحزم الأساسية المثبتة:* `fastapi`, `uvicorn`, `pydantic`, `groq`, `langchain`.

---

## 4. طرق التشغيل (Execution Modes)

### الخيار الأول: التشغيل الفوري والسهل عبر Docker Compose (موصى به للتقييم)
يقوم Docker بتشغيل الحاويات الأربع تلقائياً، وإنشاء الشبكة المعزولة وقاعدة البيانات:
```bash
# من المجلد الرئيسي للمشروع:
docker compose up --build
```
* **الواجهة التفاعلية للموقع:** افتح المتصفح على [http://localhost:4880](http://localhost:4880)
* **واجهة الـ API:** متاحة على [http://localhost:3880/api/health](http://localhost:3880/api/health)
* **خدمة الذكاء الاصطناعي:** متاحة على [http://localhost:8088/health](http://localhost:8088/health)

---

### الخيار الثاني: التشغيل المحلي التفاعلي في بيئة التطوير (Local Development)

#### 1. تشغيل قاعدة البيانات (PostgreSQL):
تأكد من تشغيل PostgreSQL على المنفذ `5488` مع اسم قاعدة البيانات `callefix_db`، أو شغلها بحاوية منفصلة:
```bash
docker run -d --name callefix-db -p 5488:5432 -e POSTGRES_USER=callefix -e POSTGRES_PASSWORD=callefix123 -e POSTGRES_DB=callefix_db postgres:16-alpine
```

#### 2. زراعة البيانات الأولية (Database Seeding):
```bash
cd backend
npm run seed
```

#### 3. إطلاق خادم الواجهة الخلفية (Backend - Port 3880):
```bash
cd backend
npm run dev
```

#### 4. إطلاق خادم الواجهة الأمامية (Frontend - Port 4880):
```bash
cd frontend
npm start -- --port 4880
# أو عبر Angular CLI مباشرة:
# npx ng serve --port 4880
```

#### 5. إطلاق خدمة الذكاء الاصطناعي (FastAPI - Port 8000 / 8088):
```bash
cd fastapi-ai
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## 5. بيانات الحسابات الجاهزة للاختبار (Test Credentials)

| الدور | البريد الإلكتروني (Email) | كلمة المرور (Password) | الصلاحيات |
|---|---|---|---|
| **مسؤول بلدي (Administrador)** | `admin@callefix.malaga.es` | `Admin123!` | إدارة كاملة، تغيير دورة حياة البلاغات، تعيين المقاولين. |
| **مواطن من ملقا (Vecino)** | `vecino@malaga.es` | `Vecino123!` | إنشاء البلاغات بالـ GPS، متابعة البلاغات الخاصة، استشارة المساعد. |

> *ملاحظة:* يوجد زر في الواجهة العلوية يتيح التبديل بنقرة واحدة `👑 Admin` / `👤 Vecino` لتسهيل تجربة التحكيم.

---

## 6. جدول مسارات الـ API الأساسية (API Endpoints Reference)

| المسار (Endpoint) | الطريقة (Method) | الصلاحية | الوصف |
|---|---|---|---|
| `/api/health` | `GET` | عام (Public) | التحقق من صحة الخادم واتصال قاعدة البيانات |
| `/api/auth/login` | `POST` | عام (Public) | تسجيل الدخول وتوليد رمز الـ JWT |
| `/api/reports` | `GET` | محمي (JWT) | جلب قائمة البلاغات مع الفلترة والبحث المكاني |
| `/api/reports` | `POST` | محمي (JWT) | تسجيل بلاغ جديد مع الصورة وإحداثيات الموقع |
| `/api/reports/:id` | `GET` | محمي (JWT) | جلب تفاصيل بلاغ معين مع سجل التغييرات |
| `/api/reports/:id/status` | `PATCH` | مسؤول (Admin) | تعديل حالة البلاغ وإضافة ملاحظة فنية |
| `/api/dashboard/stats` | `GET` | محمي (JWT) | إحصائيات لوحة التحكم الحية وعدد المكررات |
| `/api/ai/chat` | `POST` | عام (Public) | استشارة المساعد البلدي الذكي (أقل من 35 كلمة) |
