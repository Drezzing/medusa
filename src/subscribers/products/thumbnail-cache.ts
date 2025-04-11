import { ProductService, SubscriberArgs, SubscriberConfig } from "@medusajs/medusa";

import { type Redis } from "ioredis";

export default async function orderEditHandler({ data, container }: SubscriberArgs<{ id: string; fields: string[] }>) {
    const redisClient: Redis = container.resolve("redisClient");

    // medusa does not delete the image on the bucket when the product is deleted
    // so having a slight delay between product deletion and cache invalidation
    // is not a big issue. Same for updates
    redisClient.del("thumbnail:" + data.id);
}

export const config: SubscriberConfig = {
    event: [ProductService.Events.DELETED, ProductService.Events.UPDATED],
    context: { subscriberId: "products-thumbnail-update-delete" },
};
