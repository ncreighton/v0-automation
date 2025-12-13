# v0 Automation

Automates v0.dev component generation for the Visual-to-Code Pipeline. Sends prompts to v0 Platform API, retrieves code, and saves to the correct folder structure.

## The Missing Link

The [Visual-to-Code Pipeline](https://github.com/ncreighton/visual-to-code-pipeline) had one manual step: copying prompts to v0.dev. This skill automates that step completely.

```
DNA → Tokens → v0 Prompts → [v0 API] → Code Files → Claude Code → WordPress
                              ↑
                        THIS SKILL
```

## Quick Start

```bash
# Install
npm install v0-sdk

# Set API key (get from https://v0.dev/chat/settings/keys)
export V0_API_KEY=your_key_here

# Generate all components from a design package
node scripts/generate-components.js ./WitchcraftForBeginners-DesignPackage

# Generate single component
node scripts/generate-components.js ./Package --single hero.md

# Iterate on a component
node scripts/generate-components.js ./Package --single hero.md --iterate "Make button larger"
```

## What It Does

1. Reads v0 prompt files from `design-reference/v0-prompts/`
2. Sends each prompt to v0 Platform API
3. Extracts generated React component code
4. Saves to `design-reference/v0-components/`
5. Creates `manifest.json` with demo URLs

## Requirements

- **v0 Premium Plan** ($20/month) - Required for API access
- Node.js 18+
- v0 SDK: `npm install v0-sdk`

## Output

```
design-reference/v0-components/
├── Hero.tsx
├── Navigation.tsx
├── ArticleCards.tsx
├── Newsletter.tsx
├── Footer.tsx
└── manifest.json
```

## n8n Integration

Import `n8n/v0-automation.json` into your n8n instance for full workflow automation.

## Related Repos

- [visual-to-code-pipeline](https://github.com/ncreighton/visual-to-code-pipeline) - Parent skill
- [WitchcraftForBeginners-DesignPackage](https://github.com/ncreighton/WitchcraftForBeginners-DesignPackage) - Example package

---

*Closes the automation loop. No more manual copy-paste.*
