import assert from "node:assert/strict";
import { createApp } from "../server/app.js";
import { render } from "../dist-ssr/entry-server.js";

const app = createApp({
  dbPath: ":memory:",
  seedCatalog: true,
  quiet: true,
  publicUrl: "https://commons.example",
  operatorName: "Fixture operator",
  contactEmail: "fixture@example.com",
  render,
});
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  const xml = await (await fetch(base + "/sitemap.xml")).text();
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  assert.equal(new Set(urls).size, urls.length);
  for (const url of urls) {
    const path = new URL(url).pathname;
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.match(html, /<h1[ >]/, path);
    assert.equal((html.match(/<title>/g) ?? []).length, 1, path);
    assert.equal((html.match(/rel="canonical"/g) ?? []).length, 1, path);
    assert.ok(html.includes(`href="${url}"`), path);
    assert.doesNotMatch(html, /Meeting a builder|Opening the commons/, path);
  }
  app.locals.db
    .prepare("UPDATE projects SET hidden=1 WHERE id='catalog-photocraft'")
    .run();
  assert.equal(
    (await fetch(base + "/projects/catalog-photocraft")).status,
    404,
  );
  assert.ok(
    !(await (await fetch(base + "/sitemap.xml")).text()).includes(
      "catalog-photocraft",
    ),
  );
  assert.ok(
    !(await (await fetch(base + "/")).text()).includes(
      'href="/projects/catalog-photocraft"',
    ),
  );
  const settings = await fetch(base + "/settings");
  assert.equal(settings.headers.get("x-robots-tag"), "noindex");
  assert.doesNotMatch(
    await settings.text(),
    /name="csrf|sessionToken|recoveryKey/,
  );
  console.log(
    `PASS: ${urls.length} public URLs contain rendered content, unique metadata and canonical URLs; hidden projects disappear immediately; account pages are noindex.`,
  );
} finally {
  await new Promise((resolve) => server.close(resolve));
  app.locals.close();
}
