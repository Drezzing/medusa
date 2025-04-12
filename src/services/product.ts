import { ProductService as MedusaProductService, Product } from "@medusajs/medusa";
import { UpdateProductInput } from "@medusajs/medusa/dist/types/product";

class ProductService extends MedusaProductService {
    async update(productId: string, update: UpdateProductInput): Promise<Product> {
        await this.atomicPhase_(async (manager) => {
            const imageRepo = manager.withRepository(this.imageRepository_);
            if (update.metadata && update.metadata.variantImages) {
                console.log(update);
                const variantImages = update.metadata.variantImages as Record<string, string[]>;
                const imageMetadataUpdates = Object.entries(variantImages).map(([key, values]) => {
                    imageRepo.update(key, {
                        metadata: {
                            variants: values.length ? values : undefined,
                        },
                    });
                });
                await Promise.all(imageMetadataUpdates);
                delete update.metadata.variantImages;
            }
        });

        return super.update(productId, update);
    }
}

export default ProductService;
