# BuilderOS Plugin System

Plugins are local capability providers. In the MVP, plugins are registered from code-defined manifests and seeded into SQLite at startup.

## Manifest

```json
{
  "id": "builderos.files",
  "name": "Files",
  "description": "Local file capability provider.",
  "version": "0.1.0",
  "author": "BuilderOS",
  "capabilities": ["file.read", "file.write", "file.list"],
  "permissions": ["filesystem.read", "filesystem.write"]
}
```

## Built-in plugins

- `builderos.files`
- `builderos.safe-shell`
- `builderos.git`
- `builderos.research`
- `builderos.artifacts`

## Safety boundaries

Plugins are not uploaded or dynamically installed. There is no marketplace. Shell execution is mocked. File operations are conservative by default.

## Next steps

- Add filesystem-based local manifest discovery.
- Add plugin validation.
- Add scoped workspaces and permission prompts.
- Add signed plugin bundles much later, after the local runtime is stable.
