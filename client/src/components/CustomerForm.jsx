import { useEffect, useState } from "react";
import { Button, Field, Input, Textarea } from "./FormPrimitives";

const defaults = {
  fullName: "",
  phone: "",
  email: "",
  nationality: "",
  passportNo: "",
  address: "",
  notes: ""
};

export default function CustomerForm({ initialValues, onSubmit, busy }) {
  const [form, setForm] = useState(defaults);

  useEffect(() => {
    setForm(initialValues ? { ...defaults, ...initialValues } : defaults);
  }, [initialValues]);

  const setValue = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(form);
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Full Name">
          <Input value={form.fullName} onChange={(e) => setValue("fullName", e.target.value)} required />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => setValue("phone", e.target.value)} required />
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Email">
          <Input type="email" value={form.email} onChange={(e) => setValue("email", e.target.value)} />
        </Field>
        <Field label="Nationality">
          <Input value={form.nationality} onChange={(e) => setValue("nationality", e.target.value)} />
        </Field>
      </div>
      <Field label="Passport Number">
        <Input value={form.passportNo} onChange={(e) => setValue("passportNo", e.target.value)} />
      </Field>
      <Field label="Address">
        <Textarea value={form.address} onChange={(e) => setValue("address", e.target.value)} />
      </Field>
      <Field label="Notes">
        <Textarea value={form.notes} onChange={(e) => setValue("notes", e.target.value)} />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving..." : "Save Customer"}
        </Button>
      </div>
    </form>
  );
}
