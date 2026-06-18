export function ParentIllustration() {
  return (
    <div className="relative h-44 w-full min-w-[260px] overflow-hidden rounded-[28px] bg-[#eaf5f1] p-5">
      <div className="absolute -right-10 -top-12 size-36 rounded-full border border-[#a7d5cc]/60" />
      <div className="absolute -bottom-14 left-8 size-40 rounded-full bg-white/55 blur-sm" />
      <div className="relative grid h-full grid-cols-[1fr_0.82fr] items-end gap-4">
        <div className="rounded-3xl bg-white/90 p-4 shadow-[0_14px_34px_rgba(23,71,66,0.08)]">
          <div className="mb-3 h-2 w-16 rounded-full bg-[#117b7a]" />
          <div className="space-y-2">
            <div className="h-2.5 rounded-full bg-[#d4e8e3]" />
            <div className="h-2.5 w-5/6 rounded-full bg-[#d4e8e3]" />
            <div className="h-2.5 w-2/3 rounded-full bg-[#d4e8e3]" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-[#f6ead8] px-3 py-2 text-xs font-semibold text-[#8a5b20]">
              周末
            </div>
            <div className="rounded-2xl bg-[#dff3ee] px-3 py-2 text-xs font-semibold text-[#117b7a]">
              数学
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="rounded-3xl bg-white/95 p-3 shadow-[0_12px_28px_rgba(23,71,66,0.08)]">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-[#117b7a]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2 w-16 rounded-full bg-[#bddbd5]" />
                <div className="h-2 w-12 rounded-full bg-[#dcebe8]" />
              </div>
            </div>
          </div>
          <div className="rounded-3xl bg-[#117b7a] p-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(17,123,122,0.22)]">
            已匹配合适老师
          </div>
        </div>
      </div>
    </div>
  );
}
