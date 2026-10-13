import nodemailer from 'nodemailer';
import { config } from '../config/config.js';
import { Report, ReportSubmission } from '../types/report.js';

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isReady = false;

  constructor() {
    this.initTransporter();
  }

  private async initTransporter() {
    try {
      if (config.smtp.user && config.smtp.pass) {
        this.transporter = nodemailer.createTransport({
          host: config.smtp.host,
          port: config.smtp.port,
          secure: config.smtp.port === 465,
          auth: {
            user: config.smtp.user,
            pass: config.smtp.pass,
          },
        });
        this.isReady = true;
        console.log('📧 Email service configured with SMTP host:', config.smtp.host);
      } else {
        // Create an Ethereal test account for hackathon demo
        nodemailer.createTestAccount((err, account) => {
          if (err) {
            console.warn('⚠️ Could not create Ethereal test account:', err);
            return;
          }
          this.transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
              user: account.user,
              pass: account.pass,
            },
          });
          this.isReady = true;
          console.log(`📧 Ethereal test email account created: ${account.user}`);
        });
      }
    } catch (error) {
      console.warn('⚠️ Email transporter initialization error:', error);
    }
  }

  /**
   * Send confirmation email when a citizen registers a new incident
   */
  async sendReportReceivedEmail(report: Report, citizenEmail: string, citizenName?: string): Promise<boolean> {
    const name = citizenName || 'Vecino/a de Málaga';
    const subject = `¡Tu voz ha llegado! Hemos registrado tu reporte [${report.id}] en CalleFix AI`;
    
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #1e3a8a, #0284c7); padding: 30px 24px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">¡Tu voz ha llegado! 📢</h1>
          <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">CalleFix AI Málaga - Participación Ciudadana Inteligente</p>
        </div>
        
        <div style="padding: 24px;">
          <p style="font-size: 16px; color: #1e293b;">Hola <strong>${name}</strong>,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            Gracias por cuidar de tu ciudad. Hemos registrado tu reporte de incidencia urbana con éxito. 
            Nuestro sistema con Inteligencia Artificial ha categorizado y geolocalizado el problema para los servicios municipales.
          </p>

          <div style="background: #f8fafc; border-left: 4px solid #0284c7; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #0f172a; font-size: 15px;">Detalles de la Incidencia:</p>
            <ul style="margin: 0; padding-left: 20px; color: #334155; font-size: 14px; line-height: 1.6;">
              <li><strong>ID de Seguimiento:</strong> #${report.id}</li>
              <li><strong>Tipo:</strong> ${this.formatType(report.type)}</li>
              <li><strong>Barrio / Ubicación:</strong> ${report.neighborhood}</li>
              <li><strong>Prioridad Estimada:</strong> ${report.priority.toUpperCase()}</li>
              <li><strong>Estado:</strong> Pendiente de inspección</li>
            </ul>
          </div>

          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            Te mantendremos informado por este mismo correo electrónico en cuanto el equipo municipal revise y repare la incidencia.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:4200/reports/${report.id}" style="background: #0284c7; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
              Ver Estado de mi Reporte en Tiempo Real
            </a>
          </div>
        </div>

        <div style="background: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
          Plataforma Smart City "Tu voz ha llegado" • Hackathon Málaga 2026
        </div>
      </div>
    `;

    return this.sendMail(citizenEmail, subject, html);
  }

  /**
   * Send notification when citizen's report was merged into an existing cluster
   */
  async sendReportMergedEmail(report: Report, citizenEmail: string, citizenName?: string): Promise<boolean> {
    const name = citizenName || 'Vecino/a de Málaga';
    const subject = `¡Tu reporte refuerza la prioridad de la incidencia #${report.id}! - CalleFix AI`;

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #0f766e, #0d9488); padding: 30px 24px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">¡Tu voz tiene más fuerza! 🤝</h1>
          <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Agrupación Inteligente de Reportes - Málaga Smart City</p>
        </div>
        
        <div style="padding: 24px;">
          <p style="font-size: 16px; color: #1e293b;">Hola <strong>${name}</strong>,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            Nuestro algoritmo de clustering espacial ha detectado que otros vecinos también han avisado de este mismo problema en <strong>${report.neighborhood}</strong>.
          </p>

          <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #14532d; font-size: 15px;">Incidencia Agrupada #${report.id}</p>
            <p style="margin: 0; font-size: 14px; color: #166534; line-height: 1.5;">
              ¡Tu aviso es el reporte <strong>#${report.duplicateCount}</strong> para este punto! 
              Al coincidir varios avisos, el sistema ha elevado automáticamente la prioridad a <strong>${report.priority.toUpperCase()}</strong> para acelerar la actuación de los operarios.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:4200/reports/${report.id}" style="background: #0d9488; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
              Ver Incidencia y Reportes Asociados
            </a>
          </div>
        </div>
      </div>
    `;

    return this.sendMail(citizenEmail, subject, html);
  }

  /**
   * Send notification when municipal team updates status (e.g. En revisión, Resuelta)
   */
  async sendStatusUpdateEmail(report: Report, citizenEmail: string, note?: string): Promise<boolean> {
    const statusText = report.status === 'resolved' ? 'Resuelta ✅' : 'En Revisión / Cuadrilla Asignada 🛠️';
    const subject = `Actualización de incidencia #${report.id}: Estado cambiado a ${statusText}`;

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, ${report.status === 'resolved' ? '#15803d, #22c55e' : '#b45309, #f59e0b'}); padding: 30px 24px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">¡Novedades en tu reporte! 📢</h1>
          <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Estado: ${statusText}</p>
        </div>
        
        <div style="padding: 24px;">
          <p style="font-size: 16px; color: #1e293b;">Estimado/a ciudadano/a,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            Los servicios municipales del Ayuntamiento de Málaga han actualizado el estado de la incidencia en <strong>${report.neighborhood}</strong>.
          </p>

          ${note ? `
          <div style="background: #f8fafc; border: 1px dashed #94a3b8; padding: 14px; border-radius: 6px; margin: 16px 0;">
            <p style="margin: 0; font-size: 14px; color: #334155;"><strong>Nota del técnico:</strong> ${note}</p>
          </div>
          ` : ''}

          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            Gracias por participar en el cuidado del entorno urbano de Málaga.
          </p>
        </div>
      </div>
    `;

    return this.sendMail(citizenEmail, subject, html);
  }

  private async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      if (!this.transporter) {
        console.log(`[Email Mock Console] To: ${to} | Subject: ${subject}`);
        return true;
      }

      const info = await this.transporter.sendMail({
        from: config.smtp.from,
        to,
        subject,
        html,
      });

      console.log(`✉️ Email sent successfully to ${to} (MessageId: ${info.messageId})`);
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`🔗 Ethereal Email Preview URL: ${previewUrl}`);
      }
      return true;
    } catch (error) {
      console.warn(`⚠️ Failed to send email to ${to}:`, error);
      return false;
    }
  }

  private formatType(type: string): string {
    const map: Record<string, string> = {
      pothole: 'Bache en calzada',
      damaged_sign: 'Señal de tráfico deteriorada',
      damaged_bin: 'Contenedor / Papelera dañada',
      street_light: 'Alumbrado público averiado',
      graffiti: 'Graffiti / Daño estético',
      other: 'Otra incidencia urbana',
    };
    return map[type] || type;
  }
}

export const emailService = new EmailService();
