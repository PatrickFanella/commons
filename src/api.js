let csrfToken = null;
export function setCsrf(value) {
  csrfToken = value;
}
export async function api(path, options = {}) {
  const { method = "GET", body, signal } = options;
  const response = await fetch(`/api${path}`, {
    method,
    signal,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(method !== "GET" && csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      "The server returned an unexpected response. Please try again.",
    );
  }
  if (!response.ok) {
    if (response.status === 401 && result.code === "UNAUTHENTICATED")
      window.dispatchEvent(new Event("commons:session-expired"));
    const error = new Error(
      result.error || "Something went wrong. Please try again.",
    );
    error.status = response.status;
    error.code = result.code;
    throw error;
  }
  return result;
}
export const categories = [
  "Creative tools",
  "Developer tools",
  "Productivity",
  "Audio & music",
  "Engineering",
];
export const statuses = [
  "In progress",
  "Looking for builders",
  "Just launched",
  "Launched",
];
export function dateLabel(date) {
  return new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00` : date,
  ).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
