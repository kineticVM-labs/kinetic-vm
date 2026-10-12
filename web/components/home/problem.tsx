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
          AI has consumed most of the internet. Its next source of training data is the physical world: robots in
          factories, machines inspecting products, sensors watching farms.{" "}
          <span className="text-ink">
            But when that data is sold, the buyer can&apos;t tell whether it came from the claimed machine, or whether
            someone made it up.
          </span>
        </p>
      </Reveal>
      <FlowStory />
    </section>
  );
}
