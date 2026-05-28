/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/anzo_escrow.json`.
 */
 export type AnzoEscrow = {
  "address": "6swJPHnA6dJXUbtu2D2vTwqZVr1RzHe1k1mbDCqbwL3X",
  "metadata": {
    "name": "anzoEscrow",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "cancelSellOfferIntent",
      "discriminator": [
        114,
        223,
        240,
        130,
        1,
        217,
        176,
        87
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "controller",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  67,
                  79,
                  78,
                  84,
                  82,
                  79,
                  76,
                  76,
                  69,
                  82
                ]
              }
            ]
          }
        },
        {
          "name": "taker",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  84,
                  65,
                  75,
                  69,
                  82
                ]
              },
              {
                "kind": "arg",
                "path": "takerOwner"
              }
            ]
          }
        },
        {
          "name": "intent",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  73,
                  78,
                  84,
                  69,
                  78,
                  84
                ]
              },
              {
                "kind": "arg",
                "path": "offer"
              },
              {
                "kind": "arg",
                "path": "intentId"
              }
            ]
          }
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  69,
                  83,
                  67,
                  82,
                  79,
                  87
                ]
              },
              {
                "kind": "account",
                "path": "intent"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  86,
                  65,
                  85,
                  76,
                  84
                ]
              },
              {
                "kind": "account",
                "path": "intent"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "intentId",
          "type": "u64"
        },
        {
          "name": "offer",
          "type": "pubkey"
        },
        {
          "name": "takerOwner",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "confirmSellOfferIntent",
      "discriminator": [
        213,
        93,
        171,
        68,
        222,
        242,
        132,
        161
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "controller",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  67,
                  79,
                  78,
                  84,
                  82,
                  79,
                  76,
                  76,
                  69,
                  82
                ]
              }
            ]
          }
        },
        {
          "name": "taker",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  84,
                  65,
                  75,
                  69,
                  82
                ]
              },
              {
                "kind": "arg",
                "path": "takerOwner"
              }
            ]
          }
        },
        {
          "name": "maker",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  77,
                  65,
                  75,
                  69,
                  82
                ]
              },
              {
                "kind": "arg",
                "path": "makerOwner"
              }
            ]
          }
        },
        {
          "name": "intent",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  73,
                  78,
                  84,
                  69,
                  78,
                  84
                ]
              },
              {
                "kind": "arg",
                "path": "offer"
              },
              {
                "kind": "arg",
                "path": "intentId"
              }
            ]
          }
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  69,
                  83,
                  67,
                  82,
                  79,
                  87
                ]
              },
              {
                "kind": "account",
                "path": "intent"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  86,
                  65,
                  85,
                  76,
                  84
                ]
              },
              {
                "kind": "account",
                "path": "intent"
              }
            ]
          }
        },
        {
          "name": "takerOwnerAta",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "intentId",
          "type": "u64"
        },
        {
          "name": "offer",
          "type": "pubkey"
        },
        {
          "name": "takerOwner",
          "type": "pubkey"
        },
        {
          "name": "makerOwner",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "initializeController",
      "discriminator": [
        137,
        255,
        100,
        190,
        201,
        247,
        241,
        81
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "controller",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  67,
                  79,
                  78,
                  84,
                  82,
                  79,
                  76,
                  76,
                  69,
                  82
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initializeMaker",
      "discriminator": [
        234,
        205,
        166,
        200,
        194,
        113,
        56,
        215
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "owner",
          "signer": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "controller",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  67,
                  79,
                  78,
                  84,
                  82,
                  79,
                  76,
                  76,
                  69,
                  82
                ]
              }
            ]
          }
        },
        {
          "name": "maker",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  77,
                  65,
                  75,
                  69,
                  82
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "data",
          "type": {
            "array": [
              "u8",
              256
            ]
          }
        }
      ]
    },
    {
      "name": "initializeSellOffer",
      "discriminator": [
        41,
        38,
        35,
        131,
        21,
        173,
        65,
        107
      ],
      "accounts": [
        {
          "name": "makerOwner",
          "signer": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "maker",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  77,
                  65,
                  75,
                  69,
                  82
                ]
              },
              {
                "kind": "account",
                "path": "makerOwner"
              }
            ]
          }
        },
        {
          "name": "offer",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  77,
                  65,
                  75,
                  69,
                  82,
                  95,
                  79,
                  70,
                  70,
                  69,
                  82
                ]
              },
              {
                "kind": "account",
                "path": "maker"
              },
              {
                "kind": "account",
                "path": "maker"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  86,
                  65,
                  85,
                  76,
                  84
                ]
              },
              {
                "kind": "account",
                "path": "offer"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "rate",
          "type": "u64"
        },
        {
          "name": "data",
          "type": {
            "array": [
              "u8",
              256
            ]
          }
        }
      ]
    },
    {
      "name": "initializeSellOfferIntent",
      "discriminator": [
        115,
        245,
        63,
        80,
        143,
        49,
        60,
        6
      ],
      "accounts": [
        {
          "name": "takerOwner",
          "signer": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "taker",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  84,
                  65,
                  75,
                  69,
                  82
                ]
              },
              {
                "kind": "account",
                "path": "takerOwner"
              }
            ]
          }
        },
        {
          "name": "offer",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  77,
                  65,
                  75,
                  69,
                  82,
                  95,
                  79,
                  70,
                  70,
                  69,
                  82
                ]
              },
              {
                "kind": "arg",
                "path": "maker"
              },
              {
                "kind": "arg",
                "path": "offerId"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  86,
                  65,
                  85,
                  76,
                  84
                ]
              },
              {
                "kind": "account",
                "path": "offer"
              }
            ]
          }
        },
        {
          "name": "intent",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  73,
                  78,
                  84,
                  69,
                  78,
                  84
                ]
              },
              {
                "kind": "account",
                "path": "offer"
              },
              {
                "kind": "account",
                "path": "offer"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  69,
                  83,
                  67,
                  82,
                  79,
                  87
                ]
              },
              {
                "kind": "account",
                "path": "intent"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "offerId",
          "type": "u64"
        },
        {
          "name": "maker",
          "type": "pubkey"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "data",
          "type": {
            "array": [
              "u8",
              256
            ]
          }
        }
      ]
    },
    {
      "name": "initializeTaker",
      "discriminator": [
        73,
        223,
        148,
        84,
        74,
        79,
        44,
        213
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "owner",
          "signer": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "controller",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  67,
                  79,
                  78,
                  84,
                  82,
                  79,
                  76,
                  76,
                  69,
                  82
                ]
              }
            ]
          }
        },
        {
          "name": "taker",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  84,
                  65,
                  75,
                  69,
                  82
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "data",
          "type": {
            "array": [
              "u8",
              256
            ]
          }
        }
      ]
    },
    {
      "name": "withdrawSellOffer",
      "discriminator": [
        81,
        126,
        179,
        227,
        53,
        209,
        22,
        122
      ],
      "accounts": [
        {
          "name": "makerOwner",
          "signer": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "maker",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  77,
                  65,
                  75,
                  69,
                  82
                ]
              },
              {
                "kind": "account",
                "path": "makerOwner"
              }
            ]
          }
        },
        {
          "name": "offer",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  77,
                  65,
                  75,
                  69,
                  82,
                  95,
                  79,
                  70,
                  70,
                  69,
                  82
                ]
              },
              {
                "kind": "account",
                "path": "maker"
              },
              {
                "kind": "arg",
                "path": "offerId"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  86,
                  65,
                  85,
                  76,
                  84
                ]
              },
              {
                "kind": "account",
                "path": "offer"
              }
            ]
          }
        },
        {
          "name": "receiver",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "offerId",
          "type": "u64"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "controller",
      "discriminator": [
        184,
        79,
        171,
        0,
        183,
        43,
        113,
        110
      ]
    },
    {
      "name": "maker",
      "discriminator": [
        31,
        255,
        232,
        61,
        38,
        28,
        189,
        147
      ]
    },
    {
      "name": "offerIntent",
      "discriminator": [
        94,
        130,
        141,
        147,
        137,
        159,
        43,
        185
      ]
    },
    {
      "name": "sellOffer",
      "discriminator": [
        160,
        233,
        87,
        179,
        226,
        38,
        40,
        154
      ]
    },
    {
      "name": "taker",
      "discriminator": [
        124,
        135,
        63,
        38,
        46,
        218,
        51,
        67
      ]
    }
  ],
  "types": [
    {
      "name": "controller",
      "serialization": "bytemuck",
      "repr": {
        "kind": "c",
        "packed": true
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                128
              ]
            }
          }
        ]
      }
    },
    {
      "name": "maker",
      "serialization": "bytemuck",
      "repr": {
        "kind": "c",
        "packed": true
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "totalOffers",
            "type": "u64"
          },
          {
            "name": "data",
            "type": {
              "array": [
                "u8",
                256
              ]
            }
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                128
              ]
            }
          }
        ]
      }
    },
    {
      "name": "offerIntent",
      "serialization": "bytemuck",
      "repr": {
        "kind": "c",
        "packed": true
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "offer",
            "type": "pubkey"
          },
          {
            "name": "taker",
            "type": "pubkey"
          },
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "intentType",
            "type": "u8"
          },
          {
            "name": "status",
            "type": "u8"
          },
          {
            "name": "expiration",
            "type": "i64"
          },
          {
            "name": "data",
            "type": {
              "array": [
                "u8",
                256
              ]
            }
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                128
              ]
            }
          }
        ]
      }
    },
    {
      "name": "sellOffer",
      "serialization": "bytemuck",
      "repr": {
        "kind": "c",
        "packed": true
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "maker",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "rate",
            "type": "u64"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "totalIntents",
            "type": "u64"
          },
          {
            "name": "data",
            "type": {
              "array": [
                "u8",
                256
              ]
            }
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                128
              ]
            }
          }
        ]
      }
    },
    {
      "name": "taker",
      "serialization": "bytemuck",
      "repr": {
        "kind": "c",
        "packed": true
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "data",
            "type": {
              "array": [
                "u8",
                256
              ]
            }
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                128
              ]
            }
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "controllerNamespace",
      "type": "bytes",
      "value": "[67, 79, 78, 84, 82, 79, 76, 76, 69, 82]"
    }
  ]
};