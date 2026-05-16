import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Upload, Trash2, Building2, Hash, Banknote, Image as ImageIcon, FileText } from "lucide-react";
import { api } from "../api/client";
import { Button, Field, Input, Select, Textarea } from "../components/FormPrimitives";
import { SkeletonBlock } from "../components/Feedback";
import { useAuth } from "../context/AuthContext";

const TABS = [
  { key: "business", label: "Business", icon: Building2 },
  { key: "branding", label: "Logo", icon: ImageIcon },
  { key: "series", label: "Series", icon: Hash },
  { key: "tax", label: "Tax & Bank", icon: Banknote },
  { key: "invoice", label: "Invoice Terms", icon: FileText }
];

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("business");
  const fileRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/settings");
      setData(res.data);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to load settings");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const update = (patch) => setData((c) => ({ ...c, ...patch }));

  const save = async () => {
    if (!isAdmin) return;
    try {
      setBusy(true);
      const payload = { ...data };
      delete payload.id;
      delete payload.logoFileName;
      delete payload.logoUrl;
      delete payload.updatedAt;
      const res = await api.put("/settings", payload);
      setData(res.data);
      toast.success("Settings saved");
    } catch (e) {
      toast.error(e.response?.data?.message || "Save failed");
    } finally { setBusy(false); }
  };

  const uploadLogo = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      setBusy(true);
      const res = await api.post("/settings/logo", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setData(res.data);
      toast.success("Logo updated");
    } catch (e) {
      toast.error(e.response?.data?.message || "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeLogo = async () => {
    if (!window.confirm("Remove logo?")) return;
    try {
      const res = await api.delete("/settings/logo");
      setData(res.data);
      toast.success("Logo removed");
    } catch (e) { toast.error(e.response?.data?.message || "Delete failed"); }
  };

  if (loading || !data) return <SkeletonBlock className="h-96" />;

  const disabled = !isAdmin || busy;

  return (
    <div className="grid gap-5">
      <div className="panel rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--text)]">Application Settings</h2>
            <p className="mt-0.5 text-xs text-[var(--text-soft)]">
              Business details, document series, tax info and invoice branding.
              {!isAdmin && " Read-only — admin role required to edit."}
            </p>
          </div>
          {isAdmin && (
            <Button onClick={save} disabled={busy}>{busy ? "Saving..." : "Save Changes"}</Button>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                tab === t.key
                  ? "bg-[var(--brand)] text-white"
                  : "bg-white text-[var(--text-soft)] ring-1 ring-[var(--line)] hover:text-[var(--text)]"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "business" && (
        <div className="panel rounded-lg p-5">
          <h3 className="mb-4 text-sm font-semibold text-[var(--text)]">Business Details</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Business Name *"><Input value={data.businessName || ""} disabled={disabled} onChange={(e) => update({ businessName: e.target.value })} /></Field>
            <Field label="Legal Name"><Input value={data.legalName || ""} disabled={disabled} onChange={(e) => update({ legalName: e.target.value })} /></Field>
            <Field label="Phone"><Input value={data.phone || ""} disabled={disabled} onChange={(e) => update({ phone: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={data.email || ""} disabled={disabled} onChange={(e) => update({ email: e.target.value })} /></Field>
            <Field label="Website"><Input value={data.website || ""} disabled={disabled} onChange={(e) => update({ website: e.target.value })} /></Field>
            <Field label="Currency">
              <Select value={data.currency || "INR"} disabled={disabled} onChange={(e) => update({ currency: e.target.value })}>
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="AED">AED</option>
              </Select>
            </Field>
            <Field label="Address (line)"><Input value={data.address || ""} disabled={disabled} onChange={(e) => update({ address: e.target.value })} /></Field>
            <Field label="City"><Input value={data.city || ""} disabled={disabled} onChange={(e) => update({ city: e.target.value })} /></Field>
            <Field label="State"><Input value={data.state || ""} disabled={disabled} onChange={(e) => update({ state: e.target.value })} /></Field>
            <Field label="Country"><Input value={data.country || ""} disabled={disabled} onChange={(e) => update({ country: e.target.value })} /></Field>
            <Field label="Postal Code"><Input value={data.postalCode || ""} disabled={disabled} onChange={(e) => update({ postalCode: e.target.value })} /></Field>
          </div>
        </div>
      )}

      {tab === "branding" && (
        <div className="panel rounded-lg p-5">
          <h3 className="mb-4 text-sm font-semibold text-[var(--text)]">Logo</h3>
          <p className="mb-4 text-xs text-[var(--text-soft)]">
            Appears on invoice PDFs and login page. PNG/JPG, max 2 MB. Recommended square or wide rectangle.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-32 w-48 items-center justify-center rounded-md border border-dashed border-[var(--line)] bg-[var(--surface-muted)] p-2">
              {data.logoUrl ? (
                <img src={data.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-xs text-[var(--text-soft)]">No logo uploaded</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadLogo(e.target.files?.[0])} />
              <Button variant="secondary" disabled={disabled} onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" /> Upload Logo
              </Button>
              {data.logoUrl && (
                <Button variant="danger" disabled={disabled} onClick={removeLogo}>
                  <Trash2 className="h-4 w-4" /> Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "series" && (
        <div className="panel rounded-lg p-5">
          <h3 className="mb-4 text-sm font-semibold text-[var(--text)]">Document Series</h3>
          <p className="mb-4 text-xs text-[var(--text-soft)]">
            Prefix + next number for auto-generated codes. Changing "next number" jumps the counter.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <SeriesCard
              title="Booking Code"
              prefix={data.bookingPrefix}
              next={data.bookingNextNumber}
              preview={`${data.bookingPrefix || "BK"}-${String(data.bookingNextNumber || 1).padStart(5, "0")}`}
              onPrefix={(v) => update({ bookingPrefix: v })}
              onNext={(v) => update({ bookingNextNumber: Number(v) || 1 })}
              disabled={disabled}
            />
            <SeriesCard
              title="Ticket Sale Code"
              prefix={data.ticketSalePrefix}
              next={data.ticketSaleNextNumber}
              preview={`${data.ticketSalePrefix || "TKT"}-${String(data.ticketSaleNextNumber || 1).padStart(5, "0")}`}
              onPrefix={(v) => update({ ticketSalePrefix: v })}
              onNext={(v) => update({ ticketSaleNextNumber: Number(v) || 1 })}
              disabled={disabled}
            />
            <div className="rounded-md border border-[var(--line)] bg-white p-4 sm:col-span-2">
              <p className="text-sm font-semibold text-[var(--text)]">B2B / Vendor Invoice Number</p>
              <p className="mt-0.5 text-xs text-[var(--text-soft)]">Used for custom invoices sent to B2B partners, agents, corporates, suppliers.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Field label="Prefix"><Input value={data.vendorInvoicePrefix || ""} disabled={disabled} onChange={(e) => update({ vendorInvoicePrefix: e.target.value })} /></Field>
                <Field label="Next Number"><Input type="number" min="1" value={data.vendorInvoiceNextNumber || 1} disabled={disabled} onChange={(e) => update({ vendorInvoiceNextNumber: Number(e.target.value) || 1 })} /></Field>
                <Field label="Include Year">
                  <Select value={data.vendorInvoiceUseYear ? "yes" : "no"} disabled={disabled} onChange={(e) => update({ vendorInvoiceUseYear: e.target.value === "yes" })}>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </Select>
                </Field>
              </div>
              <p className="mt-3 text-xs text-[var(--text-soft)]">
                Preview: <span className="font-mono font-semibold text-[var(--text)]">
                  {data.vendorInvoicePrefix || "B2B"}{data.vendorInvoiceUseYear ? `-${new Date().getFullYear()}` : ""}-{String(data.vendorInvoiceNextNumber || 1).padStart(4, "0")}
                </span>
              </p>
            </div>
            <div className="rounded-md border border-[var(--line)] bg-white p-4 sm:col-span-2">
              <p className="text-sm font-semibold text-[var(--text)]">Invoice Number</p>
              <p className="mt-0.5 text-xs text-[var(--text-soft)]">Format: PREFIX-[YEAR-]NUMBER</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Field label="Prefix"><Input value={data.invoicePrefix || ""} disabled={disabled} onChange={(e) => update({ invoicePrefix: e.target.value })} /></Field>
                <Field label="Next Number"><Input type="number" min="1" value={data.invoiceNextNumber || 1} disabled={disabled} onChange={(e) => update({ invoiceNextNumber: Number(e.target.value) || 1 })} /></Field>
                <Field label="Include Year">
                  <Select value={data.invoiceUseYear ? "yes" : "no"} disabled={disabled} onChange={(e) => update({ invoiceUseYear: e.target.value === "yes" })}>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </Select>
                </Field>
              </div>
              <p className="mt-3 text-xs text-[var(--text-soft)]">
                Preview: <span className="font-mono font-semibold text-[var(--text)]">
                  {data.invoicePrefix || "OGH"}{data.invoiceUseYear ? `-${new Date().getFullYear()}` : ""}-{String(data.invoiceNextNumber || 1).padStart(4, "0")}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === "tax" && (
        <div className="grid gap-5">
          <div className="panel rounded-lg p-5">
            <h3 className="mb-4 text-sm font-semibold text-[var(--text)]">Tax</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="GSTIN"><Input value={data.gstin || ""} disabled={disabled} onChange={(e) => update({ gstin: e.target.value.toUpperCase() })} /></Field>
              <Field label="PAN"><Input value={data.pan || ""} disabled={disabled} onChange={(e) => update({ pan: e.target.value.toUpperCase() })} /></Field>
              <Field label="Default Tax Rate (%)">
                <Input type="number" min="0" max="100" step="0.01" value={data.taxRate ?? 0} disabled={disabled} onChange={(e) => update({ taxRate: Number(e.target.value) || 0 })} />
              </Field>
            </div>
          </div>
          <div className="panel rounded-lg p-5">
            <h3 className="mb-4 text-sm font-semibold text-[var(--text)]">Bank Details (appear on invoice)</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Bank Name"><Input value={data.bankName || ""} disabled={disabled} onChange={(e) => update({ bankName: e.target.value })} /></Field>
              <Field label="Account Holder"><Input value={data.bankAccountName || ""} disabled={disabled} onChange={(e) => update({ bankAccountName: e.target.value })} /></Field>
              <Field label="Account Number"><Input value={data.bankAccountNumber || ""} disabled={disabled} onChange={(e) => update({ bankAccountNumber: e.target.value })} /></Field>
              <Field label="IFSC"><Input value={data.bankIfsc || ""} disabled={disabled} onChange={(e) => update({ bankIfsc: e.target.value.toUpperCase() })} /></Field>
              <Field label="Branch"><Input value={data.bankBranch || ""} disabled={disabled} onChange={(e) => update({ bankBranch: e.target.value })} /></Field>
              <Field label="UPI ID"><Input value={data.upiId || ""} disabled={disabled} onChange={(e) => update({ upiId: e.target.value })} /></Field>
            </div>
          </div>
        </div>
      )}

      {tab === "invoice" && (
        <div className="panel rounded-lg p-5">
          <h3 className="mb-2 text-sm font-semibold text-[var(--text)]">Invoice Terms & Footer</h3>
          <p className="mb-4 text-xs text-[var(--text-soft)]">Shown as small footer text on every invoice PDF.</p>
          <Textarea rows={6} value={data.invoiceTerms || ""} disabled={disabled} onChange={(e) => update({ invoiceTerms: e.target.value })}
            placeholder="e.g. Payments are non-refundable after 7 days of departure. All disputes subject to Kochi jurisdiction." />
        </div>
      )}
    </div>
  );
}

function SeriesCard({ title, prefix, next, preview, onPrefix, onNext, disabled }) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-white p-4">
      <p className="text-sm font-semibold text-[var(--text)]">{title}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Prefix"><Input value={prefix || ""} disabled={disabled} onChange={(e) => onPrefix(e.target.value)} /></Field>
        <Field label="Next Number"><Input type="number" min="1" value={next || 1} disabled={disabled} onChange={(e) => onNext(e.target.value)} /></Field>
      </div>
      <p className="mt-3 text-xs text-[var(--text-soft)]">
        Preview: <span className="font-mono font-semibold text-[var(--text)]">{preview}</span>
      </p>
    </div>
  );
}
