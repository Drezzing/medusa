/* eslint-disable @typescript-eslint/no-require-imports */
const { config } = require("dotenv");
const { readFileSync } = require("fs");
const { validateEnv } = require("./medusa-env.cjs");

let ENV_FILE_NAME = "";
switch (process.env.NODE_ENV) {
    case "production":
        ENV_FILE_NAME = ".env.production";
        break;
    case "staging":
        ENV_FILE_NAME = ".env.staging";
        break;
    case "test":
        ENV_FILE_NAME = ".env.test";
        break;
    case "development":
    default:
        ENV_FILE_NAME = ".env";
        break;
}

config({ path: process.cwd() + "/" + ENV_FILE_NAME });
for (const [key, value] of Object.entries(process.env)) {
    if (key.endsWith("_FILE")) {
        try {
            process.env[key.slice(0, -5)] = readFileSync(value, "utf8").trim();
            delete process.env[key];
        } catch {
            throw new Error(`Could not read file ${value} for env variable ${key}`);
        }
    }
}

const env = validateEnv(process.env);

const DATABASE_URL = `postgres://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}`;
const FROM_EMAIL = `DreZZing <${env.SMTP_FROM_EMAIL}>`;

const plugins = [
    {
        resolve: "medusa-fulfillment-manual",
    },
    {
        resolve: "@medusajs/admin",
        /** @type {import('@medusajs/admin').PluginOptions} */
        options: {
            autoRebuild: true,
            develop: {
                open: process.env.OPEN_BROWSER !== "false",
            },
        },
    },
    {
        resolve: `medusa-payment-stripe`,
        /** @type {import('medusa-payment-stripe').StripeOptions} */
        options: {
            api_key: env.STRIPE_API_KEY,
            automatic_payment_methods: true,
            webhook_secret: env.STRIPE_WEBHOOK_SECRET,
        },
    },
    {
        resolve: "medusa-plugin-smtp",
        options: {
            fromEmail: FROM_EMAIL,
            transport: {
                host: env.SMTP_HOST,
                port: env.SMTP_PORT,
                secure: false,
                auth: {
                    user: env.SMTP_AUTH_USER,
                    pass: env.SMTP_AUTH_PASS,
                },
            },
            emailTemplatePath: "data/emailTemplates",
            templateMap: {
                "order.placed": "orderplaced",
                "invite.created": "invitecreated",
            },
        },
    },
];

const modules = {
    eventBus: {
        resolve: "@medusajs/event-bus-redis",
        options: {
            redisUrl: env.REDIS_URL,
        },
    },
    cacheService: {
        resolve: "@medusajs/cache-redis",
        /** @type {import('@medusajs/cache-redis').RedisCacheModuleOptions} */
        options: {
            redisUrl: env.REDIS_URL,
        },
    },
    fileService: {
        resolve: "./src/modules/file-r2/index.cjs",
        /** @type {import("./src/modules/file-r2/services/r2.cjs").R2StorageServiceOptions} */
        options: {
            bucket: env.R2_BUCKET_NAME,
            endpoint: env.R2_BUCKET_ENDPOINT,
            access_key: env.R2_BUCKET_ACCESS_KEY,
            secret_key: env.R2_BUCKET_SECRET_KEY,
            public_url: env.R2_BUCKET_PUBLIC_URL,
        },
    },
};

/** @type {import('@medusajs/medusa').ConfigModule["projectConfig"]} */
const projectConfig = {
    store_cors: env.MEDUSA_CORS,
    admin_cors: env.MEDUSA_CORS,
    auth_cors: env.MEDUSA_CORS,
    database_url: DATABASE_URL,
    database_logging: ["error", "warn"],
    redis_url: env.REDIS_URL,
    jwt_secret: process.env.JWT_SECRET || "supersecret",
    cookie_secret: process.env.COOKIE_SECRET || "supersecret",
};

/** @type {import('@medusajs/medusa').ConfigModule} */
module.exports = {
    projectConfig,
    plugins,
    modules,
    featureFlags: {
        product_categories: true,
        order_editing: true,
    },
};
