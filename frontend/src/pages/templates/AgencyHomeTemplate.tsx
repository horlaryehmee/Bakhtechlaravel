import { Link } from 'react-router-dom'
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import {
  ArrowRight,
  ChevronDown,
  Check,
  Cuboid,
  Cpu,
  ExternalLink,
  Gem,
  GitBranch,
  Globe2,
  Handshake,
  Menu,
  MessageCircle,
  Mic,
  PhoneCall,
  Play,
  Send,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import {
  siCloudflare,
  siFacebook,
  siFigma,
  siFirebase,
  siGithub,
  siGoogle,
  siGoogleanalytics,
  siInstagram,
  siLaravel,
  siLinear,
  siMysql,
  siNodedotjs,
  siNotion,
  siPostgresql,
  siRaycast,
  siReact,
  siShopify,
  siStripe,
  siSupabase,
  siTailwindcss,
  siTrustpilot,
  siTypescript,
  siVite,
} from 'simple-icons'
import { navigation } from '@/data/site'
import { BorderBeam } from '@/components/ui/border-beam'
import { GlobeCdn } from '@/components/ui/cobe-globe-cdn'
import { CpuArchitecture } from '@/components/ui/cpu-architecture'
import { SafeImage } from '@/components/ui/safe-image'
import { api, type Project, type Review } from '@/lib/api'
import { getProjectPrimaryImage, getProjectVideoCoverImage, getProjectVideoMedia, getProjectVideoUrl, getYoutubeEmbedUrl, isVideoUrl, projectImageFallbackSrc, type ProjectVideoMedia } from '@/lib/project-media'

type AgencyHomeTemplateProps = {
  preview?: boolean
}

type ReviewLinks = {
  google: string
  trustpilot: string
}

const clientLogos = [
  { name: '5th Perfumery', src: '/assets/client-logos-original/logo-1.png' },
  { name: 'Maple Education Canada', src: '/assets/client-logos-original/logo-2.png' },
  { name: 'Maple Education Canada Inc.', src: '/assets/client-logos-original/logo-3.png' },
  { name: 'Spazio', src: '/assets/client-logos-original/logo-4.png' },
  { name: 'Bayara Nigeria', src: '/assets/client-logos-original/logo-5.png' },
  { name: 'Celeb Beauty Clinic', src: '/assets/client-logos-original/logo-6.png' },
  { name: "Kiehl's", src: '/assets/client-logos-original/logo-7.png' },
  { name: 'Sanctuary Aesthetics and Spa', src: '/assets/client-logos-original/logo-8.png' },
  { name: 'Bruh', src: '/assets/client-logos-original/logo-9.png' },
  { name: 'Mobility Options', src: '/assets/client-logos-original/logo-10.png' },
]

const updateNotifications = [
  { label: 'Revision Completed', icon: 'slack' },
  { label: 'HOTFIX: update design', icon: 'github' },
  { label: 'Homepage approved', icon: 'slack' },
  { label: 'New milestone shipped', icon: 'github' },
]

type ComparisonRow = {
  label: string
  icon: LucideIcon
  bakhtech: string
  traditional: string
}

const comparisonRows: ComparisonRow[] = [
  { label: 'Approach', icon: Gem, bakhtech: 'Design and engineering in sync', traditional: 'Disconnected teams' },
  { label: 'Process', icon: Cpu, bakhtech: 'Streamlined, transparent, and async', traditional: 'Endless calls and vague timelines' },
  { label: 'Design Philosophy', icon: GitBranch, bakhtech: 'Modern, minimal, and purposeful', traditional: 'Trend-based and cluttered' },
  { label: 'Development Stack', icon: Cuboid, bakhtech: 'Built with modern frameworks', traditional: 'Outdated stacks' },
  { label: 'Communication', icon: MessageCircle, bakhtech: 'Clear updates', traditional: 'Multiple middlemen' },
  { label: 'Deliverables', icon: Send, bakhtech: 'Production-ready design systems', traditional: 'Static mockups' },
  { label: 'Support', icon: Handshake, bakhtech: 'Long-term partnership mindset', traditional: 'One-and-done projects' },
  { label: 'Always Free', icon: PhoneCall, bakhtech: 'Book a Free Call', traditional: 'Book a Paid Call' },
]

const founderNotes = [
  { name: 'Strategy', role: 'Before design', icon: Gem, quote: 'We turn unclear ideas into a practical website or product plan.' },
  { name: 'Build', role: 'During execution', icon: Cpu, quote: 'Every interface is shaped around speed, clarity, and real business use.' },
  { name: 'Launch', role: 'After handoff', icon: Send, quote: 'Deployment, support, and iteration stay part of the work.' },
]

const faqItems = [
  {
    question: 'What exactly does Bakhtech do?',
    answer: 'We design, build, and support websites, ecommerce stores, booking systems, dashboards, client portals, and custom web applications for businesses that need practical digital tools.',
  },
  {
    question: 'Do I need to be technical to work with you?',
    answer: 'No. You can come with a rough idea, screenshots, notes, or a business problem. We translate that into a clear plan, then guide the build from design to launch.',
  },
  {
    question: 'What is a typical project like?',
    answer: 'Most projects start with a short discovery call, then we confirm the scope, design the key screens, build the product, test it, and launch with the right hosting and integrations.',
  },
  {
    question: 'Can you connect this with my existing tools?',
    answer: 'Yes. We can connect payments, forms, email tools, analytics, WhatsApp, booking systems, CRMs, databases, and other services when the project needs them.',
  },
  {
    question: 'How long does a project usually take?',
    answer: 'A focused website can take a few weeks, while ecommerce platforms, dashboards, and custom apps take longer depending on scope, integrations, and content readiness.',
  },
  {
    question: 'Do you provide support after launch?',
    answer: 'Yes. We can help with updates, fixes, hosting checks, performance improvements, new features, and general technical support after the project goes live.',
  },
  {
    question: 'Can I update the website myself?',
    answer: 'When the project needs it, we build admin sections so you can manage content, images, projects, testimonials, services, and other important website data yourself.',
  },
  {
    question: 'How do we get started?',
    answer: 'Book a free call or send a message with what you want to build. We will review the goal, ask the right questions, and suggest the most direct way to move forward.',
  },
]

const footerLinkColumns = [
  {
    title: 'Home',
    links: [
      { label: 'Overview', to: '/' },
      { label: 'Projects', to: '/portfolio' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Testimonials', to: '/#reviews' },
      { label: 'FAQs', to: '/#faq' },
    ],
  },
  {
    title: 'About',
    links: [
      { label: 'Our Story', to: '/about' },
      { label: 'Services', to: '/#services' },
      { label: 'Founder', to: '/#founder' },
      { label: 'Portfolio', to: '/portfolio' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    title: 'Contact',
    links: [
      { label: 'Contact Us', to: '/contact' },
      { label: 'Book a Call', to: '/booking' },
      { label: 'Support', to: 'mailto:contact@bakhtech.com.ng' },
      { label: 'Live Chat', to: '/contact' },
      { label: 'Report Issue', to: 'mailto:contact@bakhtech.com.ng' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', to: '/privacy-policy' },
      { label: 'Terms of Service', to: '/terms-of-service' },
      { label: 'Cookie Policy', to: '/cookie-policy' },
      { label: 'Licenses', to: '/licenses' },
      { label: 'Security', to: '/security' },
    ],
  },
]

const defaultFooterSettings = {
  footerCtaTitle: 'Make Your Website a Sales Machine',
  footerWatermark: 'Bakhtech',
  footerDescription: 'We design and build websites, stores, dashboards, booking systems, and custom web apps that drive results.',
  footerCtaLabel: 'Get started',
  footerCopyright: '© 2026 Bakhtech Solutions - All Rights Reserved',
}

const companyMarqueeItems = [
  { name: 'Microsoft', icon: 'microsoft' },
  { name: 'Google', icon: 'google' },
  { name: 'Adobe', icon: 'adobe' },
  { name: 'Raycast', icon: 'raycast' },
  { name: 'Stripe', icon: 'stripe' },
  { name: 'Shopify', icon: 'shopify' },
  { name: 'Notion', icon: 'notion' },
  { name: 'Slack', icon: 'slack' },
  { name: 'Figma', icon: 'figma' },
  { name: 'Linear', icon: 'linear' },
]

const technologyMarqueeItems = [
  { name: 'React', icon: 'react' },
  { name: 'Laravel', icon: 'laravel' },
  { name: 'AWS', icon: 'aws' },
  { name: 'Vite', icon: 'vite' },
  { name: 'OpenAI', icon: 'openai' },
  { name: 'Supabase', icon: 'supabase' },
  { name: 'Firebase', icon: 'firebase' },
  { name: 'Tailwind', icon: 'tailwind' },
  { name: 'MySQL', icon: 'mysql' },
  { name: 'Postgres', icon: 'postgres' },
  { name: 'Node.js', icon: 'node' },
  { name: 'TypeScript', icon: 'typescript' },
  { name: 'GitHub', icon: 'github' },
  { name: 'Cloudflare', icon: 'cloudflare' },
  { name: 'Analytics', icon: 'analytics' },
  { name: 'Paystack', icon: 'paystack' },
]

const simpleIconMap = {
  google: siGoogle,
  facebook: siFacebook,
  instagram: siInstagram,
  trustpilot: siTrustpilot,
  raycast: siRaycast,
  stripe: siStripe,
  shopify: siShopify,
  notion: siNotion,
  figma: siFigma,
  linear: siLinear,
  react: siReact,
  laravel: siLaravel,
  vite: siVite,
  supabase: siSupabase,
  firebase: siFirebase,
  tailwind: siTailwindcss,
  mysql: siMysql,
  postgres: siPostgresql,
  node: siNodedotjs,
  typescript: siTypescript,
  github: siGithub,
  cloudflare: siCloudflare,
  analytics: siGoogleanalytics,
} as const

function CalendarIcon() {
  return (
    <span className="grid h-4 w-4 grid-cols-3 gap-0.5" aria-hidden="true">
      {Array.from({ length: 9 }).map((_, index) => (
        <span key={index} className="rounded-[2px] bg-current opacity-70" />
      ))}
    </span>
  )
}

function BrandIcon({ icon, className = 'h-5 w-5' }: { icon: string; className?: string }) {
  const simpleIcon = simpleIconMap[icon as keyof typeof simpleIconMap]

  if (simpleIcon) {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true" role="img">
        <path fill={`#${simpleIcon.hex}`} d={simpleIcon.path} />
      </svg>
    )
  }

  switch (icon) {
    case 'microsoft':
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#f25022" d="M2 2h9.4v9.4H2z" />
          <path fill="#7fba00" d="M12.6 2H22v9.4h-9.4z" />
          <path fill="#00a4ef" d="M2 12.6h9.4V22H2z" />
          <path fill="#ffb900" d="M12.6 12.6H22V22h-9.4z" />
        </svg>
      )
    case 'google':
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.24 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.37c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.37 12 5.37z" />
        </svg>
      )
    case 'adobe':
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#ff0000" d="M2 3h8l-8 18zm12 0h8v18zm-2.1 7.4 3.4 8H13l-1-2.6H9.5z" />
        </svg>
      )
    case 'raycast':
      return <Zap className={`${className} text-[#ff6363] fill-current`} />
    case 'stripe':
      return <span className={`${className} grid place-items-center rounded bg-[#635bff] text-[0.65rem] font-black text-white`}>S</span>
    case 'shopify':
      return <span className={`${className} grid place-items-center rounded bg-[#95bf47] text-[0.65rem] font-black text-white`}>S</span>
    case 'notion':
      return <span className={`${className} grid place-items-center rounded border border-black text-[0.65rem] font-black text-black`}>N</span>
    case 'slack':
      return (
        <span className={`${className} relative block`}>
          <span className="absolute left-[42%] top-0 h-[42%] w-[24%] rounded bg-[#36c5f0]" />
          <span className="absolute right-0 top-[42%] h-[24%] w-[42%] rounded bg-[#2eb67d]" />
          <span className="absolute bottom-0 left-[42%] h-[42%] w-[24%] rounded bg-[#ecb22e]" />
          <span className="absolute left-0 top-[42%] h-[24%] w-[42%] rounded bg-[#e01e5a]" />
        </span>
      )
    case 'figma':
      return <span className={`${className} grid place-items-center rounded bg-[#a259ff] text-[0.65rem] font-black text-white`}>F</span>
    case 'linear':
      return <span className={`${className} grid place-items-center rounded-full bg-black text-[0.65rem] font-black text-white`}>L</span>
    case 'react':
      return <span className={`${className} grid place-items-center rounded-full border border-[#61dafb] text-[0.65rem] font-black text-[#00a9d6]`}>⚛</span>
    case 'laravel':
      return <span className={`${className} grid place-items-center rounded bg-[#ff2d20] text-[0.65rem] font-black text-white`}>L</span>
    case 'aws':
      return <span className={`${className} grid place-items-center rounded bg-[#ff9900] text-[0.55rem] font-black text-black`}>aws</span>
    case 'vite':
      return <span className={`${className} grid place-items-center rounded bg-gradient-to-br from-[#bd34fe] to-[#ffd62e] text-[0.65rem] font-black text-white`}>V</span>
    case 'openai':
      return <span className={`${className} grid place-items-center rounded-full border border-black/30 text-[0.58rem] font-black text-black`}>AI</span>
    case 'supabase':
      return <span className={`${className} grid place-items-center rounded bg-[#3ecf8e] text-[0.65rem] font-black text-white`}>S</span>
    case 'firebase':
      return <span className={`${className} grid place-items-center rounded bg-[#ffca28] text-[0.65rem] font-black text-black`}>F</span>
    case 'tailwind':
      return <span className={`${className} grid place-items-center rounded bg-[#38bdf8] text-[0.65rem] font-black text-white`}>T</span>
    case 'mysql':
      return <span className={`${className} grid place-items-center rounded bg-[#00758f] text-[0.58rem] font-black text-white`}>SQL</span>
    case 'postgres':
      return <span className={`${className} grid place-items-center rounded bg-[#336791] text-[0.65rem] font-black text-white`}>P</span>
    case 'node':
      return <span className={`${className} grid place-items-center rounded bg-[#339933] text-[0.65rem] font-black text-white`}>N</span>
    case 'typescript':
      return <span className={`${className} grid place-items-center rounded bg-[#3178c6] text-[0.65rem] font-black text-white`}>TS</span>
    case 'github':
      return <span className={`${className} grid place-items-center rounded-full bg-black text-[0.65rem] font-black text-white`}>G</span>
    case 'cloudflare':
      return <span className={`${className} grid place-items-center rounded bg-[#f38020] text-[0.65rem] font-black text-white`}>C</span>
    case 'analytics':
      return <span className={`${className} grid place-items-center rounded bg-[#f9ab00] text-[0.65rem] font-black text-white`}>A</span>
    case 'paystack':
      return <span className={`${className} grid place-items-center rounded bg-[#09a5db] text-[0.65rem] font-black text-white`}>P</span>
    default:
      return <span className={`${className} grid place-items-center rounded bg-black/10 text-[0.65rem] font-black text-black`}>{icon.slice(0, 1).toUpperCase()}</span>
  }
}

function TemplateShell({ children, preview = false }: { children: ReactNode; preview?: boolean }) {
  const [showPreviewBanner, setShowPreviewBanner] = useState(preview)

  useEffect(() => {
    const previousBackground = document.body.style.backgroundColor
    document.body.style.backgroundColor = '#efeee8'

    return () => {
      document.body.style.backgroundColor = previousBackground
    }
  }, [])

  return (
    <main className="agency-template min-h-screen overflow-hidden bg-[#efeee8] text-[#111111] antialiased">
      {showPreviewBanner ? (
        <div className="fixed inset-x-0 top-0 z-[180] flex min-h-8 items-center justify-center border-b border-amber-300/20 bg-amber-300 px-12 py-2 text-center text-xs font-black uppercase tracking-[0.18em] text-[#111827]">
          <span>Admin preview only</span>
          <button
            type="button"
            className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-[#111827] transition hover:bg-black/10"
            aria-label="Close admin preview notice"
            onClick={() => setShowPreviewBanner(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      {children}
    </main>
  )
}

function ChatPill({ label = 'Chat with us' }: { label?: string }) {
  return (
    <Link to="/booking" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 bg-black/42 px-1.5 pr-4 text-sm font-bold text-white shadow-[0_20px_70px_rgba(0,0,0,0.25)] backdrop-blur-xl transition hover:bg-white/10">
      <span className="grid h-8 w-8 place-items-center rounded-md bg-[#ffc400] text-[#0b0b08]">
        <MessageCircle className="h-4 w-4" />
      </span>
      {label}
    </Link>
  )
}

function cleanProjectUrl(url?: string) {
  const value = url?.trim()
  if (!value || value === '#') return undefined
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

function ProjectMediaPreview({ project, onPlay }: { project: Project; onPlay: (media: ProjectVideoMedia) => void }) {
  const videoUrl = getProjectVideoUrl(project)
  const displayImage = getProjectPrimaryImage(project)
  const videoCoverImage = getProjectVideoCoverImage(project)
  const fallbackSrc = projectImageFallbackSrc(project)

  if (getYoutubeEmbedUrl(videoUrl)) {
    return (
      <>
        <SafeImage src={videoCoverImage} fallbackSrc={fallbackSrc} alt={project.title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
        <button type="button" onClick={() => onPlay({ title: project.title, type: 'youtube', url: videoUrl })} className="absolute inset-0 z-10 grid place-items-center bg-black/18 text-white transition hover:bg-black/28" aria-label={`Play ${project.title}`}>
          <span className="grid h-12 w-12 place-items-center rounded-full border border-white/25 bg-white/18 backdrop-blur-md">
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          </span>
        </button>
      </>
    )
  }

  if (isVideoUrl(videoUrl)) {
    return (
      <>
        {videoCoverImage ? (
          <SafeImage src={videoCoverImage} fallbackSrc={fallbackSrc} alt={project.title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <video className="h-full w-full object-cover" muted preload="metadata" playsInline>
            <source src={videoUrl} />
          </video>
        )}
        <button type="button" onClick={() => onPlay({ title: project.title, type: 'video', url: videoUrl })} className="absolute inset-0 z-10 grid place-items-center bg-black/18 text-white transition hover:bg-black/28" aria-label={`Play ${project.title}`}>
          <span className="grid h-12 w-12 place-items-center rounded-full border border-white/25 bg-white/18 backdrop-blur-md">
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          </span>
        </button>
      </>
    )
  }

  return <SafeImage src={displayImage} fallbackSrc={fallbackSrc} alt={project.title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
}

function AgencyProjectCard({ project, showDescription, onPlayMedia }: { project: Project; showDescription: boolean; onPlayMedia: (media: ProjectVideoMedia) => void }) {
  const projectUrl = cleanProjectUrl(project.websiteUrl)
  const videoMedia = getProjectVideoMedia(project)

  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-black/5 bg-white/35 p-4 text-[#202328] shadow-[0_18px_55px_rgba(15,23,42,0.07)] backdrop-blur-sm">
      <BorderBeam size={220} duration={8} borderWidth={1.25} colorFrom="#d6d2c8" colorTo="#f6f3ec" delay={project.id % 4} />
      <div className="relative h-44 overflow-hidden rounded-xl border border-black/5 bg-white/30 sm:h-48">
        <ProjectMediaPreview project={project} onPlay={onPlayMedia} />
      </div>

      <div className="mt-6 flex flex-1 flex-col">
        <span className="mb-4 w-fit rounded-full border border-black/5 bg-white/50 px-3.5 py-1 text-xs font-semibold text-black/46">{project.category}</span>
        <h3 className="text-lg font-semibold leading-tight text-[#202328] sm:text-xl">{project.title}</h3>
        {showDescription && project.summary ? <p className="mt-3 flex-1 text-sm leading-6 text-black/58">{project.summary}</p> : null}

        <div className={showDescription && project.summary ? 'mt-5 flex flex-wrap items-center gap-2' : 'mt-4 flex flex-wrap items-center gap-2'}>
          {projectUrl ? (
            <a href={projectUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-black/8 bg-white/60 px-3 text-[0.7rem] font-semibold text-black/62 transition hover:bg-white hover:text-black sm:text-xs">
              View live project
              <ArrowRight className="h-3 w-3" />
            </a>
          ) : null}
          {videoMedia ? (
            <button type="button" onClick={() => onPlayMedia(videoMedia)} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-black/8 bg-white/60 px-3 text-[0.7rem] font-semibold text-black/62 transition hover:bg-white hover:text-black sm:text-xs">
              Play presentation
              <Play className="h-3 w-3 fill-current" />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function ProjectCardSkeleton() {
  return (
    <article className="relative flex h-full min-h-[27rem] flex-col overflow-hidden rounded-[1.35rem] border border-black/5 bg-white/35 p-4 shadow-[0_18px_55px_rgba(15,23,42,0.07)] backdrop-blur-sm">
      <div className="h-44 rounded-xl bg-black/[0.045] sm:h-48" />
      <div className="mt-6 h-6 w-24 rounded-full bg-black/[0.045]" />
      <div className="mt-5 h-6 w-3/4 rounded-full bg-black/[0.055]" />
      <div className="mt-3 h-4 w-full rounded-full bg-black/[0.04]" />
      <div className="mt-2 h-4 w-4/5 rounded-full bg-black/[0.04]" />
      <div className="mt-auto h-9 w-36 rounded-lg bg-black/[0.05]" />
    </article>
  )
}

function ReviewPlatformIcon({ review }: { review: Review }) {
  if (review.provider === 'google') {
    return (
      <svg className="h-8 w-8" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.24 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.37c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.37 12 5.37z" />
      </svg>
    )
  }

  if (review.provider === 'manual' || review.provider === 'website') {
    return <Globe2 className="h-7 w-7" />
  }

  return <BrandIcon icon={review.provider} className="h-7 w-7" />
}

function TestimonialCard({ review }: { review: Review }) {
  const role = review.providerLabel || 'Verified review'

  return (
    <article className="relative flex h-[18rem] w-[72vw] shrink-0 snap-center flex-col justify-between overflow-hidden rounded-[1.35rem] bg-black p-6 text-white shadow-[0_20px_70px_rgba(0,0,0,0.18)] md:h-[20rem] md:w-[34rem] md:p-8 lg:w-[39rem]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:44px_44px] opacity-55" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_7%_8%,rgba(255,255,255,0.24),transparent_22%),linear-gradient(90deg,rgba(0,0,0,0.1),rgba(0,0,0,0.72))]" />

      <div className="relative text-white">
        <ReviewPlatformIcon review={review} />
      </div>

      <div className="relative">
        <p className="line-clamp-4 text-base font-medium leading-7 text-white md:text-lg md:leading-8">"{review.content}"</p>
        <div className="mt-7 flex items-center gap-3">
          {review.authorImage ? (
            <SafeImage
              src={review.authorImage}
              fallbackSrc="/favicon.png"
              alt={review.authorName}
              className="h-9 w-9 rounded-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : null}
          <p className="min-w-0 text-sm font-medium text-white">
            <span className="block truncate">{review.authorName}</span>
            <span className="block truncate text-white/45">{role}</span>
          </p>
        </div>
      </div>
    </article>
  )
}

function TestimonialCardSkeleton() {
  return (
    <article className="relative flex h-[18rem] w-[72vw] shrink-0 snap-center flex-col justify-between overflow-hidden rounded-[1.35rem] bg-black p-6 text-white shadow-[0_20px_70px_rgba(0,0,0,0.18)] md:h-[20rem] md:w-[34rem] md:p-8 lg:w-[39rem]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:44px_44px] opacity-55" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_7%_8%,rgba(255,255,255,0.24),transparent_22%),linear-gradient(90deg,rgba(0,0,0,0.1),rgba(0,0,0,0.72))]" />
      <div className="relative h-9 w-9 rounded-full bg-white/16" />
      <div className="relative">
        <div className="h-5 w-11/12 rounded-full bg-white/14" />
        <div className="mt-3 h-5 w-4/5 rounded-full bg-white/12" />
        <div className="mt-8 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-white/14" />
          <div className="min-w-0 flex-1">
            <div className="h-4 w-32 rounded-full bg-white/18" />
            <div className="mt-2 h-3 w-44 rounded-full bg-white/10" />
          </div>
        </div>
      </div>
    </article>
  )
}

function GoogleReviewLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.4 0 6.4 1.2 8.8 3.4l6.6-6.6C35.4 2.6 30.1.5 24 .5 14.8.5 6.9 5.8 3.1 13.5l7.7 6c1.8-5.8 7.1-10 13.2-10z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-2.8-.4-4.1H24v8.3h12.9c-.3 2.1-1.7 5.3-4.9 7.5l7.5 5.8c4.4-4.1 7-10.1 7-17.5z" />
      <path fill="#FBBC05" d="M10.8 28.5c-.5-1.4-.8-2.9-.8-4.5s.3-3.1.8-4.5l-7.7-6C1.4 16.7.5 20.2.5 24s.9 7.3 2.6 10.5l7.7-6z" />
      <path fill="#34A853" d="M24 47.5c6.1 0 11.3-2 15.1-5.5l-7.5-5.8c-2 1.4-4.7 2.3-7.6 2.3-6.1 0-11.4-4.1-13.2-9.9l-7.7 6C6.9 42.2 14.8 47.5 24 47.5z" />
    </svg>
  )
}

function TrustpilotReviewLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M17.227 16.67l2.19 6.742-7.413-5.388 5.223-1.354zM24 9.31h-9.165L12.005.589l-2.84 8.723L0 9.3l7.422 5.397-2.84 8.714 7.422-5.388 4.583-3.326L24 9.311z" />
    </svg>
  )
}

function ReviewPlatformModal({ links, onClose }: { links: ReviewLinks; onClose: () => void }) {
  const platforms = [
    { name: 'Google', href: links.google, icon: <GoogleReviewLogo className="h-7 w-7" /> },
    { name: 'Trustpilot', href: links.trustpilot, icon: <TrustpilotReviewLogo className="h-7 w-7" /> },
  ]

  return (
    <div className="fixed inset-0 z-[170] grid place-items-center bg-[#030712]/70 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Choose review platform">
      <div className="w-full max-w-md rounded-2xl border border-white/12 bg-white p-4 shadow-[0_24px_80px_rgba(15,23,42,0.28)] sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-[#111827]">Drop a review</h3>
            <p className="mt-1 text-sm leading-6 text-[#6b7280]">Choose where you would like to leave your feedback.</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#d7dbe5] text-[#111827] transition hover:bg-[#f8f8fb]" aria-label="Close review options">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {platforms.map((platform) => {
            const disabled = !platform.href.trim()
            const className = `flex min-h-24 flex-col justify-between rounded-xl border p-4 text-left transition ${disabled ? 'cursor-not-allowed border-[#d7dbe5] bg-[#f8f8fb] text-[#9ca3af]' : 'border-[#d7dbe5] bg-white text-[#111827] hover:border-[#1d4f72] hover:bg-[#f6fbff]'}`

            if (disabled) {
              return (
                <div key={platform.name} className={className} aria-disabled="true">
                  <span>{platform.icon}</span>
                  <span className="mt-3 text-sm font-semibold">{platform.name}</span>
                  <span className="mt-1 text-xs font-normal">Link not added yet</span>
                </div>
              )
            }

            return (
              <a key={platform.name} href={platform.href} target="_blank" rel="noreferrer" className={className}>
                <span>{platform.icon}</span>
                <span className="mt-3 flex items-center justify-between gap-2 text-sm font-semibold">
                  {platform.name}
                  <ExternalLink className="h-3.5 w-3.5" />
                </span>
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ProjectVideoModal({ media, onClose }: { media: ProjectVideoMedia; onClose: () => void }) {
  const youtubeEmbedUrl = media.type === 'youtube' ? getYoutubeEmbedUrl(media.url) : undefined

  return (
    <div className="fixed inset-0 z-[160] grid place-items-center bg-black/78 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={media.title}>
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-white/14 bg-[#050816] shadow-[0_30px_100px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
          <h3 className="truncate text-sm font-bold text-white">{media.title}</h3>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/8 text-white transition hover:bg-white/14" aria-label="Close video">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="aspect-video bg-black">
          {youtubeEmbedUrl ? (
            <iframe className="h-full w-full" src={youtubeEmbedUrl} title={media.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
          ) : (
            <video className="h-full w-full" src={media.url} controls autoPlay playsInline />
          )}
        </div>
      </div>
    </div>
  )
}

function HeroOrbitArc() {
  return (
    <div className="absolute -bottom-[25rem] left-1/2 flex h-full w-full -translate-x-1/2 justify-center md:-bottom-[20.15rem]">
      <svg
        className="h-[62rem] w-[68rem] max-w-none md:h-[112.875rem] md:w-[121.9375rem]"
        width="1951"
        height="1806"
        viewBox="0 0 1951 1806"
        fill="none"
        overflow="visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="bakhtech-orbit-stroke" x1="259" y1="845" x2="1687" y2="846" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6f3f1c" stopOpacity="0" />
            <stop offset="0.21" stopColor="#8f5428" stopOpacity="0.12" />
            <stop offset="0.35" stopColor="#d78343" stopOpacity="0.52" />
            <stop offset="0.48" stopColor="#ffad67" />
            <stop offset="0.58" stopColor="#f6a05d" stopOpacity="0.86" />
            <stop offset="0.72" stopColor="#a66331" stopOpacity="0.18" />
            <stop offset="1" stopColor="#6f3f1c" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="bakhtech-orbit-fill" cx="0" cy="0" r="1" gradientTransform="matrix(0 -384 761 0 975 265)" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffb265" stopOpacity="0.34" />
            <stop offset="0.36" stopColor="#a7632f" stopOpacity="0.12" />
            <stop offset="1" stopColor="#030302" stopOpacity="0" />
          </radialGradient>
          <filter id="bakhtech-orbit-glow" x="94" y="147" width="1763" height="1618" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="-9" stdDeviation="24" floodColor="#e58a42" floodOpacity="0.58" />
            <feDropShadow dx="0" dy="-2" stdDeviation="8" floodColor="#ffbd75" floodOpacity="0.5" />
          </filter>
        </defs>
        <path
          d="M975.5 255C1402.88 255 1749 569.029 1749 956C1749 1342.97 1402.88 1657 975.5 1657C548.119 1657 202 1342.97 202 956C202 569.029 548.119 255 975.5 255Z"
          fill="url(#bakhtech-orbit-fill)"
          opacity="0.84"
        />
        <path
          d="M975.5 255C1402.88 255 1749 569.029 1749 956C1749 1342.97 1402.88 1657 975.5 1657C548.119 1657 202 1342.97 202 956C202 569.029 548.119 255 975.5 255Z"
          stroke="url(#bakhtech-orbit-stroke)"
          strokeWidth="2.4"
          strokeLinecap="round"
          filter="url(#bakhtech-orbit-glow)"
        />
      </svg>
    </div>
  )
}

export function AgencyHomeTemplate({ preview = false }: AgencyHomeTemplateProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notificationIndex, setNotificationIndex] = useState(0)
  const [openComparisonIndex, setOpenComparisonIndex] = useState(0)
  const [openFaqIndex, setOpenFaqIndex] = useState(0)
  const [portfolioProjects, setPortfolioProjects] = useState<Project[]>([])
  const [projectImageProjects, setProjectImageProjects] = useState<Project[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [homepageDataLoaded, setHomepageDataLoaded] = useState(false)
  const [showPortfolioDescriptions, setShowPortfolioDescriptions] = useState(true)
  const [founderDeskImage, setFounderDeskImage] = useState('/founder-portrait.png')
  const [footerSettings, setFooterSettings] = useState(defaultFooterSettings)
  const [reviewLinks, setReviewLinks] = useState<ReviewLinks>({ google: '', trustpilot: '' })
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [activeVideo, setActiveVideo] = useState<ProjectVideoMedia | null>(null)
  const [activeTestimonialIndex, setActiveTestimonialIndex] = useState(0)
  const [testimonialsInView, setTestimonialsInView] = useState(false)
  const testimonialsSectionRef = useRef<HTMLElement | null>(null)
  const testimonialsTrackRef = useRef<HTMLDivElement | null>(null)
  const testimonialDragRef = useRef({ active: false, dragged: false, pointerId: 0, startX: 0, scrollLeft: 0 })
  const notificationStack = Array.from({ length: 3 }, (_, stackIndex) => updateNotifications[(notificationIndex + stackIndex) % updateNotifications.length])
  const showcaseScreenProjects = projectImageProjects.length ? projectImageProjects : portfolioProjects
  const topShowcaseScreens = showcaseScreenProjects.filter((_, index) => index % 2 === 0)
  const bottomShowcaseScreens = showcaseScreenProjects.filter((_, index) => index % 2 === 1)
  const loopedReviews = reviews.length > 1 ? [...reviews, ...reviews] : reviews

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNotificationIndex((index) => (index + 1) % updateNotifications.length)
    }, 2600)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const section = testimonialsSectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      ([entry]) => setTestimonialsInView(entry.isIntersecting),
      { threshold: 0.35 },
    )
    observer.observe(section)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!testimonialsInView || loopedReviews.length <= 1) return

    const timer = window.setInterval(() => {
      setActiveTestimonialIndex((index) => (index + 1) % loopedReviews.length)
    }, 3600)

    return () => window.clearInterval(timer)
  }, [loopedReviews.length, testimonialsInView])

  useEffect(() => {
    const track = testimonialsTrackRef.current
    const target = track?.children.item(activeTestimonialIndex) as HTMLElement | null
    if (!track || !target) return

    track.scrollTo({
      left: target.offsetLeft - track.clientWidth / 2 + target.clientWidth / 2,
      behavior: 'smooth',
    })
  }, [activeTestimonialIndex])

  useEffect(() => {
    if (loopedReviews.length && activeTestimonialIndex >= loopedReviews.length) {
      setActiveTestimonialIndex(0)
    }
  }, [activeTestimonialIndex, loopedReviews.length])

  useEffect(() => {
    let cancelled = false

    Promise.allSettled([api.publicProjects(), api.publicSettings(), api.publicReviews()])
      .then(([projectResult, settingsResult, reviewResult]) => {
        if (cancelled) return

        const projects = projectResult.status === 'fulfilled' ? projectResult.value.projects : []
        const seenProjectImages = new Set<string>()
        const imageProjects = projects.filter((project) => {
          const src = getProjectPrimaryImage(project) || getProjectVideoCoverImage(project)
          if (!src || seenProjectImages.has(src)) return false
          seenProjectImages.add(src)
          return true
        })
        setProjectImageProjects(imageProjects)
        setPortfolioProjects(projects.slice(0, 6))
        setReviews(reviewResult.status === 'fulfilled' ? reviewResult.value.reviews : [])
        if (settingsResult.status === 'fulfilled') {
          const publicSettings = settingsResult.value.settings
          setShowPortfolioDescriptions(publicSettings.homePortfolioShowDescriptions !== 'false')
          setFounderDeskImage(publicSettings.founder_desk_image || '/founder-portrait.png')
          setReviewLinks({
            google: publicSettings.googleReviewUrl || '',
            trustpilot: publicSettings.trustpilotReviewUrl || '',
          })
          setFooterSettings({
            footerCtaTitle: publicSettings.footerCtaTitle || defaultFooterSettings.footerCtaTitle,
            footerWatermark: publicSettings.footerWatermark || defaultFooterSettings.footerWatermark,
            footerDescription: publicSettings.footerDescription || defaultFooterSettings.footerDescription,
            footerCtaLabel: publicSettings.footerCtaLabel || defaultFooterSettings.footerCtaLabel,
            footerCopyright: publicSettings.footerCopyright || defaultFooterSettings.footerCopyright,
          })
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setHomepageDataLoaded(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  function updateActiveTestimonialFromScroll() {
    const track = testimonialsTrackRef.current
    if (!track || !track.children.length) return

    const trackCenter = track.scrollLeft + track.clientWidth / 2
    let closestIndex = 0
    let closestDistance = Number.POSITIVE_INFINITY

    Array.from(track.children).forEach((child, index) => {
      const item = child as HTMLElement
      const itemCenter = item.offsetLeft + item.clientWidth / 2
      const distance = Math.abs(itemCenter - trackCenter)
      if (distance < closestDistance) {
        closestDistance = distance
        closestIndex = index
      }
    })

    setActiveTestimonialIndex(closestIndex)
  }

  function handleTestimonialPointerDown(event: PointerEvent<HTMLDivElement>) {
    const track = testimonialsTrackRef.current
    if (!track) return

    testimonialDragRef.current = {
      active: true,
      dragged: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: track.scrollLeft,
    }
    track.setPointerCapture(event.pointerId)
  }

  function handleTestimonialPointerMove(event: PointerEvent<HTMLDivElement>) {
    const track = testimonialsTrackRef.current
    const drag = testimonialDragRef.current
    if (!track || !drag.active || drag.pointerId !== event.pointerId) return

    const delta = event.clientX - drag.startX
    if (Math.abs(delta) > 4) drag.dragged = true
    track.scrollLeft = drag.scrollLeft - delta
  }

  function handleTestimonialPointerUp(event: PointerEvent<HTMLDivElement>) {
    const track = testimonialsTrackRef.current
    const drag = testimonialDragRef.current
    if (!track || !drag.active || drag.pointerId !== event.pointerId) return

    testimonialDragRef.current.active = false
    if (track.hasPointerCapture(event.pointerId)) {
      track.releasePointerCapture(event.pointerId)
    }
    updateActiveTestimonialFromScroll()
  }

  return (
    <TemplateShell preview={preview}>
      <section className="relative mx-auto my-2 min-h-[min(41rem,calc(100svh-1rem))] w-[calc(100%-1rem)] max-w-[calc(100vw-1rem)] overflow-hidden rounded-[1.45rem] bg-[#020302] px-5 pb-0 pt-0 text-white md:my-3 md:min-h-[min(56rem,calc(100svh-1.5rem))] md:w-[calc(100%-1.5rem)] md:max-w-none md:px-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px)] bg-[size:70px_70px] opacity-60" />
          <div className="absolute inset-x-0 top-0 h-[24rem] bg-[linear-gradient(rgba(255,255,255,0.075)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.075)_1px,transparent_1px)] bg-[size:70px_70px] opacity-70" />
          <div className="absolute left-1/2 top-0 h-[38rem] w-[54rem] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(190,132,57,0.34),rgba(82,52,25,0.22)_38%,transparent_74%)]" />
          <div className="absolute inset-x-0 top-0 h-[18rem] bg-[radial-gradient(circle_at_3%_24%,rgba(255,255,255,0.72)_0_1px,transparent_1.5px),radial-gradient(circle_at_7%_14%,rgba(255,255,255,0.92)_0_1px,transparent_1.5px),radial-gradient(circle_at_13%_8%,rgba(255,255,255,0.42)_0_1px,transparent_1.5px),radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.38)_0_1px,transparent_1.5px),radial-gradient(circle_at_31%_5%,rgba(255,255,255,0.56)_0_1px,transparent_1.5px),radial-gradient(circle_at_43%_27%,rgba(255,255,255,0.76)_0_1px,transparent_1.5px),radial-gradient(circle_at_56%_14%,rgba(255,255,255,0.34)_0_1px,transparent_1.5px),radial-gradient(circle_at_69%_28%,rgba(255,255,255,0.82)_0_1px,transparent_1.5px),radial-gradient(circle_at_81%_15%,rgba(255,255,255,0.44)_0_1px,transparent_1.5px),radial-gradient(circle_at_91%_7%,rgba(255,255,255,0.96)_0_1px,transparent_1.5px),radial-gradient(circle_at_98%_2%,rgba(255,255,255,0.74)_0_1px,transparent_1.5px)] opacity-95" />
          <div className="absolute left-[62%] top-[16.5%] h-[4.35rem] w-[4.35rem] bg-[#9d7422]/16" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#020302_0%,rgba(2,3,2,0.18)_28%,rgba(2,3,2,0.12)_64%,#020302_100%)]" />
          <HeroOrbitArc />
          <div className="absolute bottom-[-1.9rem] left-1/2 -translate-x-1/2 select-none text-[clamp(5.8rem,27vw,8rem)] font-black leading-none tracking-normal text-white/[0.055] md:bottom-[-5.8rem] md:text-[clamp(8rem,22vw,20rem)]">
            Bakhtech
          </div>
        </div>

        <nav className="relative z-20 mx-auto flex max-w-[86rem] items-center justify-between py-6 md:py-7">
          <Link to="/" className="flex items-center" aria-label="Bakhtech home" onClick={() => setMobileMenuOpen(false)}>
            <img src="/bakhtech-logo-dark.png" alt="Bakhtech" className="h-8 w-auto object-contain md:h-10" width="160" height="40" decoding="async" />
          </Link>
          <div className="hidden items-center gap-14 text-sm font-bold text-white/82 md:flex">
            {navigation.map((item) => (
              <Link key={`${item.label}-${item.href}`} to={item.href} className="hover:text-white">
                {item.label}
              </Link>
            ))}
          </div>
          <Link to="/booking" className="hidden min-h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-black text-[#06070b] transition hover:bg-white/88 md:inline-flex">
            Book now
          </Link>
          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            className="grid h-10 w-10 place-items-center rounded-xl text-white transition hover:bg-white/10 md:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          {mobileMenuOpen ? (
            <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl border border-white/10 bg-black/82 p-2 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-2xl md:hidden">
              {navigation.map((item) => (
                <Link
                  key={`${item.label}-${item.href}`}
                  to={item.href}
                  className="flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-white/86 transition hover:bg-white/10 hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                to="/booking"
                className="mt-2 flex min-h-11 items-center justify-center rounded-xl bg-white px-3 text-sm font-black text-[#06070b]"
                onClick={() => setMobileMenuOpen(false)}
              >
                Book now
              </Link>
            </div>
          ) : null}
        </nav>

        <div className="relative z-10 mx-auto grid max-w-[86rem] gap-6 pb-20 pt-24 md:gap-12 md:pb-36 md:pt-[12.5rem] md:grid-cols-[minmax(0,1.65fr)_minmax(20rem,0.9fr)] md:items-start">
          <div>
            <h1 className="max-w-[46rem] text-[clamp(2.45rem,9vw,3.45rem)] font-semibold leading-[0.98] tracking-normal text-white md:text-[clamp(3.2rem,3.9vw,4.9rem)]">
              <span className="block">Need a website</span>
              <span className="block">that stands</span>
              <span className="block">out?</span>
            </h1>
          </div>

          <div className="pt-0">
            <p className="max-w-[24rem] text-base font-semibold leading-7 text-white md:text-xl md:leading-8">
              We design and build websites that drive results and help your business grow. No Calls. No BS. Just Results.
            </p>
            <div className="mt-6 md:mt-9">
              <ChatPill label="Chat with us" />
            </div>
          </div>
        </div>
      </section>

      <section className="-mt-4 border-y border-black/5 bg-[#efeee8] px-4 py-6 md:mt-0 md:py-10">
        <div className="mx-auto max-w-6xl overflow-hidden">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-black/40">Trusted by fast-growing brands</p>
          <div className="relative mt-5 overflow-hidden md:mt-8">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#efeee8] to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#efeee8] to-transparent" />
            <div className="marquee-track flex w-max items-center gap-8 [--marquee-duration:42s] md:gap-12">
              {[...clientLogos, ...clientLogos].map((logo, index) => (
                <div key={`${logo.name}-${index}`} className="flex h-11 w-32 shrink-0 items-center justify-center overflow-visible md:h-16 md:w-[11.25rem]">
                  <img
                    src={logo.src}
                    alt={logo.name}
                    className="block h-auto max-h-10 w-full object-contain grayscale opacity-55 contrast-125 transition hover:grayscale-0 hover:opacity-90 md:max-h-[3.75rem]"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-4xl font-black tracking-normal text-[#202328] md:text-5xl lg:text-[3.35rem]">Websites Built for Real Business Growth</h2>

          <div className="mt-10 grid gap-3 md:grid-cols-12 md:grid-rows-[18.5rem_18.5rem]">
            <article className="relative min-h-[39rem] overflow-hidden rounded-[1.25rem] bg-[#050505] p-3 text-white shadow-sm md:col-span-4 md:row-span-2 md:min-h-0">
              <div className="relative h-[21.2rem] overflow-hidden rounded-[0.9rem] bg-[#f4f4f2] px-4 pb-0 pt-4">
                <div className="h-full rounded-t-xl bg-[#ededeb] p-3 shadow-[0_14px_45px_rgba(0,0,0,0.06)]">
                  <div className="mb-3 flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b6b]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#fbbf24]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#34d399]" />
                    <span className="mx-auto h-2.5 w-32 rounded-full bg-white" />
                  </div>
                  <div className="h-[18.1rem] rounded-t-lg border border-black/4 bg-white p-3">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="h-3 w-3 rounded-full bg-[#dededb]" />
                      <div className="flex gap-2">
                        <span className="h-1.5 w-7 rounded-full bg-[#e4e4e1]" />
                        <span className="h-1.5 w-7 rounded-full bg-[#e4e4e1]" />
                        <span className="h-1.5 w-7 rounded-full bg-[#e4e4e1]" />
                        <span className="h-2.5 w-5 rounded-full bg-[#dededb]" />
                      </div>
                    </div>
                    <div className="mx-auto h-1.5 w-36 rounded-full bg-[#d8d8d5]" />
                    <div className="mx-auto mt-4 flex justify-center gap-2">
                      <span className="h-3 w-9 rounded-full bg-[#d9d9d6]" />
                      <span className="h-3 w-9 rounded-full bg-[#d9d9d6]" />
                    </div>
                    <div className="mx-auto mt-2 flex justify-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-[#d7d7d4]" />
                      <span className="h-3 w-3 rounded-full bg-[#d7d7d4]" />
                      <span className="h-3 w-3 rounded-full bg-[#d7d7d4]" />
                      <span className="h-3 w-3 rounded-full bg-[#d7d7d4]" />
                    </div>
                    <div className="mx-auto mt-5 grid aspect-[1.12] w-[70%] place-items-center bg-[#f0f0ee]">
                      <span className="relative h-7 w-7 text-black/24 before:absolute before:left-1 before:top-1 before:h-2 before:w-2 before:border-l before:border-t before:border-current after:absolute after:right-1 after:top-1 after:h-2 after:w-2 after:border-r after:border-t after:border-current">
                        <span className="absolute bottom-1 left-1 h-2 w-2 border-b border-l border-current" />
                        <span className="absolute bottom-1 right-1 h-2 w-2 border-b border-r border-current" />
                      </span>
                    </div>
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(180deg,rgba(244,244,242,0),rgba(255,255,255,0.86)_40%,rgba(5,5,5,0.94))]" />
              </div>
              <div className="absolute inset-x-0 bottom-0 top-[20.8rem] bg-[radial-gradient(circle_at_58%_0%,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle,rgba(255,255,255,0.11)_1px,transparent_1px),linear-gradient(180deg,rgba(5,5,5,0.74),#050505_32%)] bg-[length:auto,8px_8px,auto] p-8 pt-12">
                <h3 className="text-lg font-black">Design and Development</h3>
                <p className="mt-4 text-base font-semibold leading-7 text-white/58">
                  Designed to perfection, Bakhtech helps you take your dream idea to reality through expert design and development services.
                </p>
                <Link to="/about" className="mt-10 inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/16 bg-black/60 px-1.5 pr-4 text-sm font-black text-white transition hover:bg-white/10">
                  <span className="grid h-8 w-8 place-items-center rounded-md bg-[#ffc400] text-[#0b0b08]">
                    <Check className="h-4 w-4" />
                  </span>
                  About Us
                </Link>
              </div>
            </article>

            <article className="relative min-h-[18.5rem] overflow-hidden rounded-2xl bg-white p-5 shadow-sm md:col-span-4 md:min-h-0">
              <h3 className="relative z-10 max-w-[14rem] text-lg font-semibold leading-7 text-black">Regular updates and progress tracking</h3>
              <div className="absolute right-4 top-4 h-28 w-36 opacity-65 [background-image:radial-gradient(circle,rgba(0,0,0,0.08)_1px,transparent_1px)] [background-size:10px_10px]" />
              <div className="absolute left-1/2 top-[4.7rem] h-32 w-32 -translate-x-1/2 rounded-full border-[1.65rem] border-[#eee9d9]" />
              <div className="absolute left-1/2 top-[4.7rem] h-32 w-32 -translate-x-1/2 rounded-full border-[1.65rem] border-transparent border-r-[#f8f8f7] border-t-[#f8f8f7]" />
              {notificationStack.map((notification, stackIndex) => {
                const isFront = stackIndex === 0
                const stackStyles = [
                  { bottom: '2.25rem', left: '1.25rem', right: '1.25rem', zIndex: 40, opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)', boxShadow: '0 14px 42px rgba(0,0,0,0.10)' },
                  { bottom: '5.15rem', left: '1.5rem', right: '1.5rem', zIndex: 30, opacity: 0.92, transform: 'translate3d(0, -2px, 0) scale(0.985)', boxShadow: '0 10px 26px rgba(0,0,0,0.06)' },
                  { bottom: '5.9rem', left: '2rem', right: '2rem', zIndex: 20, opacity: 0.72, transform: 'translate3d(0, -4px, 0) scale(0.965)', boxShadow: '0 8px 20px rgba(0,0,0,0.04)' },
                ][stackIndex]

                return (
                  <div
                    key={`${notification.label}-${stackIndex === 0 ? notificationIndex : stackIndex}`}
                    className={`absolute rounded-lg border border-black/8 bg-white p-4 ${isFront ? 'animate-[notification-front-exit_2600ms_ease-in-out_forwards]' : ''}`}
                    style={stackStyles}
                    aria-hidden={!isFront}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className={`font-mono text-xs text-black/34 ${isFront ? '' : 'opacity-0'}`}>notification</p>
                        <p className={`${isFront ? 'mt-3 text-base text-black/74' : 'mt-1 truncate text-sm text-black/34'} font-mono`}>{notification.label}</p>
                      </div>
                      <BrandIcon icon={notification.icon} className={`${isFront ? 'h-5 w-5' : 'h-4 w-4 opacity-45'} mt-1 shrink-0`} />
                    </div>
                  </div>
                )
              })}
            </article>
            <article className="relative min-h-[18.5rem] overflow-hidden rounded-2xl bg-[#050505] p-5 text-white shadow-sm md:col-span-4 md:min-h-0">
              <h3 className="relative z-20 max-w-[19rem] text-lg font-black drop-shadow-[0_2px_12px_rgba(0,0,0,0.65)]">Hosting, Deployment & Maintenance</h3>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(255,255,255,0.35),transparent_22%),radial-gradient(circle_at_72%_52%,rgba(255,255,255,0.18),transparent_28%),linear-gradient(180deg,#050505,#080808)]" />
              <div className="absolute inset-x-0 bottom-[-2rem] top-20 z-0 flex items-center justify-center overflow-visible md:bottom-[-2.5rem] md:top-20">
                <GlobeCdn className="w-[15rem] max-w-none opacity-85 invert md:w-[16.25rem]" speed={0.0025} />
              </div>
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0.92)_0%,rgba(5,5,5,0.12)_34%,rgba(5,5,5,0.65)_100%)]" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#050505] to-transparent" />
            </article>

            <article className="relative min-h-[18.5rem] overflow-hidden rounded-2xl bg-white p-5 shadow-sm md:col-span-5 md:min-h-0">
              <h3 className="relative z-10 text-lg font-semibold text-black">Get found on Google</h3>
              <div className="absolute -right-3 -top-16 h-36 w-36 rounded-2xl border border-black/6" />
              <div className="absolute right-20 -top-6 h-28 w-28 rounded-2xl border border-black/6" />
              <div className="absolute right-44 -top-2 h-24 w-32 rounded-2xl border border-black/6" />
              <div className="absolute right-4 top-16 h-28 w-28 rounded-2xl border border-black/6" />
              <div className="absolute right-32 top-[4.4rem] h-36 w-24 rounded-2xl border border-black/6" />
              <div className="absolute bottom-5 left-12 h-16 w-52 rounded-2xl border border-black/6" />
              <div className="absolute bottom-10 left-24 h-40 w-52 rounded-2xl border border-black/6" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_45%_72%,rgba(0,0,0,0.06),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.24),rgba(255,255,255,0.86)_82%)]" />
              <div className="relative z-10 mt-10 max-w-[24rem] rounded-full bg-white px-5 py-3 shadow-[0_10px_32px_rgba(0,0,0,0.10)]">
                <div className="flex items-center gap-3 text-sm font-semibold text-black/42">
                  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.24 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" />
                    <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84Z" />
                    <path fill="#EA4335" d="M12 5.37c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.37 12 5.37Z" />
                  </svg>
                  <span className="min-w-0 flex-1 truncate">Best Web Design Agency Near Me</span>
                  <Mic className="h-4 w-4 shrink-0 text-black/36" />
                </div>
              </div>
              <div className="relative z-10 mt-3 max-w-[24rem] rounded-xl bg-white p-4 shadow-[0_10px_32px_rgba(0,0,0,0.10)]">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#2563eb] text-white">
                    <Zap className="h-5 w-5 fill-current" />
                  </span>
                  <div>
                    <p className="font-semibold text-black/76">Bakhtech Solutions</p>
                    <p className="text-xs font-semibold text-black/34">www.bakhtech.com.ng / web-design / lagos</p>
                    <p className="mt-2 text-sm font-semibold text-black/64">Website design, development and digital tools for growing brands.</p>
                  </div>
                </div>
                <div className="mt-4 h-2 w-64 max-w-full rounded-full bg-black/5" />
                <div className="mt-2 h-2 w-44 rounded-full bg-black/5" />
              </div>
            </article>

            <article className="relative min-h-[17rem] overflow-hidden rounded-2xl bg-white p-5 shadow-sm md:col-span-3 md:min-h-0">
              <h3 className="relative z-10 max-w-[16rem] text-lg font-semibold leading-6 text-black">Components, Dashboards and Everything else</h3>
              <CpuArchitecture
                className="absolute inset-x-[-2.5rem] bottom-[-1.9rem] h-[15.5rem] w-[calc(100%+5rem)] text-[#e5e5df] md:inset-x-[-2.25rem] md:bottom-[-2.2rem] md:h-[15.2rem]"
                showText={false}
                lineMarkerSize={10}
              />
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent" />
            </article>
          </div>
        </div>
      </section>

      <section id="work" className="relative overflow-hidden px-4 pb-24 pt-14 md:pt-20">
        <div className="pointer-events-none absolute left-1/2 top-0 w-full max-w-6xl -translate-x-1/2 select-none text-center text-[clamp(5rem,17vw,13.5rem)] font-black leading-none tracking-normal text-black/[0.045]">
          Projects
        </div>
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-8 pt-12 md:mb-10 md:pt-20">
            <h2 className="sr-only">Projects</h2>
          </div>

          {!homepageDataLoaded ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, index) => (
                <ProjectCardSkeleton key={`project-skeleton-${index}`} />
              ))}
            </div>
          ) : portfolioProjects.length ? (
            <>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {portfolioProjects.map((project) => (
                  <AgencyProjectCard key={project.id} project={project} showDescription={showPortfolioDescriptions} onPlayMedia={setActiveVideo} />
                ))}
              </div>

              <div className="mt-10 flex justify-center">
                <Link to="/portfolio" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-5 text-sm font-black text-black shadow-sm transition hover:bg-black hover:text-white">
                  Show all projects
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </>
          ) : (
            <div className="mx-auto max-w-xl rounded-3xl border border-black/5 bg-white p-8 text-center font-semibold text-black/60 shadow-sm">Published backend projects will appear here.</div>
          )}
        </div>
      </section>

      <section className="px-4 pb-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-4xl font-black tracking-normal text-[#202328] md:text-5xl lg:text-[3.35rem]">Scaling Successful Companies</h2>

          <div className="mt-10 grid gap-3 lg:grid-cols-12">
            <article className="relative min-h-[26rem] overflow-hidden rounded-[1.35rem] bg-white p-6 shadow-sm lg:col-span-4 lg:row-span-3">
              <div className="absolute inset-x-0 top-0 h-[18rem] bg-[linear-gradient(rgba(0,0,0,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.055)_1px,transparent_1px)] bg-[size:92px_92px]" />
              <div className="absolute inset-x-0 top-0 h-[18rem] bg-[linear-gradient(180deg,rgba(255,255,255,0),#fff_86%)]" />
              <div className="relative -mx-6 h-[15rem] overflow-hidden pt-7">
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent" />
                {[topShowcaseScreens, bottomShowcaseScreens.length ? bottomShowcaseScreens : topShowcaseScreens].map((rowProjects, rowIndex) => (
                  <div key={`showcase-screen-row-${rowIndex}`} className={rowIndex === 0 ? 'relative overflow-hidden' : 'relative mt-4 overflow-hidden'}>
                    <div
                      className={`showcase-screen-track flex w-max items-center gap-3 px-6 ${rowIndex === 1 ? 'showcase-screen-track-reverse' : ''}`}
                    >
                      {[...rowProjects, ...rowProjects].map((project, index) => (
                        <span key={`showcase-screen-${rowIndex}-${project.id}-${index}`} className="block aspect-[16/10] w-40 shrink-0 overflow-hidden rounded-xl border border-black/8 bg-white shadow-[0_14px_28px_rgba(15,23,42,0.16)]">
                          <SafeImage
                            className="h-full w-full object-cover"
                            src={getProjectPrimaryImage(project) || getProjectVideoCoverImage(project)}
                            fallbackSrc={projectImageFallbackSrc(project)}
                            alt={project.title}
                            loading="lazy"
                            decoding="async"
                          />
                        </span>
                      ))}
                      {!rowProjects.length ? (
                        <span className="grid aspect-[16/10] w-40 shrink-0 place-items-center rounded-xl bg-[#e6ded0] text-xs font-black text-black/50 shadow-[0_14px_28px_rgba(15,23,42,0.12)]">
                          PROJECTS
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <div className="absolute bottom-6 left-6 right-6">
                <p className="text-xl font-semibold text-black">See the kind of work we ship</p>
                <div className="mt-4">
                  <Link to="/portfolio" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-black/8 bg-black/42 px-1.5 pr-4 text-sm font-bold text-white shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl transition hover:bg-black/60">
                    <span className="grid h-8 w-8 place-items-center rounded-md bg-[#ffc400] text-[#0b0b08]">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                    View Our Work
                  </Link>
                </div>
              </div>
            </article>

            <article className="relative min-h-[15rem] overflow-hidden rounded-[1.35rem] bg-white p-6 shadow-sm lg:col-span-4 lg:row-span-2">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.045)_1px,transparent_1px)] bg-[size:84px_84px]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_28%,rgba(250,204,21,0.09),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.6),#fff_86%)]" />
              <div className="relative">
                <p className="text-[clamp(4.25rem,8vw,6.25rem)] font-light leading-none tracking-normal text-black">100+</p>
                <p className="mt-3 text-lg font-semibold text-black/42">Companies served</p>
              </div>
              <p className="relative mt-10 max-w-[23rem] text-base font-semibold leading-7 text-black/42">
                We design and build websites that drive results and help your business grow. No Calls. No BS. Just Results.
              </p>
            </article>

            <article className="relative flex min-h-[6.5rem] items-center overflow-hidden rounded-[1.35rem] bg-white py-4 shadow-sm lg:col-span-4">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-white to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white to-transparent" />
              <div className="marquee-track flex w-max items-center gap-3 px-6 [--marquee-duration:34s]">
                {[...companyMarqueeItems, ...companyMarqueeItems].map((item, index) => (
                  <span key={`${item.name}-${index}`} className="inline-flex min-h-10 min-w-max items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-black/62 shadow-[0_8px_24px_rgba(15,23,42,0.10)]">
                    <BrandIcon icon={item.icon} className="h-5 w-5 shrink-0" />
                    {item.name}
                  </span>
                ))}
              </div>
            </article>

            <article className="relative flex min-h-[14.5rem] items-end overflow-hidden rounded-[1.35rem] bg-white p-6 shadow-sm lg:col-span-4">
              <div className="absolute right-0 top-0 h-full w-1/2 bg-[linear-gradient(rgba(245,183,104,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(245,183,104,0.12)_1px,transparent_1px)] bg-[size:56px_56px]" />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,#fff_0%,rgba(255,255,255,0.88)_56%,rgba(255,255,255,0.38)_100%)]" />
              <div className="relative">
                <p className="max-w-[23rem] text-base font-semibold leading-7 text-black/46">
                  "In business, people trust what they can see and use with confidence. That is why we build digital experiences that make brands look credible, sell better, and operate smarter."
                </p>
                <p className="mt-5 text-base font-semibold text-black"><span className="text-black/70">-</span> Bakare Olayemi <span className="ml-1 font-semibold text-black/42">Founder, Bakhtech</span></p>
              </div>
            </article>

            <article className="relative flex min-h-[6.5rem] flex-col gap-4 overflow-hidden rounded-[1.35rem] bg-white p-6 shadow-sm md:flex-row md:items-center lg:col-span-8">
              <p className="relative z-20 min-w-max text-xl font-semibold text-black">Technologies we use</p>
              <div className="relative min-w-0 flex-1 overflow-hidden">
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-white to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white to-transparent" />
                <div className="marquee-track flex w-max items-center gap-8 px-4 [--marquee-duration:46s]">
                  {[...technologyMarqueeItems, ...technologyMarqueeItems].map((item, index) => (
                    <span key={`${item.name}-${index}`} className="grid h-14 w-14 shrink-0 place-items-center opacity-75 transition hover:opacity-100" title={item.name} aria-label={item.name}>
                      <BrandIcon icon={item.icon} className="h-8 w-8 shrink-0" />
                    </span>
                  ))}
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="px-4 pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex flex-col items-start gap-5 text-left md:mb-12">
            <h2 className="max-w-4xl text-4xl font-black leading-tight tracking-normal text-[#202328] md:text-5xl">
              Bakhtech VS Traditional Service Providers
            </h2>
            <Link to="/booking" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-black px-3 pr-5 text-sm font-black text-white shadow-[0_12px_32px_rgba(0,0,0,0.12)] lg:hidden">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#ffd21f] text-black"><CalendarIcon /></span>
              Book a Free Call
            </Link>
          </div>

          <div className="hidden overflow-hidden rounded-[1.8rem] border border-black/5 bg-white shadow-sm lg:block">
            <div className="grid min-h-16 grid-cols-[18rem_1fr_1fr] border-b border-black/7">
              <div className="rounded-tl-[1.45rem] bg-[#f7f7f7]" />
              <div className="flex items-center gap-3 px-10 text-sm font-semibold text-black">
                <img src="/favicon.png" alt="" className="h-8 w-8 object-contain" decoding="async" />
                Bakhtech Solutions
              </div>
              <div className="flex items-center px-10 text-sm font-semibold text-black/38">Traditional Service Providers</div>
            </div>
            {comparisonRows.map((row) => {
              const Icon = row.icon
              return (
                <div key={row.label} className="grid min-h-[4.65rem] grid-cols-[18rem_1fr_1fr] border-b border-black/7 last:border-b-0">
                  <div className="flex items-center gap-4 bg-[#f7f7f7] px-10 text-sm font-semibold text-black">
                    <Icon className="h-5 w-5" />
                    {row.label}
                  </div>
                  <div className="flex items-center gap-4 px-10 text-sm font-semibold text-black">
                    {row.label === 'Always Free' ? (
                      <Link to="/booking" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-black px-2.5 pr-4 text-xs font-black text-white">
                        <span className="grid h-7 w-7 place-items-center rounded-md bg-[#ffd21f] text-black"><CalendarIcon /></span>
                        {row.bakhtech}
                      </Link>
                    ) : (
                      <>
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-[#12b83f] text-white"><Check className="h-3.5 w-3.5 stroke-[4]" /></span>
                        {row.bakhtech}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-4 px-10 text-sm font-semibold text-black">
                    {row.label === 'Always Free' ? (
                      <span className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-black px-2.5 pr-4 text-xs font-black text-white opacity-60">
                        <span className="grid h-7 w-7 place-items-center rounded-md bg-slate-700 text-white"><CalendarIcon /></span>
                        {row.traditional}
                      </span>
                    ) : (
                      <>
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-[#ffc928] text-white"><Zap className="h-3.5 w-3.5 fill-white stroke-[3]" /></span>
                        {row.traditional}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="grid gap-4 lg:hidden">
            {comparisonRows.map((row, index) => {
              const Icon = row.icon
              const isOpen = openComparisonIndex === index
              return (
                <article key={row.label} className="overflow-hidden rounded-[1.45rem] bg-white shadow-sm">
                  <button
                    type="button"
                    className="flex min-h-20 w-full items-center justify-between gap-4 px-6 text-left"
                    onClick={() => setOpenComparisonIndex(isOpen ? -1 : index)}
                  >
                    <span className="inline-flex items-center gap-4 text-xl font-semibold text-black">
                      <Icon className="h-5 w-5 shrink-0" />
                      {row.label}
                    </span>
                    <ChevronDown className={`h-5 w-5 shrink-0 text-black/45 transition ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOpen ? (
                    <div className="grid gap-6 border-t border-black/8 px-6 py-6">
                      <div className="grid gap-3">
                        <p className="inline-flex items-center gap-3 text-lg font-semibold text-black">
                          <img src="/favicon.png" alt="" className="h-8 w-8 object-contain" decoding="async" />
                          Bakhtech Solutions
                        </p>
                        <p className="inline-flex items-center gap-3 text-lg font-semibold text-black">
                          <span className="grid h-5 w-5 place-items-center rounded-full bg-[#12b83f] text-white"><Check className="h-3.5 w-3.5 stroke-[4]" /></span>
                          {row.bakhtech}
                        </p>
                      </div>

                      <div className="grid gap-3 border-t border-black/8 pt-6">
                        <p className="text-lg font-semibold text-black/38">Traditional Service Providers</p>
                        <p className="inline-flex items-center gap-3 text-lg font-semibold text-black">
                          <span className="grid h-5 w-5 place-items-center rounded-full bg-[#ffc928] text-white"><Zap className="h-3.5 w-3.5 fill-white stroke-[3]" /></span>
                          {row.traditional}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              ['Instant Onboarding', 'Start seeing useful progress faster with a focused project team.'],
              ['High Impact, Low Overhead', 'Lean execution, senior decisions, and fewer handoffs.'],
              ['Stress-Free Collaboration', 'Clear updates and practical delivery from brief to launch.'],
            ].map(([title, text]) => (
              <article key={title} className="rounded-[1.35rem] bg-white px-6 py-7 text-center shadow-sm">
                <Handshake className="mx-auto h-5 w-5 text-[#b97a3a]" />
                <h3 className="mt-4 text-lg font-semibold text-black">{title}</h3>
                <p className="mx-auto mt-3 max-w-[18rem] text-sm font-semibold leading-6 text-black/38">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="founder" className="relative max-w-full overflow-hidden bg-[#030303] px-4 py-16 text-white md:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_38%,rgba(255,255,255,0.08),transparent_34%),radial-gradient(circle_at_78%_48%,rgba(96,125,158,0.16),transparent_36%)]" />
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 bg-[linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px)] bg-[size:48px_48px] opacity-35 md:block" />
        <div className="relative mx-auto w-full max-w-6xl min-w-0">
          <h2 className="max-w-full text-4xl font-black leading-tight tracking-normal md:text-6xl">The Founder's Desk</h2>

          <div className="mt-10 grid min-w-0 gap-10 lg:mt-12 lg:grid-cols-[minmax(20rem,30rem)_minmax(0,1fr)] lg:items-center lg:gap-16">
            <div
              className="mx-auto h-[24rem] w-full max-w-[22rem] overflow-hidden rounded-lg bg-white/5 bg-cover bg-center ring-1 ring-white/10 sm:h-[28rem] sm:max-w-[24rem] lg:mx-0 lg:h-auto lg:max-w-none lg:aspect-[1.05/1] lg:min-h-[22rem]"
              style={{ backgroundImage: "url('/founder-portrait.png')" }}
            >
              <SafeImage
                src={founderDeskImage}
                fallbackSrc="/founder-portrait.png"
                alt="Bakare Olayemi, founder of Bakhtech Solutions"
                className="block h-full w-full max-w-full object-cover object-[center_18%] lg:object-center"
                decoding="async"
                loading="lazy"
              />
            </div>

            <div className="relative min-w-0 max-w-full">
              <div className="mb-5 flex justify-start gap-4 text-white/50 lg:justify-end">
                <span className="text-sm font-semibold">X</span>
                <span className="text-sm font-semibold">in</span>
                <span className="text-sm font-semibold">◎</span>
              </div>
              <div className="max-w-full text-sm font-normal leading-7 text-white [overflow-wrap:anywhere] md:max-w-2xl md:text-base md:leading-8">
                <p>
                  Hi, I'm Bakare Olayemi, I've been building web applications for over 7 years. I've worked with startups, small businesses, and large enterprises to build and scale their web applications. People call me a "Full Stack" developer but I prefer to call myself a problem solver :).
                </p>
                <p className="mt-6">
                  I started Bakhtech to help businesses build a stronger web presence with tools that look professional, work smoothly, and scale with real operations.
                </p>
                <p className="mt-2">
                  The goal is simple: give every client a digital product that is clear, dependable, and ready for customers from day one.
                </p>
              </div>

              <div className="mt-12 max-w-full overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)] md:mt-16">
                <div className="marquee-track flex w-max gap-4 [--marquee-duration:32s]">
                  {[...founderNotes, ...founderNotes, ...founderNotes].map((item, index) => {
                    const Icon = item.icon
                    return (
                      <article key={`${item.name}-${index}`} className="w-[min(16rem,78vw)] rounded-lg border border-white/10 bg-black/38 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.24)] backdrop-blur">
                        <div className="flex items-center gap-3">
                          <span className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/8 text-white/72">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="text-xs font-medium text-white">{item.name}</p>
                            <p className="text-[0.68rem] font-normal text-white/45">{item.role}</p>
                          </div>
                        </div>
                        <p className="mt-4 text-xs font-normal leading-5 text-white/86">{item.quote}</p>
                      </article>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section ref={testimonialsSectionRef} id="reviews" className="overflow-hidden px-4 py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex flex-col gap-5 md:mb-12 md:flex-row md:items-center md:justify-between">
            <h2 className="max-w-[48rem] text-4xl font-bold leading-tight tracking-normal text-[#202328] md:text-5xl">
              What people have been saying
            </h2>
            <button type="button" onClick={() => setShowReviewModal(true)} className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg border border-white/15 bg-black px-1.5 pr-4 text-sm font-medium text-white shadow-[0_20px_70px_rgba(0,0,0,0.14)] transition hover:bg-black/82">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-[#ffc400] text-[#0b0b08]">
                <MessageCircle className="h-4 w-4" />
              </span>
              Drop a Review
            </button>
          </div>
        </div>

        <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#efeee8] to-transparent md:w-28" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#efeee8] to-transparent md:w-28" />
          <div
            ref={testimonialsTrackRef}
            className="flex min-h-[18rem] cursor-grab touch-pan-x snap-x snap-mandatory select-none gap-4 overflow-x-auto px-4 pb-2 active:cursor-grabbing [scrollbar-width:none] md:min-h-[20rem] md:gap-7 md:px-[max(1rem,calc((100vw-72rem)/2))] [&::-webkit-scrollbar]:hidden"
            onPointerDown={handleTestimonialPointerDown}
            onPointerMove={handleTestimonialPointerMove}
            onPointerUp={handleTestimonialPointerUp}
            onPointerCancel={handleTestimonialPointerUp}
          >
            {reviews.length ? (
              loopedReviews.map((review, index) => (
                <div
                  key={`${review.id}-${index}`}
                  className="block shrink-0 text-left"
                  aria-label={`Testimonial ${(index % reviews.length) + 1}`}
                >
                  <TestimonialCard review={review} />
                </div>
              ))
            ) : (
              Array.from({ length: 4 }).map((_, index) => <TestimonialCardSkeleton key={`testimonial-skeleton-${index}`} />)
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.10)]">
            {reviews.length ? (
              reviews.map((review, index) => (
                <button
                  key={review.id}
                  type="button"
                  aria-label={`Go to testimonial ${index + 1}`}
                  className={`h-2.5 w-2.5 rounded-full transition ${index === activeTestimonialIndex % reviews.length ? 'bg-black/65' : 'bg-black/12 hover:bg-black/28'}`}
                  onClick={() => setActiveTestimonialIndex(index)}
                />
              ))
            ) : (
              Array.from({ length: 4 }).map((_, index) => (
                <span key={`testimonial-dot-${index}`} className="h-2.5 w-2.5 rounded-full bg-black/12" />
              ))
            )}
          </div>
        </div>
      </section>

      <section id="faq" className="px-4 py-20 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.9fr_1.12fr] lg:gap-20">
          <div>
            <h2 className="max-w-[34rem] text-4xl font-bold leading-tight tracking-normal text-[#202328] md:text-5xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-5 text-base font-normal text-black/78">
              Have more doubts? Reach out to us at{' '}
              <a href="mailto:contact@bakhtech.com.ng" className="text-[#4f6f5a] underline underline-offset-2">
                contact@bakhtech.com.ng
              </a>
            </p>

            <div className="mt-12 max-w-[32rem] rounded-[1.35rem] bg-white p-6 shadow-[0_12px_34px_rgba(15,23,42,0.10)] ring-1 ring-black/5 md:mt-16 md:p-8">
              <h3 className="text-2xl font-medium leading-tight text-black md:text-3xl">
                Need a fast moving team for your website or web app?
              </h3>
              <p className="mt-5 max-w-[27rem] text-base font-normal leading-7 text-black/50">
                Bakhtech helps you plan, build, launch, and improve digital products without turning the process into a long technical headache.
              </p>
              <div className="mt-8">
                <ChatPill label="Chat with us" />
              </div>
            </div>
          </div>

          <div className="border-t border-black/14">
            {faqItems.map((item, index) => {
              const isOpen = openFaqIndex === index
              return (
                <article key={item.question} className="border-b border-black/14">
                  <button
                    type="button"
                    className="flex min-h-[5.8rem] w-full items-center justify-between gap-6 py-5 text-left"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaqIndex(isOpen ? -1 : index)}
                  >
                    <span className="text-base font-normal leading-6 text-black md:text-lg">{item.question}</span>
                    <ChevronDown className={`h-5 w-5 shrink-0 text-black/45 transition duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] pb-7' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden">
                      <p className="max-w-[38rem] text-sm font-normal leading-7 text-black/55 md:text-base">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <footer className="relative overflow-hidden bg-[#030303] px-4 py-16 text-white md:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_22%,rgba(255,255,255,0.12),transparent_28%),linear-gradient(90deg,rgba(255,255,255,0.05),transparent_34%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:50px_50px] opacity-[0.18]" />

        <div className="relative mx-auto max-w-6xl">
          <Link
            to="/booking"
            className="group relative block min-h-[16rem] overflow-hidden rounded-[1.8rem] border border-white/6 bg-[#11110f] px-7 py-9 shadow-[0_34px_100px_rgba(0,0,0,0.48)] md:min-h-[19rem] md:px-12 md:py-14"
          >
            <div className="relative z-10 flex items-start justify-between gap-6">
              <h2 className="max-w-[34rem] text-4xl font-medium leading-[1.08] tracking-normal text-white md:text-6xl">
                {footerSettings.footerCtaTitle}
              </h2>
              <span className="grid h-11 w-14 shrink-0 place-items-center rounded-xl bg-white text-black transition group-hover:translate-x-1">
                <ArrowRight className="h-5 w-5" />
              </span>
            </div>
            <span className="pointer-events-none absolute -bottom-6 left-6 select-none text-[4.8rem] font-bold leading-none tracking-normal text-white/[0.07] sm:text-[7rem] md:-bottom-16 md:left-10 md:text-[11rem] lg:text-[13rem]">
              {footerSettings.footerWatermark}
            </span>
          </Link>

          <div className="mt-16 grid gap-12 lg:grid-cols-[1.1fr_1.6fr] lg:gap-20">
            <div>
              <img src="/bakhtech-logo-dark.png" alt="Bakhtech Solutions" className="h-9 w-auto object-contain" decoding="async" />
              <p className="mt-5 max-w-xs text-sm font-normal leading-6 text-white/45">
                {footerSettings.footerDescription}
              </p>
              <Link to="/booking" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/12 bg-black px-2.5 pr-4 text-sm font-medium text-white">
                <span className="grid h-7 w-7 place-items-center rounded-md bg-[#ffd21f] text-black"><CalendarIcon /></span>
                {footerSettings.footerCtaLabel}
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
              {footerLinkColumns.map((column) => (
                <div key={column.title}>
                  <h3 className="text-xs font-normal text-white/35">{column.title}</h3>
                  <ul className="mt-5 grid gap-4">
                    {column.links.map((link) => {
                      const isExternal = link.to.startsWith('mailto:')
                      const className = 'text-sm font-normal text-white/82 transition hover:text-white'
                      return (
                        <li key={link.label}>
                          {isExternal ? (
                            <a href={link.to} className={className}>{link.label}</a>
                          ) : (
                            <Link to={link.to} className={className}>{link.label}</Link>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 flex flex-col gap-6 border-t border-white/8 pt-8 md:flex-row md:items-center md:justify-between">
            <p className="text-xs font-normal text-white/42">{footerSettings.footerCopyright}</p>
            <div className="flex items-center gap-5 text-white/48">
              <a href="https://x.com" aria-label="Bakhtech on X" className="text-sm font-normal transition hover:text-white">X</a>
              <a href="https://www.linkedin.com" aria-label="Bakhtech on LinkedIn" className="text-sm font-normal transition hover:text-white">in</a>
              <a href="https://www.instagram.com" aria-label="Bakhtech on Instagram" className="transition hover:text-white">
                <BrandIcon icon="instagram" className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
      {activeVideo ? <ProjectVideoModal media={activeVideo} onClose={() => setActiveVideo(null)} /> : null}
      {showReviewModal ? <ReviewPlatformModal links={reviewLinks} onClose={() => setShowReviewModal(false)} /> : null}
    </TemplateShell>
  )
}
