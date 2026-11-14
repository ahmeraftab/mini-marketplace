export type OrderStatus = "new" | "confirmed" | "shipped" | "delivered";
export const ORDER_STATUSES: OrderStatus[] = ["new", "confirmed", "shipped", "delivered"];
export const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "New",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
};
