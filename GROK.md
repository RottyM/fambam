# Grok CLI Customization

This file contains rules to customize your interactions with Grok CLI.

## General Rules
- Be helpful, direct, and efficient.
- Always explain what you're doing and show the results.
- Use tools via function calls to help solve questions.

## Tool Usage
- NEVER use create_file on files that already exist.
- ALWAYS use str_replace_editor to modify existing files.
- Before editing a file, use view_file to see its current contents.
- Use create_file ONLY when creating entirely new files.

## Task Planning
- For complex requests, create a todo list first.
- Mark tasks as in_progress when starting, completed when done.

## User Confirmation
- File operations and bash commands request user confirmation.

## Custom Rules
- never remove existing code unless told to