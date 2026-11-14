import "server-only";
import { createClient } from "@/lib/supabase/server";

import type { OrderStatus } from "./status";
export type { OrderStatus } from "./status";

export type OrderItem = {
  id: string;
  title: string;
  colourName: string;
  colourHex: string;
  imagePath: string | null;
  options: Array<{ group: string; value: string; price_delta_pence: number }>;
  addons: Array<{ label: string; price_pence: number }>;
  unitPricePence: number;
  quantity: number;
  lineTotalPence: number;
};

export type OrderSummary = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalPence: number;
  createdAt: string;
  buyerId: string;
  sellerId: string;
  shopName: string | null;
  shipping: { name: string; phone: string; line1: string; line2: string; city: string; postcode: string };
  items: OrderItem[];
  events: Array<{ status: OrderStatus; createdAt: string }>;
};

const ORDER_SELECT = `
  id, order_number, status, total_pence, created_at, buyer_id, seller_id,
  shipping_name, shipping_phone, shipping_line1, shipping_line2, shipping_city, shipping_postcode,
  sellers ( shop_name ),
  order_items ( id, title, colour_name, colour_hex, image_path, options, addons, unit_price_pence, quantity, line_total_pence, position ),
  order_status_events ( status, created_at )
`;

type Row = {
  id: string;
  order_number: string;
  status: OrderStatus;
  total_pence: number;
  created_at: string;
  buyer_id: string;
  seller_id: string;
  shipping_name: string;
  shipping_phone: string;
  shipping_line1: string;
  shipping_line2: string;
  shipping_city: string;
  shipping_postcode: string;
  sellers: { shop_name: string } | { shop_name: string }[] | null;
  order_items: Array<{
    id: string;
    title: string;
    colour_name: string;
    colour_hex: string;
    image_path: string | null;
    options: OrderItem["options"];
    addons: OrderItem["addons"];
    unit_price_pence: number;
    quantity: number;
    line_total_pence: number;
    position: number;
  }> | null;
  order_status_events: Array<{ status: OrderStatus; created_at: string }> | null;
};

function mapOrder(row: Row): OrderSummary {
  const seller = Array.isArray(row.sellers) ? row.sellers[0] : row.sellers;
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    totalPence: row.total_pence,
    createdAt: row.created_at,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    shopName: seller?.shop_name ?? null,
    shipping: {
      name: row.shipping_name,
      phone: row.shipping_phone,
      line1: row.shipping_line1,
      line2: row.shipping_line2,
      city: row.shipping_city,
      postcode: row.shipping_postcode,
    },
    items: [...(row.order_items ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({
        id: i.id,
        title: i.title,
        colourName: i.colour_name,
        colourHex: i.colour_hex,
        imagePath: i.image_path,
        options: Array.isArray(i.options) ? i.options : [],
        addons: Array.isArray(i.addons) ? i.addons : [],
        unitPricePence: i.unit_price_pence,
        quantity: i.quantity,
        lineTotalPence: i.line_total_pence,
      })),
    events: [...(row.order_status_events ?? [])]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((e) => ({ status: e.status, createdAt: e.created_at })),
  };
}

/** Orders the signed-in user may see (their purchases, or their shop's sales). Row-level security does the filtering. */
export async function listOrders(filter?: { status?: OrderStatus }): Promise<OrderSummary[]> {
  const supabase = await createClient();
  let query = supabase.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false }).limit(200);
  if (filter?.status) query = query.eq("status", filter.status);
  const { data, error } = await query;
  if (error) throw new Error(`Could not load orders: ${error.message}`);
  return ((data ?? []) as unknown as Row[]).map(mapOrder);
}

export async function getOrder(id: string): Promise<OrderSummary | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("orders").select(ORDER_SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(`Could not load the order: ${error.message}`);
  return data ? mapOrder(data as unknown as Row) : null;
}
