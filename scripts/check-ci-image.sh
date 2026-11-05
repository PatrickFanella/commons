#!/usr/bin/env bash
set -euo pipefail
image=${1:?image is required}
revision=${2:?source revision is required}
[[ "$revision" =~ ^[0-9a-f]{40}$ ]]
fixture=$(docker create --rm --network none --read-only --init \
  --tmpfs /data:uid=1000,gid=1000,mode=0700 \
  --tmpfs /tmp:uid=1000,gid=1000,mode=1777,size=32m \
  --memory 512m --cpus 1 --pids-limit 160 --cap-drop ALL \
  --security-opt no-new-privileges:true \
  -e PUBLIC_URL=https://commons.subcult.tv -e 'OPERATOR_NAME=Qualification fixture' \
  -e CONTACT_EMAIL=qualification@example.invalid -e TRUST_PROXY=0 \
  -e BREVO_API_KEY= -e BREVO_SENDER_EMAIL= \
  --entrypoint /usr/bin/timeout "$image" --signal=TERM --kill-after=5s 60s node server/index.js)
trap 'docker rm -f "$fixture" >/dev/null 2>&1 || true' EXIT
docker start "$fixture" >/dev/null
for _attempt in {1..30}; do
  if docker exec "$fixture" node scripts/healthcheck.mjs; then
    break
  fi
  sleep 0.2
done
docker exec -i "$fixture" node --input-type=module - "$revision" <<'NODE'
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const origin = "http://127.0.0.1:3000";
const marker = await fetch(origin + "/build-info.json");
assert.equal(marker.status, 200);
assert.match(marker.headers.get("cache-control"), /no-store/);
const body = Buffer.from(await marker.arrayBuffer());
assert.deepEqual(body, readFileSync("/app/dist/build-info.json"));
assert.deepEqual(JSON.parse(body), { schema_version: 1, source_commit: process.argv[2] });
const response = await fetch(origin + "/");
assert.equal(response.status, 200);
const html = await response.text();
assert.ok(html.includes("https://commons.subcult.tv/"));
assert.ok(html.includes("summary_large_image"));
for (const path of ["/favicon.ico", "/apple-touch-icon.png", "/api/health"]) {
  assert.equal((await fetch(origin + path)).status, 200, path);
}
console.log("PASS: isolated image health, uncached exact build marker, rendered metadata and selected icons");
NODE
