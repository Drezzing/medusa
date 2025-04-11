import { OrderService, ProductVariantService, SubscriberArgs, SubscriberConfig } from "@medusajs/medusa";

export default async function orderEditHandler({ data, container }: SubscriberArgs<{ id: string }>) {
    const orderService = container.resolve<OrderService>("orderService");
    const productVariantService = container.resolve<ProductVariantService>("productVariantService");

    const order = await orderService.retrieve(data.id, {
        relations: ["items", "items.variant"],
    });

    if (!order.draft_order_id) return;

    const variantsChanges = order.items
        .filter((item) => item.variant_id !== null) // custom items don't have a variant so we can update them
        .map((item) => {
            return {
                variantId: item.variant_id,
                quantity: item.variant.inventory_quantity - item.quantity,
            };
        });

    await Promise.all(
        variantsChanges.map((change) =>
            productVariantService.update(change.variantId, {
                inventory_quantity: change.quantity,
            }),
        ),
    );
}

export const config: SubscriberConfig = {
    event: OrderService.Events.PLACED,
    context: { subscriberId: "draft-order-placed-update-inventory" },
};
