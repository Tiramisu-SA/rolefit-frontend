"use client";

import { useState } from "react";

let nextKey = 0;
const newKeys = (n: number) => Array.from({ length: n }, () => ++nextKey);

/** Stable React keys for an editable list whose rows can be added and removed. */
export function useRowKeys(initialLength: number) {
  const [keys, setKeys] = useState(() => newKeys(initialLength));
  return {
    keys,
    add: () => setKeys((k) => [...k, ...newKeys(1)]),
    remove: (index: number) => setKeys((k) => k.filter((_, i) => i !== index)),
  };
}
