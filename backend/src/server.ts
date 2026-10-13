import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config/config.js';
import reportRoutes from './routes/report.routes.js';
import aiRoutes from './routes/ai.routes.js';

const app = express();

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

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
