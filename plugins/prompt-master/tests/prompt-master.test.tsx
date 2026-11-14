import { expect, test } from 'claude-code/testing'

const USAGE = { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

test('a "pm:" prompt is rewritten before it is sent', async ($, on) => {
  on('model.complete', () => ({ value: { isAnswered: true, text: 'Better prompt', usage: USAGE } }))
  on('prompt.submit', (_, e) => ({ text: e.text, context: e.context }))

  const sent = await $.prompt.submit({ text: 'pm: fix the bug pls', wait: false, origin: { kind: 'composer' } })
  expect(sent.text).toBe('Better prompt')
})

test('a plain prompt passes untouched while auto mode is off', async ($, on) => {
  on('prompt.submit', (_, e) => ({ text: e.text }))

  const sent = await $.prompt.submit({ text: 'fix the bug', wait: false, origin: { kind: 'composer' } })
  expect(sent.text).toBe('fix the bug')
})

test('the button is drawn above the prompt', async ($, on) => {
  const ui = await $.ui.mount({
    plugin: 'prompt-master',
    component: 'AbovePrompt',
    surface: 'desktop',
    props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 9 }, view: {} },
  } as const)
  expect(await ui.find({ type: 'Button', key: 'pm-rewrite' })).toBeTruthy()
  await ui.unmount()
})
