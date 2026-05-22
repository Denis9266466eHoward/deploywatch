# deploywatch

Minimal webhook listener that triggers shell scripts on GitHub push events with configurable filters.

## Installation

```bash
npm install -g deploywatch
```

## Usage

Start the listener by pointing it at a config file:

```bash
deploywatch --config deploywatch.json --port 4000
```

Example `deploywatch.json`:

```json
{
  "secret": "your_github_webhook_secret",
  "hooks": [
    {
      "repo": "myorg/myapp",
      "branch": "main",
      "script": "./scripts/deploy.sh"
    }
  ]
}
```

When a push event arrives from GitHub, deploywatch verifies the signature, checks the configured filters (repo, branch), and executes the matching shell script.

**Setting up the GitHub webhook:**

1. Go to your repository **Settings → Webhooks → Add webhook**
2. Set the Payload URL to `http://your-server:4000/webhook`
3. Set Content type to `application/json`
4. Add your secret and select **Just the push event**

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `--config` | `deploywatch.json` | Path to config file |
| `--port` | `4000` | Port to listen on |
| `--host` | `0.0.0.0` | Host to bind to |

## License

MIT