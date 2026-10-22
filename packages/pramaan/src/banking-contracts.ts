// Contracts from the supplied banking catalogue snapshot.
export type BankingConnectionStartRequest = { readonly "endUserRef": string; readonly "returnUrl": string; readonly "country": string; readonly "scopes"?: ReadonlyArray<"accounts" | "balances" | "transactions" | "owners" | "payment-risk" | "fraud-screening" | "credit-report">; readonly "consent"?: true; readonly "institutionRef"?: string };
export type BankingConnectionStartResult = { readonly "connectUrl": string; readonly "expiresAt": string; readonly "ref"?: string };
export type BankingConnectionStatusRequest = { readonly "ref": string; readonly "endUserRef"?: string };
export type BankingConnectionStatusResult = { readonly "status": "pending" | "connected" | "failed" | "expired" | "revoked" };
export type BankingAccountsListRequest = { readonly "ref": string; readonly "endUserRef"?: string; readonly "limit"?: number; readonly "cursor"?: string };
export type BankingAccountsListResult = { readonly "accounts": ReadonlyArray<{ readonly "rowRef"?: string; readonly "type"?: string; readonly "name"?: string; readonly "maskedAccountNumber"?: string; readonly "currency"?: string }>; readonly "nextCursor"?: string; readonly "truncated": boolean };
export type BankingAccountBalancesGetRequest = { readonly "ref": string; readonly "endUserRef"?: string };
export type BankingAccountBalancesGetResult = { readonly "balances": ReadonlyArray<{ readonly "type": string; readonly "amount": number; readonly "currency": string; readonly "asOf"?: string }> };
export type BankingTransactionsSyncRequest = { readonly "ref": string; readonly "endUserRef"?: string; readonly "limit"?: number; readonly "cursor"?: string };
export type BankingTransactionsSyncResult = { readonly "added": ReadonlyArray<{ readonly "rowRef"?: string; readonly "amount": number; readonly "currency": string; readonly "direction": "debit" | "credit"; readonly "status": "booked" | "pending"; readonly "date"?: string; readonly "timestamp"?: string; readonly "valueDate"?: string; readonly "description"?: string; readonly "counterparty"?: { readonly "name": string; readonly "type": "person" | "business" | "unknown"; readonly "account"?: { readonly "paymentAddress"?: string; readonly "maskedAccountNumber"?: string; readonly "ifsc"?: string; readonly "maskedIban"?: string; readonly "sortCode"?: string }; readonly "category"?: string; readonly "merchantCategoryCode"?: string; readonly "source": "provider" | "parsed" } }>; readonly "modified": ReadonlyArray<{ readonly "rowRef"?: string; readonly "amount": number; readonly "currency": string; readonly "direction": "debit" | "credit"; readonly "status": "booked" | "pending"; readonly "date"?: string; readonly "timestamp"?: string; readonly "valueDate"?: string; readonly "description"?: string; readonly "counterparty"?: { readonly "name": string; readonly "type": "person" | "business" | "unknown"; readonly "account"?: { readonly "paymentAddress"?: string; readonly "maskedAccountNumber"?: string; readonly "ifsc"?: string; readonly "maskedIban"?: string; readonly "sortCode"?: string }; readonly "category"?: string; readonly "merchantCategoryCode"?: string; readonly "source": "provider" | "parsed" } }>; readonly "removed": ReadonlyArray<{ readonly "rowRef"?: string }>; readonly "nextCursor": string; readonly "hasMore": boolean };
export type BankingTransactionsListRequest = { readonly "ref": string; readonly "endUserRef"?: string; readonly "from": string; readonly "to": string; readonly "limit"?: number; readonly "cursor"?: string; readonly "status"?: "booked" | "pending" };
export type BankingTransactionsListResult = { readonly "transactions": ReadonlyArray<{ readonly "rowRef"?: string; readonly "amount": number; readonly "currency": string; readonly "direction": "debit" | "credit"; readonly "status": "booked" | "pending"; readonly "date"?: string; readonly "timestamp"?: string; readonly "valueDate"?: string; readonly "description"?: string; readonly "counterparty"?: { readonly "name": string; readonly "type": "person" | "business" | "unknown"; readonly "account"?: { readonly "paymentAddress"?: string; readonly "maskedAccountNumber"?: string; readonly "ifsc"?: string; readonly "maskedIban"?: string; readonly "sortCode"?: string }; readonly "category"?: string; readonly "merchantCategoryCode"?: string; readonly "source": "provider" | "parsed" } }>; readonly "nextCursor"?: string; readonly "truncated": boolean };
export type BankingInstitutionsSearchRequest = { readonly "country": string; readonly "query"?: string; readonly "limit"?: number; readonly "cursor"?: string };
export type BankingInstitutionsSearchResult = { readonly "institutions": ReadonlyArray<{ readonly "rowRef"?: string; readonly "name": string; readonly "countries": ReadonlyArray<string> }>; readonly "nextCursor"?: string };
export type BankingInstitutionGetRequest = { readonly "ref": string };
export type BankingInstitutionGetResult = { readonly "rowRef"?: string; readonly "name": string; readonly "countries": ReadonlyArray<string> };
export const BANKING_CONTRACTS = {
  "banking.connection.start": {
    "input": {
      "type": "object",
      "properties": {
        "endUserRef": {
          "type": "string",
          "minLength": 1,
          "maxLength": 256
        },
        "returnUrl": {
          "type": "string"
        },
        "country": {
          "type": "string",
          "pattern": "^[A-Z]{2}$"
        },
        "scopes": {
          "minItems": 1,
          "maxItems": 7,
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "accounts",
              "balances",
              "transactions",
              "owners",
              "payment-risk",
              "fraud-screening",
              "credit-report"
            ]
          }
        },
        "consent": {
          "type": "boolean",
          "const": true
        },
        "institutionRef": {
          "type": "string",
          "pattern": "^(ref_[0-9A-HJKMNP-TV-Z]{26}|rh_[A-Za-z0-9_-]{24,1024})$"
        }
      },
      "required": [
        "endUserRef",
        "returnUrl",
        "country"
      ],
      "additionalProperties": false
    },
    "result": {
      "type": "object",
      "properties": {
        "connectUrl": {
          "type": "string",
          "pattern": "^https?:\\/\\/[^/?#\\s]+\\/connect\\/link\\/[A-Za-z0-9_-]+$"
        },
        "expiresAt": {
          "type": "string",
          "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$"
        },
        "ref": {
          "type": "string"
        }
      },
      "required": [
        "connectUrl",
        "expiresAt"
      ],
      "additionalProperties": false
    }
  },
  "banking.connection.status": {
    "input": {
      "type": "object",
      "properties": {
        "ref": {
          "type": "string",
          "pattern": "^(ref_[0-9A-HJKMNP-TV-Z]{26}|rh_[A-Za-z0-9_-]{24,1024})$"
        },
        "endUserRef": {
          "type": "string",
          "minLength": 1,
          "maxLength": 256
        }
      },
      "required": [
        "ref"
      ],
      "additionalProperties": false
    },
    "result": {
      "type": "object",
      "properties": {
        "status": {
          "type": "string",
          "enum": [
            "pending",
            "connected",
            "failed",
            "expired",
            "revoked"
          ]
        }
      },
      "required": [
        "status"
      ],
      "additionalProperties": false
    }
  },
  "banking.accounts.list": {
    "input": {
      "type": "object",
      "properties": {
        "ref": {
          "type": "string",
          "pattern": "^(ref_[0-9A-HJKMNP-TV-Z]{26}|rh_[A-Za-z0-9_-]{24,1024})$"
        },
        "endUserRef": {
          "type": "string",
          "minLength": 1,
          "maxLength": 256
        },
        "limit": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100
        },
        "cursor": {
          "type": "string",
          "minLength": 1,
          "maxLength": 4096
        }
      },
      "required": [
        "ref"
      ],
      "additionalProperties": false
    },
    "result": {
      "type": "object",
      "properties": {
        "accounts": {
          "maxItems": 100,
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "rowRef": {
                "type": "string"
              },
              "type": {
                "type": "string",
                "minLength": 1,
                "maxLength": 100
              },
              "name": {
                "type": "string",
                "minLength": 1,
                "maxLength": 200
              },
              "maskedAccountNumber": {
                "type": "string",
                "minLength": 1,
                "maxLength": 34,
                "pattern": "^[Xx*]{2,30}[0-9]{1,4}$"
              },
              "currency": {
                "type": "string",
                "pattern": "^[A-Z]{3}$"
              }
            },
            "additionalProperties": false
          }
        },
        "nextCursor": {
          "type": "string",
          "minLength": 1,
          "maxLength": 4096
        },
        "truncated": {
          "type": "boolean"
        }
      },
      "required": [
        "accounts",
        "truncated"
      ],
      "additionalProperties": false
    }
  },
  "banking.account.balances.get": {
    "input": {
      "type": "object",
      "properties": {
        "ref": {
          "type": "string",
          "pattern": "^(ref_[0-9A-HJKMNP-TV-Z]{26}|rh_[A-Za-z0-9_-]{24,1024})$"
        },
        "endUserRef": {
          "type": "string",
          "minLength": 1,
          "maxLength": 256
        }
      },
      "required": [
        "ref"
      ],
      "additionalProperties": false
    },
    "result": {
      "type": "object",
      "properties": {
        "balances": {
          "maxItems": 100,
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "type": {
                "type": "string",
                "minLength": 1,
                "maxLength": 100
              },
              "amount": {
                "type": "integer",
                "minimum": -9007199254740991,
                "maximum": 9007199254740991
              },
              "currency": {
                "type": "string",
                "pattern": "^[A-Z]{3}$"
              },
              "asOf": {
                "type": "string",
                "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$"
              }
            },
            "required": [
              "type",
              "amount",
              "currency"
            ],
            "additionalProperties": false
          }
        }
      },
      "required": [
        "balances"
      ],
      "additionalProperties": false
    }
  },
  "banking.transactions.sync": {
    "input": {
      "type": "object",
      "properties": {
        "ref": {
          "type": "string",
          "pattern": "^(ref_[0-9A-HJKMNP-TV-Z]{26}|rh_[A-Za-z0-9_-]{24,1024})$"
        },
        "endUserRef": {
          "type": "string",
          "minLength": 1,
          "maxLength": 256
        },
        "limit": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100
        },
        "cursor": {
          "type": "string",
          "minLength": 1,
          "maxLength": 4096
        }
      },
      "required": [
        "ref"
      ],
      "additionalProperties": false
    },
    "result": {
      "type": "object",
      "properties": {
        "added": {
          "maxItems": 100,
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "rowRef": {
                "type": "string"
              },
              "amount": {
                "type": "integer",
                "minimum": -9007199254740991,
                "maximum": 9007199254740991
              },
              "currency": {
                "type": "string",
                "pattern": "^[A-Z]{3}$"
              },
              "direction": {
                "type": "string",
                "enum": [
                  "debit",
                  "credit"
                ]
              },
              "status": {
                "type": "string",
                "enum": [
                  "booked",
                  "pending"
                ]
              },
              "date": {
                "type": "string",
                "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))$"
              },
              "timestamp": {
                "type": "string",
                "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$"
              },
              "valueDate": {
                "type": "string",
                "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))$"
              },
              "description": {
                "type": "string",
                "minLength": 1,
                "maxLength": 512
              },
              "counterparty": {
                "type": "object",
                "properties": {
                  "name": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 200
                  },
                  "type": {
                    "type": "string",
                    "enum": [
                      "person",
                      "business",
                      "unknown"
                    ]
                  },
                  "account": {
                    "type": "object",
                    "properties": {
                      "paymentAddress": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 256,
                        "pattern": "^[A-Za-z0-9._-]+@[A-Za-z0-9]+$"
                      },
                      "maskedAccountNumber": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 34,
                        "pattern": "^[Xx*]{2,30}[0-9]{1,4}$"
                      },
                      "ifsc": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 11,
                        "pattern": "^[A-Z]{4}0[A-Z0-9]{6}$"
                      },
                      "maskedIban": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 34,
                        "pattern": "^[A-Z]{2}[0-9]{2}[Xx*]{4,30}[0-9]{1,4}$"
                      },
                      "sortCode": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 6,
                        "pattern": "^[0-9]{6}$"
                      }
                    },
                    "additionalProperties": false
                  },
                  "category": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 200
                  },
                  "merchantCategoryCode": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 4,
                    "pattern": "^[0-9]{4}$"
                  },
                  "source": {
                    "type": "string",
                    "enum": [
                      "provider",
                      "parsed"
                    ]
                  }
                },
                "required": [
                  "name",
                  "type",
                  "source"
                ],
                "additionalProperties": false
              }
            },
            "required": [
              "amount",
              "currency",
              "direction",
              "status"
            ],
            "additionalProperties": false
          }
        },
        "modified": {
          "maxItems": 100,
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "rowRef": {
                "type": "string"
              },
              "amount": {
                "type": "integer",
                "minimum": -9007199254740991,
                "maximum": 9007199254740991
              },
              "currency": {
                "type": "string",
                "pattern": "^[A-Z]{3}$"
              },
              "direction": {
                "type": "string",
                "enum": [
                  "debit",
                  "credit"
                ]
              },
              "status": {
                "type": "string",
                "enum": [
                  "booked",
                  "pending"
                ]
              },
              "date": {
                "type": "string",
                "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))$"
              },
              "timestamp": {
                "type": "string",
                "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$"
              },
              "valueDate": {
                "type": "string",
                "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))$"
              },
              "description": {
                "type": "string",
                "minLength": 1,
                "maxLength": 512
              },
              "counterparty": {
                "type": "object",
                "properties": {
                  "name": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 200
                  },
                  "type": {
                    "type": "string",
                    "enum": [
                      "person",
                      "business",
                      "unknown"
                    ]
                  },
                  "account": {
                    "type": "object",
                    "properties": {
                      "paymentAddress": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 256,
                        "pattern": "^[A-Za-z0-9._-]+@[A-Za-z0-9]+$"
                      },
                      "maskedAccountNumber": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 34,
                        "pattern": "^[Xx*]{2,30}[0-9]{1,4}$"
                      },
                      "ifsc": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 11,
                        "pattern": "^[A-Z]{4}0[A-Z0-9]{6}$"
                      },
                      "maskedIban": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 34,
                        "pattern": "^[A-Z]{2}[0-9]{2}[Xx*]{4,30}[0-9]{1,4}$"
                      },
                      "sortCode": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 6,
                        "pattern": "^[0-9]{6}$"
                      }
                    },
                    "additionalProperties": false
                  },
                  "category": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 200
                  },
                  "merchantCategoryCode": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 4,
                    "pattern": "^[0-9]{4}$"
                  },
                  "source": {
                    "type": "string",
                    "enum": [
                      "provider",
                      "parsed"
                    ]
                  }
                },
                "required": [
                  "name",
                  "type",
                  "source"
                ],
                "additionalProperties": false
              }
            },
            "required": [
              "amount",
              "currency",
              "direction",
              "status"
            ],
            "additionalProperties": false
          }
        },
        "removed": {
          "maxItems": 100,
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "rowRef": {
                "type": "string"
              }
            },
            "additionalProperties": false
          }
        },
        "nextCursor": {
          "type": "string",
          "minLength": 1,
          "maxLength": 4096
        },
        "hasMore": {
          "type": "boolean"
        }
      },
      "required": [
        "added",
        "modified",
        "removed",
        "nextCursor",
        "hasMore"
      ],
      "additionalProperties": false
    }
  },
  "banking.transactions.list": {
    "input": {
      "type": "object",
      "properties": {
        "ref": {
          "type": "string",
          "pattern": "^(ref_[0-9A-HJKMNP-TV-Z]{26}|rh_[A-Za-z0-9_-]{24,1024})$"
        },
        "endUserRef": {
          "type": "string",
          "minLength": 1,
          "maxLength": 256
        },
        "from": {
          "type": "string",
          "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))$"
        },
        "to": {
          "type": "string",
          "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))$"
        },
        "limit": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100
        },
        "cursor": {
          "type": "string",
          "minLength": 1,
          "maxLength": 4096
        },
        "status": {
          "type": "string",
          "enum": [
            "booked",
            "pending"
          ]
        }
      },
      "required": [
        "ref",
        "from",
        "to"
      ],
      "additionalProperties": false
    },
    "result": {
      "type": "object",
      "properties": {
        "transactions": {
          "maxItems": 100,
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "rowRef": {
                "type": "string"
              },
              "amount": {
                "type": "integer",
                "minimum": -9007199254740991,
                "maximum": 9007199254740991
              },
              "currency": {
                "type": "string",
                "pattern": "^[A-Z]{3}$"
              },
              "direction": {
                "type": "string",
                "enum": [
                  "debit",
                  "credit"
                ]
              },
              "status": {
                "type": "string",
                "enum": [
                  "booked",
                  "pending"
                ]
              },
              "date": {
                "type": "string",
                "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))$"
              },
              "timestamp": {
                "type": "string",
                "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$"
              },
              "valueDate": {
                "type": "string",
                "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))$"
              },
              "description": {
                "type": "string",
                "minLength": 1,
                "maxLength": 512
              },
              "counterparty": {
                "type": "object",
                "properties": {
                  "name": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 200
                  },
                  "type": {
                    "type": "string",
                    "enum": [
                      "person",
                      "business",
                      "unknown"
                    ]
                  },
                  "account": {
                    "type": "object",
                    "properties": {
                      "paymentAddress": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 256,
                        "pattern": "^[A-Za-z0-9._-]+@[A-Za-z0-9]+$"
                      },
                      "maskedAccountNumber": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 34,
                        "pattern": "^[Xx*]{2,30}[0-9]{1,4}$"
                      },
                      "ifsc": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 11,
                        "pattern": "^[A-Z]{4}0[A-Z0-9]{6}$"
                      },
                      "maskedIban": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 34,
                        "pattern": "^[A-Z]{2}[0-9]{2}[Xx*]{4,30}[0-9]{1,4}$"
                      },
                      "sortCode": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 6,
                        "pattern": "^[0-9]{6}$"
                      }
                    },
                    "additionalProperties": false
                  },
                  "category": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 200
                  },
                  "merchantCategoryCode": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 4,
                    "pattern": "^[0-9]{4}$"
                  },
                  "source": {
                    "type": "string",
                    "enum": [
                      "provider",
                      "parsed"
                    ]
                  }
                },
                "required": [
                  "name",
                  "type",
                  "source"
                ],
                "additionalProperties": false
              }
            },
            "required": [
              "amount",
              "currency",
              "direction",
              "status"
            ],
            "additionalProperties": false
          }
        },
        "nextCursor": {
          "type": "string",
          "minLength": 1,
          "maxLength": 4096
        },
        "truncated": {
          "type": "boolean"
        }
      },
      "required": [
        "transactions",
        "truncated"
      ],
      "additionalProperties": false
    }
  },
  "banking.institutions.search": {
    "input": {
      "type": "object",
      "properties": {
        "country": {
          "type": "string",
          "pattern": "^[A-Z]{2}$"
        },
        "query": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "limit": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100
        },
        "cursor": {
          "type": "string",
          "minLength": 1,
          "maxLength": 4096
        }
      },
      "required": [
        "country"
      ],
      "additionalProperties": false
    },
    "result": {
      "type": "object",
      "properties": {
        "institutions": {
          "maxItems": 100,
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "rowRef": {
                "type": "string"
              },
              "name": {
                "type": "string",
                "minLength": 1,
                "maxLength": 200
              },
              "countries": {
                "maxItems": 100,
                "type": "array",
                "items": {
                  "type": "string",
                  "pattern": "^[A-Z]{2}$"
                }
              }
            },
            "required": [
              "name",
              "countries"
            ],
            "additionalProperties": false
          }
        },
        "nextCursor": {
          "type": "string",
          "minLength": 1,
          "maxLength": 4096
        }
      },
      "required": [
        "institutions"
      ],
      "additionalProperties": false
    }
  },
  "banking.institution.get": {
    "input": {
      "type": "object",
      "properties": {
        "ref": {
          "type": "string",
          "pattern": "^(ref_[0-9A-HJKMNP-TV-Z]{26}|rh_[A-Za-z0-9_-]{24,1024})$"
        }
      },
      "required": [
        "ref"
      ],
      "additionalProperties": false
    },
    "result": {
      "type": "object",
      "properties": {
        "rowRef": {
          "type": "string"
        },
        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "countries": {
          "maxItems": 100,
          "type": "array",
          "items": {
            "type": "string",
            "pattern": "^[A-Z]{2}$"
          }
        }
      },
      "required": [
        "name",
        "countries"
      ],
      "additionalProperties": false
    }
  }
} as const;
