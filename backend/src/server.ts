import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config/config.js';
import reportRoutes from './routes/report.routes.js';
import aiRoutes from './routes/ai.routes.js';

const app = express();

// Universal CORS and Preflight Middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma, X-Custom-Header, sentry-trace, baggage');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Answer preflight immediately
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cache-Control', 'Pragma'],
}));

// Global Request / Response Console Logger for Network Monitoring
app.use((req, res, next) => {
  const start = Date.now();
  const origin = req.headers.origin || 'direct/same-host';
  const hasAuth = Boolean(req.headers.authorization);

  console.log(`🌐 [REQ-IN]  ${req.method.padEnd(6)} ${req.originalUrl || req.url} | Origin: ${origin} | Auth: ${hasAuth ? 'Bearer ✓' : 'None'}`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusIcon = res.statusCode < 300 ? '✅' : (res.statusCode < 400 ? '➡️' : '❌');
    console.log(`${statusIcon} [RES-OUT] ${req.method.padEnd(6)} ${req.originalUrl || req.url} -> Status ${res.statusCode} (${duration}ms)`);
  });

  next();
});

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static files for local uploads fallback
app.use('/uploads', express.static(config.uploadsDir));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Tu voz ha llegado - CalleFix AI',
    edition: 'Smart City Málaga 2026',
    time: new Date().toISOString(),
    cloudflareR2: Boolean(config.r2.accessKeyId),
    smtp: Boolean(config.smtp.host),
  });
});

// API Routes
app.use('/api', reportRoutes);
app.use('/api', aiRoutes);

// Root greeting
app.get('/', (req, res) => {
  res.send(`
    <div style="font-family: system-ui, sans-serif; text-align: center; padding: 50px;">
      <h1 style="color: #0284c7;">📢 Tu voz ha llegado — CalleFix AI API</h1>
      <p style="color: #64748b;">Smart City Urban Issue Reporting & Duplicate Clustering Platform</p>
      <p><a href="/api/dashboard" style="color: #0284c7;">Ver /api/dashboard</a> | <a href="/api/reports" style="color: #0284c7;">Ver /api/reports</a></p>
    </div>
  `);
});

// Start server
app.listen(config.port, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║             📢 TU VOZ HA LLEGADO — CALLEFIX AI SERVER              ║
║         Plataforma Smart City Málaga de Detección & Agrupación     ║
╠════════════════════════════════════════════════════════════════════╣
║  🚀 API Server:       http://localhost:${config.port}                        ║
║  📊 Dashboard API:    http://localhost:${config.port}/api/dashboard            ║
║  📋 Reports API:      http://localhost:${config.port}/api/reports              ║
║  ☁️  Cloudflare R2:    Bucket [${config.r2.bucketName}]            ║
║  📧 Email Service:    ${config.smtp.host}                           ║
╚════════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
