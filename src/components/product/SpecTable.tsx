export function SpecTable({
  specs,
}: {
  specs: { label: string; value: string; unit: string | null }[];
}) {
  if (specs.length === 0) return null;

  return (
    <table className="w-full border-collapse overflow-hidden rounded-lg border border-slate-200 text-sm">
      <tbody>
        {specs.map((spec, i) => (
          <tr
            key={spec.label + i}
            className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
          >
            <th className="w-1/3 border-b border-slate-100 px-4 py-2 text-left font-medium text-slate-600">
              {spec.label}
            </th>
            <td className="border-b border-slate-100 px-4 py-2 text-slate-900">
              {spec.value}
              {spec.unit ? ` ${spec.unit}` : ""}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
