import assert from "node:assert/strict";
import test from "node:test";

import { assessDataset, lineHash } from "./manifest.ts";

const REQUEST = `0x${"ab".repeat(32)}` as const;

function manifest(line: string, requestHash: string = REQUEST) {
  return JSON.stringify({
    version: 1,
    chainId: 10143,
    agentId: "7",
    rows: [{ paramsHash: lineHash(line), requestHash }],
  });
}

test("a canonical line matches its manifest row", () => {
  const line = '{"item":"cola","slot":1}';
  const result = assessDataset(manifest(line), `${line}\n`);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.value.schema, ["item", "slot"]);
    assert.equal(result.value.rowCount, 1);
    assert.equal(result.value.manifest.agentId, "7");
  }
});

test("a line that does not match the manifest is refused", () => {
  const line = '{"item":"cola","slot":1}';
  const result = assessDataset(manifest(line), '{"item":"cola","slot":2}\n');
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /Row 1 hashes/);
});

test("a non-object line is refused", () => {
  const line = '"cola"';
  const result = assessDataset(manifest(line), `${line}\n`);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /JSON object/);
});

test("a repeated request hash is refused", () => {
  const first = '{"slot":1}';
  const second = '{"slot":2}';
  const body = JSON.stringify({
    version: 1,
    chainId: 10143,
    agentId: "7",
    rows: [
      { paramsHash: lineHash(first), requestHash: REQUEST },
      { paramsHash: lineHash(second), requestHash: REQUEST },
    ],
  });
  const result = assessDataset(body, `${first}\n${second}\n`);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /repeats a request hash/);
});
