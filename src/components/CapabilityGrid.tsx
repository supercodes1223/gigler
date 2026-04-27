import type { ReactNode } from "react";

interface Capability {
  title: string;
  description: string;
  example: string;
  preview: ReactNode;
}

const CAPABILITIES: Capability[] = [
  {
    title: "Gig Programmer",
    description: "Code, debug, and ship features — anytime, anywhere.",
    example: 'Try: "Build an API endpoint for customer invites."',
    preview: (
      <div className="font-mono text-[7px] space-y-0.5">
        <div>
          <span className="text-purple-400">const</span>{" "}
          <span className="text-blue-400">app</span>{" "}
          <span className="text-zinc-500">=</span>{" "}
          <span className="text-green-400">express</span>
          <span className="text-zinc-500">()</span>
        </div>
        <div>
          <span className="text-zinc-500">app.</span>
          <span className="text-yellow-400">get</span>
          <span className="text-zinc-500">(</span>
          <span className="text-green-400">&apos;/api&apos;</span>
          <span className="text-zinc-500">,</span>{" "}
          <span className="text-zinc-400">handler</span>
          <span className="text-zinc-500">)</span>
        </div>
        <div>
          <span className="text-zinc-500">app.</span>
          <span className="text-yellow-400">listen</span>
          <span className="text-zinc-500">(</span>
          <span className="text-amber-400">3000</span>
          <span className="text-zinc-500">)</span>
        </div>
        <div className="text-green-500 mt-1">✓ Deployed successfully</div>
      </div>
    ),
  },
  {
    title: "Gig Orchestration",
    description:
      "Turn a simple text, email, or voice request into a coordinated workflow with progress updates and deliverables.",
    example: 'Try: "Coordinate this launch and keep everyone updated."',
    preview: (
      <div className="relative h-full text-[7px]">
        <div className="absolute left-1 top-1 rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-blue-300">
          Request
        </div>
        <div className="absolute left-[3.1rem] top-[1.35rem] h-px w-5 bg-zinc-700" />
        <div className="absolute left-[4.3rem] top-0.5 rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-purple-300">
          Plan
        </div>
        <div className="absolute left-[5.4rem] top-[1.9rem] h-4 w-px bg-zinc-700" />
        <div className="absolute left-8 top-[2.9rem] grid grid-cols-2 gap-1">
          <div className="rounded border border-green-500/30 bg-green-500/10 px-1.5 py-0.5 text-green-300">
            Code
          </div>
          <div className="rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-cyan-300">
            Web
          </div>
          <div className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-amber-300">
            Docs
          </div>
          <div className="rounded border border-zinc-600 bg-zinc-800 px-1.5 py-0.5 text-zinc-400">
            Review
          </div>
        </div>
        <div className="absolute bottom-1 right-1 rounded-full border border-green-500/40 bg-green-500/10 px-2 py-1 text-green-300">
          ✓ Delivered
        </div>
      </div>
    ),
  },
  {
    title: "Landing Pages",
    description: "Full websites from a text description.",
    example: 'Try: "Make a landing page for my coffee shop."',
    preview: (
      <div className="space-y-1.5">
        <div className="h-6 rounded bg-zinc-800 flex items-center justify-center">
          <span className="text-[8px] font-bold text-zinc-400">Brew & Co.</span>
        </div>
        <div className="flex gap-1">
          <div className="h-3 flex-1 rounded bg-zinc-800" />
          <div className="h-3 flex-1 rounded bg-zinc-800" />
        </div>
        <div className="h-2.5 rounded bg-zinc-800 w-3/4" />
      </div>
    ),
  },
  {
    title: "Event Planning",
    description: "Coordinate parties, meetings, and gatherings.",
    example: 'Try: "Plan a birthday dinner for 20 people."',
    preview: (
      <div className="space-y-1 text-[8px]">
        <div className="flex items-center gap-1.5">
          <span className="text-green-500">✓</span>
          <span className="text-zinc-400">Book venue</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-green-500">✓</span>
          <span className="text-zinc-400">Send invites (40)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-yellow-500">○</span>
          <span className="text-zinc-400">Order catering</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-600">○</span>
          <span className="text-zinc-500">Set up playlist</span>
        </div>
      </div>
    ),
  },
  {
    title: "Photo Collages",
    description: "Organize and share event or project photos.",
    example: 'Try: "Organize our tournament photos by player."',
    preview: (
      <div className="grid grid-cols-3 gap-0.5">
        <div className="aspect-square rounded-sm bg-purple-900/40" />
        <div className="aspect-square rounded-sm bg-blue-900/40" />
        <div className="aspect-square rounded-sm bg-teal-900/40" />
        <div className="aspect-square rounded-sm bg-pink-900/40" />
        <div className="aspect-square rounded-sm bg-amber-900/40" />
        <div className="aspect-square rounded-sm bg-indigo-900/40" />
      </div>
    ),
  },
  {
    title: "PDFs & Reports",
    description: "Generate polished documents and summaries.",
    example: 'Try: "Turn these notes into a polished PDF report."',
    preview: (
      <div className="space-y-1.5 px-1">
        <div className="h-1.5 rounded-full bg-zinc-700 w-full" />
        <div className="h-1.5 rounded-full bg-zinc-700 w-4/5" />
        <div className="h-1.5 rounded-full bg-zinc-800 w-full mt-2" />
        <div className="h-1.5 rounded-full bg-zinc-800 w-3/5" />
        <div className="h-1.5 rounded-full bg-zinc-800 w-4/5 mt-2" />
      </div>
    ),
  },
  {
    title: "Restaurant Menus",
    description: "Beautiful menus ready to print or share online.",
    example: 'Try: "Make a brunch menu from these dishes."',
    preview: (
      <div className="flex gap-2 text-[7px]">
        <div className="flex-1 space-y-1">
          <div className="text-zinc-500 uppercase font-bold text-[6px]">Mains</div>
          <div className="text-zinc-400">Burger · $14</div>
          <div className="text-zinc-400">Pasta · $16</div>
        </div>
        <div className="flex-1 space-y-1">
          <div className="text-zinc-500 uppercase font-bold text-[6px]">Drinks</div>
          <div className="text-zinc-400">Latte · $5</div>
          <div className="text-zinc-400">Juice · $4</div>
        </div>
      </div>
    ),
  },
  {
    title: "Excel Sheet Management",
    description: "Organize, analyze, and share spreadsheet data.",
    example: 'Try: "Clean up this parts estimate spreadsheet."',
    preview: (
      <div className="text-[7px] font-mono">
        <div className="flex border-b border-zinc-700 pb-0.5 mb-0.5">
          <span className="w-4 text-zinc-600 text-center shrink-0" />
          <span className="flex-1 text-center text-zinc-500 font-bold">A</span>
          <span className="flex-1 text-center text-zinc-500 font-bold">B</span>
          <span className="flex-1 text-center text-zinc-500 font-bold">C</span>
        </div>
        <div className="flex">
          <span className="w-4 text-zinc-600 text-center shrink-0">1</span>
          <span className="flex-1 text-center text-zinc-400">Item</span>
          <span className="flex-1 text-center text-zinc-400">Qty</span>
          <span className="flex-1 text-center text-zinc-400">Cost</span>
        </div>
        <div className="flex">
          <span className="w-4 text-zinc-600 text-center shrink-0">2</span>
          <span className="flex-1 text-center text-zinc-400">Parts</span>
          <span className="flex-1 text-center text-blue-400">24</span>
          <span className="flex-1 text-center text-green-400">$480</span>
        </div>
        <div className="flex">
          <span className="w-4 text-zinc-600 text-center shrink-0">3</span>
          <span className="flex-1 text-center text-zinc-400">Labor</span>
          <span className="flex-1 text-center text-blue-400">8</span>
          <span className="flex-1 text-center text-green-400">$320</span>
        </div>
      </div>
    ),
  },
  {
    title: "Bills Dashboard",
    description: "Track and organize utility bills with auto-extraction.",
    example: 'Try: "Track these utility bills and remind everyone."',
    preview: (
      <div className="space-y-1">
        <div className="flex gap-1 text-[7px] uppercase text-zinc-500">
          <span className="flex-1">Bill</span>
          <span className="w-10 text-right">Amt</span>
          <span className="w-10 text-right">Status</span>
        </div>
        <div className="flex gap-1 text-[8px]">
          <span className="flex-1 text-zinc-400">Power</span>
          <span className="w-10 text-right text-zinc-400">$528</span>
          <span className="w-10 text-right">
            <span className="px-1 rounded bg-yellow-500/20 text-yellow-500 text-[7px]">Due</span>
          </span>
        </div>
        <div className="flex gap-1 text-[8px]">
          <span className="flex-1 text-zinc-400">Water</span>
          <span className="w-10 text-right text-zinc-400">$87</span>
          <span className="w-10 text-right">
            <span className="px-1 rounded bg-green-500/20 text-green-500 text-[7px]">Paid</span>
          </span>
        </div>
        <div className="flex gap-1 text-[8px]">
          <span className="flex-1 text-zinc-400">Internet</span>
          <span className="w-10 text-right text-zinc-400">$65</span>
          <span className="w-10 text-right">
            <span className="px-1 rounded bg-green-500/20 text-green-500 text-[7px]">Paid</span>
          </span>
        </div>
      </div>
    ),
  },
  {
    title: "Workspace Workflows",
    description: "Automate team tasks, approvals, and handoffs.",
    example: 'Try: "Route this request through manager review."',
    preview: (
      <div className="space-y-1 text-[7px]">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500/60 shrink-0" />
          <span className="text-zinc-400">Request submitted</span>
        </div>
        <div className="w-px h-1.5 bg-zinc-700 ml-1" />
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-500/60 shrink-0" />
          <span className="text-zinc-400">Manager review</span>
        </div>
        <div className="w-px h-1.5 bg-zinc-700 ml-1" />
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-yellow-500/60 shrink-0" />
          <span className="text-zinc-500">Awaiting approval</span>
        </div>
        <div className="w-px h-1.5 bg-zinc-700 ml-1" />
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-zinc-700 shrink-0" />
          <span className="text-zinc-600">Deploy</span>
        </div>
      </div>
    ),
  },
];

export default function CapabilityGrid() {
  const featured = CAPABILITIES.slice(0, 2);
  const standard = CAPABILITIES.slice(2);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        {featured.map((item) => (
          <div
            key={item.title}
            className="group rounded-2xl border border-brand-border bg-background p-5 text-left shadow-xl shadow-black/10 transition-all duration-300 hover:border-purple-500/50 hover:shadow-purple-500/10"
          >
            <div className="mb-5 flex h-40 flex-col justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              {item.preview}
            </div>
            <h3 className="mb-2 text-xl font-bold">{item.title}</h3>
            <p className="text-sm leading-relaxed text-brand-muted">{item.description}</p>
            <div className="mt-5 rounded-xl border border-brand-border bg-brand-surface px-4 py-3 text-xs text-brand-muted">
              {item.example}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
        {standard.map((item) => (
          <div
            key={item.title}
            className="group rounded-xl border border-brand-border bg-background p-4 transition-all duration-300 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/5 hover:scale-[1.02] last:col-span-2 last:md:col-span-1"
          >
            <div className="mb-3 flex h-24 flex-col justify-center overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              {item.preview}
            </div>
            <h3 className="mb-1 text-sm font-bold">{item.title}</h3>
            <p className="text-xs leading-relaxed text-brand-muted">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
