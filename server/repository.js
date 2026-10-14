export function repositoryInfo(value) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.search ||
      url.hash ||
      !["github.com", "git.subcult.tv"].includes(url.hostname)
    )
      return null;
    const parts = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
    if (
      parts.length !== 2 ||
      parts.some((p) => !/^[A-Za-z0-9_.-]+$/.test(p) || p === "." || p === "..")
    )
      return null;
    const [owner, rawRepo] = parts;
    const repo = rawRepo.replace(/\.git$/i, "");
    if (!repo) return null;
    return {
      host: url.hostname,
      owner,
      repo,
      url: `https://${url.hostname}/${owner}/${repo}`,
    };
  } catch {
    return null;
  }
}
export function repositoryKey(value) {
  return repositoryInfo(value)?.url.toLowerCase() ?? null;
}
export async function readClaimProof(repository, claimId, transport = fetch) {
  const info = repositoryInfo(repository);
  if (!info || !/^[a-f0-9-]{36}$/.test(claimId))
    throw new Error("UNSUPPORTED_REPOSITORY");
  const path = `.commons/claims/${claimId}.txt`;
  const api =
    info.host === "github.com"
      ? "https://api.github.com"
      : "https://git.subcult.tv/api/v1";
  const response = await transport(
    `${api}/repos/${info.owner}/${info.repo}/contents/${path}`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "Commons-repository-claim",
      },
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok)
    throw new Error(
      response.status === 404 ? "PROOF_NOT_FOUND" : "PROVIDER_UNAVAILABLE",
    );
  let text = "";
  for await (const chunk of response.body) {
    text += new TextDecoder().decode(chunk);
    if (Buffer.byteLength(text) > 16_384) {
      await response.body.cancel().catch(() => {});
      throw new Error("INVALID_PROOF");
    }
  }
  const data = JSON.parse(text);
  if (
    data.type !== "file" ||
    data.encoding !== "base64" ||
    !Number.isInteger(data.size) ||
    data.size > 2048 ||
    typeof data.content !== "string" ||
    data.content.length > 4096
  )
    throw new Error("INVALID_PROOF");
  return Buffer.from(data.content, "base64").toString("utf8").trim();
}
