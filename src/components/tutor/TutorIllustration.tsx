import Image from "next/image";

export function TutorIllustration() {
  return (
    <div
      aria-hidden="true"
      className="relative flex min-h-56 items-center justify-center overflow-hidden rounded-[2rem] bg-[#fbfbf6] p-0 sm:min-h-72"
    >
      <Image
        alt=""
        aria-hidden="true"
        className="h-full w-full object-cover object-center"
        height={1024}
        priority
        src="/brand/tutor-service-illustration.png"
        width={1024}
      />
    </div>
  );
}
