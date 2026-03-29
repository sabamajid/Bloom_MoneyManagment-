"use client";

import { Camera, Check, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FamilySection } from "@/components/settings/FamilySection";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/cn";
import { monthKeyFromDate } from "@/lib/format";

type ThemeMode = "blush" | "lavender" | "beige";

type CategoryItem = {
  id: string;
  name: string;
  limitAmount: number | string | null;
};

export function SettingsClient() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [theme, setTheme] = useState<ThemeMode>("blush");
  const [limitInput, setLimitInput] = useState("");
  const [savingLimit, setSavingLimit] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [limitDrafts, setLimitDrafts] = useState<Record<string, string>>({});
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(() => new Set());
  const [categorySelectMode, setCategorySelectMode] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      setProfileLoading(true);
      try {
        const res = await fetch("/api/profile", { method: "GET" });
        const payload = (await res.json()) as {
          error?: string;
          displayName?: string | null;
          avatarUrl?: string | null;
        };
        if (cancelled || !res.ok) return;
        setProfileDisplayName(payload.displayName ?? "");
        setProfileAvatarUrl(payload.avatarUrl ?? "");
      } catch {
        // ignore
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    }
    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("bloom-theme");
    if (saved === "blush" || saved === "lavender" || saved === "beige") setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("bloom-theme", theme);
  }, [theme]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setInfo(null);
    const month = monthKeyFromDate(new Date());
    try {
      const [categoriesRes, limitRes] = await Promise.all([
        fetch("/api/categories"),
        fetch(`/api/monthly-limit?month=${month}`),
      ]);
      const categoriesPayload = (await categoriesRes.json()) as {
        error?: string;
        categories?: CategoryItem[];
      };
      const limitPayload = (await limitRes.json()) as {
        error?: string;
        limitAmount?: number | string | null;
      };

      if (!categoriesRes.ok) {
        setError(categoriesPayload.error ?? "Could not load categories.");
      } else {
        const items = categoriesPayload.categories ?? [];
        setCategories(items);
        const drafts: Record<string, string> = {};
        for (const c of items) drafts[c.name] = c.limitAmount == null ? "" : String(c.limitAmount);
        setLimitDrafts(drafts);
        setSelectedCategoryIds((prev) => {
          const allowed = new Set(items.map((c) => c.id));
          const next = new Set<string>();
          for (const id of prev) {
            if (allowed.has(id)) next.add(id);
          }
          return next;
        });
      }

      if (!limitRes.ok) {
        setError((prev) => prev ?? limitPayload.error ?? "Could not load limit.");
      } else {
        const raw = limitPayload.limitAmount;
        setLimitInput(raw == null ? "" : String(raw));
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );

  useEffect(() => {
    if (categories.length === 0) setCategorySelectMode(false);
  }, [categories.length]);

  async function saveMonthlyLimit() {
    const parsed = Number.parseFloat(limitInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    setSavingLimit(true);
    setError(null);
    try {
      const res = await fetch("/api/monthly-limit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limitAmount: parsed }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) setError(payload.error ?? "Could not save.");
      else {
        setError(null);
        setInfo("Saved.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSavingLimit(false);
    }
  }

  async function addCategory() {
    const name = newCategory.trim();
    if (name.length < 2) return setError("Name too short.");
    setError(null);

    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const payload = (await res.json()) as { error?: string };
    if (!res.ok) return setError(payload.error ?? "Could not add.");

    setNewCategory("");
    await load();
  }

  async function saveCategoryLimit(categoryName: string) {
    const raw = limitDrafts[categoryName] ?? "";
    const parsed = Number.parseFloat(raw);
    const body =
      raw.trim().length === 0
        ? { categoryName, limitAmount: null }
        : { categoryName, limitAmount: parsed };
    const res = await fetch("/api/category-limits", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await res.json()) as {
      error?: string;
      categoryName?: string;
      limitAmount?: number | string | null;
    };
    if (!res.ok) return setError(payload.error ?? "Could not save.");
    setError(null);

    setCategories((prev) =>
      prev.map((item) =>
        item.name === categoryName
          ? {
              ...item,
              limitAmount: payload.limitAmount ?? null,
            }
          : item,
      ),
    );
    setInfo("Saved.");
  }

  async function deleteCategory(id: string) {
    const ok = window.confirm("Delete this category?");
    if (!ok) return;

    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    const payload = (await res.json()) as { error?: string };
    if (!res.ok) return setError(payload.error ?? "Could not delete.");
    setError(null);
    setInfo("Deleted.");
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    await load();
  }

  function toggleCategorySelect(cid: string) {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(cid)) next.delete(cid);
      else next.add(cid);
      return next;
    });
  }

  function selectAllCategories() {
    setSelectedCategoryIds(new Set(sortedCategories.map((c) => c.id)));
  }

  function clearCategorySelection() {
    setSelectedCategoryIds(new Set());
  }

  function exitCategorySelectMode() {
    setCategorySelectMode(false);
    setSelectedCategoryIds(new Set());
  }

  async function bulkDeleteCategories() {
    const ids = sortedCategories.filter((c) => selectedCategoryIds.has(c.id)).map((c) => c.id);
    if (!ids.length) return;
    const ok = window.confirm(`Delete ${ids.length} categor${ids.length === 1 ? "y" : "ies"}?`);
    if (!ok) return;

    setBulkDeleting(true);
    setError(null);
    try {
      for (const id of ids) {
        const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
        const payload = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(payload.error ?? "Could not delete.");
          return;
        }
      }
      setInfo("Deleted.");
      setSelectedCategoryIds(new Set());
      setCategorySelectMode(false);
      await load();
    } catch {
      setError("Network error.");
    } finally {
      setBulkDeleting(false);
    }
  }

  async function saveProfile() {
    setSavingProfile(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: profileDisplayName.trim() || null,
        }),
      });
      const payload = (await res.json()) as {
        error?: string;
        displayName?: string | null;
        avatarUrl?: string | null;
      };
      if (!res.ok) {
        setError(payload.error ?? "Could not save.");
        return;
      }
      setProfileDisplayName(payload.displayName ?? "");
      if (payload.avatarUrl !== undefined) setProfileAvatarUrl(payload.avatarUrl ?? "");
      setInfo("Saved.");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function onAvatarSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setAvatarBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      const payload = (await res.json()) as { error?: string; avatarUrl?: string };
      if (!res.ok) {
        setError(payload.error ?? "Upload failed.");
        return;
      }
      setProfileAvatarUrl(payload.avatarUrl ?? "");
      setInfo("Photo updated.");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar() {
    setAvatarBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(payload.error ?? "Could not remove.");
        return;
      }
      setProfileAvatarUrl("");
      setInfo("Photo removed.");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setAvatarBusy(false);
    }
  }

  function categoryRow(c: CategoryItem, showCheckboxes: boolean) {
    return (
      <div
        key={c.id}
        className="flex flex-col gap-3 rounded-2xl border border-rose-100/80 bg-white/75 p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex min-w-0 items-center gap-3 sm:max-w-[40%]">
          {showCheckboxes ? (
            <input
              type="checkbox"
              checked={selectedCategoryIds.has(c.id)}
              onChange={() => toggleCategorySelect(c.id)}
              className="h-4 w-4 shrink-0 rounded border-rose-200/90 text-fuchsia-600 focus:ring-violet-300"
              aria-label={`Select ${c.name}`}
            />
          ) : null}
          <p className="text-sm font-semibold text-ink">{c.name}</p>
        </div>
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-2">
          <Input
            id={`limit-${c.name}`}
            placeholder="Cap (PKR)"
            inputMode="decimal"
            className="sm:max-w-[10rem]"
            value={limitDrafts[c.name] ?? ""}
            onChange={(e) =>
              setLimitDrafts((prev) => ({
                ...prev,
                [c.name]: e.target.value,
              }))
            }
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1"
              onClick={() => {
                void saveCategoryLimit(c.name);
              }}
              aria-label="Save limit"
            >
              <Check className="h-4 w-4" />
              <span className="sm:hidden">Save</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-rose-700 hover:bg-rose-50"
              onClick={() => void deleteCategory(c.id)}
              aria-label="Delete category"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" />

      {error ? (
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/70 px-4 py-3 text-sm font-medium text-rose-900">
          {error}
        </div>
      ) : null}
      {info ? (
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3 text-sm font-medium text-emerald-900">
          {info}
        </div>
      ) : null}

      <section id="profile" className="scroll-mt-28 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/45">Profile</h2>
        <Card variant="quiet" className="p-5 sm:p-6">
          {profileLoading ? (
            <div className="h-24 animate-pulse rounded-2xl bg-white/50" />
          ) : (
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <div
                    className={cn(
                      "grid h-20 w-20 place-items-center overflow-hidden rounded-2xl ring-2 ring-white shadow-md",
                      profileAvatarUrl
                        ? "bg-white"
                        : "bg-gradient-to-br from-rose-300/90 via-fuchsia-300/80 to-violet-300/90",
                    )}
                  >
                    {profileAvatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profileAvatarUrl}
                        alt=""
                        width={80}
                        height={80}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-bold text-white">
                        {(profileDisplayName.trim() || "?").slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={onAvatarSelected}
                  />
                  <button
                    type="button"
                    disabled={avatarBusy}
                    onClick={() => fileRef.current?.click()}
                    className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-xl bg-white text-ink shadow-md ring-1 ring-rose-100/90 transition hover:bg-rose-50 disabled:opacity-50"
                    aria-label="Upload photo"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
                {profileAvatarUrl ? (
                  <button
                    type="button"
                    disabled={avatarBusy}
                    onClick={() => void removeAvatar()}
                    className="text-xs font-medium text-ink/55 hover:text-rose-700"
                  >
                    Remove photo
                  </button>
                ) : null}
              </div>

              <div className="min-w-0 flex-1 space-y-4">
                <Input
                  id="profileDisplayName"
                  label="Name"
                  placeholder="Your name"
                  value={profileDisplayName}
                  onChange={(e) => setProfileDisplayName(e.target.value)}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">Theme</p>
                  <div className="flex gap-2">
                    {(["blush", "lavender", "beige"] as ThemeMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setTheme(mode)}
                        aria-label={mode}
                        title={mode}
                        className={cn(
                          "h-9 w-9 rounded-xl ring-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
                          mode === "blush" && "bg-gradient-to-br from-rose-300 to-fuchsia-300",
                          mode === "lavender" && "bg-gradient-to-br from-violet-300 to-indigo-300",
                          mode === "beige" && "bg-gradient-to-br from-amber-100 to-rose-100",
                          theme === mode ? "ring-fuchsia-400" : "ring-transparent opacity-80 hover:opacity-100",
                        )}
                      />
                    ))}
                  </div>
                </div>
                <Button type="button" onClick={() => void saveProfile()} disabled={savingProfile}>
                  {savingProfile ? "…" : "Save"}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </section>

      <FamilySection />

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/45">Budget</h2>
        <Card variant="quiet" className="p-5 sm:p-6">
          <div className="flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Input
                id="monthlyLimit"
                label="Monthly limit"
                placeholder="0"
                inputMode="decimal"
                value={limitInput}
                onChange={(e) => setLimitInput(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-full shrink-0 sm:w-auto"
              onClick={() => void saveMonthlyLimit()}
              disabled={savingLimit}
            >
              {savingLimit ? "…" : "Save"}
            </Button>
          </div>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/45">Categories</h2>
        <Card variant="quiet" className="p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Input
                id="newCategory"
                label="New category"
                placeholder="Name"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
            </div>
            <Button type="button" className="w-full shrink-0 sm:w-auto" onClick={() => void addCategory()}>
              Add
            </Button>
          </div>

          <div className="mt-8 space-y-4">
            {loading ? (
              <div className="rounded-2xl bg-white/50 py-10 text-center text-sm text-ink/50">…</div>
            ) : sortedCategories.length ? (
              <>
                {!categorySelectMode ? (
                  <div className="flex flex-wrap items-center justify-start gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setCategorySelectMode(true)}
                    >
                      Select
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-ink/70"
                        onClick={selectAllCategories}
                        disabled={bulkDeleting}
                      >
                        Select all
                      </Button>
                      {selectedCategoryIds.size > 0 ? (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-ink/70"
                            onClick={clearCategorySelection}
                            disabled={bulkDeleting}
                          >
                            Clear
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => void bulkDeleteCategories()}
                            disabled={bulkDeleting}
                          >
                            {bulkDeleting ? "…" : `Delete (${selectedCategoryIds.size})`}
                          </Button>
                        </>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-ink/70"
                      onClick={exitCategorySelectMode}
                      disabled={bulkDeleting}
                    >
                      Done
                    </Button>
                  </div>
                )}
                <div className="space-y-2">
                  {sortedCategories.map((c) => categoryRow(c, categorySelectMode))}
                </div>
              </>
            ) : (
              <p className="rounded-2xl border border-rose-100/80 bg-white/50 py-6 text-center text-sm text-ink/45">
                Add your first category above
              </p>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
