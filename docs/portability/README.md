# Flow Mobility And Authorization Documentation

This folder contains the portability and authorization evidence for FLOW-00
through FLOW-46.

Start with [FLOW-MOBILITY-AUTH-WORK-LEDGER.md](FLOW-MOBILITY-AUTH-WORK-LEDGER.md)
for the human-readable project ledger. It summarizes the work completed, points
to the primary evidence artifact for each flow, and records the first tenant
repository reference for the flow where one exists.

Detailed evidence remains in each `flow-XX` directory. Session state files are
kept under `../sessions/FLOW-XX/FLOW-XX-MOBILITY-AUTH-STATE.json`.

Do not store tenant tokens, Vault values, or copied secret payloads in this
folder. Evidence should prove that credentials exist and were used without
printing the credential values.
