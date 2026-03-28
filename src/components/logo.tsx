import Image from "next/image"

export function Logo() {
  return (
    <div className="flex items-center gap-2.5 font-bold text-lg text-foreground">
      <Image
        src="/images/analogo.png"
        alt="UludagAIClub Logo"
        width={24}
        height={24}
        className="w-6 h-6 rounded-full object-cover"
        priority
      />
      <Image
        src="/images/hsdsiyah.png"
        alt="Havelsan Logo"
        width={80}
        height={32}
        className="h-5 sm:h-6 w-auto object-contain opacity-80"
      />
      <span className="group-data-[collapsible=icon]:hidden">UludagAIClub</span>
    </div>
  )
}
