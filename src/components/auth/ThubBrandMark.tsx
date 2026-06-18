import Image from "next/image";

type ThubBrandMarkProps = {
  compact?: boolean;
};

export function ThubBrandMark({ compact = false }: ThubBrandMarkProps) {
  if (compact) {
    return (
      <span className="relative block size-full overflow-hidden rounded-full bg-white">
        <Image
          alt="THub"
          className="object-cover object-top"
          fill
          sizes="32px"
          src="/brand/thub-logo.png"
        />
      </span>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative h-[132px] w-[172px] overflow-hidden rounded-2xl bg-white">
        <Image
          alt="THub"
          className="object-contain"
          fill
          priority
          sizes="172px"
          src="/brand/thub-logo.png"
        />
      </div>
      <p className="mt-2 text-xs font-medium tracking-[0.14em] text-[#5e7e7b]">
        武汉高校家教
      </p>
    </div>
  );
}
