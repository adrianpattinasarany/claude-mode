# Prompt Master

Rewrites your rough prompt into a clear, specific, well-structured prompt before Claude reads it.

- **✨ Prompt Master button** (row right above the prompt box, terminal and desktop): rewrites the draft in the box and puts it back so you can review it, then press Enter. Hotkey `p` while the band is focused.
- **`pm:` prefix** (every surface, including web and mobile): start a message with `pm:` and it is rewritten before it is sent.
- **Auto mode**: `/pm on` rewrites every prompt you send; `/pm off` stops. The `Auto` button toggles it too.
- **`/pm <rough prompt>`**: rewrites the text and puts the result in your prompt box (or shows it to copy).

The rewrite keeps your intent, names, paths and code, and replies in the language you wrote in. Claude also receives your original rough prompt as hidden context.

## Install

At the prompt of a Claude Code session:

```
/plugin install prompt-master --marketplace adrianpattinasarany/claude-mode
```

Answer `y` to add the marketplace, then pick a scope (user scope makes it available in every session).

From a shell:

```bash
claude plugin install prompt-master --marketplace adrianpattinasarany/claude-mode
```
