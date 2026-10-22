import { expect, test } from "bun:test";
import { mkdtemp, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { FakePramaan } from "../../packages/pramaan/src/fake";
import { PramaanError } from "../../packages/pramaan/src/index";
import { configureManagedServices } from "./managed";
const values = { PRAMAAN_API_KEY: "fixture", LOCAL_DATABASE_PASSWORD: "private-fixture", NEXT_PUBLIC_URL: "http://localhost:3001" };
const directory = () => mkdtemp(path.resolve(__dirname, "../../.scratch/compose-managed-"));
test("all database consumers select the managed connection and the override is private", async () => {
 const dir = await directory(); const previous = process.env.PRAMAAN_API_KEY;
 const uri = "postgresql://app:private-fixture@db.example.test/app?sslmode=require";
 const p = new FakePramaan({"db.postgres.provision": () => ({status:"ready",created:true,connectionString:uri,directConnectionString:uri}),"auth.backend.provision":()=>({status:"ready",authUrl:"https://signin.example.test/auth",jwksUrl:"https://signin.example.test/auth/jwks"})});
 try {
  await configureManagedServices(values,dir,p);
  const config = JSON.parse(await readFile(`${dir}/services.compose.json`,"utf8"));
  expect(config.services.app.environment.DATABASE_PRIMARY_URL).toBe(uri);
  expect(config.services.rest.environment.PGRST_DB_URI).toBe(uri);
  expect(new URL(config.services.auth.environment.GOTRUE_DB_DATABASE_URL).hostname).toBe("db.example.test");
  expect(config.services.app.environment.APP_SIGN_IN_MODE).toBe("managed");
  expect((await stat(`${dir}/services.compose.json`)).mode & 0o777).toBe(0o600);
 } finally { if(previous===undefined)delete process.env.PRAMAAN_API_KEY;else process.env.PRAMAAN_API_KEY=previous; }
});
test("no key never provisions and an unavailable database keeps the bundled path", async () => {
 const p = new FakePramaan(); const dir = await directory();
 await configureManagedServices({...values,PRAMAAN_API_KEY:""},dir,p);
 expect(p.calls).toHaveLength(0);
 expect(JSON.parse(await readFile(`${dir}/services.compose.json`,"utf8")).services.app.environment.APP_SIGN_IN_MODE).toBe("local");
 const unavailable = new FakePramaan({"db.postgres.provision":()=>{throw new PramaanError("upstream_unavailable","Private detail");},"auth.backend.provision":()=>{throw new PramaanError("upstream_unavailable","Private detail");}});
 await configureManagedServices(values,dir,unavailable);
 const config = JSON.parse(await readFile(`${dir}/services.compose.json`,"utf8"));
 expect(new URL(config.services.app.environment.DATABASE_PRIMARY_URL).hostname).toBe("database");
 expect(config.services.app.environment.APP_SIGN_IN_MODE).toBe("local");
});
