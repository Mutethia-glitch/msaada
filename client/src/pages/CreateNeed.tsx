import { ArrowLeft, ArrowRight, Check, CircleHelp, FileUp, MapPin, Plus, X } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

const steps = ["Tell us", "Shape it", "Add details", "Review"];

type FieldError = { label: string; message: string };
type Category = { id: number; name: string; description?: string | null };

export default function CreateNeed() {
  const { loading } = useAuth({ redirectOnUnauthenticated: true });
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [urgency, setUrgency] = useState<"low" | "medium" | "high">("medium");
  const [beneficiaryCount, setBeneficiaryCount] = useState(0);
  const [quantityLabel, setQuantityLabel] = useState("");
  const [goalAmount, setGoalAmount] = useState(0);
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [newCategory, setNewCategory] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);
  const [categoryError, setCategoryError] = useState("");
  const [savePending, setSavePending] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryPending, setCategoryPending] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPending, setAttachmentPending] = useState(false);
  useEffect(() => { fetch("/api/categories", { credentials: "include" }).then(async (response) => { if (!response.ok) throw new Error("Unable to load categories."); return response.json(); }).then(setCategories).catch((error) => setCategoryError(error.message)); }, []);
  const selectedCategory = categories.find((category) => Number(category.id) === categoryId);
  const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => { const value = event.currentTarget.value; setCategoryId(value ? Number(value) : undefined); setCategoryError(""); setFieldErrors((current) => current.filter((error) => error.label !== "Category")); };
  const canSave = Boolean(categoryId && title.trim().length >= 3 && text.trim().length >= 20 && location.trim().length >= 2);

  const errorsForStep = (currentStep: number): FieldError[] => {
    if (currentStep === 0) return text.trim().length < 20 ? [{ label: "Your story", message: "Write at least 20 characters describing the need." }] : [];
    if (currentStep === 1) return [
      ...(title.trim().length < 3 ? [{ label: "Need title", message: "Add a title of at least 3 characters." }] : []),
      ...(!categoryId ? [{ label: "Category", message: "Choose a category or add a new one." }] : []),
    ];
    if (currentStep === 2) return location.trim().length < 2 ? [{ label: "Location", message: "Add the county, town, or community location." }] : [];
    return [
      ...(!canSave ? [{ label: "Required details", message: "Complete the story, title, category, and location before submitting." }] : []),
    ];
  };
  const next = () => { const errors = errorsForStep(step); setFieldErrors(errors); if (!errors.length) setStep(Math.min(3, step + 1)); };
  const persist = async (submitForReview: boolean) => {
    const errors = [...errorsForStep(3)]; setFieldErrors(errors); if (errors.length || !categoryId) return;
    setSavePending(true); setSaveError("");
    try {
      const response = await fetch("/api/needs/draft", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ title: title.trim(), story: text.trim(), publicSummary: text.trim().slice(0, 3000), location: location.trim(), urgency, beneficiaryCount, quantityLabel: quantityLabel.trim() || undefined, goalAmount, categoryId, submitForReview }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to save this need right now.");
      if (attachment && data.needId) {
        setAttachmentPending(true);
        const fileData = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Unable to read the selected file.")); reader.readAsDataURL(attachment); });
        const uploadResponse = await fetch("/api/needs/file", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ needId: data.needId, fileName: attachment.name, mimeType: attachment.type, data: fileData }) });
        const uploadData = await uploadResponse.json(); if (!uploadResponse.ok) throw new Error(uploadData.error || "Unable to upload the supporting file.");
      }
      if (submitForReview) setSubmitted(true);
    } catch (error) { setSaveError(error instanceof Error ? error.message : "Unable to save this need right now."); }
    finally { setAttachmentPending(false); setSavePending(false); }
  };
  const addCategory = async () => {
    const name = newCategory.trim(); setCategoryError(""); if (name.length < 2) return;
    setCategoryPending(true);
    try {
      const response = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ name }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to add this category.");
      setCategories((current) => current.some((item) => item.id === data.id) ? current : [...current, data].sort((a, b) => a.name.localeCompare(b.name)));
      setCategoryId(data.id); setNewCategory(""); setShowNewCategory(false);
    } catch (error) { setCategoryError(error instanceof Error ? error.message : "Unable to add this category."); }
    finally { setCategoryPending(false); }
  };
  if (loading) return <div className="app-page" />;

  return <div className="app-page create-page"><header className="app-header container"><Link href="/" className="brand"><span className="brand-mark">m</span><span className="draft-status">{savePending ? "Saving…" : "Your words are saved securely"}</span></Link><Link href="/discover" className="exit-link">Exit <ArrowLeft size={14} /></Link></header><main className="create-main container">{submitted ? <div className="success-state"><div className="success-mark"><Check size={28} /></div><span className="section-kicker">Submitted for review</span><h1>Your need is now<br /><em>in good hands.</em></h1><p>A Msaada moderator will review the details before the request becomes public. We will let you know when there is an update.</p><Link href="/dashboard" className="button button-dark">Go to my dashboard <ArrowRight size={17} /></Link></div> : <><div className="stepper">{steps.map((item, i) => <div className={`step ${i === step ? "active" : i < step ? "complete" : ""}`} key={item}><span>{i < step ? <Check size={13} /> : i + 1}</span><label>{item}</label></div>)}</div><div className="create-card">
    {step === 0 && <div className="create-step"><div className="step-heading"><span className="section-kicker">Step 1 / Tell us what is needed</span><h1>Start with the story.</h1><p>Write naturally. You decide what is shared and can edit every field before review.</p></div><label className="field-label" htmlFor="need-story">What does your community need, and why?</label><textarea id="need-story" value={text} onChange={(e) => setText(e.target.value)} placeholder="Tell us what your community needs and why…" rows={7} /><div className="field-hint"><CircleHelp size={15} /> No automated interpretation is used. Your original words remain editable.</div></div>}
    {step === 1 && <div className="create-step"><div className="step-heading"><span className="section-kicker">Step 2 / Shape the request</span><h1>Give your request<br /><em>a clear shape.</em></h1><p>Choose an existing category or create one that fits your community’s need.</p></div><div className="structured-grid"><label className="field"><span>Need title</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Desks for community school students" /></label><label className="field"><span>Category</span><select value={categoryId === undefined ? "" : String(categoryId)} onChange={handleCategoryChange} onInput={handleCategoryChange}><option value="">Choose a category</option>{categories?.map((category) => <option value={String(category.id)} key={category.id}>{category.name}</option>)}</select></label><label className="field"><span>Urgency</span><select value={urgency} onChange={(e) => setUrgency(e.target.value as typeof urgency)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label className="field"><span>Beneficiaries</span><input type="number" min="0" value={beneficiaryCount} onChange={(e) => setBeneficiaryCount(Number(e.target.value))} /></label></div><button type="button" className="text-button category-add-toggle" onClick={() => { setCategoryError(""); setShowNewCategory(!showNewCategory); }}>{showNewCategory ? <><X size={15} /> Cancel new category</> : <><Plus size={15} /> Add a new category</>}</button>{showNewCategory && <div className="new-category-row"><input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="e.g. Disability access" maxLength={80} /><button type="button" className="button button-outline" onClick={addCategory} disabled={newCategory.trim().length < 2 || categoryPending}>{categoryPending ? "Adding…" : "Add category"}</button></div>}{categoryError && <p className="category-error" role="alert">{categoryError}</p>}</div>}
    {step === 2 && <div className="create-step"><div className="step-heading"><span className="section-kicker">Step 3 / Add a few details</span><h1>Help people understand<br /><em>where to show up.</em></h1><p>Specific details help contributors make informed choices.</p></div><div className="structured-grid"><label className="field"><span>Location</span><div className="field-input"><MapPin size={15} /><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="County or town" /></div></label><label className="field"><span>Quantity / goal</span><input value={quantityLabel} onChange={(e) => setQuantityLabel(e.target.value)} placeholder="e.g. 20 desks" /></label><label className="field"><span>Money goal (KSh)</span><input type="number" min="0" value={goalAmount} onChange={(e) => setGoalAmount(Number(e.target.value))} /></label></div><label className="upload-zone"><FileUp size={20} /><span><strong>{attachment ? attachment.name : "Attach a supporting photo or PDF"}</strong><small>{attachment ? `${Math.ceil(attachment.size / 1024)} KB selected · uploads after submission` : "Optional · JPG, PNG, WEBP, or PDF · maximum 10 MB"}</small></span><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setAttachment(e.target.files?.[0] ?? null)} /></label></div>}
    {step === 3 && <div className="create-step"><div className="step-heading"><span className="section-kicker">Step 4 / Review before sharing</span><h1>This is what will<br /><em>become public.</em></h1><p>Review your own wording. It will be marked “Pending review” after you submit.</p></div><div className="review-preview"><div className="review-label"><span className="badge badge-cream">Pending review</span><span className="review-demo">{selectedCategory?.name ?? "Category"}</span></div><h2>{title || "Your need title"}</h2><p>{text || "Your story will appear here."}</p><div className="review-details"><span>{selectedCategory?.name ?? "Category"}</span><span>{location || "Location"}</span><span>{beneficiaryCount} beneficiaries</span><span>{urgency} urgency</span></div></div></div>}
    {saveError && <div className="form-errors" role="alert"><strong>{saveError}</strong></div>}{fieldErrors.length > 0 && <div className="form-errors" role="alert"><strong>Please complete the following:</strong><ul>{fieldErrors.map((error) => <li key={error.label}><b>{error.label}:</b> {error.message}</li>)}</ul></div>}
    <div className="create-footer"><button className="text-button" onClick={() => { setFieldErrors([]); if (step > 0) setStep(step - 1); }}>{step > 0 && <><ArrowLeft size={15} /> Back</>}</button><div><button className="button button-ghost" onClick={() => persist(false)} disabled={!canSave || savePending || attachmentPending}>Save draft</button>{step < 3 ? <button className="button button-dark" onClick={next}>Continue <ArrowRight size={16} /></button> : <button className="button button-dark" onClick={() => persist(true)} disabled={!canSave || savePending || attachmentPending}>{attachmentPending ? "Uploading…" : "Submit for review"} <ArrowRight size={16} /></button>}</div></div>
  </div></>}</main></div>;
}
