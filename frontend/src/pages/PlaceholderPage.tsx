// Field Notes Intelligence reminder: future-only surfaces should be honest, calm, and clearly marked as not connected yet.
import { ArrowLeft, Sprout } from "lucide-react";
import { Link } from "wouter";

export default function PlaceholderPage({ title = "This field is being prepared", description = "This frontend foundation is ready for the next phase. Authentication and connected product data are intentionally deferred." }: { title?: string; description?: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#F8F7F2] px-5 py-12 text-center text-[#17201B]">
      <div className="max-w-md">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#E8F4ED] text-[#176B45]"><Sprout className="size-7" /></span>
        <p className="mt-7 text-[10px] font-extrabold uppercase tracking-[.2em] text-[#66716A]">CropLens AI · Future phase</p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-[-.05em] text-[#0E4D35]">{title}</h1>
        <p className="mt-4 text-base leading-7 text-[#66716A]">{description}</p>
        <Link href="/" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#176B45] px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-[#0E4D35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B45] focus-visible:ring-offset-4"><ArrowLeft className="size-4" /> Back to CropLens AI</Link>
      </div>
    </main>
  );
}
