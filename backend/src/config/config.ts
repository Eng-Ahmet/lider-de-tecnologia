import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  // Isolated port: 3880 (non-conflicting)
  port: parseInt(process.env.PORT || '3880', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4880',
  uploadsDir: path.join(process.cwd(), 'public', 'uploads'),

  // JWT Authentication
  jwtSecret: process.env.JWT_SECRET || 'callefix-smart-city-jwt-secret-key-2026-isolated',
  jwtExpiresIn: '7d',

  // Cloudflare R2 credentials (Bucket: tu-voz-ha-llegado)
  r2: {
    bucketName: process.env.R2_BUCKET_NAME || 'tu-voz-ha-llegado',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '6fa85d0bfe93576a870c5b9c160f1a5d',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '736ef90adb4eb41950b4574c82051407d4bead813645e6b70ba362bf0d8cf1ae',
    accountId: process.env.R2_ACCOUNT_ID || '6fa85d0bfe93576a870c5b9c160f1a5d',
    publicUrl: process.env.R2_PUBLIC_URL || '',
  },

  // Email service
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || '"Tu voz ha llegado - CalleFix AI" <notificaciones@callefix.malaga.es>',
  },

  // Database (PostgreSQL isolated port 5488)
  databaseUrl: process.env.DATABASE_URL || 'postgresql://callefix:callefix123@localhost:5488/callefix_db',

  // Clustering settings (distance in meters)
  clusteringRadiusMeters: 40,

  // Groq Cloud AI LLM
  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    model: process.env.GROQ_MODEL || 'allam-2-7b',
  },
};
