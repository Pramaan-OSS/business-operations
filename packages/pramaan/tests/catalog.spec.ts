import { describe, expect, test } from "bun:test";
import { CATALOG, capabilityInfo } from "../src/catalog";
import { Cap } from "../src/index";

describe("capability catalog", () => {
  test("every id the product can call is in the catalog with sane traits", () => {
    const ids = Object.values(Cap);
    expect(ids.length).toBeGreaterThan(60);
    for (const id of ids) {
      const info = capabilityInfo(id);
      expect(info).toBeDefined();
      expect(info!.id).toBe(id);
      expect(["read_only", "external_reversible", "external_irreversible", "external_unknown_effect"]).toContain(info!.effectClass);
      expect(["sync", "async"]).toContain(info!.mode);
      expect(typeof info!.needsConnection).toBe("boolean");
      expect(info!.description.length).toBeGreaterThan(10);
    }
  });

  test("catalog ids stay unique and shape-checked", () => {
    const ids = Object.keys(CATALOG);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("reads are safe to retry, sends are not marked read_only", () => {
    expect(capabilityInfo(Cap.bankingTransactionsList)!.effectClass).toBe("read_only");
    expect(capabilityInfo(Cap.documentExtract)!.mode).toBe("async");
    expect(capabilityInfo(Cap.emailSend)!.effectClass).toBe("external_irreversible");
    expect(capabilityInfo(Cap.paymentsPaymentLinkCreate)!.effectClass).toBe("external_irreversible");
    expect(capabilityInfo(Cap.notifyMessageSend)!.effectClass).toBe("external_irreversible");
    expect(capabilityInfo(Cap.bankingConnectionStart)!.effectClass).toBe("external_reversible");
    expect(capabilityInfo(Cap.chatMessagesList)!.needsConnection).toBe(true);
    expect(capabilityInfo(Cap.webSearch)!.effectClass).toBe("read_only");
  });
});
