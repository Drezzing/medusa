import { ProductDetailsWidgetProps, WidgetConfig } from "@medusajs/admin";
import { Button } from "@medusajs/ui";
import { useAdminUpdateProduct } from "medusa-react";
import { useCallback, useMemo, useState } from "react";
import Select from "react-select";

const ProductVariantImages = ({product, notify}: ProductDetailsWidgetProps) => {
    const updateProduct = useAdminUpdateProduct(product.id);
    
    const options = useMemo(() => 
        product.variants.map(variant => ({
            value: variant.id,
            label: variant.title,
        })), 
        [product.variants]
    );
    
    const currentSelection = useMemo(() => {
        const selection: Record<string, string[]> = {};
        for (const image of product.images) {
            if (image.metadata && image.metadata.variants) {
                selection[image.id] = image.metadata.variants as string[];
            } else {
                selection[image.id] = [];
            }
        }
        return selection;
    }, [product.images]);

    const [selection, setSelection] = useState<Record<string, string[]>>(currentSelection);
    const handleSave = useCallback(() => {
        updateProduct.mutate({
            metadata: { ...product.metadata, variantImages: selection },
        }, {
            onSuccess: () => notify.success("Product variant images updated successfully", ""),
            onError: (error) => notify.error("Failed to update product variant images", error.message),
        });
    }, [updateProduct, product.metadata, selection, notify]);

    const handleSelectionChange = useCallback((imageId: string, newValue: any) => {
        setSelection(prevSelection => {
            const updatedSelection = { ...prevSelection };
            updatedSelection[imageId] = newValue.map((item: any) => item.value);
            return updatedSelection;
        });
    }, []);

    const imageComponents = useMemo(() => 
        product.images.map(image => {
            const defaultSelection = selection[image.id].map(variantId => {
                const variant = product.variants.find(v => v.id === variantId);
                return {
                    value: variantId,
                    label: variant.title,
                };
            });
    
            return (
                <div key={image.url} className="flex items-center space-x-4">
                    <img src={image.url} alt="Product Variant" className="w-16 h-16 object-cover rounded" />
                    <Select
                        className="w-full"
                        isMulti
                        isSearchable
                        closeMenuOnSelect={false}
                        defaultValue={defaultSelection}
                        onChange={(newValue) => handleSelectionChange(image.id, newValue)}
                        options={options}
                        styles={{
                            control: (provided) => ({
                                ...provided,
                                maxHeight: '56px',
                                overflowY: 'auto',
                            }),
                        }}
                    />
                </div>
            );
        }),
        [product.images, selection, options, handleSelectionChange]
    );

    return (
        <div key="product-variants-images" className="bg-white p-8 border border-gray-200 rounded-lg">
            <h1 className="text-grey-90 inter-xlarge-semibold mb-base">Product Variant Images</h1>

            {imageComponents}

            <div className="flex justify-end mt-4">
                <Button variant="primary" onClick={handleSave}>
                    Save
                </Button>
            </div>
        </div>
    );
}

export const config: WidgetConfig = {
    zone: [
      "product.details.after",
    ],
  };
  
export default ProductVariantImages;