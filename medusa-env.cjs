const { z } = require("zod");

const envSchema = z.object({
    MEDUSA_CORS: z.string().nonempty(),

    POSTGRES_USER: z.string().nonempty(),
    POSTGRES_PASSWORD: z.string().nonempty(),
    POSTGRES_HOST: z.string().nonempty(),
    POSTGRES_PORT: z.number({ coerce: true }).int().positive(),
    POSTGRES_DB: z.string().nonempty(),

    REDIS_URL: z.string().nonempty().url(),

    STRIPE_API_KEY: z.string().nonempty().startsWith("sk_"),
    STRIPE_WEBHOOK_SECRET: z.string().nonempty().startsWith("whsec_"),

    R2_BUCKET_NAME: z.string().nonempty(),
    R2_BACKUP_BUCKET_NAME: z.string().nonempty(),
    R2_BUCKET_ENDPOINT: z.string().nonempty().url(),
    R2_BUCKET_ACCESS_KEY: z.string().nonempty(),
    R2_BUCKET_SECRET_KEY: z.string().nonempty(),
    R2_BUCKET_PUBLIC_URL: z.string().nonempty().url(),

    SMTP_FROM_EMAIL: z.string().nonempty().email(),
    SMTP_HOST: z.string().nonempty(),
    SMTP_PORT: z.number({ coerce: true }).int().positive(),
    SMTP_AUTH_USER: z.string().nonempty(),
    SMTP_AUTH_PASS: z.string().nonempty(),
});

/**
 * Validates the environment variables using zod schema.
 * @param {Record<string, any>} env
 * @returns {z.infer<typeof envSchema>}
 */
const validateEnv = (env) => {
    // Building the admin panel loads config and so run env validation
    // but env variables are not available during build, so we skip validation
    if (process.env.ADMIN_BUILD === "true") {
        return env;
    }

    const parsed = envSchema.safeParse(env);

    if (!parsed.success) {
        console.error("Invalid environment variables:", parsed.error.format());
        process.exit(1);
    }

    return parsed.data;
};

module.exports = { validateEnv };
