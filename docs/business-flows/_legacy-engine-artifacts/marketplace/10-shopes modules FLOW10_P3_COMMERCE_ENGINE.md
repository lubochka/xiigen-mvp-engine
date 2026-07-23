# FLOW-10 — P3: COMMERCE ENGINE
## CMS + Commerce + Multi-Tenant Platform Engine
## Family 29 | F258–F266 | Save Point: FLOW10:MERGE:P3
## Merge Target: ENGINE_ARCHITECTURE_MERGED.md
## Sequence: F244–F257 complete (P1–P2). This file: F258–F266.

---

# ═══════════════════════════════════════════════════
# FAMILY 29 — COMMERCE ENGINE
# F258–F266 | Shopify-like commerce generation
# ═══════════════════════════════════════════════════

## Family Overview

**Purpose:** Generates the complete commerce lifecycle — catalog, inventory,
cart, checkout, payment, order management, shipping, and tax computation.
The engine generates services that sit entirely on fabric interfaces.
No PSP (Stripe, Braintree, Square), no shipping carrier (UPS, FedEx),
no tax engine (TaxJar, Avalara) is ever imported directly.

**Critical Correctness Contracts:**
  - DOUBLE-CHARGE PREVENTION: IPaymentOrchestratorService (F263) is idempotent
    via IIdempotencyKeyService (F270). Same checkoutId + idempotencyKey
    never charges twice regardless of retry count.
  - DOUBLE-RESERVATION PREVENTION: IInventoryService (F260) uses optimistic
    locking. Two concurrent ReserveAsync() for the same SKU → one succeeds,
    one returns DataProcessResult.Conflict (never silently oversells).
  - CHECKOUT RACE: ICheckoutService (F261) locks the checkout session during
    payment capture. Concurrent confirm attempts are serialized.

**Order State Machine (EP-1 reuse):**
  created → payment_pending → paid → fulfillment_pending → fulfilled
  → delivery_pending → delivered → [returned | refunded]
  Any state → cancelled (pre-fulfillment only)

**Fabrics used:**
  - DATABASE FABRIC (Skill 05) → PostgreSQL (transactional: orders, inventory, payments)
  - DATABASE FABRIC (Skill 05) → Elasticsearch (catalog: product search)
  - QUEUE FABRIC (Skill 04) → Redis Streams (all lifecycle events)
  - AI ENGINE FABRIC (Skill 06/07) → pricing recommendations, fraud scoring
  - RAG FABRIC (Skill 00b) → product similarity + recommendations
  - FLOW ENGINE FABRIC (Skill 08/09) → EP-1 (order state machine)

---

## F258: IProductCatalogService

**Description:**
  Product, variant, and collection management. Products stored in
  Elasticsearch for full-text search. Each product is a dynamic document
  (Dictionary<string,object>) — no typed Product class. Product schema
  (which fields, which variant options) is defined by tenant config (F248).

**FABRIC:** DATABASE FABRIC (Skill 05) → Elasticsearch provider
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})

**METHODS:**
```
CreateProductAsync(tenantId: string, payload: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  payload required: title, status, productType
  Auto-generates: productId, handle (slug), createdAt
  Emits: product.created event via QUEUE FABRIC

UpdateProductAsync(tenantId: string, productId: string, patch: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  Partial update via BuildSearchFilter. Emits: product.updated event.
  Price changes trigger ICachePurgeService (F281) + search reindex

GetProductAsync(tenantId: string, productId: string)
  → DataProcessResult<Dictionary<string,object>>
  Returns product + all variants + collection memberships

CreateVariantAsync(tenantId: string, productId: string,
                   payload: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  payload: sku (must be unique per tenant), price, compareAtPrice,
           weight, dimensions, options{color, size, ...} (FREEDOM)

BulkImportProductsAsync(tenantId: string, importBatch: List<Dictionary<string,object>>)
  → DataProcessResult<Dictionary<string,object>>
  Returns: jobId, accepted (int), rejected (int), validationErrors[]
  Async processing via QUEUE FABRIC. Results via product.bulk_import_completed event

SearchProductsAsync(tenantId: string, filter: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  filter: q (fullText), productType, status, collectionId, priceMin, priceMax,
          inStock (bool), tags — all optional via BuildSearchFilter
  Returns: hits[], total, facets{} (price ranges, types, tags)

CreateCollectionAsync(tenantId: string, payload: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  Supports manual collections (explicit product membership) and
  automated (rules-based: productType="apparel", price<50, etc.)
```

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | Product/variant = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | SearchProductsAsync: all filter fields optional | ✅ |
| DNA-3 DataProcessResult<T> | All methods return wrapped result | ✅ |
| DNA-4 MicroserviceBase | ProductCatalogServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId on ALL product queries + SKU uniqueness per tenant | ✅ |
| DNA-6 DynamicController | DynamicController handles product endpoints | ✅ |
| DNA-7 BuildQueryFilters | ObjectProcessor on all partial updates + filters | ✅ |
| DNA-8 (as applicable) | product.updated event triggers downstream fan-out | ✅ |

---

## F259: IPriceRuleService

**Description:**
  Price lists, discount rules, coupon codes, and promotional pricing.
  Price computation is a pure function: given tenantId, variantId, customerId,
  cartContext → resolved price. All rules stored as config documents.
  AI-assisted dynamic pricing is opt-in via F246 entitlements.

**FABRIC:** DATABASE FABRIC (Skill 05) → Elasticsearch provider
  AI ENGINE FABRIC (Skill 06/07) → dynamic pricing recommendations (optional)
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})

**METHODS:**
```
CreatePriceRuleAsync(tenantId: string, payload: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  payload: ruleType (percentage|fixed|bxgy|shipping), value, conditions{},
           applicableTo (all|collection|product|customer_segment),
           startsAt, endsAt, usageLimit

ResolvePriceAsync(tenantId: string, context: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  context: variantId, customerId (optional), cartTotal (optional),
           appliedCouponCode (optional)
  Returns: basePrice, resolvedPrice, appliedRules[], savings, currencyCode
  Pure function — no side effects, fully deterministic

ValidateCouponAsync(tenantId: string, couponCode: string,
                    cartContext: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  Returns: valid (bool), discount{}, errorCode (if invalid), errorMessage

ListActivePriceRulesAsync(tenantId: string, filter: Dictionary<string,object>)
  → DataProcessResult<List<Dictionary<string,object>>>
  BuildSearchFilter: ruleType, applicableTo, isActive — all optional

GetAiPricingSuggestionAsync(tenantId: string, productId: string,
                              context: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  Only available if F246.IsFeatureEnabledAsync("ai_dynamic_pricing")
  Returns: suggestedPrice, confidence, rationale, comparisonData
```

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | Price rules = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | ListActivePriceRulesAsync: filter fields optional | ✅ |
| DNA-3 DataProcessResult<T> | All methods return wrapped result | ✅ |
| DNA-4 MicroserviceBase | PriceRuleServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId on every rule lookup | ✅ |
| DNA-6 DynamicController | DynamicController handles pricing endpoints | ✅ |
| DNA-7 BuildQueryFilters | ObjectProcessor on all partial filters | ✅ |
| DNA-8 (as applicable) | AI pricing gated by entitlement check | ✅ |

---

## F260: IInventoryService

**Description:**
  Stock levels, reservations, and adjustments. CRITICAL: all reservation
  operations use optimistic locking to prevent overselling.
  ReserveAsync() must be idempotent via idempotencyKey.
  Two concurrent ReserveAsync() calls for the last unit →
  one succeeds, one returns DataProcessResult.Conflict — never DataProcessResult.Success twice.

**FABRIC:** DATABASE FABRIC (Skill 05) → PostgreSQL provider (ACID transactions)
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})

**METHODS:**
```
GetStockLevelAsync(tenantId: string, variantId: string, locationId: string)
  → DataProcessResult<Dictionary<string,object>>
  Returns: variantId, locationId, onHand, reserved, available, lowStockThreshold

ReserveAsync(tenantId: string, items: List<Dictionary<string,object>>,
             idempotencyKey: string)
  → DataProcessResult<Dictionary<string,object>>
  items: [{variantId, locationId, quantity}]
  Optimistic lock: reads current available → checks sufficient → reserves
  Concurrent conflict: DataProcessResult.Conflict (409-equivalent)
  Returns: reservationId, items[], expiresAt (reservation held for 15min)

CommitReservationAsync(tenantId: string, reservationId: string)
  → DataProcessResult<bool>
  Converts reservation to actual decrement. Called on payment_captured.

ReleaseReservationAsync(tenantId: string, reservationId: string)
  → DataProcessResult<bool>
  Releases held stock. Called on checkout_abandoned or payment_failed.

AdjustStockAsync(tenantId: string, adjustment: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  adjustment: variantId, locationId, delta, reason, referenceId
  Used for: receive shipment, manual correction, return processing

GetInventoryHistoryAsync(tenantId: string, filter: Dictionary<string,object>)
  → DataProcessResult<List<Dictionary<string,object>>>
  filter: variantId, locationId, adjustmentType, dateFrom, dateTo — BuildSearchFilter
```

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | Inventory records = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | History filter fields all optional | ✅ |
| DNA-3 DataProcessResult<T> | Conflicts → Failure result, never exception | ✅ |
| DNA-4 MicroserviceBase | InventoryServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId on ALL inventory queries + location scoping | ✅ |
| DNA-6 DynamicController | DynamicController handles inventory endpoints | ✅ |
| DNA-7 BuildQueryFilters | ObjectProcessor on adjustment + history queries | ✅ |
| DNA-8 (as applicable) | Optimistic lock via PostgreSQL row version column | ✅ |

---

## F261: ICartService

**Description:**
  Session cart management with conflict-safe add/remove/update.
  Cart is a tenant-scoped document. Price recalculation via F259
  on every mutation. Inventory availability check (non-reserving) on add.
  Cart sessions expire via EP-2 timer (configurable TTL per F248).

**FABRIC:** DATABASE FABRIC (Skill 05) → Redis provider (active carts)
  DATABASE FABRIC → PostgreSQL (persisted cart snapshots)
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})

**METHODS:**
```
CreateCartAsync(tenantId: string, context: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  context: customerId (optional for guest), sessionId, channel (web|mobile|pos)
  Returns: cartId, expiresAt, lineItems:[], subtotal:0

AddLineItemAsync(tenantId: string, cartId: string,
                 item: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  item: variantId, quantity, customAttributes{}
  Checks availability (F260.GetStockLevelAsync — does NOT reserve yet)
  Recalculates prices (F259.ResolvePriceAsync)
  Returns updated cart document

UpdateLineItemAsync(tenantId: string, cartId: string,
                    lineItemId: string, quantity: int)
  → DataProcessResult<Dictionary<string,object>>
  quantity=0 removes the line item

ApplyCouponAsync(tenantId: string, cartId: string, couponCode: string)
  → DataProcessResult<Dictionary<string,object>>
  Validates via F259.ValidateCouponAsync. Returns updated cart with discount.

GetCartAsync(tenantId: string, cartId: string)
  → DataProcessResult<Dictionary<string,object>>
  Returns: cartId, lineItems[], subtotal, discountTotal, taxEstimate,
           shippingEstimate, total, appliedCoupons[], expiresAt

MergeCartsAsync(tenantId: string, guestCartId: string, customerId: string)
  → DataProcessResult<Dictionary<string,object>>
  Merges guest cart into authenticated customer cart on login
```

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | Cart = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | No search on carts (keyed by cartId) — N/A | ✅ |
| DNA-3 DataProcessResult<T> | All methods return wrapped result | ✅ |
| DNA-4 MicroserviceBase | CartServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId on ALL Redis keys + PG cart records | ✅ |
| DNA-6 DynamicController | DynamicController handles cart endpoints | ✅ |
| DNA-7 BuildQueryFilters | N/A for keyed cart operations | ✅ |
| DNA-8 (as applicable) | Cart prices re-resolved on every mutation | ✅ |

---

## F262: ICheckoutService

**Description:**
  Checkout session orchestrator. Converts cart → checkout → order.
  CRITICAL: Concurrent checkout.confirm calls for same checkoutId are
  serialized. Payment capture is idempotent via IIdempotencyKeyService (F270).
  The checkout session locks during capture; duplicate confirms return
  the existing result, never double-charge.

**FABRIC:** DATABASE FABRIC (Skill 05) → PostgreSQL provider
  QUEUE FABRIC (Skill 04) → Redis Streams (order creation event)
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})

**METHODS:**
```
CreateCheckoutAsync(tenantId: string, cartId: string,
                    context: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  Freezes cart into checkout session. Reserves inventory (F260.ReserveAsync).
  context: customerId, email, channel
  Returns: checkoutId, lineItems[], reservationId, expiresAt (10 min)

UpdateShippingAsync(tenantId: string, checkoutId: string,
                    address: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  address: line1, city, province, countryCode, zip
  Calls F265.GetShippingOptionsAsync. Returns updated checkout with rates.

SelectShippingRateAsync(tenantId: string, checkoutId: string,
                        shippingRateHandle: string)
  → DataProcessResult<Dictionary<string,object>>
  Returns checkout with selected shipping + updated total

ConfirmCheckoutAsync(tenantId: string, checkoutId: string,
                     paymentPayload: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  IDEMPOTENT via F270.IIdempotencyKeyService
  paymentPayload: paymentMethodId (tokenized — never raw card data)
  Steps: 1. Lock session 2. Compute taxes (F266) 3. Capture payment (F263)
         4. Commit inventory (F260) 5. Create order (F264) 6. Emit order.created
  Returns: orderId, status, receipt

GetCheckoutAsync(tenantId: string, checkoutId: string)
  → DataProcessResult<Dictionary<string,object>>

AbandonCheckoutAsync(tenantId: string, checkoutId: string)
  → DataProcessResult<bool>
  Releases inventory reservation. Emits checkout.abandoned for remarketing.
```

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | Checkout session = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | N/A — keyed by checkoutId | ✅ |
| DNA-3 DataProcessResult<T> | Capture failure → Failure result, not exception | ✅ |
| DNA-4 MicroserviceBase | CheckoutServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId on all PG checkout records | ✅ |
| DNA-6 DynamicController | DynamicController handles checkout endpoints | ✅ |
| DNA-7 BuildQueryFilters | ObjectProcessor on shipping/tax sub-queries | ✅ |
| DNA-8 (as applicable) | Idempotency key on ConfirmCheckoutAsync | ✅ |

---

## F263: IPaymentOrchestratorService

**Description:**
  PSP abstraction layer. Service code never imports Stripe, Braintree, Square,
  or any other PSP. All payment operations go through this interface.
  The actual PSP is resolved at runtime via F248.GetProviderBindingAsync("payment").
  Supports: authorize, capture, void, refund, partial refund.
  PCI scope: raw card data NEVER touches XIIGen services (tokenized only).

**FABRIC:** AI ENGINE FABRIC (Skill 06/07) → external PSP via provider binding
  (PSP is treated as an "external AI-like provider" using the same factory pattern)
  QUEUE FABRIC (Skill 04) → payment event delivery
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})

**METHODS:**
```
AuthorizeAsync(tenantId: string, payload: Dictionary<string,object>,
               idempotencyKey: string)
  → DataProcessResult<Dictionary<string,object>>
  payload: amount, currencyCode, paymentMethodId (token), customerId,
           orderId, metadata{}
  IDEMPOTENT: same idempotencyKey → same result, no double-auth
  Returns: authorizationId, status, amount, expiresAt

CaptureAsync(tenantId: string, authorizationId: string,
             amount: decimal, idempotencyKey: string)
  → DataProcessResult<Dictionary<string,object>>
  IDEMPOTENT: same idempotencyKey → same result
  Returns: captureId, status, capturedAmount

VoidAsync(tenantId: string, authorizationId: string)
  → DataProcessResult<bool>
  Cancels uncaptured authorization. Emits payment.voided event.

RefundAsync(tenantId: string, captureId: string,
            amount: decimal, idempotencyKey: string)
  → DataProcessResult<Dictionary<string,object>>
  Partial or full refund. IDEMPOTENT.
  Returns: refundId, status, refundedAmount

GetPaymentStatusAsync(tenantId: string, paymentRef: string)
  → DataProcessResult<Dictionary<string,object>>
  Unified status across authorize/capture/refund lifecycle
```

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | Payment records = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | N/A — keyed operations | ✅ |
| DNA-3 DataProcessResult<T> | Declines/failures → Failure result, never exception | ✅ |
| DNA-4 MicroserviceBase | PaymentOrchestratorServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId on all payment records | ✅ |
| DNA-6 DynamicController | DynamicController handles payment endpoints | ✅ |
| DNA-7 BuildQueryFilters | PSP resolved via CreateAsync + F248 binding | ✅ |
| DNA-8 (as applicable) | All operations idempotent via F270 idempotency store | ✅ |

---

## F264: IOrderService

**Description:**
  Order lifecycle management. Order records are the authoritative source of
  truth for what was purchased, at what price, by whom.
  State machine managed by EP-1 (order lifecycle states defined in Family overview).
  All lifecycle events emitted via QUEUE FABRIC for downstream consumers
  (fulfillment, notifications, analytics, webhooks).

**FABRIC:** DATABASE FABRIC (Skill 05) → PostgreSQL provider
  QUEUE FABRIC (Skill 04) → Redis Streams (order lifecycle events)
  FLOW ENGINE FABRIC (Skill 08/09) → EP-1 (order state machine)
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})

**METHODS:**
```
CreateOrderAsync(tenantId: string, checkoutId: string,
                 payload: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  Called only by F262.ConfirmCheckoutAsync (not directly by API consumers)
  Returns full order document: orderId, orderNumber, lineItems[], amounts{},
  shippingAddress{}, billingAddress{}, fulfillmentStatus, financialStatus

GetOrderAsync(tenantId: string, orderId: string)
  → DataProcessResult<Dictionary<string,object>>

SearchOrdersAsync(tenantId: string, filter: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  filter: customerId, status, financialStatus, dateFrom, dateTo,
          minTotal, maxTotal — all optional via BuildSearchFilter
  Returns: orders[], total, pages

TransitionOrderStateAsync(tenantId: string, orderId: string,
                          trigger: string, payload: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  Uses EP-1. trigger examples: payment_captured, fulfillment_created,
  delivered_confirmed, return_initiated, refund_processed
  Emits order.{trigger} event via QUEUE FABRIC

CancelOrderAsync(tenantId: string, orderId: string, reason: string)
  → DataProcessResult<Dictionary<string,object>>
  Only valid pre-fulfillment. Triggers: void payment + release inventory
  + emit order.cancelled

AddOrderNoteAsync(tenantId: string, orderId: string,
                  note: Dictionary<string,object>)
  → DataProcessResult<bool>
  Append-only note (customer-visible or staff-only)
```

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | Orders = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | SearchOrdersAsync: all filter fields optional | ✅ |
| DNA-3 DataProcessResult<T> | Invalid transitions → Failure result | ✅ |
| DNA-4 MicroserviceBase | OrderServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId on ALL PG order queries | ✅ |
| DNA-6 DynamicController | DynamicController handles order endpoints | ✅ |
| DNA-7 BuildQueryFilters | ObjectProcessor on order search | ✅ |
| DNA-8 (as applicable) | Order events emitted via QUEUE FABRIC, not direct HTTP | ✅ |

---

## F265: IShippingService

**Description:**
  Carrier selection, rate computation, label creation, and delivery tracking.
  Shipping providers (UPS, FedEx, DHL, custom) resolved via F248 provider binding.
  Never imports carrier SDK directly. Multi-carrier support via the factory pattern.

**FABRIC:** DATABASE FABRIC (Skill 05) → PostgreSQL (shipments, tracking)
  QUEUE FABRIC (Skill 04) → carrier webhook delivery events
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})

**METHODS:**
```
GetShippingOptionsAsync(tenantId: string, context: Dictionary<string,object>)
  → DataProcessResult<List<Dictionary<string,object>>>
  context: fromLocationId, toAddress{}, lineItems[], weight, dimensions
  Returns: rates[] each with carrier, serviceName, handle, price, estimatedDays

CreateShipmentAsync(tenantId: string, orderId: string,
                    payload: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  payload: selectedRateHandle, items[], labelFormat
  Returns: shipmentId, trackingNumber, trackingUrl, labelUrl, carrier

GetTrackingAsync(tenantId: string, shipmentId: string)
  → DataProcessResult<Dictionary<string,object>>
  Returns: shipmentId, carrier, trackingNumber, status, events[],
           estimatedDelivery

UpdateTrackingAsync(tenantId: string, trackingPayload: Dictionary<string,object>)
  → DataProcessResult<bool>
  Called by carrier webhook receiver. Emits shipment.status_updated event.

GetFulfillmentLocationsAsync(tenantId: string)
  → DataProcessResult<List<Dictionary<string,object>>>
  Returns configured warehouse/store locations for this tenant
```

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | Shipments + tracking = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | N/A — carrier lookup by context, not filter | ✅ |
| DNA-3 DataProcessResult<T> | All methods return wrapped result | ✅ |
| DNA-4 MicroserviceBase | ShippingServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId on all shipment records | ✅ |
| DNA-6 DynamicController | DynamicController handles shipping endpoints | ✅ |
| DNA-7 BuildQueryFilters | Carrier resolved via F248 — not BuildSearchFilter | ✅ |
| DNA-8 (as applicable) | Carrier SDK never imported — factory resolves provider | ✅ |

---

## F266: ITaxService

**Description:**
  Tax rule computation per jurisdiction. Tax providers (TaxJar, Avalara,
  custom rules) resolved via F248 provider binding. Tax computation is
  a pure function: given address + line items → tax breakdown.
  Tax rules stored as tenant config (FREEDOM) or delegated to external provider.

**FABRIC:** DATABASE FABRIC (Skill 05) → PostgreSQL (tax records)
  AI ENGINE FABRIC (Skill 06/07) → external tax provider (via provider binding)
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})

**METHODS:**
```
ComputeTaxAsync(tenantId: string, context: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  context: shippingAddress{}, lineItems[] (with productType/taxCode),
           channel, currencyCode
  Pure function — no side effects
  Returns: totalTax, taxLines[]{name, rate, amount, jurisdiction},
           taxExempt (bool), nexus

GetTaxRulesAsync(tenantId: string, filter: Dictionary<string,object>)
  → DataProcessResult<List<Dictionary<string,object>>>
  filter: countryCode, provinceCode, productType — BuildSearchFilter

UpsertTaxRuleAsync(tenantId: string, rule: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  For tenants using custom tax rules (not external provider)

ValidateTaxExemptionAsync(tenantId: string, exemptionDoc: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  Validates customer tax exemption certificates
  Returns: valid (bool), exemptionType, expiresAt
```

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | Tax records = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | GetTaxRulesAsync: all filter fields optional | ✅ |
| DNA-3 DataProcessResult<T> | All methods return wrapped result | ✅ |
| DNA-4 MicroserviceBase | TaxServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId on all tax rule lookups | ✅ |
| DNA-6 DynamicController | DynamicController handles tax endpoints | ✅ |
| DNA-7 BuildQueryFilters | ObjectProcessor on tax rule filter | ✅ |
| DNA-8 (as applicable) | Tax provider resolved via AI ENGINE FABRIC | ✅ |

---

# ═══════════════════════════════════════════════════
# DESIGN RECORDS — DR-25, DR-26, DR-27
# ═══════════════════════════════════════════════════

## DR-25: Payment Fabric Design — PCI Scope Isolation

**Decision:** IPaymentOrchestratorService (F263) is the ONLY service in the
XIIGen engine that communicates with a PSP. Raw card data NEVER enters
any XIIGen service — only PSP-issued tokens are passed.

**PCI Scope Boundary:**
  - In scope: PSP SDK (resolved via factory), payment token, authorization IDs
  - Out of scope: all other XIIGen services (never see card data)
  - Consequence: F263 implementation is deployed in a separate, hardened container
    with restricted network policy. All other generated services are PCI-out-of-scope.

**Why factory pattern is critical here:** Swapping PSPs (Stripe → Braintree)
requires only an F248 config change. No redeployment. PCI re-scoping is handled
by the new PSP adapter, not by any business logic service.

## DR-26: Double-Prevention Contract — Inventory + Payment

**Inventory double-reservation:** F260.ReserveAsync() uses PostgreSQL
optimistic locking (version column). Concurrent requests: DB constraint
ensures only one succeeds. The losing request receives DataProcessResult.Conflict
and must retry with fresh stock check. This is an IRON RULE.

**Payment double-charge:** F263 operations are idempotent via F270
(IIdempotencyKeyService). The idempotency key = tenantId:checkoutId:operation.
PSP idempotency key forwarded to the PSP as well (belt + suspenders).

## DR-27: PostgreSQL for Transactional Commerce vs. ES for Catalog

**Commerce data split:**
  - PostgreSQL (transactional): orders, inventory, payments, checkouts, shipments
  - Elasticsearch (catalog + search): products, collections, price rules, content
  **Rationale:** Orders/inventory require ACID transactions for correctness.
  Product catalog requires full-text search and dynamic faceting.
  Both are DATABASE FABRIC — service code never knows which provider it's on.

---

# ═══════════════════════════════════════════════════
# DESIGN DECISIONS — DD-25, DD-26
# ═══════════════════════════════════════════════════

## DD-25: Two-Phase Inventory Reservation (Reserve → Commit)

**Decision:** Inventory goes through reserve-on-checkout-create →
commit-on-payment-captured (two-phase).
**Alternative rejected:** Reserve-on-add-to-cart — too many false reservations,
degrades availability metrics.
**Alternative rejected:** Commit-on-checkout-create — payment may fail, leaving
inventory committed to a dead order.
**Consequence:** Reservation expires in 15 min if checkout not completed.
EP-2 timer fires AbandonCheckoutAsync which calls ReleaseReservationAsync.

## DD-26: No Raw PSP SDK in Generated Service Code

**Decision:** The engine NEVER generates service code that directly imports
or calls a PSP SDK. Only F263:IPaymentOrchestratorService is ever referenced.
**Enforcement:** AF-7 (Compliance station) rejects any generated code containing
"stripe", "braintree", "square", "paypal" as import references.
This is a BUILD FAILURE iron rule.

---

# ═══════════════════════════════════════════════════
# FAMILY 29 SUMMARY
# ═══════════════════════════════════════════════════

| Interface | F# | Fabric | Primary Purpose |
|-----------|-----|--------|----------------|
| IProductCatalogService | F258 | DATABASE (ES) | Product + variant + collection |
| IPriceRuleService | F259 | DATABASE (ES) + AI ENGINE | Pricing + discounts |
| IInventoryService | F260 | DATABASE (PG) | Stock + reservations |
| ICartService | F261 | DATABASE (Redis + PG) | Session cart |
| ICheckoutService | F262 | DATABASE (PG) + QUEUE | Checkout orchestration |
| IPaymentOrchestratorService | F263 | AI ENGINE (PSP via binding) | PSP abstraction |
| IOrderService | F264 | DATABASE (PG) + FLOW ENGINE | Order lifecycle |
| IShippingService | F265 | DATABASE (PG) + QUEUE | Carrier abstraction |
| ITaxService | F266 | DATABASE (PG) + AI ENGINE | Tax computation |

**DNA Compliance Total:** 9 interfaces × 8 patterns = **72/72 ✅**
**Next Family:** 30 (F267–F271) — Workflow Lifecycle Engine

---
## FLOW10:MERGE:P3 SAVE POINT ✅
## Next: "Start FLOW-10 P4" → FLOW10_P4_WORKFLOW_EXTENSIBILITY.md
## Recovery: "Show FLOW-10 P3" → Read FLOW10_P3_COMMERCE_ENGINE.md
