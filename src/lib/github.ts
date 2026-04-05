/**
 * GitHub API helpers for technical gig types.
 * Creates repos, pushes code scaffolds, and manages CI/CD.
 */

const GITHUB_API = "https://api.github.com";

interface GitHubConfig {
  token: string;
  owner?: string;
}

export async function createRepository(
  config: GitHubConfig,
  name: string,
  options: {
    description?: string;
    isPrivate?: boolean;
    autoInit?: boolean;
  } = {}
): Promise<{ fullName: string; htmlUrl: string; cloneUrl: string }> {
  const response = await fetch(`${GITHUB_API}/user/repos`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
    },
    body: JSON.stringify({
      name,
      description: options.description || `Created by Gigler AI`,
      private: options.isPrivate ?? false,
      auto_init: options.autoInit ?? true,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`GitHub API error: ${data.message || response.statusText}`);
  }

  return {
    fullName: data.full_name,
    htmlUrl: data.html_url,
    cloneUrl: data.clone_url,
  };
}

export async function createOrUpdateFile(
  config: GitHubConfig,
  repo: string,
  path: string,
  content: string,
  message: string,
  sha?: string
): Promise<{ sha: string }> {
  const owner = config.owner || (await getAuthenticatedUser(config));
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({
        message,
        content: Buffer.from(content).toString("base64"),
        sha,
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`GitHub API error: ${data.message || response.statusText}`);
  }

  return { sha: data.content?.sha };
}

async function getAuthenticatedUser(config: GitHubConfig): Promise<string> {
  const response = await fetch(`${GITHUB_API}/user`, {
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/vnd.github+json",
    },
  });
  const data = await response.json();
  return data.login;
}

export interface ScaffoldTemplate {
  files: Record<string, string>;
  description: string;
}

export function getNextJsScaffold(projectName: string): ScaffoldTemplate {
  return {
    description: `Next.js app scaffold for ${projectName}`,
    files: {
      "package.json": JSON.stringify(
        {
          name: projectName.toLowerCase().replace(/\s+/g, "-"),
          version: "0.1.0",
          private: true,
          scripts: {
            dev: "next dev",
            build: "next build",
            start: "next start",
          },
          dependencies: {
            next: "latest",
            react: "latest",
            "react-dom": "latest",
          },
        },
        null,
        2
      ),
      "README.md": `# ${projectName}\n\nCreated with [Gigler](https://gigler.ai) - AI that lives in your texts.\n\n## Getting Started\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`,
    },
  };
}
