export const dynamic = "force-dynamic";

/** Keep route fallback minimal — nav tab owns the spinner until the page mounts. */
export default function Loading() {
  return <div aria-hidden="true" className="min-h-[1rem]" />;
}
