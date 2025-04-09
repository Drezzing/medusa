import {
  isString,
  ProductVariantService as MedusaProductVariantService,
} from "@medusajs/medusa";
import { In } from "typeorm";
import ImageRepository from "@medusajs/medusa/dist/repositories/image";

class ProductVariantService extends MedusaProductVariantService {
  protected readonly imageRepository_: typeof ImageRepository;

  constructor(container) {
    super(container);
    this.imageRepository_ = container.imageRepository;
  }

  async delete(variantIds: string | string[]): Promise<void> {
    const variantIds_ = isString(variantIds) ? [variantIds] : variantIds;
    await this.atomicPhase_(async (manager) => {
      const variantRepo = manager.withRepository(
        this.productVariantRepository_
      );
      const imageRepo = manager.withRepository(this.imageRepository_);

      const variants = await variantRepo.find({
        where: { id: In(variantIds_) },
        relations: ["product", "product.images"],
      });

      const images = variants.map((variant) => variant.product.images).flat();
      const imagesUpdates = images.map((image) => {
        if (image.metadata && image.metadata.variants) {
          const variantIds = image.metadata.variants as string[];
          const newVariants = variantIds.filter(
            (variantId) => !variantIds_.includes(variantId)
          );
          return imageRepo.update(image.id, {
            metadata: {
              variants: newVariants.length ? newVariants : undefined,
            },
          });
        }
      });

      await Promise.all(imagesUpdates);
    });

    return super.delete(variantIds_);
  }
}

export default ProductVariantService;
