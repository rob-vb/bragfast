export function PixelTable({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto border-2 border-[#4A3326] bg-white shadow-[4px_4px_0_#4A3326]">
      <table className="w-full text-left text-sm text-[#4A3326]">
        <thead>
          <tr className="border-b-2 border-[#4A3326] bg-[#F8AF3C]/20">
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-3 font-[family-name:var(--font-press-start)] text-[10px] uppercase"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#4A3326]/10">{children}</tbody>
      </table>
    </div>
  );
}
