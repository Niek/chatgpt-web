import { rename, unlink, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const promptCount = 100
const source = new URL(`https://prompts.chat/api/prompts?sort=upvotes&perPage=${promptCount}&type=TEXT`)
const destination = fileURLToPath(new URL('../src/awesome-chatgpt-prompts/prompts.csv', import.meta.url))
const temporaryDestination = `${destination}.${process.pid}.tmp`

const csvField = (value) => `"${value.replaceAll('"', '""')}"`

try {
  const response = await fetch(source, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(30_000)
  })

  if (!response.ok) {
    throw new Error(`Prompt API returned ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  if (!Array.isArray(data.prompts) || data.prompts.length !== promptCount) {
    throw new Error(`Expected ${promptCount} prompts, received ${data.prompts?.length ?? 'an invalid response'}`)
  }

  const rows = data.prompts.map((prompt, index) => {
    if (prompt.type !== 'TEXT' || typeof prompt.title !== 'string' || !prompt.title || typeof prompt.content !== 'string' || !prompt.content) {
      throw new Error(`Prompt ${index + 1} is missing valid text prompt data`)
    }

    return `${csvField(prompt.title)},${csvField(prompt.content)}`
  })

  const csv = `"act","prompt"\n${rows.join('\n')}\n`
  await writeFile(temporaryDestination, csv, 'utf8')
  await rename(temporaryDestination, destination)

  console.log(`Updated ${destination} with ${promptCount} top-rated text prompts.`)
} catch (error) {
  await unlink(temporaryDestination).catch(() => {})
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
