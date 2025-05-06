const { z } = require("zod");

const envSchema = z.object({
    MEDUSA_CORS: z.string(),

    POSTGRES_USER: z.string(),
    POSTGRES_PASSWORD: z.string(),
    POSTGRES_HOST: z.string(),
    POSTGRES_PORT: z.number({ coerce: true }).int().positive(),
    POSTGRES_DB: z.string(),

    REDIS_URL: z.string(),

    STRIPE_API_KEY: z.string(),
    STRIPE_WEBHOOK_SECRET: z.string(),

    R2_BUCKET_NAME: z.string(),
    R2_BACKUP_BUCKET_NAME: z.string(),
    R2_BUCKET_ENDPOINT: z.string(),
    R2_BUCKET_ACCESS_KEY: z.string(),
    R2_BUCKET_SECRET_KEY: z.string(),
    R2_BUCKET_PUBLIC_URL: z.string(),

    SMTP_FROM_EMAIL: z.string(),
    SMTP_HOST: z.string(),
    SMTP_PORT: z.number({ coerce: true }).int().positive(),
    SMTP_AUTH_USER: z.string(),
    SMTP_AUTH_PASS: z.string(),
});

const validateEnv = (env) => {
    const parsed = envSchema.safeParse(env);
    if (!parsed.success) {
        console.error("Invalid environment variables:", parsed.error.format());
        process.exit(1);
    }

    return parsed.data;
};

module.exports = { validateEnv };
