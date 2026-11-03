"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createJob,
  getJob,
  jobProblem,
  updateJob,
  type Job,
  type JobInput,
  type JobProblem,
} from "@/lib/buyer/buyer-jobs-api";
import { isSignedOut } from "@/lib/buyer/cart-errors";
import { loginUrlFor } from "@/lib/buyer/login-redirect";
import { EMPTY_GEO, GeoSelect, type GeoValue } from "../browse/geo-select";
import { SHOP } from "../shop-links";
import { BudgetBuilder, blankBudget, budgetItems, duplicateType, rowsFromSaved, type BudgetRow } from "./budget-builder";
import { CategoryPicker } from "./category-picker";

const EDITABLE = ["open_for_bidding", "draft", "pending"];

/** An optional text goes only when filled, or when it was saved before and is
 * now cleared (so the buyer can empty it). */
function optional(key: keyof JobInput, value: string, saved: string | null | undefined): JobInput {
  const text = value.trim();
  return text || saved ? { [key]: text } : {};
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="form-group">
      <label className="font-weight-bold small mb-1">{label}</label>
      {children}
      {error && (
        <p className="text-danger small mt-1 mb-0" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Post a job, or (with `jobId`) edit one that has not been hired yet. */
export function JobForm({ jobId }: { jobId?: number }) {
  const router = useRouter();
  const editing = jobId !== undefined;

  const [job, setJob] = useState<Job | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ready, setReady] = useState(!editing);

  const [category, setCategory] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [titleBn, setTitleBn] = useState("");
  const [descriptionBn, setDescriptionBn] = useState("");
  const [includes, setIncludes] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [days, setDays] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [geo, setGeo] = useState<GeoValue>(EMPTY_GEO);
  const [rows, setRows] = useState<BudgetRow[]>(() => [blankBudget()]);
  const [showBn, setShowBn] = useState(false);

  const [problem, setProblem] = useState<JobProblem | null>(null);
  const [localBudget, setLocalBudget] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (jobId === undefined) return;
    let cancelled = false;
    getJob(jobId)
      .then((j) => {
        if (cancelled) return;
        setJob(j);
        setCategory(j.category.id);
        setTitle(j.title);
        setDescription(j.description);
        setTitleBn(j.title_bn ?? "");
        setDescriptionBn(j.description_bn ?? "");
        setIncludes(j.package_includes ?? "");
        setUrgent(j.urgent);
        setDays(j.delivery_days ? String(j.delivery_days) : "");
        setFrom(j.available_from?.slice(0, 10) ?? "");
        setTo(j.available_to?.slice(0, 10) ?? "");
        setGeo({
          country: j.location.country ? String(j.location.country) : "",
          state: j.location.state ? String(j.location.state) : "",
          city: j.location.city ? String(j.location.city) : "",
          thana: j.location.thana ? String(j.location.thana) : "",
        });
        setRows(rowsFromSaved(j.skus));
        setShowBn(Boolean(j.title_bn || j.description_bn || j.package_includes));
        setReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        if (isSignedOut(err)) router.replace(loginUrlFor(window.location.pathname));
        else setLoadError(jobProblem(err).general);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setProblem(null);
    const dup = duplicateType(rows);
    if (dup) {
      setLocalBudget(`Two budget options use the same price type (${dup}). Use one row per type.`);
      return;
    }
    setLocalBudget(null);

    const num = (v: string) => (v ? Number(v) : null);
    const input: JobInput = {
      title: title.trim(),
      description: description.trim(),
      ...optional("title_bn", titleBn, job?.title_bn),
      ...optional("description_bn", descriptionBn, job?.description_bn),
      ...optional("package_includes", includes, job?.package_includes),
      urgent,
      delivery_days: num(days),
      available_from: from || null,
      available_to: to || null,
      country: num(geo.country),
      state: num(geo.state),
      city: num(geo.city),
      thana: num(geo.thana),
      skus: budgetItems(rows),
    };
    if (category !== null && category !== job?.category.id) input.category = category;
    if (!editing && category !== null) input.category = category;

    setSaving(true);
    try {
      const saved = editing ? await updateJob(jobId, input) : await createJob(input);
      router.push(SHOP.job(saved.id));
    } catch (err) {
      if (isSignedOut(err)) router.replace(loginUrlFor(window.location.pathname));
      else setProblem(jobProblem(err));
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <div className="container-fluid p-587 my-3">
        <p className="text-danger" role="alert">
          {loadError}
        </p>
        <Link href={SHOP.jobs}>Back to my jobs</Link>
      </div>
    );
  }
  if (!ready) return <p className="text-muted text-center py-5">Loading…</p>;
  if (job && !EDITABLE.includes(job.status)) {
    return (
      <div className="container-fluid p-587 my-3" data-testid="not-editable">
        <p>
          {job.status === "in_progress"
            ? "This job has been hired. Only an admin can change it now; you can still mark it complete."
            : "This job can no longer be edited (it's completed or cancelled)."}
        </p>
        <Link href={SHOP.job(job.id)}>Back to the job</Link>
      </div>
    );
  }

  const f = problem?.fields ?? {};
  return (
    <div className="container-fluid p-587 my-3">
      <div className="row justify-content-center">
        <form className="col-lg-8 bg-white p-4" onSubmit={submit} noValidate>
          <h4 className="mb-3">{editing ? "Edit job" : "Post a job"}</h4>
          {problem?.general && (
            <p className="alert alert-danger" role="alert" data-testid="form-error">
              {problem.general}
            </p>
          )}

          <Field label="Category (service)" error={f.category}>
            <CategoryPicker currentName={job?.category.name} onChange={setCategory} />
          </Field>
          <Field label="Title" error={f.title}>
            <input className="form-control" aria-label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Description" error={f.description}>
            <textarea
              className="form-control"
              rows={4}
              aria-label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          <div className="mb-3">
            <button type="button" className="btn btn-link p-0" onClick={() => setShowBn((v) => !v)}>
              {showBn ? "Hide Bangla fields" : "Add Bangla text (optional)"}
            </button>
          </div>
          {showBn && (
            <>
              <Field label="Title (Bangla)" error={f.title_bn}>
                <input className="form-control" aria-label="Title (Bangla)" value={titleBn} onChange={(e) => setTitleBn(e.target.value)} />
              </Field>
              <Field label="Description (Bangla)" error={f.description_bn}>
                <textarea
                  className="form-control"
                  rows={3}
                  aria-label="Description (Bangla)"
                  value={descriptionBn}
                  onChange={(e) => setDescriptionBn(e.target.value)}
                />
              </Field>
            </>
          )}

          <Field label="What the work includes (optional)" error={f.package_includes}>
            <textarea
              className="form-control"
              rows={2}
              aria-label="What the work includes"
              value={includes}
              onChange={(e) => setIncludes(e.target.value)}
            />
          </Field>

          <div className="form-row">
            <div className="col-md-6">
              <Field label="Needed within (days)" error={f.delivery_days}>
                <input
                  className="form-control"
                  type="number"
                  min="1"
                  aria-label="Delivery days"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                />
              </Field>
            </div>
            <div className="col-md-6 d-flex align-items-center">
              <label className="mb-0">
                <input type="checkbox" aria-label="Urgent" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} /> This job is
                urgent
              </label>
            </div>
          </div>

          <div className="form-row">
            <div className="col-md-6">
              <Field label="Available from (optional)" error={f.available_from}>
                <input className="form-control" type="date" aria-label="Available from" value={from} onChange={(e) => setFrom(e.target.value)} />
              </Field>
            </div>
            <div className="col-md-6">
              <Field label="Available to (optional)" error={f.available_to}>
                <input className="form-control" type="date" aria-label="Available to" value={to} onChange={(e) => setTo(e.target.value)} />
              </Field>
            </div>
          </div>

          <Field label="Where (optional)" error={f.country || f.state || f.city || f.thana}>
            <GeoSelect value={geo} onChange={setGeo} />
          </Field>

          <Field label="Your budget">
            <BudgetBuilder rows={rows} onChange={setRows} error={localBudget ?? f.skus} />
          </Field>

          <button type="submit" className="btn btn-success mr-2" disabled={saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Post job"}
          </button>
          <Link className="btn btn-light border" href={editing ? SHOP.job(jobId) : SHOP.jobs}>
            Cancel
          </Link>
        </form>
      </div>
    </div>
  );
}
