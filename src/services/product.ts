import { ProductService as MedusaProductService, Product } from "@medusajs/medusa";
import { UpdateProductInput } from "@medusajs/medusa/dist/types/product";

export const WIDGET_IMAGE_METADATA_KEYS = {
    VARIANTS: "imageMetadata-variants",
    ALT_DESCRIPTION: "imageMetadata-altDescription",
} as const;

type ImageMetadata = {
    [WIDGET_IMAGE_METADATA_KEYS.VARIANTS]?: Record<string, string[]> | undefined;
    [WIDGET_IMAGE_METADATA_KEYS.ALT_DESCRIPTION]?: Record<string, string> | undefined;
    [key: string]: unknown;
};

class ProductService extends MedusaProductService {
    async update(productId: string, update: UpdateProductInput): Promise<Product> {
        await this.atomicPhase_(async (manager) => {
            const imageRepo = manager.withRepository(this.imageRepository_);
            const metadata = update.metadata as ImageMetadata | undefined;
            if (!metadata) {
                return;
            }

            const variantImages = metadata["imageMetadata-variants"];
            const altDescription = metadata["imageMetadata-altDescription"];

            const imageMetadataUpdates: Record<
                string,
                { variants: string[] | undefined; alt_description: string | undefined }
            > = {};
            for (const [key, values] of Object.entries(variantImages || {})) {
                const insertValue = values.length ? values : undefined;
                if (key in imageMetadataUpdates) {
                    imageMetadataUpdates[key].variants = insertValue;
                } else {
                    imageMetadataUpdates[key] = {
                        variants: insertValue,
                        alt_description: undefined,
                    };
                }
            }

            for (const [key, value] of Object.entries(altDescription || {})) {
                const insertValue = value.length ? value : undefined;
                if (key in imageMetadataUpdates) {
                    imageMetadataUpdates[key]["alt_description"] = insertValue;
                } else {
                    imageMetadataUpdates[key] = {
                        variants: undefined,
                        alt_description: insertValue,
                    };
                }
            }

            const updates = Object.entries(imageMetadataUpdates).map(async ([key, value]) => {
                return imageRepo.update(key, {
                    metadata: {
                        ...value,
                    },
                });
            });
            await Promise.all(updates);

            delete metadata["imageMetadata-variants"];
            delete metadata["imageMetadata-altDescription"];
        });

        return super.update(productId, update);
    }
}

export default ProductService;
