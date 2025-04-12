import {
    LineItem,
    OrderEditItemChangeType,
    OrderEditService,
    ProductVariantService,
    SubscriberArgs,
    SubscriberConfig,
} from "@medusajs/medusa";

type VariantInventory = {
    variantId: string;
    quantity: number;
};

const addRemoveItem = (
    lineItem: LineItem,
    changeType: OrderEditItemChangeType.ITEM_ADD | OrderEditItemChangeType.ITEM_REMOVE,
): VariantInventory => {
    const currentQuantity = lineItem.variant.inventory_quantity;
    const newInventoryQuantity =
        changeType === OrderEditItemChangeType.ITEM_ADD
            ? currentQuantity - lineItem.quantity
            : currentQuantity + lineItem.quantity;

    return { variantId: lineItem.variant_id, quantity: newInventoryQuantity };
};

const updateItem = (lineItemBefore: LineItem, lineItemAfter: LineItem): VariantInventory => {
    const quantityDiff = lineItemBefore.quantity - lineItemAfter.quantity;
    const inventoryQuantity = lineItemAfter.variant.inventory_quantity;
    return {
        variantId: lineItemAfter.variant_id,
        quantity: inventoryQuantity + quantityDiff,
    };
};

export default async function orderEditHandler({ data, container }: SubscriberArgs<{ id: string }>) {
    const orderEditService = container.resolve<OrderEditService>("orderEditService");
    const productVariantService = container.resolve<ProductVariantService>("productVariantService");

    const order = await orderEditService.retrieve(data.id, {
        relations: [
            "changes",
            "changes.line_item",
            "changes.line_item.variant",
            "changes.original_line_item",
            "changes.original_line_item.variant",
        ],
    });

    const variantsChanges = order.changes.map((change) => {
        switch (change.type) {
            case OrderEditItemChangeType.ITEM_ADD:
                return addRemoveItem(change.line_item, change.type);
            case OrderEditItemChangeType.ITEM_REMOVE:
                return addRemoveItem(change.original_line_item, change.type);
            case OrderEditItemChangeType.ITEM_UPDATE:
                return updateItem(change.original_line_item, change.line_item);
        }
    });

    await Promise.all(
        variantsChanges.map((vc) =>
            productVariantService.update(vc.variantId, {
                inventory_quantity: vc.quantity,
            }),
        ),
    );
}

export const config: SubscriberConfig = {
    event: OrderEditService.Events.CONFIRMED,
    context: { subscriberId: "order-edit-update-inventory" },
};
