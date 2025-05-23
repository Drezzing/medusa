import { isString, ProductVariantService as MedusaProductVariantService } from "@medusajs/medusa";
import { In } from "typeorm";

import { WIDGET_IMAGE_METADATA, VariantImages, AltDescription } from "../admin/widgets/product-images/product-images";

type ProductMetadata = {
    [WIDGET_IMAGE_METADATA.VARIANTS]?: VariantImages | undefined;
    [WIDGET_IMAGE_METADATA.ALT_DESCRIPTION]?: AltDescription | undefined;
    [x: string]: unknown;
};

class ProductVariantService extends MedusaProductVariantService {
    async delete(variantIds: string | string[]): Promise<void> {
        const variantIds_ = isString(variantIds) ? [variantIds] : variantIds;
        await this.atomicPhase_(async (manager) => {
            const variantRepo = manager.withRepository(this.productVariantRepository_);
            const productRepo = manager.withRepository(this.productRepository_);

            const variants = await variantRepo.find({
                where: { id: In(variantIds_) },
                relations: ["product"],
            });

            const productsUpdates: Record<string, ProductMetadata> = {};
            for (const variant of variants) {
                if (productsUpdates[variant.product.id] === undefined) {
                    productsUpdates[variant.product.id] = variant.product.metadata;
                }
            }
            for (const [productId, productMetadata] of Object.entries(productsUpdates)) {
                if (productMetadata[WIDGET_IMAGE_METADATA.VARIANTS] === undefined) {
                    continue;
                }
                for (const [imageId, variants] of Object.entries(productMetadata[WIDGET_IMAGE_METADATA.VARIANTS])) {
                    const newVariants = variants.filter((variantId) => !variantIds_.includes(variantId));
                    productsUpdates[productId][WIDGET_IMAGE_METADATA.VARIANTS][imageId] = newVariants.length
                        ? newVariants
                        : undefined;
                }
            }

            const updates = Object.entries(productsUpdates).map(async ([productId, productMetadata]) => {
                productRepo.update(productId, {
                    metadata: productMetadata,
                });
            });

            await Promise.all(updates);
        });

        return super.delete(variantIds_);
    }
}

export default ProductVariantService;
