# v0 Automation

Automated component generation using v0 Platform API.

## Features
- Batch generate components from design packages
- Single component generation
- Iteration via follow-up messages
- n8n workflow integration
- Auto-save to correct folder structure

## Requirements
- v0 Premium plan ($20/month)
- API key from https://v0.dev/chat/settings/keys

## Usage
```bash
npm install
export V0_API_KEY=your_key_here
node scripts/generate-components.js ./path/to/DesignPackage
```

## Options
```bash
# Single component
node scripts/generate-components.js ./Package --single hero.md

# Iterate on component
node scripts/generate-components.js ./Package --single hero.md --iterate "Make button larger"
```

## Output
- Components saved to `v0-components/*.tsx`
- Manifest with demo URLs created
- Ready for WordPress implementation

## Part of
[Nick's AI Publishing Empire](https://github.com/ncreighton/empire-session-files)
