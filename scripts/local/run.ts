import { mkdir } from "node:fs/promises";
{
  await mkdir(".data", { recursive: true });
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try { if ((await fetch(`${process.env.LOCAL_AUTH_INTERNAL_URL || "http://auth:9999"}/health`)).ok) { ready = true; break; } } catch {}
    await Bun.sleep(1000);
  }
  if (!ready) throw new Error("The local sign-in service could not start.");
  const initialized = Bun.spawn(["bun", "scripts/local/bootstrap.ts"], { stdout: "inherit", stderr: "inherit" });
  if (await initialized.exited !== 0) process.exit(1);
  const processes = [
    Bun.spawn(["bun", "scripts/local/gateway.ts"], { stdout: "inherit", stderr: "inherit" }),
    Bun.spawn(["bun", "apps/api/src/index.ts"], { stdout: "inherit", stderr: "inherit", env: { ...process.env, PORT: "3002" } }),
    Bun.spawn(["bun", "apps/worker/src/index.ts"], { stdout: "inherit", stderr: "inherit", env: { ...process.env, PORT: "3003" } }),
    Bun.spawn(["bun", "--bun", "run", "--cwd", "apps/dashboard", "start", "-p", "3001", "-H", "0.0.0.0"], { stdout: "inherit", stderr: "inherit" }),
  ];
  const stop = () => { for (const child of processes) child.kill(); };
  process.on("SIGTERM", stop); process.on("SIGINT", stop);
  await Promise.race(processes.map(child => child.exited));
  stop(); process.exit(1);
}
