export const APPS_CONTRACTS = {
  "apps.catalog.search": {
    "input": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string"
        },
        "app": {
          "type": "string",
          "pattern": "^[a-z0-9_-]{1,64}$"
        },
        "cursor": {
          "type": "string",
          "minLength": 1,
          "maxLength": 4096
        },
        "limit": {
          "type": "number",
          "minimum": 1
        }
      },
      "required": [
        "query"
      ]
    },
    "result": {
      "type": "object",
      "properties": {
        "results": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "app": {
                "type": "string"
              },
              "action": {
                "type": "string"
              },
              "readOnly": {
                "type": "boolean",
                "const": true
              },
              "description": {
                "type": "string"
              },
              "inputSchema": {}
            },
            "required": [
              "app",
              "action"
            ],
            "additionalProperties": false
          }
        },
        "nextCursor": {
          "type": "string"
        }
      },
      "required": [
        "results"
      ],
      "additionalProperties": false
    }
  },
  "apps.connection.start": {
    "input": {
      "type": "object",
      "properties": {
        "endUserRef": {
          "type": "string",
          "pattern": "^[A-Za-z0-9_.-]{1,128}$"
        },
        "app": {
          "type": "string",
          "pattern": "^[a-z0-9_-]{1,64}$"
        },
        "redirectUrl": {
          "type": "string"
        },
        "access": {
          "type": "string",
          "enum": [
            "read",
            "read-write"
          ]
        }
      },
      "required": [
        "endUserRef",
        "app",
        "redirectUrl"
      ]
    },
    "result": {
      "type": "object",
      "properties": {
        "connectUrl": {
          "type": "string"
        },
        "expiresAt": {
          "type": "string"
        }
      },
      "required": [
        "connectUrl"
      ],
      "additionalProperties": false
    }
  },
  "apps.connections.list": {
    "input": {
      "type": "object",
      "properties": {
        "endUserRef": {
          "type": "string",
          "pattern": "^[A-Za-z0-9_.-]{1,128}$"
        },
        "app": {
          "type": "string",
          "pattern": "^[a-z0-9_-]{1,64}$"
        }
      },
      "required": [
        "endUserRef"
      ]
    },
    "result": {
      "type": "object",
      "properties": {
        "results": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "app": {
                "type": "string"
              },
              "status": {
                "type": "string",
                "enum": [
                  "active",
                  "pending",
                  "failed",
                  "expired",
                  "disabled",
                  "revoked"
                ]
              },
              "connectedAt": {
                "type": "string"
              },
              "access": {
                "type": "string",
                "enum": [
                  "read",
                  "read-write",
                  "full",
                  "limited"
                ]
              },
              "accessConfirmed": {
                "type": "boolean",
                "const": true
              }
            },
            "required": [
              "app",
              "status"
            ],
            "additionalProperties": false
          }
        },
        "nextCursor": {
          "type": "string"
        }
      },
      "required": [
        "results"
      ],
      "additionalProperties": false
    }
  },
  "apps.action.execute": {
    "input": {
      "type": "object",
      "properties": {
        "endUserRef": {
          "type": "string",
          "pattern": "^[A-Za-z0-9_.-]{1,128}$"
        },
        "action": {
          "type": "string",
          "pattern": "^[A-Z][A-Z0-9_]{1,127}$"
        },
        "input": {
          "type": "object",
          "additionalProperties": true
        }
      },
      "required": [
        "endUserRef",
        "action"
      ]
    },
    "result": {
      "type": "object",
      "properties": {
        "status": {
          "type": "string",
          "enum": [
            "succeeded",
            "failed"
          ]
        },
        "output": {},
        "error": {
          "type": "string"
        },
        "truncated": {
          "type": "boolean",
          "const": true
        }
      },
      "required": [
        "status",
        "output"
      ],
      "additionalProperties": false
    }
  },
  "apps.connection.revoke": {
    "input": {
      "type": "object",
      "properties": {
        "endUserRef": {
          "type": "string",
          "pattern": "^[A-Za-z0-9_.-]{1,128}$"
        },
        "app": {
          "type": "string",
          "pattern": "^[a-z0-9_-]{1,64}$"
        }
      },
      "required": [
        "endUserRef",
        "app"
      ]
    },
    "result": {
      "type": "object",
      "properties": {
        "revoked": {
          "type": "number"
        }
      },
      "required": [
        "revoked"
      ],
      "additionalProperties": false
    }
  },
  "email.account.connect.start": {
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
        }
      },
      "required": [
        "endUserRef",
        "returnUrl"
      ],
      "additionalProperties": false
    },
    "result": {
      "type": "object",
      "properties": {
        "connectUrl": {
          "type": "string"
        },
        "expiresAt": {
          "type": "string"
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
  "email.accounts.list": {
    "input": {
      "type": "object",
      "properties": {
        "endUserRef": {
          "type": "string",
          "minLength": 1,
          "maxLength": 256
        },
        "limit": {
          "type": "number",
          "minimum": 1
        },
        "cursor": {
          "type": "string",
          "minLength": 1,
          "maxLength": 1024
        }
      },
      "additionalProperties": false
    },
    "result": {
      "type": "object",
      "properties": {
        "results": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "ref": {
                "type": "string"
              },
              "inbox": {
                "type": "string"
              },
              "status": {
                "type": "string",
                "enum": [
                  "active",
                  "past_due"
                ]
              }
            },
            "required": [
              "ref",
              "inbox",
              "status"
            ],
            "additionalProperties": false
          }
        },
        "nextCursor": {
          "type": "string"
        }
      },
      "required": [
        "results"
      ],
      "additionalProperties": false
    }
  },
  "email.messages.list": {
    "input": {
      "type": "object",
      "properties": {
        "inbox": {
          "type": "string",
          "minLength": 1,
          "maxLength": 320
        },
        "limit": {
          "type": "number",
          "minimum": 1
        },
        "cursor": {
          "type": "string",
          "maxLength": 1024
        }
      },
      "required": [
        "inbox"
      ]
    },
    "result": {
      "type": "object",
      "properties": {
        "results": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "autoSubmitted": {
                "type": "string",
                "enum": [
                  "auto-generated",
                  "auto-replied",
                  "other"
                ]
              },
              "messageId": {
                "type": "string"
              },
              "inbox": {
                "type": "string"
              },
              "from": {
                "type": "string"
              },
              "to": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              },
              "cc": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              },
              "subject": {
                "type": "string"
              },
              "preview": {
                "type": "string"
              },
              "timestamp": {
                "type": "string"
              },
              "labels": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              },
              "attachments": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "attachmentId": {
                      "type": "string"
                    },
                    "filename": {
                      "type": "string"
                    },
                    "size": {
                      "type": "number"
                    },
                    "contentType": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "attachmentId",
                    "size"
                  ],
                  "additionalProperties": false
                }
              }
            },
            "required": [
              "messageId",
              "inbox",
              "from",
              "to"
            ],
            "additionalProperties": false
          }
        },
        "nextCursor": {
          "type": "string"
        }
      },
      "required": [
        "results"
      ],
      "additionalProperties": false
    }
  },
  "email.message.get": {
    "input": {
      "type": "object",
      "properties": {
        "inbox": {
          "type": "string",
          "minLength": 1,
          "maxLength": 320
        },
        "ref": {
          "type": "string",
          "pattern": "^(ref_[0-9A-HJKMNP-TV-Z]{26}|rh_[A-Za-z0-9_-]{24,1024})$"
        },
        "messageId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 998
        }
      },
      "required": [
        "inbox"
      ]
    },
    "result": {
      "type": "object",
      "properties": {
        "autoSubmitted": {
          "type": "string",
          "enum": [
            "auto-generated",
            "auto-replied",
            "other"
          ]
        },
        "messageId": {
          "type": "string"
        },
        "inbox": {
          "type": "string"
        },
        "from": {
          "type": "string"
        },
        "to": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "cc": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "subject": {
          "type": "string"
        },
        "preview": {
          "type": "string"
        },
        "timestamp": {
          "type": "string"
        },
        "labels": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "attachments": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "attachmentId": {
                "type": "string"
              },
              "filename": {
                "type": "string"
              },
              "size": {
                "type": "number"
              },
              "contentType": {
                "type": "string"
              }
            },
            "required": [
              "attachmentId",
              "size"
            ],
            "additionalProperties": false
          }
        },
        "text": {
          "type": "string"
        },
        "extractedText": {
          "type": "string"
        },
        "bcc": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "replyTo": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "inReplyTo": {
          "type": "string"
        },
        "size": {
          "type": "number"
        }
      },
      "required": [
        "messageId",
        "inbox",
        "from",
        "to",
        "text"
      ],
      "additionalProperties": false
    }
  },
  "email.attachment.get": {
    "input": {
      "type": "object",
      "properties": {
        "inbox": {
          "type": "string",
          "minLength": 1,
          "maxLength": 320
        },
        "messageId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 998
        },
        "attachmentId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255
        }
      },
      "required": [
        "inbox",
        "messageId",
        "attachmentId"
      ]
    },
    "result": {
      "type": "object",
      "properties": {
        "filename": {
          "type": "string"
        },
        "mimeType": {
          "type": "string"
        },
        "size": {
          "type": "number"
        },
        "content": {
          "type": "string"
        },
        "contentId": {
          "type": "string"
        }
      },
      "required": [
        "size",
        "content"
      ],
      "additionalProperties": false
    }
  },
  "email.account.disconnect": {
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
        "confirm": {
          "type": "boolean",
          "const": true
        }
      },
      "required": [
        "ref",
        "confirm"
      ],
      "additionalProperties": false
    },
    "result": {
      "type": "object",
      "properties": {
        "disconnected": {
          "type": "boolean",
          "const": true
        }
      },
      "required": [
        "disconnected"
      ],
      "additionalProperties": false
    }
  },
  "auth.social.exchange": {
    "input": {
      "type": "object",
      "properties": {
        "providerKey": {
          "type": "string",
          "minLength": 1,
          "maxLength": 32,
          "pattern": "^[a-z][a-z0-9-]*$"
        },
        "code": {
          "type": "string",
          "minLength": 1,
          "maxLength": 16384
        },
        "redirectUri": {
          "type": "string",
          "maxLength": 2048
        },
        "pkceVerifier": {
          "type": "string",
          "minLength": 43,
          "maxLength": 128,
          "pattern": "^[A-Za-z0-9._~-]+$"
        },
        "expectedNonce": {
          "type": "string",
          "minLength": 1,
          "maxLength": 512
        },
        "connectionRef": {
          "type": "string",
          "pattern": "^(ref_[0-9A-HJKMNP-TV-Z]{26}|rh_[A-Za-z0-9_-]{24,1024})$"
        },
        "state": {
          "type": "string",
          "minLength": 22,
          "maxLength": 512,
          "pattern": "^[A-Za-z0-9._~-]+$"
        }
      },
      "required": [
        "providerKey",
        "code",
        "redirectUri"
      ],
      "additionalProperties": false
    },
    "result": {
      "type": "object",
      "properties": {
        "providerKey": {
          "type": "string"
        },
        "subjectId": {
          "type": "string"
        },
        "email": {
          "type": "string"
        },
        "emailVerified": {
          "type": "boolean"
        },
        "displayName": {
          "type": "string"
        },
        "pictureUrl": {
          "type": "string"
        }
      },
      "required": [
        "providerKey",
        "subjectId",
        "emailVerified"
      ],
      "additionalProperties": false
    }
  },
  "auth.enterprise.start": {
    "input": {
      "type": "object",
      "properties": {
        "connectionRef": {
          "type": "string",
          "pattern": "^(ref_[0-9A-HJKMNP-TV-Z]{26}|rh_[A-Za-z0-9_-]{24,1024})$"
        },
        "redirectUri": {
          "type": "string",
          "maxLength": 512
        },
        "state": {
          "type": "string",
          "minLength": 22,
          "maxLength": 512,
          "pattern": "^[A-Za-z0-9._~-]+$"
        },
        "nonce": {
          "type": "string",
          "minLength": 22,
          "maxLength": 512,
          "pattern": "^[A-Za-z0-9._~-]+$"
        },
        "codeChallenge": {
          "type": "string",
          "pattern": "^[A-Za-z0-9_-]{43}$"
        }
      },
      "required": [
        "connectionRef",
        "redirectUri",
        "state",
        "nonce",
        "codeChallenge"
      ],
      "additionalProperties": false
    },
    "result": {
      "type": "object",
      "properties": {
        "authorizationUrl": {
          "type": "string"
        },
        "expiresAt": {
          "type": "string"
        }
      },
      "required": [
        "authorizationUrl",
        "expiresAt"
      ],
      "additionalProperties": false
    }
  },
  "auth.enterprise-connections.list": {
    "input": {
      "type": "object",
      "properties": {
        "organizationRef": {
          "type": "string",
          "minLength": 1,
          "maxLength": 256
        },
        "limit": {
          "type": "number",
          "minimum": 1
        },
        "cursor": {
          "type": "string",
          "minLength": 1,
          "maxLength": 64
        }
      },
      "additionalProperties": false
    },
    "result": {
      "type": "object",
      "properties": {
        "results": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "organizationRef": {
                "type": "string"
              },
              "name": {
                "type": "string"
              },
              "status": {
                "type": "string",
                "const": "ready"
              },
              "createdAt": {
                "type": "string"
              },
              "ref": {
                "type": "string"
              }
            },
            "required": [
              "organizationRef",
              "name",
              "status",
              "createdAt"
            ],
            "additionalProperties": false
          }
        },
        "nextCursor": {
          "type": "string"
        }
      },
      "required": [
        "results"
      ],
      "additionalProperties": false
    }
  },
  "geo.address.suggest": {
    "input": {
      "type": "object",
      "properties": {
        "countryCode": {
          "type": "string",
          "minLength": 1,
          "maxLength": 3,
          "pattern": "^[A-Z]{2,3}$"
        },
        "text": {
          "type": "string",
          "minLength": 1,
          "maxLength": 32
        },
        "limit": {
          "type": "integer",
          "minimum": 1,
          "maximum": 10
        },
        "source": {
          "type": "string",
          "enum": [
            "postal",
            "all"
          ]
        },
        "includeStates": {
          "minItems": 1,
          "maxItems": 60,
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 2,
            "pattern": "^[A-Z]{2}$"
          }
        },
        "excludeStates": {
          "minItems": 1,
          "maxItems": 60,
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 2,
            "pattern": "^[A-Z]{2}$"
          }
        },
        "includeCities": {
          "minItems": 1,
          "maxItems": 20,
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "city": {
                "type": "string",
                "minLength": 1,
                "maxLength": 64
              },
              "state": {
                "type": "string",
                "minLength": 1,
                "maxLength": 2,
                "pattern": "^[A-Z]{2}$"
              }
            },
            "required": [
              "city",
              "state"
            ],
            "additionalProperties": false
          }
        },
        "preferCities": {
          "minItems": 1,
          "maxItems": 20,
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "city": {
                "type": "string",
                "minLength": 1,
                "maxLength": 64
              },
              "state": {
                "type": "string",
                "minLength": 1,
                "maxLength": 2,
                "pattern": "^[A-Z]{2}$"
              }
            },
            "required": [
              "city",
              "state"
            ],
            "additionalProperties": false
          }
        },
        "includePostalCodes": {
          "minItems": 1,
          "maxItems": 20,
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 16
          }
        },
        "includeLocalities": {
          "minItems": 1,
          "maxItems": 20,
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 64
          }
        },
        "preferStates": {
          "minItems": 1,
          "maxItems": 60,
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 2,
            "pattern": "^[A-Z]{2}$"
          }
        },
        "preferPostalCodes": {
          "minItems": 1,
          "maxItems": 20,
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 16
          }
        },
        "preferencePercent": {
          "type": "integer",
          "minimum": 0,
          "maximum": 100
        },
        "excludeTypes": {
          "minItems": 1,
          "maxItems": 6,
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "base-address",
              "undeliverable-base-address",
              "commercial",
              "residential",
              "po-box",
              "military"
            ]
          }
        },
        "language": {
          "type": "string",
          "enum": [
            "native",
            "latin"
          ]
        },
        "preferLocation": {
          "type": "boolean"
        },
        "ipv4": {
          "type": "string",
          "pattern": "^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$"
        }
      },
      "required": [
        "countryCode",
        "text"
      ],
      "additionalProperties": false
    },
    "result": {
      "type": "object",
      "properties": {
        "results": {
          "maxItems": 10,
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "text": {
                "type": "string",
                "maxLength": 512
              },
              "components": {
                "type": "object",
                "properties": {
                  "street": {
                    "type": "string",
                    "maxLength": 256
                  },
                  "secondary": {
                    "type": "string",
                    "maxLength": 256
                  },
                  "locality": {
                    "type": "string",
                    "maxLength": 256
                  },
                  "region": {
                    "type": "string",
                    "maxLength": 256
                  },
                  "postalCode": {
                    "type": "string",
                    "maxLength": 64
                  },
                  "postalSuffix": {
                    "type": "string",
                    "maxLength": 64
                  },
                  "countryCode": {
                    "type": "string",
                    "maxLength": 3
                  },
                  "urbanization": {
                    "type": "string",
                    "maxLength": 256
                  }
                },
                "additionalProperties": false
              },
              "entries": {
                "type": "integer",
                "minimum": 0,
                "maximum": 9007199254740991
              },
              "ref": {
                "type": "string"
              },
              "source": {
                "type": "string",
                "enum": [
                  "postal",
                  "other"
                ]
              }
            },
            "required": [
              "text",
              "entries"
            ],
            "additionalProperties": false
          }
        }
      },
      "required": [
        "results"
      ],
      "additionalProperties": false
    }
  },
  "geo.address.geocode-detailed": {
    "input": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2048
        },
        "address": {
          "type": "object",
          "properties": {
            "addressLines": {
              "minItems": 1,
              "maxItems": 5,
              "type": "array",
              "items": {
                "type": "string",
                "minLength": 1,
                "maxLength": 256
              }
            },
            "regionCode": {
              "type": "string",
              "minLength": 1,
              "maxLength": 2,
              "pattern": "^[A-Z]{2}$"
            },
            "locality": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "administrativeArea": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "postalCode": {
              "type": "string",
              "minLength": 1,
              "maxLength": 32
            }
          },
          "required": [
            "addressLines"
          ],
          "additionalProperties": false
        },
        "language": {
          "type": "string",
          "minLength": 1,
          "maxLength": 35,
          "pattern": "^[a-zA-Z]{2,8}(?:-[a-zA-Z0-9]{1,8})*$"
        },
        "region": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2,
          "pattern": "^[A-Za-z]{2}$"
        },
        "bounds": {
          "type": "object",
          "properties": {
            "low": {
              "type": "object",
              "properties": {
                "latitude": {
                  "type": "number",
                  "minimum": -90,
                  "maximum": 90
                },
                "longitude": {
                  "type": "number",
                  "minimum": -180,
                  "maximum": 180
                }
              },
              "required": [
                "latitude",
                "longitude"
              ],
              "additionalProperties": false
            },
            "high": {
              "type": "object",
              "properties": {
                "latitude": {
                  "type": "number",
                  "minimum": -90,
                  "maximum": 90
                },
                "longitude": {
                  "type": "number",
                  "minimum": -180,
                  "maximum": 180
                }
              },
              "required": [
                "latitude",
                "longitude"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "low",
            "high"
          ],
          "additionalProperties": false
        },
        "types": {
          "maxItems": 20,
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 80
          }
        },
        "limit": {
          "type": "integer",
          "minimum": 1,
          "maximum": 20
        }
      },
      "additionalProperties": false
    },
    "result": {
      "type": "object",
      "properties": {
        "results": {
          "maxItems": 20,
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "formattedAddress": {
                "type": "string",
                "minLength": 1,
                "maxLength": 2048
              },
              "location": {
                "type": "object",
                "properties": {
                  "latitude": {
                    "type": "number",
                    "minimum": -90,
                    "maximum": 90
                  },
                  "longitude": {
                    "type": "number",
                    "minimum": -180,
                    "maximum": 180
                  }
                },
                "required": [
                  "latitude",
                  "longitude"
                ],
                "additionalProperties": false
              },
              "components": {
                "maxItems": 40,
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "longText": {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 512
                    },
                    "shortText": {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 128
                    },
                    "types": {
                      "maxItems": 20,
                      "type": "array",
                      "items": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 80
                      }
                    }
                  },
                  "required": [
                    "longText",
                    "types"
                  ],
                  "additionalProperties": false
                }
              },
              "granularity": {
                "type": "string",
                "minLength": 1,
                "maxLength": 80
              },
              "types": {
                "maxItems": 20,
                "type": "array",
                "items": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 80
                }
              },
              "viewport": {
                "type": "object",
                "properties": {
                  "low": {
                    "type": "object",
                    "properties": {
                      "latitude": {
                        "type": "number",
                        "minimum": -90,
                        "maximum": 90
                      },
                      "longitude": {
                        "type": "number",
                        "minimum": -180,
                        "maximum": 180
                      }
                    },
                    "required": [
                      "latitude",
                      "longitude"
                    ],
                    "additionalProperties": false
                  },
                  "high": {
                    "type": "object",
                    "properties": {
                      "latitude": {
                        "type": "number",
                        "minimum": -90,
                        "maximum": 90
                      },
                      "longitude": {
                        "type": "number",
                        "minimum": -180,
                        "maximum": 180
                      }
                    },
                    "required": [
                      "latitude",
                      "longitude"
                    ],
                    "additionalProperties": false
                  }
                },
                "required": [
                  "low",
                  "high"
                ],
                "additionalProperties": false
              },
              "plusCode": {
                "type": "string",
                "minLength": 1,
                "maxLength": 128
              },
              "ref": {
                "type": "string"
              }
            },
            "required": [
              "formattedAddress",
              "location"
            ],
            "additionalProperties": false
          }
        }
      },
      "required": [
        "results"
      ],
      "additionalProperties": false
    }
  },
  "sms.inbound-messages.list": {
  "input": {
    "type": "object",
    "properties": {
      "limit": {
        "type": "number",
        "minimum": 1
      },
      "cursor": {
        "type": "string",
        "minLength": 1,
        "maxLength": 1024
      },
      "startDate": {
        "type": "string"
      },
      "endDate": {
        "type": "string"
      },
      "to": {
        "type": "string"
      }
    },
    "additionalProperties": false
  },
  "result": {
    "type": "object",
    "properties": {
      "results": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "ref": {
              "type": "string"
            },
            "from": {
              "type": "string"
            },
            "to": {
              "type": "string"
            },
            "contentType": {
              "type": "string",
              "enum": [
                "text",
                "binary",
                "media"
              ]
            },
            "body": {
              "type": "string",
              "maxLength": 2000
            },
            "udh": {
              "type": "string",
              "minLength": 1,
              "maxLength": 280
            },
            "receivedAt": {
              "type": "string"
            },
            "sentAt": {
              "type": "string"
            }
          },
          "required": [
            "from",
            "to",
            "contentType",
            "receivedAt"
          ],
          "additionalProperties": false
        }
      },
      "nextCursor": {
        "type": "string",
        "minLength": 1,
        "maxLength": 1024
      }
    },
    "required": [
      "results"
    ],
    "additionalProperties": false
  }
}
} as const;
