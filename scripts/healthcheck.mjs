const port = process.env.PORT || "3000";
try {
  const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
    signal: AbortSignal.timeout(4000),
  });
  const body = await response.json();
  if (!response.ok || body.ok !== true) process.exitCode = 1;
} catch {
  process.exitCode = 1;
}
