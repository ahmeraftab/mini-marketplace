import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/seller/product-form";
import { getSessionProfile } from "@/lib/auth";
import { getAllCategories, getProductById } from "@/lib/catalog/queries";
import { isUuid } from "@/lib/ids";
import { formFromProduct } from "@/lib/seller/form-state";

export const metadata: Metadata = { title: "Edit listing" };

export default async function EditProductPage(props: PageProps<"/seller/products/[id]/edit">) {
  const { id } = await props.params;
  const session = await getSessionProfile();
  if (!isUuid(id)) notFound();
  const product = await getProductById(id);
  // only the owner may edit (an admin can read it, but edits go through the owner)
  if (!product || product.sellerId !== session!.id) notFound();
  const categories = await getAllCategories();

  return (
    <div>
      <h2 className="mb-8 font-display text-2xl">Edit listing</h2>
      <ProductForm
        initial={formFromProduct(product)}
        sellerId={session!.id}
        categories={categories}
        aiEnabled={Boolean(process.env.GEMINI_API_KEY)}
        shopStatus={session!.seller?.status ?? "pending"}
      />
    </div>
  );
}
