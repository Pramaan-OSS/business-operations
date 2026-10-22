import { expect, test } from "bun:test";
import { signInReturnPath } from "./sign-in-return";

test.each([
  ["customers?q=QA&sort=name", "/customers?q=QA&sort=name"],
  ["/oauth/authorize?client_id=app&state=nonce&redirect_uri=https%3A%2F%2Fclient.example%2Freturn", "/oauth/authorize?client_id=app&state=nonce&redirect_uri=https%3A%2F%2Fclient.example%2Freturn"],
  ["/transactions?categories=office#details", "/transactions?categories=office#details"],
  ["/", "/"],
])("preserves an internal sign-in return %s", (input, expected) => expect(signInReturnPath(input)).toBe(expected));

test.each([
  ["missing", undefined], ["empty", ""], ["external address", "https://other.example/"],
  ["network address", "//other.example/"], ["backslash address", "/\\other.example/"],
  ["encoded slashes", "/%2f%2fother.example"], ["double encoded backslash", "/%255cother.example"],
  ["script scheme", "javascript:alert(1)"], ["login loop", "/login?return_to=/login"],
  ["callback loop", "/managed-return?state=old"], ["auth endpoint", "/api/auth/managed/finish"],
  ["encoded auth endpoint", "/%61pi/auth/managed/start"], ["control character", "/customers\n"],
  ["oversized address", "x".repeat(4097)],
])("refuses %s", (_name, input) => expect(signInReturnPath(input)).toBe("/"));
