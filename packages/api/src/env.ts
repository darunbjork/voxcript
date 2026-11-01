import { z } from 'zod'

const apiEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  WHISPER_BIN: z.string().default('/usr/local/bin/whisper'),
  WHISPER_MODEL: z.string().default('/opt/whisper/ggml-tiny.bin'),
  MEDIA_ROOT: z.string().default('/tmp/voxcript'),
})

export type ApiEnv = z.infer<typeof apiEnvSchema>

export function loadApiEnv(): ApiEnv {
  const parsed = apiEnvSchema.safeParse(process.env)
  if (!parsed.success) {
    throw new Error(
      `Invalid environment: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
    )
  }
  return parsed.data
}
