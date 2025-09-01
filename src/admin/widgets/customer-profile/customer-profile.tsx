import { CustomerDetailsWidgetProps, OrderDetailsWidgetProps, WidgetConfig } from "@medusajs/admin";
const CustomerProfile = (props: CustomerDetailsWidgetProps | OrderDetailsWidgetProps) => {
    const profile = (
        "customer" in props ? props.customer.metadata?.profile : props.order.customer.metadata?.profile
    ) as string | undefined;
    return (
        <div key="product-variants-images" className="rounded-lg border border-gray-200 bg-white p-8">
            <h1 className="text-grey-90 inter-xlarge-semibold mb-base">Customer profile</h1>

            {profile ? <div className="space-y-4">{profile}</div> : <div>No profile saved for this customer</div>}
        </div>
    );
};
export const config: WidgetConfig = {
    zone: ["customer.details.after", "order.details.after"],
};

export default CustomerProfile;
