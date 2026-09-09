const TYPE_LABELS: Record<string, string> = {
  DATASHEET: "Datasheet",
  MANUAL: "Manual",
  CERTIFICATE: "Certificate",
  OTHER: "Document",
};

export function DownloadsList({
  documents,
}: {
  documents: { title: string; url: string; type: string }[];
}) {
  if (documents.length === 0) return null;

  return (
    <ul className="space-y-2">
      {documents.map((doc) => (
        <li key={doc.url}>
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-sm text-blue-700 hover:bg-slate-50"
          >
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
              {TYPE_LABELS[doc.type] ?? doc.type}
            </span>
            {doc.title}
          </a>
        </li>
      ))}
    </ul>
  );
}
