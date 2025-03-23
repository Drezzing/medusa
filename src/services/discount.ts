import {
  DiscountService as MedusaDiscountService,
  LineItem,
  DiscountRuleType,
  AllocationType as DiscountAllocation,
  DiscountConditionType,
  DiscountConditionOperator,
} from "@medusajs/medusa";

import { Lifetime } from "awilix";

import { CalculationContextData } from "@medusajs/medusa/dist/types/totals";
import TaxInclusivePricingFeatureFlag from "@medusajs/medusa/dist/loaders/feature-flags/tax-inclusive-pricing";

class DiscountService extends MedusaDiscountService {
  static LIFE_TIME = Lifetime.SCOPED;

  async calculateDiscountForLineItem(
    discountId: string,
    lineItem: LineItem,
    calculationContextData: CalculationContextData
  ): Promise<number> {
    return await this.atomicPhase_(async (transactionManager) => {
      let adjustment = 0;

      if (!lineItem.allow_discounts) {
        return adjustment;
      }

      const discount = await this.retrieve(discountId, {
        relations: [
          "rule",
          "rule.conditions",
          "rule.conditions.products",
          "rule.conditions.product_collections",
          "rule.conditions.product_types",
          // "rule.conditions.product_tags",
          // "rule.conditions.customer_groups",
        ],
      });
      const { type, value, allocation } = discount.rule;

      const calculationContext = await this.totalsService_
        .withTransaction(transactionManager)
        .getCalculationContext(calculationContextData, {
          exclude_shipping: true,
        });

      let fullItemPrice = lineItem.unit_price * lineItem.quantity;
      const includesTax =
        this.featureFlagRouter_.isFeatureEnabled(
          TaxInclusivePricingFeatureFlag.key
        ) && lineItem.includes_tax;

      if (includesTax) {
        const lineItemTotals = await this.newTotalsService_
          .withTransaction(transactionManager)
          .getLineItemTotals([lineItem], {
            includeTax: true,
            calculationContext,
          });
        fullItemPrice = lineItemTotals[lineItem.id].subtotal;
      }

      if (type === DiscountRuleType.PERCENTAGE) {
        adjustment = Math.round((fullItemPrice / 100) * value);
      } else if (
        type === DiscountRuleType.FIXED &&
        allocation === DiscountAllocation.TOTAL
      ) {
        // when a fixed discount should be applied to the total,
        // we create line adjustments for each item with an amount
        // relative to the subtotal
        let discountedItems = calculationContextData.items.filter(
          (item) => item.allow_discounts
        );

        if (discount.rule.conditions.length > 0) {
          for (const condition of discount.rule.conditions) {
            const operatorInclude =
              condition.operator === DiscountConditionOperator.IN;
            if (condition.type === DiscountConditionType.PRODUCTS) {
              const productIds = condition.products.map((p) => p.id);
              discountedItems = discountedItems.filter((item) => {
                const include = productIds.includes(item.variant.product_id);
                return operatorInclude ? include : !include;
              });
            }

            if (condition.type === DiscountConditionType.PRODUCT_COLLECTIONS) {
              const collectionIds = condition.product_collections.map(
                (c) => c.id
              );
              discountedItems = discountedItems.filter((item) => {
                const include = collectionIds.includes(
                  item.variant.product.collection_id
                );
                return operatorInclude ? include : !include;
              });
            }

            if (condition.type === DiscountConditionType.PRODUCT_TYPES) {
              const typeIds = condition.product_types.map((t) => t.id);
              discountedItems = discountedItems.filter((item) => {
                const include = typeIds.includes(item.variant.product.type_id);
                return operatorInclude ? include : !include;
              });
            }
          }
        }

        const totals = await this.newTotalsService_.getLineItemTotals(
          discountedItems,
          {
            includeTax: includesTax,
            calculationContext,
          }
        );
        const subtotal = Object.values(totals).reduce((subtotal, total) => {
          subtotal += total.subtotal;
          return subtotal;
        }, 0);
        const nominator = Math.min(value, subtotal);
        const totalItemPercentage = fullItemPrice / subtotal;

        adjustment = nominator * totalItemPercentage;
      } else {
        adjustment = value * lineItem.quantity;
      }

      return Math.min(adjustment, fullItemPrice);
    });
  }
}
export default DiscountService;
