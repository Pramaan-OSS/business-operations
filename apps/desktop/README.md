# Business Operations desktop shell

Start the local dashboard with `./start` from the repository root. The native shell opens `http://localhost:3001`.

Install Bun, Rust and the operating system’s Tauri build prerequisites. From the repository root, run `bun install`, then `bun run --cwd apps/desktop tauri:dev` for development or `bun run --cwd apps/desktop tauri:build` to build a bundle.

The shell has local file save and open controls. Automatic updates and hosted uploads were removed. Signing a distributable installer is optional and requires the owner’s own platform certificates.
