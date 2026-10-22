import { expect, test } from "bun:test";
import { createManagedAuthClient, managedBrowserToken } from "./managed-browser";
test("the browser client uses the provisioned base address for email, social and tokens", async () => {
 const calls: {path:string;body:any}[]=[];
 const client=createManagedAuthClient("https://signin.example.test/auth", (async (input:any,init:any)=>{const pathname=new URL(String(input)).pathname;calls.push({path:pathname,body:init?.body ? JSON.parse(init.body) : {}});return Response.json(pathname.endsWith("/token")?{token:"signed-token"}:pathname.endsWith("/social")?{url:"https://signin.example.test/continue",redirect:false}:{user:{id:"owned-person"}});}) as typeof fetch);
 await client.signUp.email({email:"person@example.test",password:"fixture-password",name:"Fixture"});
 await client.signIn.email({email:"person@example.test",password:"fixture-password"});
 await client.signIn.social({provider:"google",callbackURL:"https://app.example.test/managed-return?state=fixture"});
 expect(await managedBrowserToken(client)).toBe("signed-token");
 expect(calls.map(row=>row.path)).toEqual(["/auth/sign-up/email","/auth/sign-in/email","/auth/sign-in/social","/auth/token"]);
 expect(calls[2]?.body.callbackURL).toBe("https://app.example.test/managed-return?state=fixture");
});
test("a social return exchanges its verifier before reading the token", async () => {
 const calls:{path:string;verifier:string|null;credentials:unknown}[]=[];let verified=false;
 const client=createManagedAuthClient("https://signin.example.test/auth",(async(input:any,init:any)=>{const url=new URL(String(input));calls.push({path:url.pathname,verifier:url.searchParams.get("neon_auth_session_verifier"),credentials:init?.credentials});if(url.pathname.endsWith("/get-session")){verified=url.searchParams.get("neon_auth_session_verifier")==="one-use-verifier";return Response.json({session:{id:"fixture"}});}return verified?Response.json({token:"signed-token"}):Response.json({message:"Session required"},{status:401});}) as typeof fetch);
 expect(await managedBrowserToken(client,"one-use-verifier")).toBe("signed-token");expect(calls.map(row=>row.path)).toEqual(["/auth/get-session","/auth/token"]);expect(calls[0]?.verifier).toBe("one-use-verifier");expect(calls[0]?.credentials).toBe("include");
});
test("a refused social verifier never requests a token or marks the session ready", async () => {
 const paths:string[]=[];let cleared=false;
 const client=createManagedAuthClient("https://signin.example.test/auth",(async(input:any)=>{paths.push(new URL(String(input)).pathname);return Response.json({message:"Refused"},{status:401});}) as typeof fetch);
 await expect(managedBrowserToken(client,"bad-verifier",()=>{cleared=true;})).rejects.toThrow("Sign-in could not be confirmed");expect(paths).toEqual(["/auth/get-session"]);expect(cleared).toBe(false);
});
