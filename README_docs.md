# API Studio Documentation

This directory contains the documentation for API Studio, built with [MkDocs](https://www.mkdocs.org/) and the [Material theme](https://squidfunk.github.io/mkdocs-material/).

## Local Development

### Prerequisites

- Python 3.8+
- pip

### Setup

1. Install dependencies:

   ```bash
   pip install -r requirements-docs.txt
   ```

2. Serve the documentation locally:

   ```bash
   ./docs-serve.sh
   ```

   Or manually:

   ```bash
   mkdocs serve --dev-addr=localhost:58124
   ```

3. Open your browser to `http://localhost:58124`

## Deployment

The documentation is automatically deployed to GitHub Pages when changes are pushed to the `main` branch. The deployment is handled by the GitHub Actions workflow in `.github/workflows/docs.yml`.

### Manual Deployment

If you need to deploy manually:

```bash
mkdocs gh-deploy --force
```

## Structure

- `src/` - Documentation source files (Markdown)
- `mkdocs.yml` - MkDocs configuration
- `requirements-docs.txt` - Python dependencies
- `docs-serve.sh` - Local development server script

## Writing Documentation

- Use Markdown for all content
- Place images in `src/assets/`
- Follow the existing navigation structure in `mkdocs.yml`
- Use Material theme features like admonitions, tabs, and code blocks

## Troubleshooting

### 404 Errors on GitHub Pages

If you're getting 404 errors:

1. Check that your repository has GitHub Pages enabled
2. Ensure the source is set to "GitHub Actions" in repository settings
3. Verify the workflow has run successfully
4. Check that all file paths in navigation match actual files

### Local Development Issues

- Make sure all dependencies are installed: `pip install -r requirements-docs.txt`
- Check that you're in the correct directory when running commands
- Verify Python version compatibility (3.8+)
