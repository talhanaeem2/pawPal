export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <script>
      try {
        const t = localStorage.getItem("pawpal-theme");

        if (
          t === "dark" ||
          ((!t || t === "system") &&
            matchMedia("(prefers-color-scheme: dark)").matches)
        ) {
          document.documentElement.classList.add("dark");
        }
      } catch {}
    </script>

    <style>
      :root {
        --error-bg: #F6F4EE;
        --error-text: #3D3A35;
        --error-muted: #6B6862;
        --error-card: #FFFFFF;
        --error-border: #E0DCD0;
        --error-primary: #A8C5B5;
        --error-primary-text: #1F2D24;
      }

      .dark {
        --error-bg: oklch(0.22 0.012 80);
        --error-text: oklch(0.96 0.008 85);
        --error-muted: oklch(0.70 0.012 85);
        --error-card: oklch(0.27 0.012 80);
        --error-border: oklch(1 0 0 / 12%);
        --error-primary: oklch(0.795 0.052 155);
        --error-primary-text: oklch(0.15 0.01 155);
      }

      body {
        font: 15px/1.5 system-ui, -apple-system, sans-serif;
        background: var(--error-bg);
        color: var(--error-text);
        display: grid;
        place-items: center;
        min-height: 100vh;
        margin: 0;
        padding: 1.5rem;
      }

      .card {
        max-width: 28rem;
        width: 100%;
        text-align: center;
        padding: 2rem;
      }

      h1 {
        font-size: 1.25rem;
        margin: 0 0 0.5rem;
      }

      p {
        color: var(--error-muted);
        margin: 0 0 1.5rem;
      }

      .actions {
        display: flex;
        gap: 0.5rem;
        justify-content: center;
        flex-wrap: wrap;
      }

      a,
      button {
        padding: 0.5rem 1rem;
        border-radius: 9999px;
        font: inherit;
        cursor: pointer;
        text-decoration: none;
        border: 1px solid transparent;
      }

      .primary {
        background: var(--error-primary);
        color: var(--error-primary-text);
      }

      .secondary {
        background: var(--error-card);
        color: var(--error-text);
        border-color: var(--error-border);
      }
    </style>
  </head>

  <body>
    <div class="card">
      <h1>This page didn't load</h1>
      <p>
        Something went wrong on our end. You can try refreshing or head back home.
      </p>

      <div class="actions">
        <button class="primary" onclick="location.reload()">
          Try again
        </button>

        <a class="secondary" href="/">
          Go home
        </a>
      </div>
    </div>
  </body>
</html>`;
}