import * as AccordionPrimitive from "@radix-ui/react-accordion";
import React from "react";
import { CheckCircleSolid, CircleMiniSolid } from "@medusajs/icons";
import { Heading, Text, clx } from "@medusajs/ui";
import ActiveCircleDottedLine from "./icons/active-circle-dotted-line";

type AccordionItemProps = AccordionPrimitive.AccordionItemProps & {
    title: string;
    subtitle?: string;
    description?: string;
    required?: boolean;
    tooltip?: string;
    forceMountContent?: true;
    headingSize?: "small" | "medium" | "large";
    customTrigger?: React.ReactNode;
    complete?: boolean;
    active?: boolean;
    triggerable?: boolean;
};

const Accordion: React.FC<
    | (AccordionPrimitive.AccordionSingleProps & React.RefAttributes<HTMLDivElement>)
    | (AccordionPrimitive.AccordionMultipleProps & React.RefAttributes<HTMLDivElement>)
> & {
    Item: React.FC<AccordionItemProps>;
} = ({ children, ...props }) => {
    return <AccordionPrimitive.Root {...props}>{children}</AccordionPrimitive.Root>;
};

const Item: React.FC<AccordionItemProps> = ({
    title,
    subtitle,
    description,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    required,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tooltip,
    children,
    className,
    complete,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    headingSize = "large",
    customTrigger = undefined,
    forceMountContent = undefined,
    active,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    triggerable,
    ...props
}) => {
    return (
        <AccordionPrimitive.Item
            {...props}
            className={clx("border-grey-20 group border-t last:mb-0", "px-8 py-1", className)}
        >
            <AccordionPrimitive.Header className="px-1">
                <div className="flex flex-col">
                    <div className="flex w-full items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center p-[10px]">
                                {complete ? (
                                    <CheckCircleSolid className="text-ui-fg-interactive" />
                                ) : (
                                    <>
                                        {active && (
                                            <ActiveCircleDottedLine
                                                size={20}
                                                className="text-ui-fg-interactive rounded-full"
                                            />
                                        )}
                                        {!active && <CircleMiniSolid className="text-ui-fg-muted" />}
                                    </>
                                )}
                            </div>
                            <Heading level="h3" className={clx("text-ui-fg-base")}>
                                {title}
                            </Heading>
                        </div>
                        <AccordionPrimitive.Trigger>{customTrigger || <MorphingTrigger />}</AccordionPrimitive.Trigger>
                    </div>
                    {subtitle && (
                        <Text as="span" size="small" className="mt-1">
                            {subtitle}
                        </Text>
                    )}
                </div>
            </AccordionPrimitive.Header>
            <AccordionPrimitive.Content
                forceMount={forceMountContent}
                className={clx(
                    "radix-state-closed:animate-accordion-close radix-state-open:animate-accordion-open radix-state-closed:pointer-events-none px-1",
                )}
            >
                <div className="inter-base-regular group-radix-state-closed:animate-accordion-close">
                    {description && <Text>{description}</Text>}
                    <div className="w-full">{children}</div>
                </div>
            </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
    );
};

Accordion.Item = Item;

const MorphingTrigger = () => {
    return (
        <div className="btn-ghost rounded-rounded group relative p-[6px]">
            <div className="h-5 w-5">
                <span className="bg-grey-50 rounded-circle group-radix-state-open:rotate-90 absolute inset-y-[31.75%] left-[48%] right-1/2 w-[1.5px] duration-300" />
                <span className="bg-grey-50 rounded-circle group-radix-state-open:rotate-90 group-radix-state-open:left-1/2 group-radix-state-open:right-1/2 absolute inset-x-[31.75%] bottom-1/2 top-[48%] h-[1.5px] duration-300" />
            </div>
        </div>
    );
};

export default Accordion;
