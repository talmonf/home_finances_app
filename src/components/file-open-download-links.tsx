const linkClass =
  "inline-flex items-center rounded border border-sky-500 px-2 py-1 text-xs text-sky-100 hover:bg-sky-500/10";

/**
 * For same-origin API routes that honor `disposition=inline` (Open) vs `attachment` (Download).
 */
export function ProxiedFileOpenDownloadLinks({
  downloadApiPath,
  downloadFileName,
}: {
  downloadApiPath: string;
  /** Hint for the browser; server Content-Disposition still applies for proxied routes */
  downloadFileName?: string;
}) {
  const sep = downloadApiPath.includes("?") ? "&" : "?";
  const openHref = `${downloadApiPath}${sep}disposition=inline`;
  const downloadHref = `${downloadApiPath}${sep}disposition=attachment`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href={openHref} target="_blank" rel="noreferrer" className={linkClass}>
        Open
      </a>
      <a href={downloadHref} className={linkClass} download={downloadFileName}>
        Download
      </a>
    </div>
  );
}

/**
 * For direct URLs (e.g. public/signed S3). Download may be limited cross-origin; Open always works in a new tab.
 */
export function DirectFileOpenDownloadLinks({
  href,
  fileName,
}: {
  href: string;
  fileName: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href={href} target="_blank" rel="noreferrer" className={linkClass}>
        Open
      </a>
      <a href={href} download={fileName} className={linkClass}>
        Download
      </a>
    </div>
  );
}
