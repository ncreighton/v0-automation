# v0 Automation Skill

Automates the v0.dev component generation step in the Visual-to-Code Pipeline. Sends prompts to v0 Platform API, retrieves generated code, and saves to correct folder structure.

## Prerequisites

- **v0 Premium Plan** ($20/month) - Required for API access
- Get API key from: https://v0.dev/chat/settings/keys
- Set environment variable: `V0_API_KEY=your_key_here`

## Installation

```bash
npm install v0-sdk
# or
pnpm add v0-sdk
```

## Capabilities

1. **Batch Generate Components** - Send all v0 prompts in a design package
2. **Single Component Generation** - Generate one component at a time
3. **Auto-Save to Folder Structure** - Save exports to `v0-components/` folder
4. **Iterate on Components** - Send follow-up messages to refine output
5. **n8n Integration** - Workflow nodes for full automation

---

## Quick Start

### Option 1: Node.js Script (Standalone)

```javascript
// generate-components.js
import { v0 } from 'v0-sdk'
import fs from 'fs/promises'
import path from 'path'

const DESIGN_PACKAGE_PATH = './WitchcraftForBeginners-DesignPackage'

async function generateComponent(promptFile, outputName) {
  // Read the v0 prompt
  const promptPath = path.join(DESIGN_PACKAGE_PATH, 'design-reference/v0-prompts', promptFile)
  const promptContent = await fs.readFile(promptPath, 'utf-8')
  
  // Extract prompt (everything after the --- line)
  const prompt = promptContent.split('---')[1]?.trim()
  
  if (!prompt) {
    console.error(`No prompt found in ${promptFile}`)
    return null
  }

  console.log(`Generating ${outputName}...`)
  
  // Send to v0 API
  const chat = await v0.chats.create({
    message: prompt,
    system: 'You are an expert React developer. Generate clean, production-ready components with Tailwind CSS.'
  })
  
  // Extract the main component file
  const componentFile = chat.files?.find(f => f.name.endsWith('.tsx') || f.name.endsWith('.jsx'))
  
  if (componentFile) {
    const outputPath = path.join(DESIGN_PACKAGE_PATH, 'design-reference/v0-components', `${outputName}.tsx`)
    await fs.writeFile(outputPath, componentFile.content)
    console.log(`✓ Saved ${outputName}.tsx`)
    return { name: outputName, chatUrl: chat.webUrl, demoUrl: chat.demo }
  }
  
  return null
}

async function generateAllComponents() {
  const components = [
    { prompt: 'hero.md', output: 'Hero' },
    { prompt: 'navigation.md', output: 'Navigation' },
    { prompt: 'cards.md', output: 'ArticleCards' },
    { prompt: 'newsletter.md', output: 'Newsletter' },
    { prompt: 'footer.md', output: 'Footer' }
  ]
  
  const results = []
  
  for (const comp of components) {
    const result = await generateComponent(comp.prompt, comp.output)
    if (result) results.push(result)
    
    // Rate limiting - wait between requests
    await new Promise(r => setTimeout(r, 2000))
  }
  
  // Save manifest
  const manifest = {
    generated: new Date().toISOString(),
    components: results
  }
  
  await fs.writeFile(
    path.join(DESIGN_PACKAGE_PATH, 'design-reference/v0-components/manifest.json'),
    JSON.stringify(manifest, null, 2)
  )
  
  console.log('\n✓ All components generated!')
  console.log('Manifest saved to v0-components/manifest.json')
}

generateAllComponents()
```

### Option 2: n8n Workflow

Import the workflow JSON from `./n8n-workflow.json` into your n8n instance.

**Workflow Steps:**
1. **Trigger** - Manual or webhook
2. **Read Prompts** - Load all .md files from v0-prompts folder
3. **Loop** - For each prompt file
4. **HTTP Request** - Call v0 API
5. **Extract Code** - Parse response for component files
6. **Save File** - Write to v0-components folder
7. **Aggregate** - Build manifest.json

### Option 3: Claude Desktop MCP Integration

Use the v0 MCP adapter for direct integration with Claude Desktop:

```bash
npx @anthropic-ai/mcp-server-v0
```

Then Claude can directly call v0 to generate components during conversation.

---

## API Reference

### Create Chat (Generate Component)

```javascript
const chat = await v0.chats.create({
  message: 'Your detailed prompt here',
  system: 'Optional system message for context'
})

// Response includes:
chat.id        // Chat ID for follow-up messages
chat.webUrl    // Link to v0.dev chat
chat.demo      // Live demo URL
chat.files     // Array of generated files
```

### Send Follow-up Message (Iterate)

```javascript
const response = await v0.chats.sendMessage({
  chatId: chat.id,
  message: 'Make the button larger and add a hover animation'
})
```

### Initialize from Existing Files

```javascript
const chat = await v0.chats.init({
  type: 'files',
  files: [
    { name: 'tokens.css', content: '/* your tokens */' }
  ],
  initialContext: 'Build components using these design tokens'
})
```

---

## Full Automation Pipeline

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Design Package │     │   v0 API        │     │  v0-components/ │
│  v0-prompts/    │ ──▶ │   (generate)    │ ──▶ │  Hero.tsx       │
│  - hero.md      │     │                 │     │  Navigation.tsx │
│  - cards.md     │     │                 │     │  Cards.tsx      │
│  - footer.md    │     │                 │     │  manifest.json  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │  WordPress      │ ◀── │  Claude Code    │
                        │  Theme Files    │     │  (implement)    │
                        └─────────────────┘     └─────────────────┘
```

---

## Pricing Estimate

**v0 Premium Plan**: $20/month

Typical usage per component:
- Input tokens: ~2,000-5,000 (detailed prompt)
- Output tokens: ~3,000-8,000 (React component)
- Estimated cost: $0.50-$2.00 per component

**For a 5-component design package**: ~$5-10 total

**Monthly estimate for 17 sites × 5 components**: ~$170-340
- But components are reusable templates
- After initial generation, iterations are cheaper

---

## Error Handling

```javascript
try {
  const chat = await v0.chats.create({ message: prompt })
} catch (error) {
  if (error.code === 'rate_limit_exceeded') {
    console.log('Rate limited - waiting 60s...')
    await new Promise(r => setTimeout(r, 60000))
    // Retry
  } else if (error.code === 'insufficient_credits') {
    console.error('Out of credits - purchase more at v0.dev/settings')
  } else {
    throw error
  }
}
```

---

## Integration with Visual-to-Code Pipeline

This skill is Phase 2.5 of the Visual-to-Code Pipeline:

1. **Phase 1**: Generate design tokens from DNA ✓
2. **Phase 2**: Generate v0 prompts ✓
3. **Phase 2.5**: Execute v0 prompts via API ← THIS SKILL
4. **Phase 3**: Claude Code implements from v0 exports

### Automated Trigger Points

**Option A: Run after v0 prompts are generated**
```bash
node generate-components.js
```

**Option B: n8n webhook trigger**
- Trigger URL watches for new .md files in v0-prompts/
- Automatically generates components when prompts are added

**Option C: Claude orchestration**
- Claude reads prompt, calls v0 MCP, saves result
- All in one conversation

---

## Files in This Skill

```
v0-automation/
├── SKILL.md                    # This file
├── scripts/
│   ├── generate-components.js  # Standalone Node.js script
│   ├── generate-single.js      # Generate one component
│   └── iterate-component.js    # Refine existing component
├── n8n/
│   └── v0-automation.json      # n8n workflow template
└── examples/
    └── batch-generate.js       # Full batch example
```

---

## Next Steps

1. Get v0 API key from https://v0.dev/chat/settings/keys
2. Set `V0_API_KEY` environment variable
3. Install v0-sdk: `npm install v0-sdk`
4. Run `node generate-components.js` on your design package
5. Components appear in `v0-components/` folder
6. Tell Claude Code to implement from v0 references

---

## Related Skills

- [visual-to-code-pipeline](../visual-to-code-pipeline/SKILL.md) - Parent pipeline skill
- [n8n-master-architect](../../n8n-master-architect/SKILL.md) - Workflow automation

---

*Closes the loop on fully automated design-to-code pipeline.*
