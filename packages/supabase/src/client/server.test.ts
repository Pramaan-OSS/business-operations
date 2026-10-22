import { expect, test } from "bun:test";
import path from "node:path";

test("internal admin reads use service credentials without borrowing a browser session", async () => {
  const code = `
    import {mock} from 'bun:test';
    const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
    const now=Math.floor(Date.now()/1000);
    const userToken=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:'person',role:'authenticated',aud:'authenticated',iat:now,exp:now+3600})+'.'+Buffer.from('signature').toString('base64url');
    const session={access_token:userToken,refresh_token:'refresh',token_type:'bearer',expires_in:3600,expires_at:now+3600,user:{id:'person',aud:'authenticated',role:'authenticated',email:'person@example.test'}};
    let writes=0;
    mock.module('next/headers',()=>({cookies:async()=>({getAll:()=>[{name:'sb-local-auth-token',value:'base64-'+encode(session)}],set:()=>{writes++}})}));
    const seen=[];
    globalThis.fetch=async(input,init)=>{seen.push(new Headers(init?.headers).get('authorization'));return Response.json([{id:'profile'}])};
    const {createClient}=await import('./packages/supabase/src/client/server.ts');
    await (await createClient({admin:true})).from('users').select('id');
    await (await createClient()).from('users').select('id');
    console.log(JSON.stringify({adminUsesService:seen[0]==='Bearer service-key',normalUsesSession:seen[1]==='Bearer '+userToken,writes}));
  `;
  const child = Bun.spawn(["bun", "-e", code], { cwd: path.resolve(import.meta.dir, "../../../.."), env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "http://local.test", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-key", SUPABASE_SECRET_KEY: "service-key", INTERNAL_API_KEY: "internal-test-key" }, stdout: "pipe", stderr: "pipe" });
  const output = await new Response(child.stdout).text();
  const errors = await new Response(child.stderr).text();
  expect(await child.exited, errors).toBe(0);
  const result = JSON.parse(output.trim().split("\n").at(-1)!);
  expect(result.adminUsesService).toBe(true);
  expect(result.normalUsesSession).toBe(true);
  expect(result.writes).toBe(0);
});
