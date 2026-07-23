# @xiigen/friend-request-privacy-sdk

Portable contract package for FLOW-07 privacy checks.

## Exports

- `PrivacyAction`
- `PrivacyCheckRequest`
- `PrivacyCheckResult`
- `PrivacyCheckResponse`
- `IPrivacyGatekeeperService`
- `PrivacyGatekeeperService`

The abstract `PrivacyGatekeeperService` is a contract class, not a NestJS
implementation. The server implementation lives in
`server/src/engine/flows/friend-request-social-feed/privacy-gatekeeper.service.ts`
and implements the same interface shape.
