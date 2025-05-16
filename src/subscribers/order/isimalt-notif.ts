import { OrderService, SubscriberArgs, SubscriberConfig } from "@medusajs/medusa";

export default async function notifyIsimalt({ data, container }: SubscriberArgs<{ id: string }>) {
    const orderService = container.resolve<OrderService>("orderService");
    const notificationService = container.resolve("smtpService");

    const order = await orderService.retrieve(data.id, {
        relations: ["items", "customer"],
    });

    const chopes = order.items.find((item) => item.variant_id === process.env.ISIMALT_NOTIFY_VARIANT_ID);
    if (!chopes) {
        return;
    }

    notificationService.sendEmail({
        to: process.env.ISIMALT_NOTIFY_TO,
        templateName: "isimalt",
        data: {
            first_name: order.customer.first_name,
            last_name: order.customer.last_name,
            quantity: chopes.quantity,
        },
    });
}

export const config: SubscriberConfig = {
    event: [OrderService.Events.PLACED],
    context: { subscriberId: "notify-isimalt" },
};
