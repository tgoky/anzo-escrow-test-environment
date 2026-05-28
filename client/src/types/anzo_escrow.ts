const IDL = {
  "address": "6swJPHnA6dJXUbtu2D2vTwqZVr1RzHe1k1mbDCqbwL3X",
  "metadata": {
    "name": "anzo_escrow",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "cancel_buy_intent",
      "discriminator": [
        117,
        167,
        240,
        140,
        109,
        95,
        176,
        111
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
          "name": "taker_authority"
        },
        {
          "name": "maker_authority"
        },
        {
          "name": "offer",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  66,
                  85,
                  89,
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
                "path": "maker_authority"
              },
              {
                "kind": "arg",
                "path": "offer_id"
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
                  66,
                  85,
                  89,
                  95,
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
                "kind": "arg",
                "path": "intent_id"
              }
            ]
          }
        },
        {
          "name": "escrow_ata",
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
          "name": "refund_ata"
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "intent_id",
          "type": "u64"
        },
        {
          "name": "offer_id",
          "type": "u64"
        }
      ]
    },
    {
      "name": "cancel_sell_intent",
      "discriminator": [
        255,
        128,
        58,
        124,
        193,
        163,
        145,
        244
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
          "name": "taker_authority"
        },
        {
          "name": "maker_authority"
        },
        {
          "name": "offer",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  83,
                  69,
                  76,
                  76,
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
                "path": "maker_authority"
              },
              {
                "kind": "arg",
                "path": "offer_id"
              }
            ]
          }
        },
        {
          "name": "controller",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  83,
                  69,
                  76,
                  76,
                  95,
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
                "kind": "arg",
                "path": "intent_id"
              }
            ]
          }
        },
        {
          "name": "vault_ata",
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
                "path": "intent.offer",
                "account": "SellIntent"
              }
            ]
          }
        },
        {
          "name": "escrow_ata",
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
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "intent_id",
          "type": "u64"
        },
        {
          "name": "offer_id",
          "type": "u64"
        }
      ]
    },
    {
      "name": "confirm_buy_intent",
      "discriminator": [
        239,
        247,
        107,
        32,
        227,
        96,
        54,
        142
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
          "name": "taker_authority"
        },
        {
          "name": "maker_authority"
        },
        {
          "name": "intent",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  66,
                  85,
                  89,
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
                "path": "maker_authority"
              },
              {
                "kind": "arg",
                "path": "offer_id"
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
                  66,
                  85,
                  89,
                  95,
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
                "kind": "arg",
                "path": "intent_id"
              }
            ]
          }
        },
        {
          "name": "escrow_ata",
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
          "name": "receiver_ata",
          "writable": true
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "intent_id",
          "type": "u64"
        },
        {
          "name": "offer_id",
          "type": "u64"
        }
      ]
    },
    {
      "name": "confirm_sell_intent",
      "discriminator": [
        148,
        85,
        46,
        226,
        75,
        37,
        181,
        185
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
          "name": "maker_authority"
        },
        {
          "name": "offer",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  83,
                  69,
                  76,
                  76,
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
                "path": "maker_authority"
              },
              {
                "kind": "arg",
                "path": "offer_id"
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
                  83,
                  69,
                  76,
                  76,
                  95,
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
                "kind": "arg",
                "path": "intent_id"
              }
            ]
          }
        },
        {
          "name": "escrow_ata",
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
          "name": "receiver_ata",
          "writable": true
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "intent_id",
          "type": "u64"
        },
        {
          "name": "offer_id",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initalize_buy_intent",
      "discriminator": [
        218,
        229,
        20,
        165,
        154,
        19,
        65,
        14
      ],
      "accounts": [
        {
          "name": "taker_authority",
          "signer": true
        },
        {
          "name": "sender",
          "signer": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "maker_authority"
        },
        {
          "name": "offer",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  66,
                  85,
                  89,
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
                "path": "maker_authority"
              },
              {
                "kind": "arg",
                "path": "offer_id"
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
                  66,
                  85,
                  89,
                  95,
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
                "path": "offer.total_intents",
                "account": "BuyOffer"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "escrow_ata",
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
          "name": "refund_ata"
        },
        {
          "name": "sender_ata",
          "writable": true
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "offer_id",
          "type": "u64"
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
      "name": "initialize_buy_offer",
      "discriminator": [
        144,
        147,
        39,
        188,
        99,
        31,
        239,
        110
      ],
      "accounts": [
        {
          "name": "maker_authority",
          "signer": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
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
                "path": "maker_authority"
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
                  66,
                  85,
                  89,
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
                "path": "maker_authority"
              },
              {
                "kind": "account",
                "path": "maker.total_offers",
                "account": "Maker"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "receiver_ata",
          "writable": true
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "system_program",
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
      "name": "initialize_controller",
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
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initialize_maker",
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
          "signer": true,
          "relations": [
            "controller"
          ]
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
          "name": "maker_authority",
          "signer": true
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
                "path": "maker_authority"
              }
            ]
          }
        },
        {
          "name": "system_program",
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
      "name": "initialize_sell_intent",
      "discriminator": [
        41,
        163,
        184,
        139,
        44,
        59,
        252,
        93
      ],
      "accounts": [
        {
          "name": "taker_authority",
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
                "path": "taker_authority"
              }
            ]
          }
        },
        {
          "name": "maker_authority"
        },
        {
          "name": "offer",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  83,
                  69,
                  76,
                  76,
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
                "path": "maker_authority"
              },
              {
                "kind": "arg",
                "path": "offer_id"
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
                  83,
                  69,
                  76,
                  76,
                  95,
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
                "path": "offer.total_intents",
                "account": "SellOffer"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "vault_ata",
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
          "name": "escrow_ata",
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
          "name": "receiver_ata"
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "offer_id",
          "type": "u64"
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
      "name": "initialize_sell_offer",
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
          "name": "maker_authority",
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
                "path": "maker_authority"
              }
            ]
          }
        },
        {
          "name": "offer",
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
                  83,
                  69,
                  76,
                  76,
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
                "path": "maker_authority"
              },
              {
                "kind": "account",
                "path": "maker.total_offers",
                "account": "Maker"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "maker_token_account",
          "writable": true
        },
        {
          "name": "vault_ata",
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
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "system_program",
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
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initialize_taker",
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
          "signer": true,
          "relations": [
            "controller"
          ]
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
          "name": "taker_authority",
          "signer": true
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
                "path": "taker_authority"
              }
            ]
          }
        },
        {
          "name": "system_program",
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
      "name": "withdraw_sell_offer",
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
          "name": "authority",
          "signer": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "offer",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  83,
                  69,
                  76,
                  76,
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
                "path": "authority"
              },
              {
                "kind": "arg",
                "path": "offer_id"
              }
            ]
          }
        },
        {
          "name": "receiver",
          "writable": true
        },
        {
          "name": "vault_ata",
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
          "name": "receiver_ata",
          "writable": true
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "offer_id",
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
      "name": "BuyIntent",
      "discriminator": [
        92,
        44,
        215,
        59,
        73,
        170,
        155,
        77
      ]
    },
    {
      "name": "BuyOffer",
      "discriminator": [
        247,
        133,
        161,
        252,
        116,
        1,
        4,
        172
      ]
    },
    {
      "name": "Controller",
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
      "name": "Maker",
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
      "name": "SellIntent",
      "discriminator": [
        49,
        180,
        82,
        157,
        242,
        100,
        217,
        0
      ]
    },
    {
      "name": "SellOffer",
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
      "name": "Taker",
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
      "name": "BuyIntent",
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
            "name": "taker_authority",
            "type": "pubkey"
          },
          {
            "name": "escrow_ata",
            "type": "pubkey"
          },
          {
            "name": "refund_ata",
            "type": "pubkey"
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
          }
        ]
      }
    },
    {
      "name": "BuyOffer",
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
            "name": "maker_authority",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "receiver_ata",
            "type": "pubkey"
          },
          {
            "name": "total_intents",
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
      }
    },
    {
      "name": "Controller",
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
          }
        ]
      }
    },
    {
      "name": "Maker",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "status",
            "type": "u8"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "total_offers",
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
      }
    },
    {
      "name": "SellIntent",
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
            "name": "taker_authority",
            "type": "pubkey"
          },
          {
            "name": "escrow_ata",
            "type": "pubkey"
          },
          {
            "name": "receiver_ata",
            "type": "pubkey"
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
          }
        ]
      }
    },
    {
      "name": "SellOffer",
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
            "name": "maker_authority",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "vault_ata",
            "type": "pubkey"
          },
          {
            "name": "total_intents",
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
      }
    },
    {
      "name": "Taker",
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
            "name": "data",
            "type": {
              "array": [
                "u8",
                256
              ]
            }
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "CONTROLLER_NAMESPACE",
      "type": "bytes",
      "value": "[67, 79, 78, 84, 82, 79, 76, 76, 69, 82]"
    }
  ]
}

export default IDL;