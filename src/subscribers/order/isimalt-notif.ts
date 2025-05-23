import { OrderService, SubscriberArgs, SubscriberConfig, TotalsService } from "@medusajs/medusa";

export default async function notifyIsimalt({ data, container }: SubscriberArgs<{ id: string }>) {
    const orderService = container.resolve<OrderService>("orderService");
    const notificationService = container.resolve("smtpService");
    const totalsService = container.resolve<TotalsService>("totalsService");

    const order = await orderService.retrieve(data.id, {
        relations: ["items", "items.adjustments", "customer", "discounts", "discounts.rule"],
    });

    const chopes = order.items.find((item) => item.variant_id === process.env.ISIMALT_NOTIFY_VARIANT_ID);
    if (!chopes) {
        return;
    }
    const chopesTotals = await totalsService.getLineItemTotals(chopes, order);

    const isimaltDiscount = chopes.adjustments.find(
        (adjustment) => adjustment.discount_id === process.env.ISIMALT_NOTIFY_DISCOUNT_ID,
    );
    const discountAmout = isimaltDiscount ? isimaltDiscount.amount : 0;
    const totalAfterDiscount = chopesTotals.original_total - discountAmout;

    notificationService.sendEmail({
        to: process.env.ISIMALT_NOTIFY_TO,
        templateName: "isimalt",
        data: {
            first_name: order.customer.first_name,
            last_name: order.customer.last_name,
            quantity: chopes.quantity,
            before_discount: chopesTotals.original_total,
            after_discount: totalAfterDiscount,
            discount_amount: discountAmout,
        },
    });
}

export const config: SubscriberConfig = {
    event: [OrderService.Events.PLACED],
    context: { subscriberId: "notify-isimalt" },
};
