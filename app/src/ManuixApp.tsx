"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Archive,
  BarChart3,
  Boxes,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Command,
  Copy,
  Download,
  Grid2X2,
  ImageOff,
  Inbox,
  LayoutDashboard,
  List,
  MapPin,
  Menu,
  Moon,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { collectionItemLabel, findCollectionMatches, normalizeCollectionName } from "./collections";
import { countInventoryItems, filterItems, formatCurrency, inventoryMetrics } from "./inventory";
import { inventoryRepository } from "./repository";
import type { Catalog, CollectionSummary, InboxPhoto, LocationSummary } from "./repository";
import type { InventoryItem, ItemDraft } from "./types";

type Section = "Dashboard" | "Inventory" | "Locations" | "Collections" | "Inbox" | "Reports" | "Settings";

const nav = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Inventory", icon: Package },
  { label: "Locations", icon: MapPin },
  { label: "Collections", icon: Boxes },
  { label: "Inbox", icon: Inbox },
  { label: "Reports", icon: BarChart3 },
  { label: "Settings", icon: Settings },
] as const;

const itemSchema = z.object({
  name: z.string().min(2, "Give this item a clear name"),
  category: z.string().min(1, "Choose a category"),
  location: z.string().min(1, "Add its permanent location"),
  collectionsText: z.string(),
  tagsText: z.string(),
  notes: z.string(),
  purchaseDate: z.string(),
  purchasePriceText: z.string(),
  estimatedValueText: z.string(),
  manufacturer: z.string(),
  model: z.string(),
  serialNumber: z.string(),
  condition: z.enum(["New", "Excellent", "Good", "Fair", "Poor"]),
});

type ItemFormValues = z.infer<typeof itemSchema>;

const EMPTY_FORM: ItemFormValues = {
  name: "",
  category: "",
  location: "",
  collectionsText: "",
  tagsText: "",
  notes: "",
  purchaseDate: "",
  purchasePriceText: "",
  estimatedValueText: "",
  manufacturer: "",
  model: "",
  serialNumber: "",
  condition: "Good",
};

const DEFAULT_CATEGORIES = ["Electronics", "Cameras", "Outdoor", "Tools", "Kitchen", "Other"];

function itemToForm(item: InventoryItem): ItemFormValues {
  return {
    name: item.name,
    category: item.category,
    location: item.location,
    collectionsText: item.collections.join(", "),
    tagsText: item.tags.join(", "),
    notes: item.notes,
    purchaseDate: item.purchaseDate,
    purchasePriceText: item.purchasePrice?.toString() ?? "",
    estimatedValueText: item.estimatedValue?.toString() ?? "",
    manufacturer: item.manufacturer,
    model: item.model,
    serialNumber: item.serialNumber,
    condition: item.condition,
  };
}

function splitList(value: string) {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

function getVisualSymbol(visual: string) {
  return {
    camera: "◉", stove: "♨", headphones: "◡", tools: "✣",
    binoculars: "∞", drill: "⌁", moka: "♜", ssd: "▰",
  }[visual] ?? "◇";
}

export function ManuixApp() {
  const [section, setSection] = useState<Section>("Dashboard");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [catalog, setCatalog] = useState<Catalog>({ locations: [], collections: [], inbox: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState<string | undefined>();
  const [collectionFilter, setCollectionFilter] = useState<string | undefined>();
  const [category, setCategory] = useState("All");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [editing, setEditing] = useState<InventoryItem | "new" | null>(null);
  const [newItemPhoto, setNewItemPhoto] = useState<InboxPhoto | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [toast, setToast] = useState("");

  const loadItems = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      const [storedItems, storedCatalog] = await Promise.all([
        inventoryRepository.list(),
        inventoryRepository.catalog(),
      ]);
      setItems(storedItems);
      setCatalog(storedCatalog);
    } catch {
      setError("Manuix couldn’t open your local inventory.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([inventoryRepository.list(), inventoryRepository.catalog()])
      .then(([storedItems, storedCatalog]) => {
        setItems(storedItems);
        setCatalog(storedCatalog);
      })
      .catch(() => setError("Manuix couldn’t open your local inventory."))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.querySelector<HTMLInputElement>("#global-search")?.focus();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setNewItemPhoto(null);
        setEditing("new");
      }
      if (event.key === "Escape") {
        setEditing(null);
        setSelected(null);
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const metrics = useMemo(() => inventoryMetrics(items), [items]);
  const categories = useMemo(
    () => ["All", ...new Set([...DEFAULT_CATEGORIES, ...items.map((item) => item.category).filter(Boolean)])],
    [items],
  );
  const filtered = useMemo(() => filterItems(items, query, { category, locationPath: locationFilter, collectionName: collectionFilter }), [items, query, category, locationFilter, collectionFilter]);

  function startNewItem(photo?: InboxPhoto) {
    setNewItemPhoto(photo ?? null);
    setEditing("new");
  }

  async function saveItem(draft: ItemDraft, existing?: InventoryItem) {
    const now = new Date().toISOString();
    const item: InventoryItem = {
      ...draft,
      id: existing?.id ?? crypto.randomUUID(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await inventoryRepository.save(item);
    setItems((current) => [item, ...current.filter((candidate) => candidate.id !== item.id)]);
    setCatalog(await inventoryRepository.catalog());
    setSelected(item);
    setEditing(null);
    setNewItemPhoto(null);
    setToast(existing ? "Changes saved" : "Item added to inventory");
  }

  async function duplicateItem(item: InventoryItem) {
    const now = new Date().toISOString();
    const copy = { ...item, id: crypto.randomUUID(), name: `${item.name} copy`, photo: null, createdAt: now, updatedAt: now };
    await inventoryRepository.save(copy);
    setItems((current) => [copy, ...current]);
    setCatalog(await inventoryRepository.catalog());
    setSelected(copy);
    setToast("Item duplicated");
  }

  async function deleteItem(item: InventoryItem) {
    if (!window.confirm(`Remove “${item.name}” from your inventory?`)) return;
    await inventoryRepository.remove(item.id);
    setItems((current) => current.filter((candidate) => candidate.id !== item.id));
    setCatalog(await inventoryRepository.catalog());
    setSelected(null);
    setToast("Item removed");
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark"><span>M</span></div>
          <div><strong>Manuix</strong><small>Personal inventory</small></div>
          <button className="icon-button mobile-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={19} /></button>
        </div>
        <nav aria-label="Main navigation">
          <p className="nav-eyebrow">Workspace</p>
          {nav.slice(0, 5).map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={section === label ? "nav-item active" : "nav-item"}
              onClick={() => { setSection(label); setSelected(null); setMobileNav(false); }}
            >
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {label === "Inbox" && catalog.inbox.length > 0 && <em>{catalog.inbox.length}</em>}
            </button>
          ))}
          <p className="nav-eyebrow">Insights</p>
          {nav.slice(5).map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={section === label ? "nav-item active" : "nav-item"}
              onClick={() => { setSection(label); setSelected(null); setMobileNav(false); }}
            >
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="privacy-card">
            <div className="privacy-icon"><Check size={14} /></div>
            <div><strong>Private by design</strong><span>Your inventory stays on this device.</span></div>
          </div>
          <button className="profile">
            <span className="avatar">MC</span><span><strong>My collection</strong><small>Local workspace</small></span><MoreHorizontal size={18} />
          </button>
        </div>
      </aside>

      {mobileNav && <button className="nav-backdrop" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}

      <main className="main">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <div className="global-search">
            <Search size={18} />
            <input
              id="global-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search everything…"
              onFocus={() => section !== "Inventory" && setSection("Inventory")}
            />
            <span><Command size={12} /> K</span>
          </div>
          <div className="top-actions">
            <button className="icon-button" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label="Toggle theme">
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button className="primary-button compact" onClick={() => startNewItem()}><Plus size={18} /> Add item</button>
          </div>
        </header>

        <div className="content">
          {loading ? <LoadingState /> : error ? <ErrorState message={error} retry={loadItems} /> : (
            <>
              {section === "Dashboard" && (
                <Dashboard
                  items={items}
                  locations={catalog.locations}
                  collections={catalog.collections}
                  metrics={metrics}
                  onBrowse={() => setSection("Inventory")}
                  onSelect={setSelected}
                  onAdd={() => startNewItem()}
                  onSearch={(value) => { setQuery(value); setLocationFilter(undefined); setCollectionFilter(undefined); setSection("Inventory"); }}
                />
              )}
              {section === "Inventory" && (
                <Inventory
                  items={filtered}
                  allCount={items.length}
                  categories={categories}
                  category={category}
                  setCategory={setCategory}
                  query={query}
                  setQuery={(value) => { setQuery(value); setLocationFilter(undefined); setCollectionFilter(undefined); }}
                  activeScope={locationFilter ?? collectionFilter}
                  clearScope={() => { setLocationFilter(undefined); setCollectionFilter(undefined); }}
                  view={view}
                  setView={setView}
                  onSelect={setSelected}
                  onAdd={() => startNewItem()}
                />
              )}
              {section === "Locations" && <LocationsView locations={catalog.locations} itemCount={countInventoryItems(items)} onBrowse={(locationPath) => { setQuery(""); setCategory("All"); setCollectionFilter(undefined); setLocationFilter(locationPath); setSection("Inventory"); }} />}
              {section === "Collections" && <CollectionsView collections={catalog.collections} onBrowse={(collection) => { setQuery(""); setCategory("All"); setLocationFilter(undefined); setCollectionFilter(collection); setSection("Inventory"); }} />}
              {section === "Inbox" && <InboxView photos={catalog.inbox} onCreate={startNewItem} onImported={async () => setCatalog(await inventoryRepository.catalog())} />}
              {section === "Reports" && <ReportsView items={items} metrics={metrics} />}
              {section === "Settings" && <SettingsView theme={theme} setTheme={setTheme} onReset={async () => { await inventoryRepository.reset(); await loadItems(); setToast("Sample inventory restored"); }} />}
            </>
          )}
        </div>
      </main>

      {selected && (
        <ItemInspector
          item={selected}
          onClose={() => setSelected(null)}
          onEdit={() => setEditing(selected)}
          onDuplicate={() => void duplicateItem(selected)}
          onDelete={() => void deleteItem(selected)}
        />
      )}
      {editing && (
        <ItemModal
          item={editing === "new" ? undefined : editing}
          categories={categories.slice(1)}
          locations={catalog.locations}
          collections={catalog.collections}
          onCollectionsChanged={async () => setCatalog(await inventoryRepository.catalog())}
          initialPhoto={editing === "new" ? newItemPhoto : null}
          onClose={() => { setEditing(null); setNewItemPhoto(null); }}
          onSave={(draft) => void saveItem(draft, editing === "new" ? undefined : editing)}
        />
      )}
      {toast && <div className="toast"><Check size={16} /> {toast}</div>}
    </div>
  );
}

function PageHeading({ eyebrow, title, copy, actions }: { eyebrow?: string; title: string; copy: string; actions?: React.ReactNode }) {
  return (
    <div className="page-heading">
      <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1><p>{copy}</p></div>
      {actions && <div className="heading-actions">{actions}</div>}
    </div>
  );
}

function Dashboard({ items, locations, collections, metrics, onBrowse, onSelect, onAdd, onSearch }: {
  items: InventoryItem[];
  locations: LocationSummary[];
  collections: CollectionSummary[];
  metrics: ReturnType<typeof inventoryMetrics>;
  onBrowse: () => void;
  onSelect: (item: InventoryItem) => void;
  onAdd: () => void;
  onSearch: (value: string) => void;
}) {
  const [quickSearch, setQuickSearch] = useState("");
  return (
    <div className="page dashboard-page">
      <div className="welcome">
        <div>
          <p className="eyebrow">Sunday, July 27</p>
          <h1>Good evening.</h1>
          <p>Everything you own, thoughtfully organized.</p>
        </div>
        <button className="primary-button" onClick={onAdd}><Plus size={18} /> Add something</button>
      </div>
      <form className="hero-search" onSubmit={(event) => { event.preventDefault(); onSearch(quickSearch); }}>
        <Search size={21} />
        <input value={quickSearch} onChange={(event) => setQuickSearch(event.target.value)} placeholder="Find an item, location, collection, or tag" />
        <button type="submit">Search</button>
      </form>
      <div className="metric-grid">
        <Metric icon={<Package />} label="Total items" value={metrics.total.toString()} note="+3 this month" tone="green" />
        <Metric icon={<CircleDollarSign />} label="Estimated value" value={formatCurrency(metrics.value)} note="Across valued items" tone="blue" />
        <Metric icon={<ImageOff />} label="Missing photos" value={metrics.missingPhotos.toString()} note="Ready for review" tone="sand" />
        <Metric icon={<Tag />} label="Missing values" value={metrics.missingValues.toString()} note="Complete your records" tone="coral" />
      </div>
      <section className="section-block">
        <div className="section-title"><div><h2>Recently added</h2><p>The newest objects in your inventory</p></div><button className="text-button" onClick={onBrowse}>View all <ChevronRight size={16} /></button></div>
        <div className="recent-grid">{items.slice(0, 4).map((item) => <ItemCard key={item.id} item={item} onClick={() => onSelect(item)} />)}</div>
      </section>
      <div className="dashboard-columns">
        <BrowsePanel title="Browse by location" icon={<MapPin size={19} />} items={locations.map((place) => ({ title: place.name, value: place.path, meta: collectionItemLabel(place.count), color: place.color }))} onBrowse={(value) => { onSearch(value); }} />
        <BrowsePanel title="Browse by collection" icon={<Boxes size={19} />} items={collections.map((group) => ({ title: group.name, meta: collectionItemLabel(group.count), color: group.color }))} onBrowse={onSearch} />
      </div>
    </div>
  );
}

function Metric({ icon, label, value, note, tone }: { icon: React.ReactNode; label: string; value: string; note: string; tone: string }) {
  return <article className="metric-card"><div className={`metric-icon ${tone}`}>{icon}</div><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function BrowsePanel({ title, icon, items, onBrowse }: { title: string; icon: React.ReactNode; items: Array<{ title: string; value?: string; meta: string; color: string }>; onBrowse: (value: string) => void }) {
  return (
    <section className="browse-panel">
      <div className="panel-heading"><span>{icon}</span><h2>{title}</h2><button aria-label={`Open ${title}`}><MoreHorizontal size={18} /></button></div>
      {items.map((item) => <button className="browse-row" key={item.title} onClick={() => onBrowse(item.value ?? item.title)}><span className={`location-swatch ${item.color}`} /><span><strong>{item.title}</strong><small>{item.meta}</small></span><ChevronRight size={16} /></button>)}
    </section>
  );
}

function Inventory({ items, allCount, categories, category, setCategory, query, setQuery, activeScope, clearScope, view, setView, onSelect, onAdd }: {
  items: InventoryItem[]; allCount: number; categories: string[]; category: string; setCategory: (category: string) => void;
  query: string; setQuery: (query: string) => void; activeScope?: string; clearScope: () => void; view: "grid" | "list"; setView: (view: "grid" | "list") => void;
  onSelect: (item: InventoryItem) => void; onAdd: () => void;
}) {
  return (
    <div className="page">
      <PageHeading eyebrow="Your things" title="Inventory" copy={`${allCount} objects, each with a place and a story.`} actions={<button className="primary-button" onClick={onAdd}><Plus size={18} /> Add item</button>} />
      {activeScope && <div className="calm-callout"><Search size={18} /><div><strong>Showing {activeScope}</strong><p>{items.length} matching {items.length === 1 ? "item" : "items"}.</p></div><button type="button" className="text-button" onClick={clearScope}>Clear</button></div>}
      <div className="inventory-toolbar">
        <div className="local-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search inventory" />{query && <button onClick={() => setQuery("")}><X size={14} /></button>}</div>
        <button className="filter-button"><SlidersHorizontal size={16} /> Filter <span>1</span></button>
        <div className="view-toggle"><button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")} aria-label="Grid view"><Grid2X2 size={17} /></button><button className={view === "list" ? "active" : ""} onClick={() => setView("list")} aria-label="List view"><List size={18} /></button></div>
      </div>
      <div className="category-tabs">{categories.map((entry) => <button key={entry} className={category === entry ? "active" : ""} onClick={() => setCategory(entry)}>{entry}</button>)}</div>
      {items.length ? (
        view === "grid" ? <div className="inventory-grid">{items.map((item) => <ItemCard key={item.id} item={item} onClick={() => onSelect(item)} />)}</div>
          : <div className="inventory-list"><div className="list-head"><span>Item</span><span>Location</span><span>Condition</span><span>Value</span></div>{items.map((item) => <button key={item.id} className="list-row" onClick={() => onSelect(item)}><Visual item={item} compact /><span className="list-name"><strong>{item.name}</strong><small>{item.category}</small></span><span className="list-location"><MapPin size={14} />{item.location.split(" / ").slice(-2).join(" / ")}</span><span><em className={`condition ${item.condition.toLowerCase()}`}>{item.condition}</em></span><strong>{formatCurrency(item.estimatedValue)}</strong></button>)}</div>
      ) : <EmptyInventory query={query} onAdd={onAdd} />}
    </div>
  );
}

function Visual({ item, compact = false }: { item: InventoryItem; compact?: boolean }) {
  return (
    <div className={`item-visual visual-${item.visual} ${compact ? "compact" : ""}`}>
      {item.photo ? <img src={item.photo} alt="" /> : <><span className="visual-glow" /><b>{getVisualSymbol(item.visual)}</b><i>{item.manufacturer || item.category}</i></>}
    </div>
  );
}

function ItemCard({ item, onClick }: { item: InventoryItem; onClick: () => void }) {
  return (
    <button className="item-card" onClick={onClick}>
      <Visual item={item} />
      <div className="item-card-copy"><div><strong>{item.name}</strong><span>{formatCurrency(item.estimatedValue)}</span></div><p><MapPin size={13} /> {item.location.split(" / ").slice(-2).join(" / ")}</p>{item.collections[0] && <em>{item.collections[0]}</em>}</div>
    </button>
  );
}

function EmptyInventory({ query, onAdd }: { query: string; onAdd: () => void }) {
  return <div className="empty-state"><div><Package size={28} /></div><h2>{query ? "Nothing matches that search" : "Your first item starts here"}</h2><p>{query ? "Try a different name, tag, place, or category." : "Add an object you care about and Manuix will help you remember every detail."}</p>{!query && <button className="primary-button" onClick={onAdd}><Plus size={17} /> Add your first item</button>}</div>;
}

function LocationsView({ locations, itemCount, onBrowse }: { locations: LocationSummary[]; itemCount: number; onBrowse: (value: string) => void }) {
  return (
    <div className="page">
      <PageHeading eyebrow="Permanent places" title="Locations" copy="A clear map of where everything lives." />
      <div className="location-hero"><div><MapPin size={24} /><span><small>Local inventory</small><strong>{itemCount} inventoried objects</strong></span></div><div className="location-path">{locations.slice(0, 4).map((place, index) => <span key={place.path}>{index > 0 && <i />}{place.name}</span>)}</div></div>
      <div className="location-grid">{locations.map((place, index) => <button className="location-card" onClick={() => onBrowse(place.path)} key={place.path}><div className={`location-art ${place.color}`}><span>{index === 0 ? "⌂" : index === 1 ? "▦" : index === 2 ? "▥" : "◫"}</span></div><div><span><strong>{place.name}</strong><small>{place.path}</small></span><em>{place.count}</em></div></button>)}</div>
    </div>
  );
}

function CollectionsView({ collections, onBrowse }: { collections: CollectionSummary[]; onBrowse: (value: string) => void }) {
  return (
    <div className="page">
      <PageHeading eyebrow="Organized by purpose" title="Collections" copy="Bring related items together without changing where they live." actions={<button className="secondary-button"><Plus size={17} /> New collection</button>} />
      <div className="collection-grid">{collections.map((collection) => <button className="collection-card" key={collection.name} onClick={() => onBrowse(collection.name)}><div className="collection-cover" style={{ background: collection.color }}><span>{collection.icon}</span><i /><i /></div><div><strong>{collection.name}</strong><small>{collectionItemLabel(collection.count)}</small></div><ChevronRight size={17} /></button>)}</div>
      <div className="calm-callout"><Sparkles size={19} /><div><strong>Collections are flexible</strong><p>An item can belong to several collections while keeping one permanent location.</p></div></div>
    </div>
  );
}

function InboxView({ photos, onCreate, onImported }: { photos: InboxPhoto[]; onCreate: (photo?: InboxPhoto) => void; onImported: () => Promise<void> }) {
  const [importing, setImporting] = useState(false);
  async function importPhotos(files: FileList | null) {
    if (!files?.length) return;
    setImporting(true);
    try {
      for (const file of Array.from(files)) await inventoryRepository.upload(file, "inbox");
      await onImported();
    } finally {
      setImporting(false);
    }
  }
  return (
    <div className="page">
      <PageHeading eyebrow="Review & organize" title="Inbox" copy="Turn loose photos into complete inventory records." actions={<label className="primary-button"><Upload size={17} /> {importing ? "Importing…" : "Import photos"}<input hidden multiple type="file" accept="image/*" onChange={(event) => void importPhotos(event.target.files)} /></label>} />
      <div className="inbox-summary"><div><Inbox size={21} /><span><strong>{photos.length} {photos.length === 1 ? "photo" : "photos"} to review</strong><small>Originals are stored in the local Manuix data folder</small></span></div>{photos.length > 0 && <button>Review all <ChevronRight size={16} /></button>}</div>
      {photos.length > 0 ? <div className="inbox-grid">{photos.map((photo) => <article className="inbox-card" key={photo.id}><div className="inbox-image"><PhotoPreview photo={photo} /></div><div><span><strong>{photo.name}</strong><small>{new Date(photo.createdAt).toLocaleString()}</small></span><button onClick={() => onCreate(photo)}><Plus size={15} /> Create item</button></div></article>)}</div> : <div className="empty-state"><div><Inbox size={28} /></div><h2>Your inbox is clear</h2><p>Import photos when you are ready to turn them into inventory records.</p></div>}
      <label className="drop-zone"><Upload size={24} /><strong>{importing ? "Saving photos locally…" : "Choose images to add to Inbox"}</strong><span>JPEG, PNG, WebP, GIF, HEIC · Up to 20 MB each</span><input hidden multiple type="file" accept="image/*" onChange={(event) => void importPhotos(event.target.files)} /></label>
    </div>
  );
}

function PhotoPreview({ photo }: { photo: InboxPhoto }) {
  if (photo.mimeType === "image/heic" || photo.mimeType === "image/heif") {
    return <><ImageOff size={24} /><span>HEIC original saved locally</span></>;
  }
  return <img src={photo.url} alt="" />;
}

function ReportsView({ items, metrics }: { items: InventoryItem[]; metrics: ReturnType<typeof inventoryMetrics> }) {
  const categoryValues = [...new Set(items.map((item) => item.category))].map((name) => ({ name, value: items.filter((item) => item.category === name).reduce((sum, item) => sum + (item.estimatedValue ?? 0), 0) })).sort((a, b) => b.value - a.value);
  const max = Math.max(...categoryValues.map((entry) => entry.value));
  return (
    <div className="page">
      <PageHeading eyebrow="Inventory health" title="Reports" copy="A useful overview—without sending your data anywhere." />
      <div className="report-overview"><div><small>Total known value</small><strong>{formatCurrency(metrics.value)}</strong><span>Across {items.length - metrics.missingValues} valued objects</span></div><div className="donut" style={{ "--progress": `${Math.round(((items.length - metrics.missingValues) / items.length) * 100)}%` } as React.CSSProperties}><span><strong>{Math.round(((items.length - metrics.missingValues) / items.length) * 100)}%</strong><small>complete</small></span></div></div>
      <div className="report-grid">
        <section className="report-card"><div className="section-title"><div><h2>Value by category</h2><p>Estimated replacement value</p></div></div><div className="bar-chart">{categoryValues.map((entry) => <div key={entry.name}><span>{entry.name}</span><div><i style={{ width: `${(entry.value / max) * 100}%` }} /></div><strong>{formatCurrency(entry.value)}</strong></div>)}</div></section>
        <section className="report-card"><div className="section-title"><div><h2>Needs attention</h2><p>Small steps toward complete records</p></div></div><button className="attention-row"><span className="metric-icon sand"><ImageOff size={18} /></span><span><strong>{metrics.missingPhotos} missing photos</strong><small>Add a visual reference</small></span><ChevronRight size={17} /></button><button className="attention-row"><span className="metric-icon coral"><CircleDollarSign size={18} /></span><span><strong>{metrics.missingValues} missing values</strong><small>Improve your totals</small></span><ChevronRight size={17} /></button></section>
      </div>
    </div>
  );
}

function SettingsView({ theme, setTheme, onReset }: { theme: "light" | "dark"; setTheme: (theme: "light" | "dark") => void; onReset: () => void }) {
  return (
    <div className="page settings-page">
      <PageHeading eyebrow="Your workspace" title="Settings" copy="Keep Manuix comfortable, private, and yours." />
      <section className="settings-card"><h2>Appearance</h2><p>Choose how Manuix looks on this device.</p><div className="theme-choice"><button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}><span className="theme-preview light-preview"><i /><i /><i /></span><span><Sun size={16} /> Light</span>{theme === "light" && <Check size={16} />}</button><button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}><span className="theme-preview dark-preview"><i /><i /><i /></span><span><Moon size={16} /> Dark</span>{theme === "dark" && <Check size={16} />}</button></div></section>
      <section className="settings-card">
        <h2>Backup &amp; local data</h2>
        <p>Download one restorable archive containing a consistent copy of the SQLite database, every uploaded original in <code>uploads/</code>, and safe manual restore instructions.</p>
        <div className="setting-row"><span className="metric-icon green"><Archive size={18} /></span><span><strong>Project-local storage</strong><small>No account, cloud database, or network connection required</small></span><em>Healthy</em></div>
        <a className="backup-button" href="/api/backup"><Download size={16} /> Download complete backup</a>
        <p className="backup-note">Your browser saves the <code>.tar.gz</code> file in its normal Downloads folder. Export does not change or remove any inventory or photos. To restore, stop Manuix and follow the included <code>RESTORE.txt</code>; there is intentionally no automatic restore button.</p>
        <button className="danger-link" onClick={onReset}>Restore sample inventory</button>
      </section>
      <section className="settings-card shortcuts"><h2>Keyboard shortcuts</h2><div><span>Search anywhere</span><kbd>⌘ K</kbd></div><div><span>Add a new item</span><kbd>⌘ N</kbd></div><div><span>Close a panel</span><kbd>Esc</kbd></div></section>
    </div>
  );
}

function ItemInspector({ item, onClose, onEdit, onDuplicate, onDelete }: { item: InventoryItem; onClose: () => void; onEdit: () => void; onDuplicate: () => void; onDelete: () => void }) {
  return (
    <div className="inspector-layer">
      <button className="inspector-backdrop" onClick={onClose} aria-label="Close item details" />
      <aside className="inspector">
        <div className="inspector-top"><button className="icon-button" onClick={onClose}><X size={19} /></button><div><button className="secondary-button small" onClick={onDuplicate}><Copy size={15} /> Duplicate</button><button className="primary-button small" onClick={onEdit}>Edit item</button></div></div>
        <Visual item={item} />
        <div className="inspector-copy">
          <div className="inspector-title"><div><span>{item.category}</span><h2>{item.name}</h2><p>{item.manufacturer} {item.model}</p></div><button className="icon-button"><MoreHorizontal size={20} /></button></div>
          <div className="value-strip"><span><small>Estimated value</small><strong>{formatCurrency(item.estimatedValue)}</strong></span><span><small>Condition</small><em className={`condition ${item.condition.toLowerCase()}`}>{item.condition}</em></span></div>
          <InfoGroup title="Permanent location"><div className="place-detail"><span><MapPin size={18} /></span><div><strong>{item.location.split(" / ").slice(-1)}</strong><small>{item.location}</small></div></div></InfoGroup>
          <InfoGroup title="Collections & tags"><div className="chip-row">{item.collections.map((entry) => <em className="collection-chip" key={entry}><Boxes size={13} /> {entry}</em>)}{item.tags.map((entry) => <em className="tag-chip" key={entry}>#{entry}</em>)}{!item.collections.length && !item.tags.length && <small>Nothing added yet</small>}</div></InfoGroup>
          <InfoGroup title="Details"><dl className="detail-list"><div><dt>Manufacturer</dt><dd>{item.manufacturer || "—"}</dd></div><div><dt>Model</dt><dd>{item.model || "—"}</dd></div><div><dt>Serial number</dt><dd>{item.serialNumber || "—"}</dd></div><div><dt>Purchased</dt><dd>{item.purchaseDate || "—"}</dd></div><div><dt>Purchase price</dt><dd>{formatCurrency(item.purchasePrice)}</dd></div></dl></InfoGroup>
          <InfoGroup title="Notes"><p className="notes">{item.notes || "No notes for this item yet."}</p></InfoGroup>
          <div className="record-meta"><Clock3 size={14} /> Added {new Date(item.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
          <button className="delete-button" onClick={onDelete}><Trash2 size={16} /> Remove from inventory</button>
        </div>
      </aside>
    </div>
  );
}

function InfoGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="info-group"><h3>{title}</h3>{children}</section>;
}

function ItemModal({ item, initialPhoto, categories, locations, collections, onCollectionsChanged, onClose, onSave }: { item?: InventoryItem; initialPhoto?: InboxPhoto | null; categories: string[]; locations: LocationSummary[]; collections: CollectionSummary[]; onCollectionsChanged: () => Promise<void>; onClose: () => void; onSave: (draft: ItemDraft) => void }) {
  const { control, register, handleSubmit, formState: { errors, isSubmitting }, trigger } = useForm<ItemFormValues>({ resolver: zodResolver(itemSchema), defaultValues: item ? itemToForm(item) : EMPTY_FORM });
  const itemName = useWatch({ control, name: "name" });
  const [photo, setPhoto] = useState<string | null>(item?.photo ?? initialPhoto?.url ?? null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [formSection, setFormSection] = useState<"essential" | "details">("essential");
  const [collectionInput, setCollectionInput] = useState("");
  const [selectedCollections, setSelectedCollections] = useState<string[]>(item?.collections ?? []);

  function submit(values: ItemFormValues) {
    if (photoUploading) return;
    const parseNumber = (value: string) => value.trim() ? Number(value) : null;
    onSave({
      name: values.name,
      category: values.category.trim(),
      location: values.location.trim(),
      collections: selectedCollections,
      tags: splitList(values.tagsText),
      notes: values.notes,
      purchaseDate: values.purchaseDate,
      purchasePrice: parseNumber(values.purchasePriceText),
      estimatedValue: parseNumber(values.estimatedValueText),
      manufacturer: values.manufacturer,
      model: values.model,
      serialNumber: values.serialNumber,
      condition: values.condition,
      photo,
      visual: item?.visual ?? "ssd",
    });
  }

  async function handlePhoto(file?: File) {
    if (!file) return;
    setPhotoError("");
    setPhotoUploading(true);
    try {
      const uploaded = await inventoryRepository.upload(file);
      setPhoto(uploaded.url);
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Photo upload failed.");
    } finally {
      setPhotoUploading(false);
    }
  }

  return (
    <div className="modal-layer">
      <button className="modal-backdrop" onClick={onClose} aria-label="Close form" />
      <form className="item-modal" onSubmit={handleSubmit(submit)}>
        <div className="modal-header"><div><p className="eyebrow">{item ? "Update record" : "New inventory item"}</p><h2>{item ? `Edit ${item.name}` : "Add something you own"}</h2></div><button type="button" className="icon-button" onClick={onClose}><X size={19} /></button></div>
        <div className="form-progress"><button type="button" className={formSection === "essential" ? "active" : ""} onClick={() => setFormSection("essential")}><span>1</span> Essentials</button><i /><button type="button" className={formSection === "details" ? "active" : ""} onClick={() => setFormSection("details")}><span>2</span> Details</button></div>
        <div className="modal-body">
          {formSection === "essential" ? (
            <>
              <label className={`photo-drop ${photo ? "has-photo" : ""}`}>
                {photo ? <img src={photo} alt="Selected item" /> : <><Upload size={22} /><strong>{photoUploading ? "Saving photo locally…" : "Add a photo"}</strong><span>{photoError || "Choose an original from this device"}</span></>}
                <input disabled={photoUploading} type="file" accept="image/*" onChange={(event) => void handlePhoto(event.target.files?.[0])} />
              </label>
              <div className="field-grid">
                <Field label="Item name" error={errors.name?.message} wide><input autoFocus placeholder="e.g. Film camera" {...register("name")} /></Field>
                <Field label="Category" error={errors.category?.message} hint="Choose a suggestion or type a new category"><input list="manuix-category-options" placeholder="Choose or type a category" {...register("category")} /><datalist id="manuix-category-options">{categories.map((entry) => <option value={entry} key={entry} />)}</datalist></Field>
                <Field label="Condition"><select {...register("condition")}><option>New</option><option>Excellent</option><option>Good</option><option>Fair</option><option>Poor</option></select></Field>
                <Field label="Permanent location" error={errors.location?.message} wide hint="Choose an existing full path or type a new one"><div className="input-icon"><MapPin size={16} /><input list="manuix-location-options" placeholder="Home / Room / Shelf" {...register("location")} /><datalist id="manuix-location-options">{locations.map((entry) => <option value={entry.path} key={entry.path}>{entry.path}</option>)}</datalist></div></Field>
                <CollectionSelector collections={collections} selected={selectedCollections} input={collectionInput} setInput={setCollectionInput} setSelected={setSelectedCollections} onCollectionsChanged={onCollectionsChanged} />
                <Field label="Tags" wide hint="Separate several with commas"><input placeholder="vintage, favorite" {...register("tagsText")} /></Field>
              </div>
            </>
          ) : (
            <div className="field-grid">
              <Field label="Manufacturer"><input placeholder="Brand or maker" {...register("manufacturer")} /></Field>
              <Field label="Model"><input placeholder="Model name or number" {...register("model")} /></Field>
              <Field label="Serial number" wide><input placeholder="Optional" {...register("serialNumber")} /></Field>
              <Field label="Purchase date"><input type="date" {...register("purchaseDate")} /></Field>
              <Field label="Purchase price"><div className="money-input"><span>$</span><input inputMode="decimal" placeholder="0" {...register("purchasePriceText")} /></div></Field>
              <Field label="Estimated value" wide><div className="money-input"><span>$</span><input inputMode="decimal" placeholder="0" {...register("estimatedValueText")} /></div></Field>
              <Field label="Notes" wide><textarea rows={4} placeholder="History, accessories, reminders…" {...register("notes")} /></Field>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <span>{itemName ? `Adding “${itemName}”` : "Required fields are marked"}</span>
          <div>
            {formSection === "details" && <button type="button" className="secondary-button" onClick={() => setFormSection("essential")}>Back</button>}
            {formSection === "essential" ? <button type="button" className="primary-button" onClick={async () => { if (await trigger(["name", "category", "location"])) setFormSection("details"); }}>Continue <ChevronRight size={17} /></button>
              : <button className="primary-button" disabled={isSubmitting || photoUploading}>{photoUploading ? "Saving photo…" : item ? "Save changes" : "Add to inventory"}</button>}
          </div>
        </div>
      </form>
    </div>
  );
}

function CollectionSelector({ collections, selected, input, setInput, setSelected, onCollectionsChanged }: { collections: CollectionSummary[]; selected: string[]; input: string; setInput: (value: string) => void; setSelected: React.Dispatch<React.SetStateAction<string[]>>; onCollectionsChanged: () => Promise<void> }) {
  const matches = findCollectionMatches(collections, input);
  const searchable = collections.filter((collection) => normalizeCollectionName(collection.name).includes(normalizeCollectionName(input))).slice(0, 6);
  const suggestions = input ? (matches.exact ? [matches.exact, ...matches.similar] : [...matches.similar, ...searchable]) : collections.slice(0, 6);
  const uniqueSuggestions = suggestions.filter((collection, index, all) => all.findIndex((entry) => entry.name === collection.name) === index);

  async function createNewCollection() {
    const name = input.trim();
    if (!name) return;
    if (matches.exact) {
      setSelected((current) => current.includes(matches.exact!.name) ? current : [...current, matches.exact!.name]);
      setInput("");
      return;
    }
    const warning = matches.similar.length ? `Similar collections exist: ${matches.similar.map((collection) => collection.name).join(", ")}. Create “${name}” anyway?` : `Create new collection “${name}”?`;
    if (!window.confirm(warning)) return;
    await inventoryRepository.createCollection(name);
    await onCollectionsChanged();
    setSelected((current) => current.includes(name) ? current : [...current, name]);
    setInput("");
  }

  return <div className="field wide collection-selector"><span>Collections</span><div className="chip-row">{selected.map((entry) => <button type="button" className="collection-chip" key={entry} onClick={() => setSelected((current) => current.filter((name) => name !== entry))}>{entry} <X size={12} /></button>)}</div><div className="input-icon"><Boxes size={16} /><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Search collections" /></div><div className="collection-suggestions">{uniqueSuggestions.map((collection) => <button type="button" key={collection.name} onClick={() => { setSelected((current) => current.includes(collection.name) ? current : [...current, collection.name]); setInput(""); }}><strong>{collection.name}</strong><small>{collectionItemLabel(collection.count)}</small></button>)}</div>{input && !matches.exact && <button type="button" className="secondary-button small" onClick={() => void createNewCollection()}>Create new collection</button>}{matches.exact && <small>Exact match found. Select “{matches.exact.name}” instead of creating a duplicate.</small>}{matches.similar.length > 0 && <small>Possible spelling variations: {matches.similar.map((collection) => collection.name).join(", ")}</small>}</div>;
}

function Field({ label, error, hint, wide, children }: { label: string; error?: string; hint?: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={`field ${wide ? "wide" : ""}`}><span>{label}{error && <em>{error}</em>}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function LoadingState() {
  return <div className="loading-page"><div className="loading-head"><i /><i /></div><div className="loading-metrics">{[1,2,3,4].map((n) => <i key={n} />)}</div><div className="loading-grid">{[1,2,3,4].map((n) => <i key={n} />)}</div></div>;
}

function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return <div className="empty-state error-state"><div><Archive size={28} /></div><h2>{message}</h2><p>Your data is still on this device. Try opening the local store again.</p><button className="primary-button" onClick={retry}>Try again</button></div>;
}
