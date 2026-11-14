import type { Metadata } from "next";
import { ProductForm } from "@/components/seller/product-form";
import { getSessionProfile } from "@/lib/auth";
import { getAllCategories } from "@/lib/catalog/queries";
import { emptyForm } from "@/lib/seller/form-state";

export const metadata: Metadata = { title: "New listing" };

export default async function NewProductPage() {
  const session = await getSessionProfile();
  const categories = await getAllCategories();
  const leaf = categories.filter((c) => c.parentId);
  const defaultCategory = (leaf[0] ?? categories[0])?.id ?? "";

  return (
    <div>
      <h2 className="mb-8 font-display text-2xl">New listing</h2>
      <ProductForm
        initial={emptyForm(defaultCategory)}
        sellerId={session!.id}
        categories={categories}
        aiEnabled={Boolean(process.env.GEMINI_API_KEY)}
        shopStatus={session!.seller?.status ?? "pending"}
      />
    </div>
  );
}
