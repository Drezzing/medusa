import { config } from "dotenv";
import { readFileSync } from "fs";

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
            process.env[key.slice(0, -5)] = readFileSync(value, "utf8");
            delete process.env[key];
        } catch {
            throw new Error(`Could not read file ${value} for env variable ${key}`);
        }
    }
}

// CORS when consuming Medusa from admin
const ADMIN_CORS = process.env.ADMIN_CORS || "http://localhost:7000,http://localhost:7001";

// CORS to avoid issues when consuming Medusa from a client
const STORE_CORS = process.env.STORE_CORS || "http://localhost:8000";

const DATABASE_URL = process.env.DATABASE_URL || "postgres://localhost/medusa-starter-default";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const plugins = [
    `medusa-fulfillment-manual`,
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
            api_key: process.env.STRIPE_API_KEY,
            automatic_payment_methods: true,
            // webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
        },
    },
    {
        resolve: "medusa-plugin-smtp",

        options: {
            fromEmail: process.env.SMTP_FROM_EMAIL,
            transport: {
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                secure: false,
                auth: {
                    user: process.env.SMTP_AUTH_USER,
                    pass: process.env.SMTP_AUTH_PASS,
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
            redisUrl: REDIS_URL,
        },
    },
    cacheService: {
        resolve: "@medusajs/cache-redis",
        /** @type {import('@medusajs/cache-redis').RedisCacheModuleOptions} */
        options: {
            redisUrl: REDIS_URL,
            redisOptions: {},
        },
    },
    fileService: {
        resolve: "./src/modules/file-r2/index.js",
        /** @type {import("./src/modules/file-r2/services/r2.cjs").R2StorageServiceOptions} */
        options: {
            bucket: process.env.R2_BUCKET_NAME,
            endpoint: process.env.R2_BUCKET_ENDPOINT,
            access_key: process.env.R2_BUCKET_ACCESS_KEY,
            secret_key: process.env.R2_BUCKET_SECRET_KEY,
            public_url: process.env.R2_BUCKET_PUBLIC_URL,
        },
    },
};

/** @type {import('@medusajs/medusa').ConfigModule["projectConfig"]} */
const projectConfig = {
    jwt_secret: process.env.JWT_SECRET || "supersecret",
    cookie_secret: process.env.COOKIE_SECRET || "supersecret",
    store_cors: STORE_CORS,
    database_url: DATABASE_URL,
    admin_cors: ADMIN_CORS,
    redis_url: REDIS_URL,
};

/** @type {import('@medusajs/medusa').ConfigModule} */
export default {
    projectConfig,
    plugins,
    modules,
    featureFlags: {
        product_categories: true,
        order_editing: true,
    },
};
