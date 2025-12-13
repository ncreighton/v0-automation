#!/usr/bin/env node
/**
 * v0 Component Generator
 * 
 * Reads v0 prompts from a design package and generates components via v0 Platform API.
 * Saves generated code to v0-components/ folder.
 * 
 * Usage:
 *   node generate-components.js [design-package-path]
 * 
 * Environment:
 *   V0_API_KEY - Your v0 API key from https://v0.dev/chat/settings/keys
 */

import { v0 } from 'v0-sdk'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Configuration
const CONFIG = {
  promptsDir: 'design-reference/v0-prompts',
  outputDir: 'design-reference/v0-components',
  delayBetweenRequests: 3000, // ms - avoid rate limiting
  systemPrompt: `You are an expert React developer specializing in modern, accessible UI components.
Generate clean, production-ready components using:
- React functional components with hooks
- Tailwind CSS for styling
- Lucide React for icons
- Proper TypeScript types
- Mobile-first responsive design
- Semantic HTML and ARIA attributes

Export the main component as default.`
}

// Component mapping: prompt filename -> output component name
const COMPONENT_MAP = {
  'hero.md': 'Hero',
  'navigation.md': 'Navigation',
  'nav.md': 'Navigation',
  'header.md': 'Header',
  'cards.md': 'ArticleCards',
  'article-cards.md': 'ArticleCards',
  'newsletter.md': 'Newsletter',
  'signup.md': 'Newsletter',
  'footer.md': 'Footer',
  'sidebar.md': 'Sidebar',
  'cta.md': 'CallToAction',
  'testimonials.md': 'Testimonials',
  'features.md': 'Features',
  'pricing.md': 'Pricing',
  'faq.md': 'FAQ',
  'contact.md': 'Contact'
}

/**
 * Extract the prompt content from a markdown file
 * Prompts are everything after the --- separator
 */
function extractPrompt(content) {
  const parts = content.split('---')
  if (parts.length < 2) {
    // No separator, use entire content
    return content.trim()
  }
  // Return everything after first separator
  return parts.slice(1).join('---').trim()
}

/**
 * Generate a single component from a prompt file
 */
async function generateComponent(promptPath, componentName, options = {}) {
  const { verbose = true, iterate = null } = options
  
  try {
    // Read prompt file
    const promptContent = await fs.readFile(promptPath, 'utf-8')
    const prompt = extractPrompt(promptContent)
    
    if (!prompt) {
      console.error(`  ✗ No prompt content found in ${path.basename(promptPath)}`)
      return null
    }
    
    if (verbose) {
      console.log(`  → Generating ${componentName}...`)
    }
    
    // Create chat with v0 API
    const chat = await v0.chats.create({
      message: prompt,
      system: CONFIG.systemPrompt
    })
    
    // If iterate option provided, send follow-up
    if (iterate) {
      if (verbose) console.log(`    → Iterating: "${iterate}"`)
      await v0.chats.sendMessage({
        chatId: chat.id,
        message: iterate
      })
    }
    
    // Find the main component file in response
    const componentFile = chat.files?.find(f => 
      f.name.endsWith('.tsx') || 
      f.name.endsWith('.jsx') ||
      f.name === 'page.tsx' ||
      f.name.includes('component')
    )
    
    if (!componentFile) {
      console.error(`  ✗ No component file in response for ${componentName}`)
      console.log(`    Available files:`, chat.files?.map(f => f.name).join(', ') || 'none')
      return {
        name: componentName,
        success: false,
        chatUrl: chat.webUrl,
        demoUrl: chat.demo
      }
    }
    
    return {
      name: componentName,
      success: true,
      content: componentFile.content,
      filename: `${componentName}.tsx`,
      chatUrl: chat.webUrl,
      demoUrl: chat.demo,
      originalFile: componentFile.name
    }
    
  } catch (error) {
    console.error(`  ✗ Error generating ${componentName}:`, error.message)
    
    if (error.code === 'rate_limit_exceeded') {
      console.log(`    Waiting 60s for rate limit...`)
      await new Promise(r => setTimeout(r, 60000))
      // Retry once
      return generateComponent(promptPath, componentName, { ...options, verbose })
    }
    
    return {
      name: componentName,
      success: false,
      error: error.message
    }
  }
}

/**
 * Generate all components from a design package
 */
async function generateAllComponents(packagePath) {
  const promptsPath = path.join(packagePath, CONFIG.promptsDir)
  const outputPath = path.join(packagePath, CONFIG.outputDir)
  
  // Ensure output directory exists
  await fs.mkdir(outputPath, { recursive: true })
  
  // Find all prompt files
  let promptFiles
  try {
    const files = await fs.readdir(promptsPath)
    promptFiles = files.filter(f => f.endsWith('.md'))
  } catch (error) {
    console.error(`Error reading prompts directory: ${promptsPath}`)
    console.error(error.message)
    process.exit(1)
  }
  
  if (promptFiles.length === 0) {
    console.error(`No .md prompt files found in ${promptsPath}`)
    process.exit(1)
  }
  
  console.log(`\nFound ${promptFiles.length} prompt files`)
  console.log(`Output directory: ${outputPath}\n`)
  
  const results = []
  
  for (const promptFile of promptFiles) {
    // Determine component name
    const componentName = COMPONENT_MAP[promptFile] || 
      promptFile.replace('.md', '').replace(/-/g, '').replace(/^\w/, c => c.toUpperCase())
    
    const result = await generateComponent(
      path.join(promptsPath, promptFile),
      componentName
    )
    
    if (result) {
      results.push(result)
      
      // Save successful components
      if (result.success && result.content) {
        const outputFile = path.join(outputPath, result.filename)
        await fs.writeFile(outputFile, result.content)
        console.log(`  ✓ Saved ${result.filename}`)
        
        if (result.demoUrl) {
          console.log(`    Demo: ${result.demoUrl}`)
        }
      }
    }
    
    // Rate limiting delay
    if (promptFiles.indexOf(promptFile) < promptFiles.length - 1) {
      await new Promise(r => setTimeout(r, CONFIG.delayBetweenRequests))
    }
  }
  
  // Generate manifest
  const manifest = {
    generated: new Date().toISOString(),
    packagePath: packagePath,
    totalComponents: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    components: results.map(r => ({
      name: r.name,
      success: r.success,
      filename: r.filename || null,
      chatUrl: r.chatUrl || null,
      demoUrl: r.demoUrl || null,
      error: r.error || null
    }))
  }
  
  const manifestPath = path.join(outputPath, 'manifest.json')
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2))
  
  // Summary
  console.log('\n' + '─'.repeat(50))
  console.log('Generation Complete!')
  console.log(`  ✓ Successful: ${manifest.successful}`)
  console.log(`  ✗ Failed: ${manifest.failed}`)
  console.log(`\nManifest saved to: ${manifestPath}`)
  
  // List demo URLs
  const demos = results.filter(r => r.demoUrl)
  if (demos.length > 0) {
    console.log('\nLive Demos:')
    demos.forEach(d => console.log(`  ${d.name}: ${d.demoUrl}`))
  }
  
  return manifest
}

/**
 * Generate a single component (for CLI use)
 */
async function generateSingle(packagePath, promptFile, options = {}) {
  const promptsPath = path.join(packagePath, CONFIG.promptsDir)
  const outputPath = path.join(packagePath, CONFIG.outputDir)
  
  await fs.mkdir(outputPath, { recursive: true })
  
  const componentName = COMPONENT_MAP[promptFile] || 
    promptFile.replace('.md', '').replace(/-/g, '').replace(/^\w/, c => c.toUpperCase())
  
  const result = await generateComponent(
    path.join(promptsPath, promptFile),
    componentName,
    options
  )
  
  if (result?.success && result.content) {
    const outputFile = path.join(outputPath, result.filename)
    await fs.writeFile(outputFile, result.content)
    console.log(`✓ Generated ${result.filename}`)
    if (result.demoUrl) console.log(`  Demo: ${result.demoUrl}`)
    if (result.chatUrl) console.log(`  Chat: ${result.chatUrl}`)
  }
  
  return result
}

// CLI Entry Point
async function main() {
  // Check for API key
  if (!process.env.V0_API_KEY) {
    console.error('Error: V0_API_KEY environment variable not set')
    console.error('Get your API key from: https://v0.dev/chat/settings/keys')
    process.exit(1)
  }
  
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log('Usage:')
    console.log('  node generate-components.js <design-package-path>')
    console.log('  node generate-components.js <design-package-path> --single <prompt-file>')
    console.log('  node generate-components.js <design-package-path> --single <prompt-file> --iterate "feedback"')
    console.log('')
    console.log('Examples:')
    console.log('  node generate-components.js ./WitchcraftForBeginners-DesignPackage')
    console.log('  node generate-components.js ./SmartHomeWizards --single hero.md')
    console.log('  node generate-components.js ./Site --single hero.md --iterate "Make the CTA button larger"')
    process.exit(0)
  }
  
  const packagePath = args[0]
  
  // Check if single mode
  const singleIndex = args.indexOf('--single')
  if (singleIndex !== -1 && args[singleIndex + 1]) {
    const promptFile = args[singleIndex + 1]
    
    // Check for iterate flag
    const iterateIndex = args.indexOf('--iterate')
    const iterate = iterateIndex !== -1 ? args[iterateIndex + 1] : null
    
    await generateSingle(packagePath, promptFile, { iterate })
  } else {
    await generateAllComponents(packagePath)
  }
}

main().catch(console.error)

// Export for programmatic use
export { generateComponent, generateAllComponents, generateSingle, CONFIG }
