import { BrainCircuit, Ghost, Share2, ScrollText, type LucideIcon } from "lucide-react"

interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: BrainCircuit,
    title: "AI Architecture Generation",
    description: "Describe your system, AI maps it to nodes and edges on a live canvas.",
  },
  {
    icon: Share2,
    title: "Real-time Collaboration",
    description: "Live cursors, presence indicators, and shared node editing across your team.",
  },
  {
    icon: ScrollText,
    title: "Instant Spec Generation",
    description: "Export a complete Markdown technical spec directly from the canvas graph.",
  },
]

interface AuthShellProps {
  children: React.ReactNode
}

export function AuthShell({ children }: AuthShellProps) {
  const year = new Date().getFullYear()

  return (
    <main className="flex min-h-full flex-1 bg-base">
      <section className="hidden flex-1 flex-col justify-between border-r border-surface-border px-14 py-14 lg:flex">
        <div className="flex items-center gap-2.5">
          <Ghost className="h-6 w-6 text-brand" />
          <span className="text-lg font-semibold text-copy-primary">Ghost AI</span>
        </div>

        <div className="flex flex-col gap-9">
          <span className="w-fit rounded-xl border border-surface-border px-3.5 py-1.5 text-sm font-medium uppercase tracking-wider text-brand">
            AI-Powered · Real-time · Collaborative
          </span>

          <h1 className="max-w-xl text-5xl font-bold leading-tight text-copy-primary">
            Design better systems,{" "}
            <span className="text-brand">together.</span>
          </h1>

          <p className="max-w-lg text-base leading-relaxed text-copy-secondary">
            Describe your architecture in plain English. Ghost AI maps it to a shared
            canvas your whole team can refine in real time.
          </p>

          <ul className="flex flex-col gap-6">
            {features.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-dim">
                  <Icon className="h-5 w-5 text-brand" />
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-base font-semibold text-copy-primary">{title}</span>
                  <span className="text-sm text-copy-muted">{description}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-copy-faint">© {year} Ghost AI</p>
      </section>

      <section className="flex flex-1 items-center justify-center px-6 py-16">
        {children}
      </section>
    </main>
  )
}
