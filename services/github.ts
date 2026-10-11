// services/github.ts
// Real GitHub REST API calls — no simulation. Needs a Personal Access Token (PAT)
// with "repo" scope, created from github.com → Settings → Developer settings → Tokens.

import * as SecureStore from "expo-secure-store";

const GITHUB_API = "https://api.github.com";

async function getToken(): Promise<string> {
  const token = await SecureStore.getItemAsync("GITHUB_TOKEN");
  if (!token) throw new Error("GITHUB_TOKEN missing. Set it in Settings first.");
  return token;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

// Verifies the token actually works and returns the authenticated user's login.
export async function testGithubConnection(): Promise<{ login: string }> {
  const token = await getToken();
  const res = await fetch(`${GITHUB_API}/user`, { headers: authHeaders(token) });
  if (!res.ok) {
    throw new Error(`GitHub auth failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return { login: data.login };
}

// Creates or updates a single file in a repo (base64-encodes the content for you).
// repoFullName format: "username/repo-name"
export async function pushFile(
  repoFullName: string,
  path: string,
  content: string,
  commitMessage: string,
  branch: string = "main"
) {
  const token = await getToken();

  // Need the current file's sha if it already exists, otherwise GitHub rejects the update.
  let sha: string | undefined;
  const existing = await fetch(
    `${GITHUB_API}/repos/${repoFullName}/contents/${path}?ref=${branch}`,
    { headers: authHeaders(token) }
  );
  if (existing.ok) {
    const data = await existing.json();
    sha = data.sha;
  }

  const base64Content = base64Encode(content);

  const res = await fetch(`${GITHUB_API}/repos/${repoFullName}/contents/${path}`, {
    method: "PUT",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: commitMessage,
      content: base64Content,
      branch,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!res.ok) {
    throw new Error(`GitHub push failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export async function createRepo(name: string, isPrivate: boolean = true) {
  const token = await getToken();
  const res = await fetch(`${GITHUB_API}/user/repos`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ name, private: isPrivate, auto_init: true }),
  });
  if (!res.ok) {
    throw new Error(`Repo creation failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

function base64Encode(str: string): string {
  // React Native's global btoa only handles Latin1 — this handles UTF-8 safely.
  const utf8 = unescape(encodeURIComponent(str));
  let output = "";
  if (typeof btoa === "function") return btoa(utf8);
  // Fallback manual base64 (rarely needed on modern RN/Expo, kept for safety)
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let i = 0;
  while (i < utf8.length) {
    const a = utf8.charCodeAt(i++);
    const b = utf8.charCodeAt(i++);
    const c = utf8.charCodeAt(i++);
    const e1 = a >> 2;
    const e2 = ((a & 3) << 4) | (isNaN(b) ? 0 : b >> 4);
    const e3 = isNaN(b) ? 64 : (((b & 15) << 2) | (isNaN(c) ? 0 : c >> 6));
    const e4 = isNaN(c) ? 64 : c & 63;
    output += chars[e1] + chars[e2] + chars[e3] + chars[e4];
  }
  return output;
}
