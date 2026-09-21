# Steam platform separation

Configuration produces server-validated capabilities. Steam mode refuses startup if Arkovia or external wallets are enabled. It uses only internal, non-transferable ARKOS ledger behavior: no wallet, deposit, withdrawal, exchange, NFT, or required chain interaction.

Direct-download distributions may later enable an adapter after policy and legal review. UI hiding is never the enforcement mechanism; backend handlers must check capabilities. Core gameplay depends only on `IEconomyProvider`, not Steam or Arkovia.
