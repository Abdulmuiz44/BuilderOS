# BuilderOS Capabilities

Capabilities are typed actions that workflow steps call. They are provided by plugins and guarded by permissions.

## Capability fields

- `id`
- `name`
- `description`
- provider `pluginId`
- `inputSchema`
- `outputSchema`
- `requiredPermissions`
- `enabled`
- handler

## Initial capabilities

| Capability | Purpose | Permissions |
| --- | --- | --- |
| `file.read` | Conservative local file read placeholder. | `filesystem.read` |
| `file.write` | Conservative local file write placeholder. | `filesystem.write` |
| `file.list` | Mocked file listing for planning. | `filesystem.read` |
| `shell.command.mocked` | Records intended commands without execution. | `shell.execute` |
| `git.inspect.mocked` | Mocked repo inspection summary. | `git.read` |
| `research.note` | Generates structured markdown research notes. | `artifacts.write` |
| `artifact.create` | Persists run artifacts. | `artifacts.write` |

## Permission checks

The executor checks required workflow permissions before creating meaningful execution side effects. It also checks capability permissions before every step. Missing permissions fail the run clearly and write logs.
