/**
 * SpecAuditService — Registration UML Integration Test (SS-06)
 *
 * Feeds the actual Registration UML content (from possible_umls.drawio.xml)
 * into SpecAuditService and verifies it detects the gaps identified in the
 * self-sufficiency simulation document.
 *
 * These tests run against a MOCKED fabric registry (not live ES).
 * The mock is configured to match the actual SS-01 bootstrap output:
 *   REGISTERED: DATABASE_SERVICE, QUEUE_SERVICE, AI_PROVIDER, RAG_SERVICE,
 *               SECRETS_SERVICE, FLOW_ORCHESTRATOR (and variants)
 *   MISSING:    MESSAGING_SERVICE, SSO_PROVIDER, AUTH_SERVICE, USER_SERVICE,
 *               EMAIL_SERVICE, QUESTIONNAIRE_SERVICE
 *
 * Alias mapping tests verify that "Event Bus" → QUEUE_SERVICE and
 * "Database" → DATABASE_SERVICE work correctly (alias fix from SS-06 Step 4).
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SpecAuditService, SpecServiceReference } from './spec-audit.service';

// ── Fetch mock helpers ──

function mockFetchForRegistration(): jest.SpyInstance {
  const REGISTERED_TOKENS = new Set([
    'DATABASE_SERVICE',
    'QUEUE_SERVICE',
    'AI_PROVIDER',
    'AI_DISPATCHER',
    'AI_JUDGE_PROVIDER',
    'RAG_SERVICE',
    'SECRETS_SERVICE',
    'FLOW_ORCHESTRATOR',
    'FLOW_DEFINITION',
    'SCHEDULER_SERVICE',
    'SCOPED_MEMORY_SERVICE',
    'CODE_REPOSITORY_SERVICE',
    'PROJECT_TRACKER_SERVICE',
  ]);

  // Aliases that map spec names to registered tokens
  const ALIAS_MAP: Record<string, string> = {
    database: 'DATABASE_SERVICE',
    idatabaseservice: 'DATABASE_SERVICE',
    database_service: 'DATABASE_SERVICE',
    db: 'DATABASE_SERVICE',
    'data store': 'DATABASE_SERVICE',
    queue: 'QUEUE_SERVICE',
    iqueueservice: 'QUEUE_SERVICE',
    queue_service: 'QUEUE_SERVICE',
    'event bus': 'QUEUE_SERVICE',
    'message queue': 'QUEUE_SERVICE',
  };

  return jest
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (url: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url.toString();

      // Handle fabric registry searches
      if (urlStr.includes('xiigen-fabric-registry/_search')) {
        const body = JSON.parse((init?.body as string) ?? '{}') as {
          query?: {
            bool?: { should?: Array<Record<string, unknown>> };
            term?: Record<string, string>;
          };
        };

        // checkFabricRegistry: bool.should query
        if (body.query?.bool?.should) {
          const shouldClauses = body.query.bool.should;
          let foundToken: string | null = null;
          let foundName: string | null = null;

          for (const clause of shouldClauses) {
            // match on aliases
            if ('match' in clause) {
              const matchClause = clause as { match: { aliases?: string } };
              const aliasQuery = matchClause.match?.aliases?.toLowerCase();
              if (aliasQuery && ALIAS_MAP[aliasQuery]) {
                const token = ALIAS_MAP[aliasQuery];
                foundToken = token;
                foundName = `I${token
                  .split('_')
                  .map((p: string) => p[0] + p.slice(1).toLowerCase())
                  .join('')}`;
                break;
              }
            }
            // term on interfaceName
            if ('term' in clause) {
              const termClause = clause as {
                term?: { interfaceName?: string; interfaceToken?: string };
              };
              if (
                termClause.term?.interfaceToken &&
                REGISTERED_TOKENS.has(termClause.term.interfaceToken)
              ) {
                foundToken = termClause.term.interfaceToken;
                foundName = termClause.term.interfaceName ?? `I${foundToken}`;
                break;
              }
            }
          }

          if (foundToken) {
            return {
              ok: true,
              json: () =>
                Promise.resolve({
                  hits: {
                    total: { value: 1 },
                    hits: [
                      {
                        _source: {
                          interfaceToken: foundToken,
                          interfaceName: foundName,
                          status: 'ACTIVE',
                        },
                      },
                    ],
                  },
                }),
            } as unknown as Response;
          }

          return {
            ok: true,
            json: () => Promise.resolve({ hits: { total: { value: 0 }, hits: [] } }),
          } as unknown as Response;
        }

        // detectOverlaps: term on serviceCategory — return empty (no overlaps for simplicity)
        return {
          ok: true,
          json: () => Promise.resolve({ hits: { hits: [] } }),
        } as unknown as Response;
      }

      // Default — not found
      return {
        ok: true,
        json: () => Promise.resolve({ hits: { total: { value: 0 }, hits: [] } }),
      } as unknown as Response;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// The Registration UML content (extracted from possible_umls.drawio.xml)
// ─────────────────────────────────────────────────────────────────────────────

const REGISTRATION_UML_TEXT = `
  User Registration Flow - Event Driven Design

  Actors: User, Frontend/UI, API Gateway, Auth Service, SSO Provider, User Service, Email Service, Questionnaire Service, Messaging Service, Event Bus, Database

  Click "Register/Sign Up"
  POST /auth/register
  Forward registration request
  Redirect to SSO provider
  Show SSO login page
  Enter credentials
  Return auth token + user info
  Publish "UserSSOAuthenticated" event
  Consume "UserSSOAuthenticated"
  Check if user exists
  Create user profile
  Publish "UserCreated" event
  Publish "UserLoggedIn" event
  Check email exists
  Create pending user
  Publish "UserRegistrationInitiated" event
  Consume "UserRegistrationInitiated"
  Send verification email
  Publish "VerificationEmailSent" event
  Click verification link
  GET /auth/verify?token=xxx
  Verify token
  Update user status to verified
  Publish "EmailVerified" event
  Consume "EmailVerified"
  Activate user account
  Publish "UserActivated" event
  Consume "UserActivated" or "UserCreated"
  Check if questionnaire completed
  Publish "QuestionnaireRequired" event
  Consume "QuestionnaireRequired"
  Send chat message with questionnaire link
  Publish "QuestionnaireSent" event
  Complete questionnaire
  POST /questionnaire/submit
  Submit answers
  Store questionnaire responses
  Publish "QuestionnaireCompleted" event
  Consume "QuestionnaireCompleted"
  Update user onboarding status
  Publish "UserOnboardingCompleted" event
  Publish "UserFullyOnboarded" event
  Send welcome message
  Redirect to dashboard

  Email Verification Process
  First Setup Questionnaire Flow
`;

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('SpecAuditService — Registration UML Integration (SS-06)', () => {
  let service: SpecAuditService;
  let fetchMock: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpecAuditService],
    }).compile();

    service = module.get(SpecAuditService);
  });

  afterEach(() => {
    fetchMock?.mockRestore();
  });

  // ── 1. Service reference extraction ──────────────────────────────────────

  describe('service reference extraction from Registration UML', () => {
    it('should extract all actors from the Actors: line', () => {
      const refs = service.extractServiceReferences(REGISTRATION_UML_TEXT);
      const names = refs.map((r) => r.name);

      // All actors from the Actors: line must be extracted
      expect(names).toContain('Auth Service');
      expect(names).toContain('User Service');
      expect(names).toContain('Email Service');
      expect(names).toContain('Questionnaire Service');
      expect(names).toContain('Messaging Service');
      expect(names).toContain('SSO Provider');
      expect(names).toContain('Event Bus');
      expect(names).toContain('Database');
      expect(names).toContain('API Gateway');

      // Should extract at least 8 distinct service references from the Actors: line
      expect(refs.length).toBeGreaterThanOrEqual(8);
    });

    it('should mark Actors: line items with actors-list source (high confidence)', () => {
      const refs = service.extractServiceReferences(REGISTRATION_UML_TEXT);
      const actorLineRefs = refs.filter((r) => r.source.includes('actors-list'));

      // Auth Service, User Service, Email Service, etc. come from the Actors: line
      expect(actorLineRefs.length).toBeGreaterThanOrEqual(6);
    });

    it('should not duplicate services across passes', () => {
      const refs = service.extractServiceReferences(REGISTRATION_UML_TEXT);
      const names = refs.map((r) => r.name);
      const uniqueNames = new Set(names);

      expect(names.length).toBe(uniqueNames.size);
    });
  });

  // ── 2. Fabric registry checks against Registration UML ───────────────────

  describe('fabric registry checks for Registration UML actors', () => {
    beforeEach(() => {
      fetchMock = mockFetchForRegistration();
    });

    it('should detect Messaging Service as MISSING fabric interface', async () => {
      const report = await service.auditSpec(REGISTRATION_UML_TEXT, 'registration-uml');

      expect(report.missingInterfaces).toContain('Messaging Service');

      const gap = report.prereqGaps.find(
        (g) => g.name === 'Messaging Service' && g.type === 'MISSING_FABRIC_INTERFACE',
      );
      expect(gap).toBeDefined();
      expect(gap!.priority).toBe('BLOCKING');
      expect(gap!.autonomouslyResolvable).toBe(true);
    });

    it('should detect SSO Provider as MISSING fabric interface', async () => {
      const report = await service.auditSpec(REGISTRATION_UML_TEXT, 'registration-uml');

      expect(report.missingInterfaces).toContain('SSO Provider');
    });

    it('should detect Questionnaire Service as MISSING fabric interface', async () => {
      const report = await service.auditSpec(REGISTRATION_UML_TEXT, 'registration-uml');

      expect(report.missingInterfaces).toContain('Questionnaire Service');
    });

    it('should NOT flag Event Bus as missing (alias → QUEUE_SERVICE)', async () => {
      const report = await service.auditSpec(REGISTRATION_UML_TEXT, 'registration-uml');

      // Event Bus is aliased to QUEUE_SERVICE in the fabric registry
      expect(report.missingInterfaces).not.toContain('Event Bus');
    });

    it('should NOT flag Database as missing (alias → DATABASE_SERVICE)', async () => {
      const report = await service.auditSpec(REGISTRATION_UML_TEXT, 'registration-uml');

      // Database is aliased to DATABASE_SERVICE in the fabric registry
      expect(report.missingInterfaces).not.toContain('Database');
    });

    it('should produce BLOCKING_GAPS verdict for the Registration UML', async () => {
      const report = await service.auditSpec(REGISTRATION_UML_TEXT, 'registration-uml');

      expect(report.verdict).toBe('BLOCKING_GAPS');
      expect(report.prereqGaps.length).toBeGreaterThan(0);
      expect(report.prereqGaps.some((g) => g.type === 'MISSING_FABRIC_INTERFACE')).toBe(true);
    });

    it('should have at least 3 BLOCKING gaps (Messaging, SSO Provider, Questionnaire Service)', async () => {
      const report = await service.auditSpec(REGISTRATION_UML_TEXT, 'registration-uml');

      const blockingGaps = report.prereqGaps.filter((g) => g.priority === 'BLOCKING');
      expect(blockingGaps.length).toBeGreaterThanOrEqual(3);
    });

    it('should log the full audit report', async () => {
      const report = await service.auditSpec(REGISTRATION_UML_TEXT, 'registration-uml');

      // Log for manual inspection during development
      console.log('\n=== REGISTRATION UML SPEC AUDIT REPORT ===');
      console.log(`Verdict: ${report.verdict}`);
      console.log(`Total service refs extracted: ${report.serviceReferences.length}`);
      console.log(
        `Missing interfaces (${report.missingInterfaces.length}): ${report.missingInterfaces.join(', ')}`,
      );
      console.log(`PREREQ_GAP events (${report.prereqGaps.length}):`);
      for (const gap of report.prereqGaps) {
        console.log(
          `  [${gap.priority}] ${gap.type}: ${gap.name} (auto=${gap.autonomouslyResolvable})`,
        );
      }
      console.log(`Constant candidates: ${report.constantCandidates.length}`);
      console.log('==========================================\n');
    });
  });

  // ── 3. SSO Provider — must be extracted (not silently missed) ─────────────

  describe('SSO Provider detection (never silently missed)', () => {
    beforeEach(() => {
      fetchMock = mockFetchForRegistration();
    });

    it('SSO Provider must be extracted AND checked (gap or found — never ignored)', async () => {
      const report = await service.auditSpec(REGISTRATION_UML_TEXT, 'registration-uml');

      const ssoRef = report.serviceReferences.find((r) => r.name.includes('SSO'));
      const ssoGap = report.prereqGaps.find((g) => g.name.includes('SSO'));

      // SSO Provider must be either in serviceReferences or as a prereqGap
      // "Not extracted at all" is a bug — the Actors: line explicitly names SSO Provider
      const ssoDetected = !!ssoRef || !!ssoGap;
      expect(ssoDetected).toBe(true);
    });
  });

  // ── 4. Full PREREQ_GAP event shape validation ────────────────────────────

  describe('PREREQ_GAP event shape', () => {
    beforeEach(() => {
      fetchMock = mockFetchForRegistration();
    });

    it('every MISSING_FABRIC_INTERFACE gap should have correct shape', async () => {
      const report = await service.auditSpec(REGISTRATION_UML_TEXT, 'registration-uml');

      for (const gap of report.prereqGaps.filter((g) => g.type === 'MISSING_FABRIC_INTERFACE')) {
        expect(gap.type).toBe('MISSING_FABRIC_INTERFACE');
        expect(gap.sourceSpec).toBe('registration-uml');
        expect(gap.priority).toBe('BLOCKING');
        expect(gap.autonomouslyResolvable).toBe(true);
        expect(gap.detail).toContain(gap.name);
        expect(gap.name).toBeTruthy();
      }
    });
  });
});
