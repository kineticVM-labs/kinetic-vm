"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

const WORDS = ["Check", "Verify", "Buy", "Audit"] as const;

export function TypedWord() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const word = WORDS[index] ?? WORDS[0];
  const shown = reduce ? WORDS[0] : word.slice(0, count);

  useEffect(() => {
    if (reduce) return;
    const hold = !deleting && count === word.length;
    const gap = deleting && count === 0;
    const delay = hold ? 1100 : gap ? 280 : deleting ? 42 : 88;
    const timer = window.setTimeout(() => {
      if (!deleting && count < word.length) setCount(count + 1);
      else if (hold) setDeleting(true);
      else if (deleting && count > 0) setCount(count - 1);
      else {
        setDeleting(false);
        setIndex((value) => (value + 1) % WORDS.length);
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [count, deleting, index, reduce, word.length]);

  return (
    <>
      <span className="font-serif text-[1.08em] font-normal italic text-purple" aria-hidden="true">
        {shown}
        {reduce ? null : <span className="type-caret ml-px inline-block h-[0.82em] w-px translate-y-[0.06em] bg-current align-middle motion-safe:animate-[type-caret_1.05s_steps(1,end)_infinite]" />}
      </span>
      <span className="sr-only">check</span>
    </>
  );
}
