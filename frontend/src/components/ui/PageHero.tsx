import { ButtonLink } from '@/components/ui/button'

type PageHeroProps = {
  eyebrow: string
  title: string
  text: string
  image?: string
}

export function PageHero({ eyebrow, title, text, image }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden pt-32 text-white md:pt-40">
      {image ? (
        <img className="absolute inset-0 h-full w-full object-cover opacity-20" src={image} alt="" />
      ) : null}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(18,200,160,0.28),transparent_34%),linear-gradient(115deg,#07101f_0%,rgba(7,16,31,0.92)_55%,rgba(18,97,255,0.35)_100%)] dark:bg-[radial-gradient(circle_at_25%_20%,rgba(18,200,160,0.22),transparent_34%),linear-gradient(115deg,#030611_0%,rgba(5,8,22,0.96)_55%,rgba(18,97,255,0.22)_100%)]" />
      <div className="container-x relative z-10 pb-20 md:pb-28">
        <p className="mb-4 text-sm font-black uppercase tracking-[0.22em] text-[#12c8a0]">{eyebrow}</p>
        <h1 className="text-balance max-w-4xl text-4xl font-black tracking-tight md:text-7xl">{title}</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">{text}</p>
        <div className="mt-8">
          <ButtonLink href="/contact">Talk to Bakhtech</ButtonLink>
        </div>
      </div>
    </section>
  )
}
