import 'dotenv/config'; // carga backend/.env automáticamente
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),

  // Sin defaults: falla hard si no están configurados (nunca usar secrets del repo)
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  DYNAMODB_ENDPOINT: z.string().optional(),

  S3_BUCKET_ATTACHMENTS: z.string().default('taskflow-attachments-dev'),
  S3_BUCKET_REPORTS: z.string().default('taskflow-reports-dev'),
  SQS_QUEUE_URL: z.string().optional(),
  SES_FROM_EMAIL: z.string().email().default('noreply@taskflow.dev'),

  FRONTEND_URL: z.string().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  // Máximo de tareas abiertas que el auto-asignador intenta no superar por persona.
  // Si todos están en el tope, igualmente se asigna al de menor carga.
  MAX_TASKS_PER_MEMBER: z.coerce.number().int().positive().default(8),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
