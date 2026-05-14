import { useEffect, useState } from "react";
import { Button, Field, Input, Select } from "./FormPrimitives";

const defaultState = {
  name: "",
  destination: "",
  durationDays: 5,
  durationNights: 4,
  inclusions: { flights: true, hotels: true, meals: true, transfers: true },
  priceAdult: "",
  priceChild: "",
  maxPax: 20,
  availableDates: "",
  status: "ACTIVE",
  coverImageUrl: ""
};

export default function PackageForm({ initialValues, onSubmit, busy }) {
  const [form, setForm] = useState(defaultState);

  useEffect(() => {
    if (initialValues) {
      setForm({
        ...initialValues,
        priceAdult: initialValues.priceAdult ?? "",
        priceChild: initialValues.priceChild ?? "",
        availableDates: (initialValues.availableDates || []).join(", ")
      });
    } else {
      setForm(defaultState);
    }
  }, [initialValues]);

  const setValue = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          ...form,
          priceAdult: Number(form.priceAdult),
          priceChild: Number(form.priceChild),
          durationDays: Number(form.durationDays),
          durationNights: Number(form.durationNights),
          maxPax: Number(form.maxPax),
          availableDates: form.availableDates
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Package Name">
          <Input value={form.name} onChange={(e) => setValue("name", e.target.value)} required />
        </Field>
        <Field label="Destination">
          <Input
            value={form.destination}
            onChange={(e) => setValue("destination", e.target.value)}
            required
          />
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Field label="Days">
          <Input type="number" value={form.durationDays} onChange={(e) => setValue("durationDays", e.target.value)} />
        </Field>
        <Field label="Nights">
          <Input type="number" value={form.durationNights} onChange={(e) => setValue("durationNights", e.target.value)} />
        </Field>
        <Field label="Adult Price">
          <Input type="number" value={form.priceAdult} onChange={(e) => setValue("priceAdult", e.target.value)} />
        </Field>
        <Field label="Child Price">
          <Input type="number" value={form.priceChild} onChange={(e) => setValue("priceChild", e.target.value)} />
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Max Group Size">
          <Input type="number" value={form.maxPax} onChange={(e) => setValue("maxPax", e.target.value)} />
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => setValue("status", e.target.value)}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </Field>
        <Field label="Cover Image URL">
          <Input value={form.coverImageUrl} onChange={(e) => setValue("coverImageUrl", e.target.value)} />
        </Field>
      </div>
      <Field label="Available Dates (comma separated YYYY-MM-DD)">
        <Input value={form.availableDates} onChange={(e) => setValue("availableDates", e.target.value)} />
      </Field>
      <div className="grid gap-3 md:grid-cols-4">
        {Object.keys(form.inclusions).map((key) => (
          <label key={key} className="flex items-center gap-3 rounded-md border border-[var(--line)] bg-white px-3 py-3 text-sm text-[var(--text)]">
            <input
              type="checkbox"
              checked={form.inclusions[key]}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  inclusions: { ...current.inclusions, [key]: e.target.checked }
                }))
              }
            />
            <span className="capitalize">{key}</span>
          </label>
        ))}
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving..." : "Save Package"}
        </Button>
      </div>
    </form>
  );
}
