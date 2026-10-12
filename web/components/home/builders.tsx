import type { ReactNode } from "react";

import { Reveal } from "@/components/home/reveal";
import { Accent, SectionHeading } from "@/components/home/section-heading";
import { ArrowUpRight, PluginIcon, TerminalIcon } from "@/components/icons";
import { links } from "@/lib/links";

const COMMANDS = [
  { command: "kinetic plugin create vending", note: "Scaffold tools, a procedure and a records schema" },
  { command: "kinetic build", note: "Compile to a sandboxed WASM component" },
  { command: "kinetic plugin install ./vending", note: "Load it on the device, permissions and all" },
];

const SOURCE = `impl Guest for Tools {
    fn list_tools() -> Vec<ToolInfo> {
        vec![ToolInfo {
            name: "vend".to_string(),
            description: "Drop one item from a slot.".to_string(),
            parameters_schema: SLOT_SCHEMA.to_string(),
        }]
    }

    fn execute(name: String, args: String) -> Result<ToolResult, String> {
        match name.as_str() {
            // The host signs and attests the result.
            "vend" => vend(&args),
            other => Err(format!("unknown tool {other}")),
        }
    }
}`;

export function Builders() {
  return (
    <section id="builders" className="scroll-mt-24 py-28 sm:py-36">
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 lg:grid-cols-2 lg:gap-20 [&>*]:min-w-0">
        <div>
          <SectionHeading
            eyebrow="For builders"
            title={
              <>
                Ship a plugin, <Accent>not a platform.</Accent>
              </>
            }
            body="One directory is one integration: tools, a procedure and an optional skill. The runtime handles identity, payments, attestations and the agent loop."
          />
          <Reveal delay={0.08} className="mt-10 space-y-3">
            {COMMANDS.map((item) => (
              <div key={item.command} className="flex items-start gap-4 rounded-2xl border border-line bg-surface p-4">
                <span className="grid size-9 flex-none place-items-center rounded-xl bg-lilac text-purple-deep">
                  <TerminalIcon width={18} height={18} />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm text-ink">{item.command}</p>
                  <p className="mt-1 text-sm text-muted">{item.note}</p>
                </div>
              </div>
            ))}
          </Reveal>
          <Reveal delay={0.12} className="mt-8">
            <a href={links.github} className="btn btn-secondary group">
              <PluginIcon width={18} height={18} />
              Browse the source
              <ArrowUpRight
                width={16}
                height={16}
                className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </a>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_40px_80px_-40px_rgba(32,0,82,0.35)]">
            <div className="flex items-center justify-between border-b border-line bg-paper px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-line" />
                <span className="size-3 rounded-full bg-line" />
                <span className="size-3 rounded-full bg-line" />
              </div>
              <span className="font-mono text-xs text-muted">vending/src/lib.rs</span>
            </div>
            <pre className="overflow-x-auto p-6 font-mono text-[13px] leading-6 text-ink">
              <code>{highlight(SOURCE)}</code>
            </pre>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const TOKEN = /(\/\/.*$)|("(?:[^"\\]|\\.)*")|\b(fn|impl|for|match|let|pub|use|struct|const)\b|\b([A-Z][A-Za-z_]+)\b|\b([a-z_]+)(?=[!(])/gm;

function highlight(source: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of source.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(source.slice(last, index));
    const [text, comment, string, keyword, type] = match;
    const className = comment
      ? "text-muted italic"
      : string
        ? "text-[#0f7b6c] dark:text-[#5eead4]"
        : keyword
          ? "text-purple-deep"
          : type
            ? "text-[#a0055d] dark:text-[#f9a8d4]"
            : "text-[#1d4ed8] dark:text-[#93c5fd]";
    nodes.push(
      <span key={index} className={className}>
        {text}
      </span>,
    );
    last = index + text.length;
  }
  if (last < source.length) nodes.push(source.slice(last));
  return nodes;
}
