import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Rewrite } from '../types'

const isAuto = atom({ plugin: 'prompt-master', key: 'isAuto' } as const, false)
const isBusy = atom({ plugin: 'prompt-master', key: 'isBusy' } as const, false)
const last = atom({ plugin: 'prompt-master', key: 'last' } as const, null)

// Prompts typed by the person (terminal, app, phone); never a plugin's,
// a scheduled task's or another session's.
const PERSON_ORIGINS = ['composer', 'bridge', 'sdk', 'projects-relay']
const PREFIX = /^\s*pm:\s*/i

const SYSTEM = `You are Prompt Master, an expert prompt engineer.
Rewrite the user's rough prompt into a clear, specific, well-structured prompt for an AI coding/assistant agent.

Rules:
- Keep the user's intent, facts, names, file paths, code and constraints exactly. Never invent requirements, data or context.
- Make the goal explicit, then add useful structure: context, the concrete task, constraints, and what a good result looks like (expected output/format, how to verify).
- Fix typos and ambiguity; turn vague words into precise ones only where the meaning is clear.
- Keep it concise: no filler, no role-play preambles. Use short bullet points when that helps.
- Write in the same language the user wrote in.
- If the prompt is already good, return it with only light polishing.
- Reply with the rewritten prompt ONLY: no explanation, no quotes, no heading like "Improved prompt".`

async function rewrite($: EngineInterface, rough: string): Promise<string | undefined> {
  await update($, isBusy, () => true)
  try {
    const r = await $.model.complete({
      model: 'sonnet',
      system: SYSTEM,
      prompt: `<rough_prompt>\n${rough}\n</rough_prompt>`,
      maxTokens: 2048,
      effort: 'low',
      timeoutMs: 45000,
    })
    if (!r.isAnswered) {
      $.ui.toast(`Prompt Master: rewrite failed (${r.reason})`)
      return undefined
    }
    const after = r.text.trim()
    if (!after) return undefined
    const done: Rewrite = { before: rough, after }
    await update($, last, () => done)
    return after
  } finally {
    await update($, isBusy, () => false)
  }
}

// The one-click path: rewrite what is in the prompt box, put it back for review.
async function rewriteDraft($: EngineInterface): Promise<void> {
  if (await read($, isBusy)) return
  const { text } = await $.prompt.read()
  const rough = text.replace(PREFIX, '').trim()
  if (!rough) {
    $.ui.toast('Prompt Master: type a rough prompt first')
    return
  }
  $.ui.status('✨ Prompt Master: rewriting…')
  try {
    const after = await rewrite($, rough).catch(() => undefined)
    if (!after) return
    const filled = await $.prompt.fill({ text: after, mode: 'replace' })
    $.ui.toast(
      filled.isFilled
        ? '✨ Prompt rewritten. Review it, then press Enter to send'
        : 'Prompt Master: could not put the rewrite in the prompt box',
    )
  } finally {
    $.ui.status(undefined)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'pm',
      description:
        'Prompt Master: /pm <rough prompt> rewrites it; /pm on|off auto-rewrites every prompt you send',
    })
    return next(e)
  })

  on('command.run', { command: 'pm' }, async ($, e) => {
    const arg = e.args.trim()
    const word = arg.toLowerCase()

    if (word === 'on' || word === 'off' || word === '') {
      const value = word === '' ? !(await read($, isAuto)) : word === 'on'
      await update($, isAuto, () => value)
      return {
        text: value
          ? '✨ Prompt Master auto mode ON: every prompt you send is rewritten first. /pm off to stop.'
          : 'Prompt Master auto mode OFF. Use the ✨ button, or start a prompt with "pm:" to rewrite just that one.',
        isLocal: true,
      }
    }

    const after = await rewrite($, arg).catch(() => undefined)
    if (!after) return { text: 'Prompt Master: the rewrite failed, try again.', isLocal: true }
    const filled = await $.prompt.fill({ text: after, mode: 'replace' })
    return {
      text: filled.isFilled
        ? '✨ Rewritten prompt is in your prompt box. Review it, then press Enter.'
        : `✨ Rewritten prompt (copy it and send):\n\n${after}`,
      isLocal: true,
    }
  })

  // "pm: ..." on any surface, or every prompt while auto mode is on.
  on('prompt.submit', async ($, e, next) => {
    if (e.command || e.isMeta || !PERSON_ORIGINS.includes(e.origin.kind)) return next(e)

    const hasPrefix = PREFIX.test(e.text)
    if (!hasPrefix && !(await read($, isAuto))) return next(e)

    const rough = e.text.replace(PREFIX, '').trim()
    if (!rough) return next(e)

    $.ui.status('✨ Prompt Master: rewriting…')
    try {
      const after = await rewrite($, rough).catch(() => undefined)
      if (!after) return next({ ...e, text: rough })
      $.ui.toast('✨ Prompt Master rewrote your prompt')
      return next({
        ...e,
        text: after,
        context: [
          ...(e.context ?? []),
          `The user's original rough prompt, before Prompt Master rewrote it:\n${rough}`,
        ],
      })
    } finally {
      $.ui.status(undefined)
    }
  })

  // The button, in the row directly above the prompt box (terminal and desktop).
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    const busy = await read($, isBusy)
    const auto = await read($, isAuto)

    return (
      <Box flexDirection="row" gap={1}>
        <Button
          key="pm-rewrite"
          label={busy ? '✨ Rewriting…' : '✨ Prompt Master'}
          variant="primary"
          hotkey="p"
          onPress={() => rewriteDraft($)}
        />
        <Button
          key="pm-auto"
          label={auto ? 'Auto: on' : 'Auto: off'}
          dimColor={!auto}
          hotkey="a"
          onPress={() => update($, isAuto, v => !v)}
        />
        <Text dimColor>or start a prompt with pm:</Text>
      </Box>
    )
  })
}
