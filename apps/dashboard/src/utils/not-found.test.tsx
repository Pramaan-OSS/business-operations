import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import NotFound from "../app/[locale]/not-found";

test("missing public links render a page without throwing another navigation", () => {
  const html = renderToStaticMarkup(<NotFound />);
  expect(html).toContain("Page not found");
  expect(html).toContain('href="/"');
});
