export const API_TIMEOUT_MS = 120_000;

export async function fetchJson<T>(url: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(API_TIMEOUT_MS)
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error(`Request timed out after ${API_TIMEOUT_MS / 1000} seconds`);
    }

    throw error;
  }

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;

    try {
      const errorBody = (await response.json()) as { error?: string };
      message = errorBody.error || message;
    } catch {
      // Ignore JSON parse errors and keep the HTTP status message.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
