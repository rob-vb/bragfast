import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Branded panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-[#F8AF3C]">
        <Image
          src="/logo-icon.svg"
          alt="Bragfast"
          width={160}
          height={166}
          priority
        />
      </div>

      {/* Form panel */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-[#F9F6ED] px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex justify-center lg:hidden">
            <Image
              src="/logo-icon.svg"
              alt="Bragfast"
              width={64}
              height={66}
              priority
            />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
