interface CaptionFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function CaptionField({ value, onChange }: CaptionFieldProps) {
  return (
    <div className="border-t border-[var(--workspace-border)] pt-4">
      <label htmlFor="post-caption" className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--workspace-sage)]">
        Post caption
      </label>
      <textarea
        id="post-caption"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Write the caption that will post with this creation."
        rows={4}
        className="mt-2 w-full resize-none rounded-[6px] border border-[var(--workspace-border)] bg-white px-3 py-2 text-[14px] leading-[1.5] text-[var(--workspace-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-lime)]"
      />
    </div>
  );
}
