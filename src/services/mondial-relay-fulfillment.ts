import { createShipment } from "@frontboi/mondial-relay/node";
import { Person, Shipment } from "@frontboi/mondial-relay/types";
import {
    AbstractFulfillmentService,
    Cart,
    CartService,
    CustomerService,
    Fulfillment,
    LineItem,
    Logger,
    MedusaContainer,
    Order,
    OrderService,
} from "@medusajs/medusa";
import { FulfillmentRepository } from "@medusajs/medusa/dist/repositories/fulfillment";
import { CreateReturnType } from "@medusajs/medusa/dist/types/fulfillment-provider";
import { MedusaError } from "@medusajs/utils";
import crypto from "crypto";
import { EntityManager } from "typeorm";

type ShippingData =
    | {
          fulfillment_id: "mondial-relay-point-relais";
          parcel_id: string;
          method: string;
      }
    | {
          fulfillment_id: "mondial-relay-home";
          address: string;
          city: string;
          postal_code: string;
          phone: string;
          method: string;
          complement?: string | undefined;
      }
    | { fulfillment_id: "manual-fulfillment" };

interface InjectedDependencies extends MedusaContainer {
    logger: Logger;
    manager: EntityManager;
    orderService: OrderService;
    cartService: CartService;
    customerService: CustomerService;
}

type RecipentData = Omit<Person, "Lastname" | "Firstname" | "Email" | "CountryCode" | "MobileNo">;

class MondialRelayFulfillmentService extends AbstractFulfillmentService {
    static identifier = "mondial-relay-fullfilment";

    protected readonly config_: Record<string, unknown>;
    protected readonly container_: InjectedDependencies;
    protected readonly logger_: Logger;
    protected readonly orderService_: OrderService;
    protected readonly cartService_: CartService;
    protected readonly customerService_: CustomerService;
    protected readonly fullfilmentRepository_: typeof FulfillmentRepository;

    constructor(container: InjectedDependencies, options: Record<string, unknown>) {
        super(container as never, options);

        this.logger_ = container.logger;
        this.cartService_ = container.cartService;
        this.customerService_ = container.customerService;

        this.fullfilmentRepository_ = FulfillmentRepository;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async getFulfillmentOptions(): Promise<any[]> {
        return [{ id: "mondial-relay-home" }, { id: "mondial-relay-point-relais" }];
    }

    async validateFulfillmentData(
        optionData: { [x: string]: unknown },
        data: { [x: string]: unknown },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        cart: Cart,
    ): Promise<Record<string, unknown>> {
        return data;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async validateOption(data: { [x: string]: unknown }): Promise<boolean> {
        return true;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async canCalculate(data: { [x: string]: unknown }): Promise<boolean> {
        return true;
    }

    async calculatePrice(
        optionData: { [x: string]: unknown },
        data: { [x: string]: unknown },
        cart: Cart,
    ): Promise<number> {
        const itemWeights = cart.items.map((item) => this.getItemWeight(item));

        const totalWeight = itemWeights.reduce((acc, weight) => {
            return acc + weight;
        }, 0);

        const pricesParcel = {
            250: 3.49,
            500: 3.58,
            1000: 4.49,
            2000: 5.49,
            3000: 6.17,
            4000: 7.42,
            5000: 10.33,
            7000: 12.0,
            10000: 12.0,
            15000: 18.67,
            20000: 18.67,
            25000: 27.0,
            30000: 27.0,
        };

        const pricesHome = {
            250: 4.16,
            500: 5.66,
            750: 7.13,
            1000: 7.33,
            2000: 8.33,
            3000: 12.49,
            4000: 12.49,
            5000: 12.49,
            7000: 15.83,
            10000: 19.99,
            15000: 24.16,
            20000: 33.08,
            25000: 33.08,
            30000: null, // not available
        };

        let basePrice: number | null;
        if (optionData.id === "mondial-relay-home") {
            basePrice = this.getPrice(totalWeight, pricesHome);
        } else {
            basePrice = this.getPrice(totalWeight, pricesParcel);
        }

        if (basePrice === null) {
            return -1;
        }

        // find the closest higher price ending with .49 or .99 with at least 50 cents difference
        const finalPrice = Math.ceil((basePrice + 0.5) * 2) / 2 - 0.01;
        return Math.round(finalPrice * 100);
    }

    async createFulfillment(
        data: { [x: string]: unknown },
        items: LineItem[],
        order: Order,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        fulfillment: Fulfillment,
    ): Promise<{ [x: string]: unknown }> {
        const cart = await this.cartService_.retrieve(order.cart_id);
        const customer = await this.customerService_.retrieve(order.customer_id);
        const cartData = this.getShippingData(cart);

        let totalWeight = 0;
        for (const item of items) {
            const itemWeight = this.getItemWeight(item);

            if (itemWeight === 0) {
                throw new MedusaError(
                    MedusaError.Types.INVALID_DATA,
                    `Product ${item.variant.product.title} (${item.variant.title}) is not marked as shippable.`,
                );
            }

            totalWeight += itemWeight;
        }

        let recipentData: RecipentData;
        let shipMode: Shipment["DeliveryMode"]["Mode"];
        if (cartData.fulfillment_id === "mondial-relay-home") {
            shipMode = "HOM";
            recipentData = {
                HouseNo: "",
                Streetname: cartData.address,
                City: cartData.city,
                PostCode: cartData.postal_code,
                PhoneNo: cartData.phone,
            };
        } else if (cartData.fulfillment_id === "mondial-relay-point-relais") {
            shipMode = "24R";
            recipentData = {
                HouseNo: "",
                Streetname: "",
                City: "XX",
                PostCode: "00000",
                PhoneNo: "",
            };
        }

        const shipment = await createShipment({
            context: {
                Login: process.env.MONDIAL_RELAY_API2_LOGIN,
                Password: process.env.MONDIAL_RELAY_API2_PASSWORD,
                CustomerId: process.env.MONDIAL_RELAY_API2_BRAND_ID,
            },
            shipment: {
                CollectionMode: {
                    Mode: "REL",
                },
                CustomerNo: "",
                OrderNo: "",
                DeliveryMode: {
                    Mode: shipMode,
                    Location:
                        cartData.fulfillment_id === "mondial-relay-point-relais" ? "FR-" + cartData.parcel_id : "Auto",
                },
                ParcelCount: "1",
                Parcels: {
                    Parcel: {
                        Content: "Commande DreZZing " + order.id.split("_")[1],
                        Weight: { Value: totalWeight, Unit: "gr" },
                    },
                },
                // ISIMA 1 RUE DE LA CHEBARDE 63170 AUBIERE
                Sender: {
                    Firstname: "Drezzing",
                    Lastname: "",
                    Email: "contact@drezzing.fr",
                    HouseNo: "1",
                    Streetname: "Rue de la Chebarde",
                    City: "AUBIERE",
                    PostCode: "63170",
                    CountryCode: "FR",
                    MobileNo: "",
                    PhoneNo: "",
                },
                Recipient: {
                    Lastname: customer.last_name,
                    Firstname: customer.first_name,
                    Email: customer.email,
                    ...recipentData,
                    CountryCode: "FR",
                    MobileNo: "",
                },
            },
        });

        return { shipment_number: shipment.sendingNumber, label_url: shipment.etiquetteLink };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    async cancelFulfillment(fulfillment: { [x: string]: unknown }): Promise<any> {
        // throw new Error("Method not implemented.");
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    createReturn(returnOrder: CreateReturnType): Promise<Record<string, unknown>> {
        throw new Error("Method not implemented.");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    getFulfillmentDocuments(data: { [x: string]: unknown }): Promise<any> {
        throw new Error("Method not implemented.");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    getReturnDocuments(data: Record<string, unknown>): Promise<any> {
        throw new Error("Method not implemented.");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    getShipmentDocuments(data: Record<string, unknown>): Promise<any> {
        throw new Error("Method not implemented.");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    retrieveDocuments(fulfillmentData: Record<string, unknown>, documentType: "invoice" | "label"): Promise<any> {
        throw new Error("Method not implemented.");
    }

    getPrice(weight: number, priceTable: Record<number, number | null>): number | null {
        if (weight <= 0) {
            return null;
        }

        const sortedWeights = Object.keys(priceTable)
            .map(Number)
            .sort((a, b) => a - b);

        for (const maxWeight of sortedWeights) {
            if (weight <= maxWeight) {
                return priceTable[maxWeight] * 1.2; // TVA
            }
        }

        return null; // no price available for this weight
    }

    getItemWeight(item: LineItem): number {
        let itemWeight = 0;
        if (item.variant.weight != null && item.variant.weight > 0) {
            itemWeight = item.variant.weight * item.quantity;
        } else if (item.variant.product?.weight != null && item.variant.product.weight > 0) {
            itemWeight = item.variant.product.weight * item.quantity;
        }

        return itemWeight;
    }

    getShippingData(cart: Cart): ShippingData {
        const encryptedData = cart.context?.shipping_data as string | undefined;
        if (!encryptedData) {
            return { fulfillment_id: "manual-fulfillment" };
        }

        const textParts = encryptedData.split(":");
        if (textParts.length != 2) {
            throw new Error("Could not seperate IV and content");
        }

        const iv = Buffer.from(textParts.shift()!, "hex");
        const encryptedText = Buffer.from(textParts.join(":"), "hex");
        const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(process.env.SHIPPING_AES_KEY), iv);

        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        const decryptedJson = JSON.parse(decrypted.toString()) as ShippingData;

        return decryptedJson;
    }
}

export default MondialRelayFulfillmentService;
