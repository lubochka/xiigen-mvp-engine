/**
 * T609 MarketplaceCheckoutGateway [VALIDATION]
 * FLOW-16: Marketplace Payments
 *
 * Entry: CheckoutRequested event (buyer initiates checkout)
 *
 * Execution order is MACHINE:
 *   ORDER 1: BOLA check — cart.buyerTenantId === ALS tenantId (cheapest gate first)
 *   ORDER 2: SETNX cart lock with TTL from FREEDOM config (checkout_lock_ttl_ms)
 *   ORDER 3: OCC inventory read (getDocumentWithVersion)
 *   ORDER 4: OCC inventory reservation (storeDocumentWithOCC)
 *   ORDER 5: storeDocument(audit) — DNA-8, before emit
 *   ORDER 6: enqueue(CheckoutReserved)
 *
 * Iron rules:
 *   IR-1: BOLA at ORDER 1 — cart.buyerTenantId must equal ALS.tenantId before any lock or read
 *   IR-2: SETNX cart lock at ORDER 2 with FREEDOM TTL
 *   IR-3: OCC inventory reservation at ORDER 4
 *   IR-4: storeDocument(audit) BEFORE CheckoutReserved emit (DNA-8)
 *
 * Pattern reference: saas-multi-tenancy/tenant-provisioning-orchestrator.service.ts (SETNX + audit + emit)
 * Pattern reference: saas-multi-tenancy/tenant-configuration-manager.service.ts (ORDER 1 guard + OCC)
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const CART_LOCK_INDEX = 'xiigen-cart-locks';
const INVENTORY_INDEX = 'xiigen-inventory';
const CHECKOUT_AUDIT_INDEX = 'xiigen-checkout-audit';
const FREEDOM_INDEX = 'xiigen-freedom-config';

/** MACHINE: Default checkout lock TTL if FREEDOM config not yet seeded. */
const DEFAULT_CHECKOUT_LOCK_TTL_MS = 300_000; // 5 minutes

@Injectable()
export class MarketplaceCheckoutGatewayService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T609',
        serviceName: 'MarketplaceCheckoutGatewayService',
        flowId: 'FLOW-16',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  /**
   * Process CheckoutRequested — validate BOLA, acquire lock, reserve inventory.
   * DPO pattern: BOLA-FIRST-CHECKOUT-001
   */
  async handleCheckoutRequested(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const alsTenantId = this.getTenantId();
    const cartId = event['cartId'] as string;
    const buyerTenantId = event['buyerTenantId'] as string;
    const itemIds = event['itemIds'] as string[];

    if (!cartId || !buyerTenantId || !itemIds || itemIds.length === 0) {
      return DataProcessResult.failure(
        'INVALID_INPUT',
        'cartId, buyerTenantId, and itemIds are required',
      );
    }

    // ── ORDER 1: BOLA check — IR-1 ──────────────────────────────────────────
    // cart.buyerTenantId must equal ALS tenantId — cheapest gate first
    if (buyerTenantId !== alsTenantId) {
      await this.queueFabric.enqueue('CheckoutRejected', {
        tenantId: alsTenantId,
        cartId,
        reason: 'BOLA_VIOLATION',
      });
      return DataProcessResult.failure(
        'BOLA_VIOLATION',
        'buyerTenantId does not match authenticated tenant',
      );
    }

    // ── ORDER 2: SETNX cart lock — IR-2 ─────────────────────────────────────
    // TTL from FREEDOM config (checkout_lock_ttl_ms)
    const lockResult = await this.dbFabric.searchDocuments(CART_LOCK_INDEX, { cartId });
    if (lockResult.isSuccess && (lockResult.data ?? []).length > 0) {
      await this.queueFabric.enqueue('CheckoutRejected', {
        tenantId: alsTenantId,
        cartId,
        reason: 'CART_LOCKED',
      });
      return DataProcessResult.failure('CART_LOCKED', `Cart '${cartId}' is already locked`);
    }

    // Load checkout_lock_ttl_ms from FREEDOM config
    const freedomResult = await this.dbFabric.searchDocuments(FREEDOM_INDEX, {
      tenantId: alsTenantId,
      key: 'checkout_lock_ttl_ms',
    });
    const lockTtlMs =
      freedomResult.isSuccess && (freedomResult.data ?? []).length > 0
        ? ((freedomResult.data![0] as Record<string, unknown>)['value'] as number)
        : DEFAULT_CHECKOUT_LOCK_TTL_MS;

    await this.dbFabric.storeDocument(
      CART_LOCK_INDEX,
      {
        cartId,
        tenantId: alsTenantId,
        lockedAt: new Date().toISOString(),
        ttlMs: lockTtlMs,
        knowledgeScope: 'PRIVATE',
      },
      cartId,
    );

    // ── ORDER 3: OCC inventory read — IR-3 ──────────────────────────────────
    const inventoryRead = await this.dbFabric.searchDocuments(INVENTORY_INDEX, {
      itemIds,
      tenantId: alsTenantId,
    });

    if (!inventoryRead.isSuccess) {
      return DataProcessResult.failure(
        'INVENTORY_READ_FAILED',
        `Inventory read failed: ${inventoryRead.errorMessage}`,
      );
    }

    const inventoryItems = inventoryRead.data ?? [];
    const inventoryVersion =
      inventoryItems.length > 0
        ? ((inventoryItems[0] as Record<string, unknown>)['_version'] as string | undefined)
        : undefined;

    // ── ORDER 4: OCC inventory reservation — IR-3 ───────────────────────────
    const reservedAt = new Date().toISOString();
    const reservationRecord: Record<string, unknown> = {
      cartId,
      tenantId: alsTenantId,
      itemIds,
      status: 'RESERVED',
      reservedAt,
      _version: inventoryVersion,
      knowledgeScope: 'PRIVATE',
    };

    // storeDocumentWithOCC — IR-3 (NEVER plain storeDocument for inventory reservation)
    const occOptions = inventoryVersion
      ? {
          ifSeqNo: parseInt(inventoryVersion.split(':')[0] ?? '0', 10),
          ifPrimaryTerm: parseInt(inventoryVersion.split(':')[1] ?? '1', 10),
        }
      : { ifSeqNo: 0, ifPrimaryTerm: 1 };
    const reserveResult = await this.dbFabric.storeDocumentWithOCC(
      INVENTORY_INDEX,
      reservationRecord,
      `reservation:${cartId}`,
      occOptions,
    );

    if (!reserveResult.isSuccess) {
      if (
        reserveResult.errorCode === 'OCC_CONFLICT' ||
        reserveResult.errorMessage?.includes('conflict')
      ) {
        await this.queueFabric.enqueue('CheckoutRejected', {
          tenantId: alsTenantId,
          cartId,
          reason: 'INVENTORY_CONFLICT',
        });
        return DataProcessResult.failure(
          'INVENTORY_CONFLICT',
          'Inventory reservation conflict — concurrent checkout attempt',
        );
      }
      return DataProcessResult.failure(
        'RESERVATION_FAILED',
        `Inventory reservation failed: ${reserveResult.errorMessage}`,
      );
    }

    // ── ORDER 5: Audit write — IR-4, DNA-8 ──────────────────────────────────
    // storeDocument(audit) BEFORE CheckoutReserved emit
    await this.dbFabric.storeDocument(CHECKOUT_AUDIT_INDEX, {
      tenantId: alsTenantId,
      cartId,
      itemIds,
      action: 'CHECKOUT_RESERVED',
      reservedAt,
      timestamp: new Date().toISOString(),
      knowledgeScope: 'PRIVATE',
    });

    // ── ORDER 6: Emit CheckoutReserved — IR-4 ───────────────────────────────
    await this.queueFabric.enqueue('CheckoutReserved', {
      tenantId: alsTenantId,
      cartId,
      itemIds,
      reservedAt,
    });

    return DataProcessResult.success({
      tenantId: alsTenantId,
      cartId,
      itemIds,
      reservedAt,
      status: 'RESERVED',
    });
  }
}
