import { OrderDetailsWidgetProps, WidgetConfig } from "@medusajs/admin";
import { useMemo } from "react";

const ShippingDataPreview = ({ order }: OrderDetailsWidgetProps) => {
    const shippingData = useMemo(() => order.fulfillments.map((fulfilment) => fulfilment.data), [order.fulfillments]);

    const test = shippingData.map((data, index) => {
        const trackingNumber = data?.shipment_number as string | undefined;
        const ettiquetteUrl = data?.label_url as string | undefined;

        return (
            <div key={`shipping-data-${index}`} className="mb-4">
                <h2 className="text-grey-90 inter-large-semibold mb-2">Shipment {index + 1}</h2>
                {data ? (
                    <div>
                        <p>
                            Ettiquette d'expédition :{" "}
                            <a href={ettiquetteUrl} className="underline">
                                Télécharger l'étiquette
                            </a>
                        </p>
                        <p>Numero de tracking : {trackingNumber}</p>
                    </div>
                ) : (
                    <div>No data found for this fulfilment.</div>
                )}
            </div>
        );
    });

    return (
        <div key="product-variants-images" className="mt-base rounded-lg border border-gray-200 bg-white p-8">
            <h1 className="text-grey-90 inter-xlarge-semibold mb-base">Fulfilment data preview</h1>

            {shippingData.length > 0 ? (
                <div className="space-y-4">{test}</div>
            ) : (
                <div>No shipping data found for this order.</div>
            )}
        </div>
    );
};

export const config: WidgetConfig = {
    zone: ["order.details.after"],
};

export default ShippingDataPreview;
