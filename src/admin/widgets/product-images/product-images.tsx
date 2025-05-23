import { ProductDetailsWidgetProps, WidgetConfig } from "@medusajs/admin";
import { Button } from "@medusajs/ui";
import { useAdminUpdateProduct } from "medusa-react";
import { useCallback, useMemo, useState } from "react";
import Select, { MultiValue } from "react-select";

export const WIDGET_IMAGE_METADATA = {
    VARIANTS: "imageMetadata-variants",
    ALT_DESCRIPTION: "imageMetadata-altDescription",
} as const;

type WIDGET_IMAGE_METADATA_KEYS = (typeof WIDGET_IMAGE_METADATA)[keyof typeof WIDGET_IMAGE_METADATA];

export type VariantImages = Record<string, string[] | undefined>;
export type AltDescription = Record<string, string | undefined>;

const ProductVariantImages = ({ product, notify }: ProductDetailsWidgetProps) => {
    const updateProduct = useAdminUpdateProduct(product.id);

    const options = useMemo(
        () =>
            product.variants.map((variant) => ({
                value: variant.id,
                label: variant.title,
            })),
        [product.variants],
    );

    const getDefaultSelection = (metadataKey: WIDGET_IMAGE_METADATA_KEYS) => {
        const selection = product.metadata?.[metadataKey] as VariantImages | AltDescription | undefined;
        return selection || {};
    };

    const currentSelection = useMemo(() => {
        return getDefaultSelection(WIDGET_IMAGE_METADATA.VARIANTS) as VariantImages;
    }, [product.images]);

    const currentAltDescription = useMemo(() => {
        return getDefaultSelection(WIDGET_IMAGE_METADATA.ALT_DESCRIPTION) as AltDescription;
    }, [product.images]);

    const [selection, setSelection] = useState<VariantImages>(currentSelection);
    const [altDescription, setAltDescription] = useState<AltDescription>(currentAltDescription);

    const handleSave = useCallback(() => {
        updateProduct.mutate(
            {
                metadata: {
                    ...product.metadata,
                    [WIDGET_IMAGE_METADATA.VARIANTS]: selection,
                    [WIDGET_IMAGE_METADATA.ALT_DESCRIPTION]: altDescription,
                },
            },
            {
                onSuccess: () => notify.success("Product images updated successfully", ""),
                onError: (error) => notify.error("Failed to update product variant images", error.message),
            },
        );
    }, [updateProduct, product.metadata, selection, altDescription, notify]);

    const handleSelectionChange = useCallback(
        (imageId: string, newValue: MultiValue<{ value: string; label: string }>) => {
            setSelection((prevSelection) => {
                const updatedSelection = { ...prevSelection };
                updatedSelection[imageId] = newValue.length ? newValue.map((item) => item.value) : undefined;
                return updatedSelection;
            });
        },
        [],
    );

    const handleAltDescriptionChange = useCallback((imageId: string, newValue: string) => {
        setAltDescription((prevAltDescription) => {
            const updatedAltDescription = { ...prevAltDescription };
            updatedAltDescription[imageId] = newValue || undefined;
            return updatedAltDescription;
        });
    }, []);

    const imageComponents = useMemo(
        () =>
            product.images.map((image) => {
                const defaultSelection =
                    selection[image.id]?.map((variantId) => {
                        const variant = product.variants.find((v) => v.id === variantId);
                        return {
                            value: variantId,
                            label: variant.title,
                        };
                    }) || [];

                const defaultAltDescription = altDescription[image.id] || "";

                return (
                    <div
                        key={image.url}
                        className="grid grid-cols-[auto_1fr] grid-rows-[auto_auto] items-center gap-x-4 gap-y-2"
                    >
                        <img
                            src={image.url}
                            alt="Product Variant"
                            className="row-span-2 size-20 rounded object-cover"
                        />
                        <Select
                            className="w-full"
                            isMulti
                            isSearchable
                            closeMenuOnSelect={false}
                            defaultValue={defaultSelection}
                            onChange={(newValue) => handleSelectionChange(image.id, newValue)}
                            options={options}
                        />
                        <input
                            // styled like react-select
                            className="h-[36px] w-full rounded border border-[hsl(0,0%,80%)] px-3 py-2 duration-100 placeholder:text-[hsl(0,0%,50%)] hover:border-[hsl(0,0%,70%)] focus:border-[#2684FF] focus:outline-none focus:ring-1 focus:ring-[#2684FF] focus:ring-offset-0"
                            placeholder="Alt description"
                            defaultValue={defaultAltDescription}
                            onChange={(e) => handleAltDescriptionChange(image.id, e.target.value)}
                        />
                    </div>
                );
            }),
        [product.images, selection, options, handleSelectionChange, altDescription, handleAltDescriptionChange],
    );

    return (
        <div key="product-variants-images" className="rounded-lg border border-gray-200 bg-white p-8">
            <h1 className="text-grey-90 inter-xlarge-semibold mb-base">Product Variant Images</h1>

            {product.images.length > 0 ? (
                <div className="space-y-4">{imageComponents}</div>
            ) : (
                <div>No images found for this product.</div>
            )}

            <div className="mt-4 flex justify-end">
                <Button variant="primary" onClick={handleSave}>
                    Save
                </Button>
            </div>
        </div>
    );
};

export const config: WidgetConfig = {
    zone: ["product.details.after"],
};

export default ProductVariantImages;
