/**
 * CapabilityGapFlowProposerService — unit tests (SS-09)
 *
 * Covers:
 *   propose: returns correct solutionScopeLevel per gap type and precedent
 *   classifyScopeLevel: CONVENTION only for eligible types with precedent
 *   storeProposal: stores with PENDING_LUBA_REVIEW + lubaDecision=null
 *   MISSING_FABRIC_INTERFACE: always NEW_FLOW, never CONVENTION
 *   MISSING_NAMED_CHECK: EXTENSION without precedent, CONVENTION with precedent
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CapabilityGapFlowProposerService } from './capability-gap-flow-proposer.service';

describe('CapabilityGapFlowProposerService', () => {
  let service: CapabilityGapFlowProposerService;
  let fetchMock: jest.SpyInstance;

  function mockEmptyPreviousResolutions() {
    return jest.spyOn(globalThis, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
      const urlStr = url.toString();
      if (urlStr.includes('_search')) {
        return {
          ok: true,
          json: () => Promise.resolve({ hits: { hits: [] } }),
        } as unknown as Response;
      }
      // Store call
      return {
        ok: true,
        json: () => Promise.resolve({ result: 'created' }),
      } as unknown as Response;
    });
  }

  function mockPreviousConventionResolution() {
    return jest.spyOn(globalThis, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
      const urlStr = url.toString();
      if (urlStr.includes('_search')) {
        return {
          ok: true,
          json: () =>
            Promise.resolve({
              hits: {
                hits: [{ _source: { solutionScopeLevel: 'CONVENTION' } }],
              },
            }),
        } as unknown as Response;
      }
      return {
        ok: true,
        json: () => Promise.resolve({ result: 'created' }),
      } as unknown as Response;
    });
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CapabilityGapFlowProposerService],
    }).compile();
    service = module.get(CapabilityGapFlowProposerService);
  });

  afterEach(() => {
    fetchMock?.mockRestore();
  });

  // ── Proposal shape ────────────────────────────────────────────────────────

  it('should produce a proposal with PENDING_LUBA_REVIEW status', async () => {
    fetchMock = mockEmptyPreviousResolutions();

    const proposal = await service.propose({
      gapId: 'IPaymentService',
      gapType: 'MISSING_FABRIC_INTERFACE',
      serviceName: 'Payment Service',
      context: 'E-commerce checkout flow requires payment processing',
    });

    expect(proposal.gapId).toBe('IPaymentService');
    expect(proposal.solutionScopeLevel).toBe('NEW_FLOW');
    expect(proposal.estimatedTaskTypes).toBeGreaterThanOrEqual(1);

    // Verify stored with PENDING_LUBA_REVIEW
    const storeCalls = (fetchMock as jest.SpyInstance).mock.calls.filter(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('_doc'),
    );
    expect(storeCalls.length).toBeGreaterThan(0);
    const storedBody = JSON.parse(storeCalls[storeCalls.length - 1][1].body as string);
    expect(storedBody.status).toBe('PENDING_LUBA_REVIEW');
    expect(storedBody.lubaDecision).toBeNull();
  });

  // ── Scope level classification ─────────────────────────────────────────────

  it('should classify MISSING_FABRIC_INTERFACE as NEW_FLOW', async () => {
    fetchMock = mockEmptyPreviousResolutions();

    const proposal = await service.propose({
      gapId: 'IMessagingService',
      gapType: 'MISSING_FABRIC_INTERFACE',
      serviceName: 'Messaging Service',
      context: 'Chat messages require messaging infrastructure',
    });

    expect(proposal.solutionScopeLevel).toBe('NEW_FLOW');
    expect(proposal.estimatedTaskTypes).toBe(3);
  });

  it('should classify MISSING_NAMED_CHECK as EXTENSION scope (no precedent)', async () => {
    fetchMock = mockEmptyPreviousResolutions();

    const proposal = await service.propose({
      gapId: 'SPEC-004',
      gapType: 'MISSING_NAMED_CHECK',
      serviceName: 'event schema validation',
      context: 'No named check for event schema compatibility',
    });

    expect(proposal.solutionScopeLevel).toBe('EXTENSION');
    expect(proposal.estimatedTaskTypes).toBe(1);
  });

  it('should use CONVENTION scope when previous CONVENTION resolution exists for eligible gap type', async () => {
    fetchMock = mockPreviousConventionResolution();

    const proposal = await service.propose({
      gapId: 'SPEC-005',
      gapType: 'MISSING_NAMED_CHECK',
      serviceName: 'event payload validation',
      context: 'No named check for event payload schema',
    });

    expect(proposal.solutionScopeLevel).toBe('CONVENTION');
    expect(proposal.estimatedTaskTypes).toBe(0);
    expect(proposal.estimatedSessions).toBe(1);
  });

  it('should NOT use CONVENTION scope for MISSING_FABRIC_INTERFACE even with CONVENTION precedent', async () => {
    // MISSING_FABRIC_INTERFACE always requires code — CONVENTION is never valid
    fetchMock = mockPreviousConventionResolution();

    const proposal = await service.propose({
      gapId: 'INotificationService',
      gapType: 'MISSING_FABRIC_INTERFACE',
      serviceName: 'Notification Service',
      context: 'Push notifications for mobile app',
    });

    expect(proposal.solutionScopeLevel).toBe('NEW_FLOW');
  });

  // ── Archetype derivation ──────────────────────────────────────────────────

  it('should use AI_GENERATION archetype for MISSING_FABRIC_INTERFACE', async () => {
    fetchMock = mockEmptyPreviousResolutions();
    const proposal = await service.propose({
      gapId: 'IEmailService',
      gapType: 'MISSING_FABRIC_INTERFACE',
      serviceName: 'Email Service',
      context: 'Transactional email required',
    });
    expect(proposal.archetype).toBe('AI_GENERATION');
  });

  it('should use ORCHESTRATION archetype for OVERLAP_DETECTED', async () => {
    fetchMock = mockEmptyPreviousResolutions();
    const proposal = await service.propose({
      gapId: 'ISSOProvider',
      gapType: 'OVERLAP_DETECTED',
      serviceName: 'SSO Provider',
      context: 'Overlaps with Auth Service',
    });
    expect(proposal.archetype).toBe('ORCHESTRATION');
  });

  // ── ES failure resilience ─────────────────────────────────────────────────

  it('should return a valid proposal even when ES is unavailable', async () => {
    fetchMock = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ES down'));

    const proposal = await service.propose({
      gapId: 'IQueueService',
      gapType: 'MISSING_FABRIC_INTERFACE',
      serviceName: 'Queue Service',
      context: 'Message queue required',
    });

    // Still produces a valid proposal — ES failure is non-blocking
    expect(proposal.gapId).toBe('IQueueService');
    expect(proposal.solutionScopeLevel).toBe('NEW_FLOW');
  });
});
