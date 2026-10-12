const STACK = ["Monad", "ERC-8004", "Raspberry Pi", "ESP32", "Raspberry Pi Pico", "Arduino", "STM32 Nucleo", "NXP SE050", "WASM plugins"];

export function StackStrip() {
  return (
    <section aria-label="Supported hardware and standards" className="border-y border-line bg-surface">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-8 lg:flex-row lg:items-center lg:gap-12">
        <p className="flex-none text-sm text-muted">Works with the hardware you already have</p>
        <ul className="flex flex-wrap items-center gap-x-8 gap-y-3">
          {STACK.map((name) => (
            <li key={name} className="font-mono text-sm tracking-tight text-ink/70">
              {name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
