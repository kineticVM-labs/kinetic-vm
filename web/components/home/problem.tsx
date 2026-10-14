import { FlowStory } from "@/components/home/flow-story";
import { Reveal } from "@/components/home/reveal";
import { Eyebrow } from "@/components/home/section-heading";

export function Problem() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-28 sm:py-36">
      <Reveal>
        <Eyebrow>The problem</Eyebrow>
      </Reveal>
      <Reveal delay={0.05}>
        <p className="mt-7 max-w-5xl text-3xl font-medium leading-[1.25] tracking-[-0.025em] text-ink/40 sm:text-[2.75rem] sm:leading-[1.2]">
          AI has consumed most of the internet. Its next great dataset will come from the physical world: robots in
          factories, machines inspecting products, and sensors observing farms.{" "}
          <span className="text-ink">
            But physical AI has no trust or ownership layer. Machines lack public identities, their work becomes
            editable logs, and owners have no native way to create and monetize a provenance-backed history that buyers
            can independently verify.
          </span>
        </p>
      </Reveal>
      <FlowStory />
    </section>
  );
}
