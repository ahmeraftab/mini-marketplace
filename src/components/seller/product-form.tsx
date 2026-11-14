"use client";

import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import type { Facets } from "@/lib/catalog/types";
import { discountPercentFor } from "@/lib/pricing";
import { parsePounds } from "@/lib/money";
import { saveProduct } from "@/lib/seller/actions";
import { buildPayload, submissionProblems, type FormState } from "@/lib/seller/form-state";
import { AiDescribe } from "./ai-describe";
import { ColoursEditor } from "./colours-editor";
import { MoneyInput } from "./money-input";
import { AddonsEditor, OptionGroupsEditor } from "./options-editor";
import { PhotosEditor } from "./photos-editor";

function Section({ n, title, hint, children }: { n: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-10" aria-labelledby={`sec-${n}`}>
      <div className="mb-6 flex items-baseline gap-3">
        <span className="tnum font-display text-3xl text-clay" aria-hidden="true">{n}</span>
        <div>
          <h2 id={`sec-${n}`} className="font-display text-2xl">{title}</h2>
          {hint && <p className="mt-1 max-w-xl text-[15px] text-ink-muted">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export function ProductForm({
  initial,
  sellerId,
  categories,
  aiEnabled,
  shopStatus,
}: {
  initial: FormState;
  sellerId: string;
  categories: Facets["categories"];
  aiEnabled: boolean;
  shopStatus: "pending" | "approved" | "hidden";
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState<null | "draft" | "submit">(null);
  const [dirty, setDirty] = useState(false);
  const saved = useRef(false);

  const set = (patch: Partial<FormState>) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };

  // warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (saved.current) return;
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const base = parsePounds(form.basePrice);
  const compare = form.compareAt.trim() ? parsePounds(form.compareAt) : null;
  const discount = base != null && compare != null ? discountPercentFor(base, compare) : null;

  const leaf = useMemo(() => {
    const children = categories.filter((c) => c.parentId);
    return children.length ? children : categories;
  }, [categories]);
  const parentName = (id: string | null) => categories.find((c) => c.id === id)?.name;

  const isLive = form.status === "approved";

  async function save(kind: "draft" | "submit") {
    if (saving) return;
    setFormError(null);
    const submit = kind === "submit";
    if (submit) {
      const problems = submissionProblems(form);
      if (problems.length) {
        setFormError(problems.join(" "));
        const el = document.getElementById("sec-3");
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    const built = buildPayload(form, submit);
    if (!built.ok) {
      setErrors(built.errors);
      setFormError("Please fix the highlighted fields.");
      requestAnimationFrame(() => {
        const first = document.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]');
        first?.scrollIntoView({ behavior: "smooth", block: "center" });
        if (first && "focus" in first) first.focus({ preventScroll: true });
      });
      return;
    }
    setErrors({});
    setSaving(kind);
    try {
      const res = await saveProduct(built.payload);
      if (res.ok) {
        saved.current = true;
        setDirty(false);
        toast.success(submit ? "Sent for approval" : isLive ? "Changes saved" : "Draft saved");
        router.push("/seller");
        router.refresh();
        return;
      }
      setErrors(res.fieldErrors ?? {});
      setFormError(res.message);
    } catch {
      setFormError("We could not reach the server. Your changes are still here, so try again.");
    }
    setSaving(null);
  }

  const err = (k: string) => errors[k];

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save(isLive ? "submit" : "draft");
      }}
      className="space-y-12 pb-32"
    >
      {shopStatus === "pending" && (
        <p className="rounded-control border border-amber-ink/20 bg-amber-soft px-4 py-3 text-sm text-amber-ink">
          Your shop is waiting for admin approval. You can prepare listings now; they go live once the shop is approved.
        </p>
      )}

      <Section n={1} title="Details" hint="What buyers see first. The title comes from your main colour in step 3.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Category" error={err("categoryId")} required className="sm:col-span-2">
            {(a) => (
              <Select value={form.categoryId} onChange={(e) => set({ categoryId: e.target.value })} {...a}>
                {leaf.map((c) => (
                  <option key={c.id} value={c.id}>
                    {parentName(c.parentId) ? `${parentName(c.parentId)} › ${c.name}` : c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Price" hint="Starting price, before sizes and extras." error={err("basePrice")} required>
            {(a) => <MoneyInput value={form.basePrice} placeholder="269.99" onChange={(e) => set({ basePrice: e.target.value })} {...a} />}
          </Field>
          <Field label="Compare-at price" hint="Optional. Shown crossed out." error={err("compareAt")}>
            {(a) => <MoneyInput value={form.compareAt} placeholder="539.98" onChange={(e) => set({ compareAt: e.target.value })} {...a} />}
          </Field>
          {discount != null && (
            <p className="flex items-center gap-2 text-sm text-ink-muted sm:col-span-2">
              Buyers will see <Badge tone="clay">{discount}% OFF</Badge> next to the price.
            </p>
          )}
          <Field label="Description" error={err("description")} className="sm:col-span-2" hint="A few sentences. Mention what makes it good.">
            {(a) => <Textarea value={form.description} rows={6} maxLength={4000} onChange={(e) => set({ description: e.target.value })} {...a} />}
          </Field>
        </div>
      </Section>

      <Section n={2} title="Photos" hint="At least 5. Choose which colour each photo shows, or leave it for all colours.">
        <PhotosEditor
          sellerId={sellerId}
          productId={form.id}
          photos={form.photos}
          colours={form.colours}
          onChange={(photos) => set({ photos })}
          error={err("images")}
        >
          <AiDescribe
            enabled={aiEnabled}
            photos={form.photos}
            hasText={Boolean(form.description.trim() || form.colours[0]?.title.trim())}
            onUseTitle={(title) =>
              set({ colours: form.colours.map((c, i) => (i === 0 ? { ...c, title, titleEdited: true } : c)) })
            }
            onUseDescription={(description) => set({ description })}
            onUseAlt={(photoId, alt) => set({ photos: form.photos.map((p) => (p.id === photoId ? { ...p, alt } : p)) })}
          />
        </PhotosEditor>
      </Section>

      <Section n={3} title="Colours" hint="Each colour can have its own title and photos. The first one is the main colour.">
        <ColoursEditor colours={form.colours} onChange={(colours) => set({ colours })} errors={errors} groupError={err("colours")} />
      </Section>

      <Section n={4} title="Options" hint="Anything buyers choose between: size, storage, headboard, base. Each choice can add to the price.">
        <OptionGroupsEditor groups={form.groups} onChange={(groups) => set({ groups })} errors={errors} />
      </Section>

      <Section n={5} title="Extras" hint="Optional tick boxes with their own price, such as assembly.">
        <AddonsEditor addons={form.addons} onChange={(addons) => set({ addons })} errors={errors} />
      </Section>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper shadow-[0_-8px_24px_-16px_rgb(27_26_23/0.35)]">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1 text-sm">
            {formError ? (
              <p role="alert" className="font-medium text-clay">{formError}</p>
            ) : (
              <p className="flex items-center gap-2 text-ink-muted">
                <StatusBadge status={form.status} />
                {dirty ? "Unsaved changes" : "All saved"}
              </p>
            )}
          </div>
          {isLive ? (
            <Button type="submit" loading={saving !== null} data-testid="save-changes">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Save changes
            </Button>
          ) : (
            <>
              <Button type="button" variant="secondary" loading={saving === "draft"} disabled={saving !== null} onClick={() => void save("draft")} data-testid="save-draft">
                Save draft
              </Button>
              <Button type="button" loading={saving === "submit"} disabled={saving !== null} onClick={() => void save("submit")} data-testid="submit-approval">
                Submit for approval
              </Button>
            </>
          )}
        </div>
      </div>
    </form>
  );
}
