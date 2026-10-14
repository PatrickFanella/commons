import test from "node:test";
import assert from "node:assert/strict";
import { readClaimProof, repositoryInfo, repositoryKey } from "./repository.js";

const id = "b53f068e-0aca-477e-8d02-7c75a652540c";
test("claim verification only reads supported fixed HTTPS provider APIs, without redirects or unbounded content", async () => {
  assert.equal(
    repositoryKey("https://github.com/StoryTold/PhotoCraft.git/"),
    "https://github.com/storytold/photocraft",
  );
  for (const url of [
    "http://github.com/a/b",
    "https://github.com@127.0.0.1/a/b",
    "https://github.com/a/b?redirect=1",
    "https://github.com/a/b/blob/main",
    "https://github.com:444/a/b",
    "https://127.0.0.1/a/b",
    "https://git.subcult.tv/a/%2e%2e",
    "https://github.com/a/b#main",
  ])
    assert.equal(repositoryInfo(url), null, url);
  const good = async (url, options) => {
    assert.equal(
      url,
      `https://git.subcult.tv/api/v1/repos/a/b/contents/.commons/claims/${id}.txt`,
    );
    assert.equal(options.redirect, "error");
    assert.ok(options.signal);
    return Response.json({
      type: "file",
      encoding: "base64",
      size: 5,
      content: Buffer.from("proof").toString("base64"),
    });
  };
  assert.equal(
    await readClaimProof("https://git.subcult.tv/a/b", id, good),
    "proof",
  );
  await assert.rejects(
    readClaimProof("https://127.0.0.1/a/b", id, good),
    /UNSUPPORTED_REPOSITORY/,
  );
  await assert.rejects(
    readClaimProof(
      "https://github.com/a/b",
      id,
      async () => new Response("missing", { status: 404 }),
    ),
    /PROOF_NOT_FOUND/,
  );
  await assert.rejects(
    readClaimProof(
      "https://github.com/a/b",
      id,
      async () => new Response("unavailable", { status: 503 }),
    ),
    /PROVIDER_UNAVAILABLE/,
  );
  await assert.rejects(
    readClaimProof(
      "https://github.com/a/b",
      id,
      async () => new Response("x".repeat(20_000)),
    ),
    /INVALID_PROOF/,
  );
  await assert.rejects(
    readClaimProof("https://github.com/a/b", id, async () =>
      Response.json({
        type: "symlink",
        encoding: "base64",
        size: 5,
        content: "cHJvb2Y=",
      }),
    ),
    /INVALID_PROOF/,
  );
});
