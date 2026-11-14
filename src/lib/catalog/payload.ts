/**
 * The exact shape the `save_product` database function receives. The seller
 * form builds one of these, the server action validates it, the seed script
 * builds one for the Prague bed, and the database tests mutate copies of it.
 */
export type SaveProductPayload = {
  id: string;
  category_id: string;
  description: string;
  base_price_pence: number;
  compare_at_price_pence: number | null;
  /** true = send for approval, false = keep as a draft */
  submit: boolean;
  /** The first colour is the main colour; its title becomes the product title. */
  colours: Array<{ id: string; name: string; hex: string; title: string }>;
  images: Array<{
    id: string;
    colour_id: string | null;
    storage_path: string;
    alt: string;
    width: number | null;
    height: number | null;
  }>;
  groups: Array<{
    id: string;
    name: string;
    is_filterable: boolean;
    values: Array<{ id: string; label: string; price_delta_pence: number; is_default: boolean }>;
  }>;
  addons: Array<{ id: string; label: string; price_pence: number }>;
};
