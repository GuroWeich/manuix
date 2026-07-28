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
import { useForm } from "react-hook-form";
import { z } from "zod";
import { collections, locations } from "./data";
import { filterItems, formatCurrency, inventoryMetrics } from "./inventory";
import { inventoryRepository } from "./repository";
import type { InventoryItem, ItemDraft } from "./types";

type Section = "Dashboard" | "Inventory" | "Locations" | "Collections" | "Inbox" | "Reports" | "Settings";

const nav = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Inventory", icon: Package },
  { label: "Locations", icon: MapPin },
  { label: "Collections", icon: Boxes },
  { label: "Inbox", icon: Inbox, badge: "3" },
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
  category: "Electronics",
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [editing, setEditing] = useState<InventoryItem | "new" | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [toast, setToast] = useState("");

  const loadItems = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      setItems(await inventoryRepository.list());
    } catch {
      setError("Manuix couldn’t open your local inventory.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    inventoryRepository
      .list()
      .then((storedItems) => setItems(storedItems))
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
  const categories = useMemo(() => ["All", ...new Set(items.map((item) => item.category))], [items]);
  const filtered = useMemo(() => filterItems(items, query, category), [items, query, category]);

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
    setSelected(item);
    setEditing(null);
    setToast(existing ? "Changes saved" : "Item added to inventory");
  }

  async function duplicateItem(item: InventoryItem) {
    const now = new Date().toISOString();
    const copy = { ...item, id: crypto.randomUUID(), name: `${item.name} copy`, createdAt: now, updatedAt: now };
    await inventoryRepository.save(copy);
    setItems((current) => [copy, ...current]);
    setSelected(copy);
    setToast("Item duplicated");
  }

  async function deleteItem(item: InventoryItem) {
    if (!window.confirm(`Remove “${item.name}” from your inventory?`)) return;
    await inventoryRepository.remove(item.id);
    setItems((current) => current.filter((candidate) => candidate.id !== item.id));
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
          {nav.slice(0, 5).map(({ label, icon: Icon, ...entry }) => (
            <button
              key={label}
              className={section === label ? "nav-item active" : "nav-item"}
              onClick={() => { setSection(label); setSelected(null); setMobileNav(false); }}
            >
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {"badge" in entry && <em>{entry.badge}</em>}
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
            <button className="primary-button compact" onClick={() => setEditing("new")}><Plus size={18} /> Add item</button>
          </div>
        </header>

        <div className="content">
          {loading ? <LoadingState /> : error ? <ErrorState message={error} retry={loadItems} /> : (
            <>
              {section === "Dashboard" && (
                <Dashboard
                  items={items}
                  metrics={metrics}
                  onBrowse={() => setSection("Inventory")}
                  onSelect={setSelected}
                  onAdd={() => setEditing("new")}
                  onSearch={(value) => { setQuery(value); setSection("Inventory"); }}
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
                  setQuery={setQuery}
                  view={view}
                  setView={setView}
                  onSelect={setSelected}
                  onAdd={() => setEditing("new")}
                />
              )}
              {section === "Locations" && <LocationsView onBrowse={(location) => { setQuery(location); setSection("Inventory"); }} />}
              {section === "Collections" && <CollectionsView onBrowse={(collection) => { setQuery(collection); setSection("Inventory"); }} />}
              {section === "Inbox" && <InboxView onCreate={() => setEditing("new")} />}
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
          onClose={() => setEditing(null)}
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

function Dashboard({ items, metrics, onBrowse, onSelect, onAdd, onSearch }: {
  items: InventoryItem[];
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
        <BrowsePanel title="Browse by location" icon={<MapPin size={19} />} items={locations.map((place) => ({ title: place.name, meta: `${place.count} items`, color: place.color }))} onBrowse={onSearch} />
        <BrowsePanel title="Browse by collection" icon={<Boxes size={19} />} items={collections.map((group) => ({ title: group.name, meta: `${group.count} items`, color: group.color }))} onBrowse={onSearch} />
      </div>
    </div>
  );
}

function Metric({ icon, label, value, note, tone }: { icon: React.ReactNode; label: string; value: string; note: string; tone: string }) {
  return <article className="metric-card"><div className={`metric-icon ${tone}`}>{icon}</div><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function BrowsePanel({ title, icon, items, onBrowse }: { title: string; icon: React.ReactNode; items: Array<{ title: string; meta: string; color: string }>; onBrowse: (value: string) => void }) {
  return (
    <section className="browse-panel">
      <div className="panel-heading"><span>{icon}</span><h2>{title}</h2><button aria-label={`Open ${title}`}><MoreHorizontal size={18} /></button></div>
      {items.map((item) => <button className="browse-row" key={item.title} onClick={() => onBrowse(item.title)}><span className={`location-swatch ${item.color}`} /><span><strong>{item.title}</strong><small>{item.meta}</small></span><ChevronRight size={16} /></button>)}
    </section>
  );
}

function Inventory({ items, allCount, categories, category, setCategory, query, setQuery, view, setView, onSelect, onAdd }: {
  items: InventoryItem[]; allCount: number; categories: string[]; category: string; setCategory: (category: string) => void;
  query: string; setQuery: (query: string) => void; view: "grid" | "list"; setView: (view: "grid" | "list") => void;
  onSelect: (item: InventoryItem) => void; onAdd: () => void;
}) {
  return (
    <div className="page">
      <PageHeading eyebrow="Your things" title="Inventory" copy={`${allCount} objects, each with a place and a story.`} actions={<button className="primary-button" onClick={onAdd}><Plus size={18} /> Add item</button>} />
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

function LocationsView({ onBrowse }: { onBrowse: (value: string) => void }) {
  return (
    <div className="page">
      <PageHeading eyebrow="Permanent places" title="Locations" copy="A clear map of where everything lives." />
      <div className="location-hero"><div><MapPin size={24} /><span><small>Home</small><strong>8 inventoried objects</strong></span></div><div className="location-path"><span>Garage</span><i /><span>Office</span><i /><span>Hall</span><i /><span>Kitchen</span></div></div>
      <div className="location-grid">{locations.map((place, index) => <button className="location-card" onClick={() => onBrowse(place.name)} key={place.name}><div className={`location-art ${place.color}`}><span>{index === 0 ? "⌂" : index === 1 ? "▦" : index === 2 ? "▥" : "◫"}</span></div><div><span><strong>{place.name}</strong><small>{place.path}</small></span><em>{place.count}</em></div></button>)}</div>
    </div>
  );
}

function CollectionsView({ onBrowse }: { onBrowse: (value: string) => void }) {
  return (
    <div className="page">
      <PageHeading eyebrow="Organized by purpose" title="Collections" copy="Bring related items together without changing where they live." actions={<button className="secondary-button"><Plus size={17} /> New collection</button>} />
      <div className="collection-grid">{collections.map((collection) => <button className="collection-card" key={collection.name} onClick={() => onBrowse(collection.name)}><div className="collection-cover" style={{ background: collection.color }}><span>{collection.icon}</span><i /><i /></div><div><strong>{collection.name}</strong><small>{collection.count} items</small></div><ChevronRight size={17} /></button>)}</div>
      <div className="calm-callout"><Sparkles size={19} /><div><strong>Collections are flexible</strong><p>An item can belong to several collections while keeping one permanent location.</p></div></div>
    </div>
  );
}

function InboxView({ onCreate }: { onCreate: () => void }) {
  const candidates = ["IMG_4028.HEIC", "IMG_4029.HEIC", "garage-bin.jpg"];
  return (
    <div className="page">
      <PageHeading eyebrow="Review & organize" title="Inbox" copy="Turn loose photos into complete inventory records." actions={<button className="primary-button"><Upload size={17} /> Import photos</button>} />
      <div className="inbox-summary"><div><Inbox size={21} /><span><strong>3 photos to review</strong><small>Imported today from Home Inventory</small></span></div><button>Review all <ChevronRight size={16} /></button></div>
      <div className="inbox-grid">{candidates.map((name, index) => <article className="inbox-card" key={name}><div className={`inbox-image inbox-${index}`}><ImageOff size={24} /><span>Original stored locally</span></div><div><span><strong>{name}</strong><small>Today, 4:{12 + index * 7} PM</small></span><button onClick={onCreate}><Plus size={15} /> Create item</button></div></article>)}</div>
      <div className="drop-zone"><Upload size={24} /><strong>Drop a folder of images here</strong><span>JPEG, PNG, HEIC · Originals remain on this device</span></div>
    </div>
  );
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
      <section className="settings-card"><h2>Local data</h2><p>Your SQLite inventory and original image files stay in local browser storage.</p><div className="setting-row"><span className="metric-icon green"><Archive size={18} /></span><span><strong>On-device storage</strong><small>No account, cloud database, or network connection required</small></span><em>Healthy</em></div><button className="danger-link" onClick={onReset}>Restore sample inventory</button></section>
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

function ItemModal({ item, onClose, onSave }: { item?: InventoryItem; onClose: () => void; onSave: (draft: ItemDraft) => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } = useForm<ItemFormValues>({ resolver: zodResolver(itemSchema), defaultValues: item ? itemToForm(item) : EMPTY_FORM });
  const [photo, setPhoto] = useState<string | null>(item?.photo ?? null);
  const [formSection, setFormSection] = useState<"essential" | "details">("essential");

  function submit(values: ItemFormValues) {
    const parseNumber = (value: string) => value.trim() ? Number(value) : null;
    onSave({
      name: values.name,
      category: values.category,
      location: values.location,
      collections: splitList(values.collectionsText),
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

  function handlePhoto(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
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
                {photo ? <img src={photo} alt="Selected item" /> : <><Upload size={22} /><strong>Add a photo</strong><span>Choose an original from this device</span></>}
                <input type="file" accept="image/*" onChange={(event) => handlePhoto(event.target.files?.[0])} />
              </label>
              <div className="field-grid">
                <Field label="Item name" error={errors.name?.message} wide><input autoFocus placeholder="e.g. Film camera" {...register("name")} /></Field>
                <Field label="Category" error={errors.category?.message}><select {...register("category")}><option>Electronics</option><option>Cameras</option><option>Outdoor</option><option>Tools</option><option>Kitchen</option><option>Other</option></select></Field>
                <Field label="Condition"><select {...register("condition")}><option>New</option><option>Excellent</option><option>Good</option><option>Fair</option><option>Poor</option></select></Field>
                <Field label="Permanent location" error={errors.location?.message} wide><div className="input-icon"><MapPin size={16} /><input placeholder="Home / Room / Shelf" {...register("location")} /></div></Field>
                <Field label="Collections" wide hint="Separate several with commas"><input placeholder="Photography, Travel" {...register("collectionsText")} /></Field>
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
          <span>{watch("name") ? `Adding “${watch("name")}”` : "Required fields are marked"}</span>
          <div>
            {formSection === "details" && <button type="button" className="secondary-button" onClick={() => setFormSection("essential")}>Back</button>}
            {formSection === "essential" ? <button type="button" className="primary-button" onClick={() => { setValue("name", watch("name"), { shouldValidate: true }); setFormSection("details"); }}>Continue <ChevronRight size={17} /></button>
              : <button className="primary-button" disabled={isSubmitting}>{item ? "Save changes" : "Add to inventory"}</button>}
          </div>
        </div>
      </form>
    </div>
  );
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
