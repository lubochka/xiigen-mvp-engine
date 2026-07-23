#!/usr/bin/env python3
"""
Generate UI-REFLECTION-STATE.{json,md} for FLOW-37..FLOW-47.
Skeptical scoring: only mark INTERNAL_ONLY when clearly internal; default to NO_UI when no UI evidence found.
"""
import json
import os
from pathlib import Path

ROOT = Path(r"C:/Projects/xiigen mvp/.claude/worktrees/vigorous-margulis")
DOCS = ROOT / "docs" / "sessions"
GENERATED_AT = "2026-04-17"
BRANCH = "claude/vigorous-margulis"

# ---------------------------------------------------------------------------
# Per-flow process catalogues with verdict + evidence
# ---------------------------------------------------------------------------
# Each process: processId, kind, service_class, service_file (path:line),
#   taskTypeId, archetype, public_methods, events_emitted, events_consumed,
#   endpoints, ui_reflection { ... }
# ---------------------------------------------------------------------------

def state(found, evidence=None, note=None):
    d = {"found": bool(found), "evidence": evidence}
    if note:
        d["note"] = note
    return d

def ui(applicable, components, hooks, client_tests, e2e_tests, endpoint_route_hits,
       initiate, in_progress, result, error, next_step, verdict, missing):
    return {
        "applicable": applicable,
        "react_components_found": components,
        "hooks_found": hooks,
        "client_tests_found": client_tests,
        "e2e_tests_found": e2e_tests,
        "endpoint_route_hits": endpoint_route_hits,
        "state_indicators": {
            "initiate": initiate,
            "in_progress": in_progress,
            "result": result,
            "error": error,
            "next_step": next_step,
        },
        "verdict": verdict,
        "missing": missing,
    }

# -------------------------------- FLOW-37 ----------------------------------
# Two server slugs: stack-coupling (T590-T593) + design-system-governance cluster.
# Orphan UI: client/src/components/stack-coupling/* + StackPortingScreen exists
# but is NOT imported in App.tsx (no /stack-porting route). e2e exists but 404s.
flow37 = {
    "flowId": "FLOW-37",
    "slug": "design-system-governance",
    "processes": [
        {
            "processId": "T590-StackCouplingAuditor",
            "kind": "service",
            "service_class": "StackCouplingAuditor",
            "service_file": "server/src/engine/flows/stack-coupling/stack-coupling-auditor.service.ts:1",
            "taskTypeId": "T590",
            "archetype": "audit",
            "public_methods": ["auditStack"],
            "events_emitted": ["StackCouplingAudited"],
            "events_consumed": [],
            "endpoints": [],
            "ui_reflection": ui(
                applicable=True,
                components=["client/src/components/stack-coupling/StackPortingScreen.tsx",
                            "client/src/components/stack-coupling/StackCouplingBadge.tsx",
                            "client/src/components/stack-coupling/CompatibilityReportCard.tsx"],
                hooks=[],
                client_tests=["client/__tests__/components/stack-coupling.test.tsx"],
                e2e_tests=["client/e2e/stack-coupling.spec.ts"],
                endpoint_route_hits=[],
                initiate=state(False, None, "StackPortingScreen exists but NOT imported by App.tsx — no /stack-porting route"),
                in_progress=state(True, "client/src/components/stack-coupling/PortingStatusTag.tsx — status badge component"),
                result=state(True, "client/src/components/stack-coupling/CompatibilityReportCard.tsx — report card"),
                error=state(False, None, "no error UI in stack-coupling components"),
                next_step=state(False, None, "no chained action surface"),
                verdict="PARTIAL_UI",
                missing=["initiate", "error", "next_step", "route_wiring"],
            ),
        },
        {
            "processId": "T591-HybridGenesisPromptBuilder",
            "kind": "service",
            "service_class": "HybridGenesisPromptBuilder",
            "service_file": "server/src/engine/flows/stack-coupling/hybrid-genesis-prompt-builder.service.ts:1",
            "taskTypeId": "T591",
            "archetype": "build",
            "public_methods": ["buildPrompt"],
            "events_emitted": [],
            "events_consumed": ["StackCouplingAudited"],
            "endpoints": [],
            "ui_reflection": ui(
                applicable=False,
                components=[],
                hooks=[],
                client_tests=[],
                e2e_tests=[],
                endpoint_route_hits=[],
                initiate=state(False, None, "internal prompt builder — no UI surface"),
                in_progress=state(False),
                result=state(False),
                error=state(False),
                next_step=state(False),
                verdict="INTERNAL_ONLY",
                missing=[],
            ),
        },
        {
            "processId": "T592-StackCompatibilityReporter",
            "kind": "service",
            "service_class": "StackCompatibilityReporter",
            "service_file": "server/src/engine/flows/stack-coupling/stack-compatibility-reporter.service.ts:1",
            "taskTypeId": "T592",
            "archetype": "report",
            "public_methods": ["report"],
            "events_emitted": ["StackCompatibilityReportEmitted"],
            "events_consumed": [],
            "endpoints": [],
            "ui_reflection": ui(
                applicable=True,
                components=["client/src/components/stack-coupling/CompatibilityReportCard.tsx"],
                hooks=[],
                client_tests=["client/__tests__/components/stack-coupling.test.tsx"],
                e2e_tests=["client/e2e/stack-coupling.spec.ts"],
                endpoint_route_hits=[],
                initiate=state(False, None, "no initiate UI"),
                in_progress=state(False),
                result=state(True, "client/src/components/stack-coupling/CompatibilityReportCard.tsx"),
                error=state(False),
                next_step=state(False),
                verdict="PARTIAL_UI",
                missing=["initiate", "in_progress", "error", "next_step", "route_wiring"],
            ),
        },
        {
            "processId": "T593-StackPortingOrchestrator",
            "kind": "service",
            "service_class": "StackPortingOrchestrator",
            "service_file": "server/src/engine/flows/stack-coupling/stack-porting-orchestrator.service.ts:1",
            "taskTypeId": "T593",
            "archetype": "orchestrator",
            "public_methods": ["orchestrate"],
            "events_emitted": ["StackPortingOrchestrated"],
            "events_consumed": [],
            "endpoints": [],
            "ui_reflection": ui(
                applicable=True,
                components=["client/src/components/stack-coupling/StackPortingScreen.tsx",
                            "client/src/components/stack-coupling/PortingStatusTag.tsx"],
                hooks=[],
                client_tests=["client/__tests__/components/stack-coupling.test.tsx"],
                e2e_tests=["client/e2e/stack-coupling.spec.ts"],
                endpoint_route_hits=[],
                initiate=state(False, None, "StackPortingScreen exists but NOT imported by App.tsx"),
                in_progress=state(True, "client/src/components/stack-coupling/PortingStatusTag.tsx"),
                result=state(False),
                error=state(False),
                next_step=state(False),
                verdict="PARTIAL_UI",
                missing=["initiate", "result", "error", "next_step", "route_wiring"],
            ),
        },
        {
            "processId": "design-system-governance-cluster",
            "kind": "cluster",
            "service_class": "DesignSystemGovernanceCluster",
            "service_file": "server/src/engine/flows/design-system-governance/:1",
            "taskTypeId": None,
            "archetype": "cluster",
            "public_methods": [],
            "events_emitted": [],
            "events_consumed": [],
            "endpoints": [],
            "ui_reflection": ui(
                applicable=True,
                components=[],
                hooks=[],
                client_tests=[],
                e2e_tests=[],
                endpoint_route_hits=[],
                initiate=state(False, None, "27 services in directory — none reflect to React UI"),
                in_progress=state(False),
                result=state(False),
                error=state(False),
                next_step=state(False),
                verdict="NO_UI",
                missing=["initiate", "in_progress", "result", "error", "next_step"],
            ),
        },
    ],
}

# -------------------------------- FLOW-38 ----------------------------------
# rag-quality: orphan Screen exists, e2e exists; no /rag-quality route.
flow38 = {
    "flowId": "FLOW-38",
    "slug": "rag-quality-feedback",
    "processes": [
        {
            "processId": "DpoToRagPromoter",
            "kind": "service",
            "service_class": "DpoToRagPromoter",
            "service_file": "server/src/engine/flows/rag-quality-feedback/dpo-to-rag-promoter.service.ts:1",
            "taskTypeId": None,
            "archetype": "promoter",
            "public_methods": ["promote"],
            "events_emitted": ["DpoEntryPromotedToRag"],
            "events_consumed": [],
            "endpoints": [],
            "ui_reflection": ui(
                applicable=True,
                components=["client/src/components/rag-quality/RagQualityScreen.tsx",
                            "client/src/components/rag-quality/DistilledRuleCard.tsx"],
                hooks=[],
                client_tests=["client/__tests__/components/rag-quality.test.tsx"],
                e2e_tests=["client/e2e/rag-quality.spec.ts"],
                endpoint_route_hits=[],
                initiate=state(False, None, "RagQualityScreen exists but NOT imported by App.tsx — no /rag-quality route"),
                in_progress=state(False),
                result=state(True, "client/src/components/rag-quality/DistilledRuleCard.tsx"),
                error=state(False),
                next_step=state(False),
                verdict="PARTIAL_UI",
                missing=["initiate", "in_progress", "error", "next_step", "route_wiring"],
            ),
        },
        {
            "processId": "CycleOutcomeClassifier",
            "kind": "service",
            "service_class": "CycleOutcomeClassifier",
            "service_file": "server/src/engine/flows/rag-quality-feedback/cycle-outcome-classifier.service.ts:1",
            "taskTypeId": None,
            "archetype": "classifier",
            "public_methods": ["classify"],
            "events_emitted": ["CycleOutcomeClassified"],
            "events_consumed": [],
            "endpoints": [],
            "ui_reflection": ui(
                applicable=True,
                components=["client/src/components/rag-quality/CycleOutcomeTag.tsx",
                            "client/src/components/rag-quality/RagQualityScreen.tsx"],
                hooks=[],
                client_tests=["client/__tests__/components/rag-quality.test.tsx"],
                e2e_tests=["client/e2e/rag-quality.spec.ts"],
                endpoint_route_hits=[],
                initiate=state(False, None, "no initiate UI"),
                in_progress=state(False),
                result=state(True, "client/src/components/rag-quality/CycleOutcomeTag.tsx — outcome badge"),
                error=state(False),
                next_step=state(False),
                verdict="PARTIAL_UI",
                missing=["initiate", "in_progress", "error", "next_step", "route_wiring"],
            ),
        },
        {
            "processId": "DistilledRuleExtractor",
            "kind": "service",
            "service_class": "DistilledRuleExtractor",
            "service_file": "server/src/engine/flows/rag-quality-feedback/distilled-rule-extractor.service.ts:1",
            "taskTypeId": None,
            "archetype": "extractor",
            "public_methods": ["extract"],
            "events_emitted": ["DistilledRuleExtracted"],
            "events_consumed": [],
            "endpoints": [],
            "ui_reflection": ui(
                applicable=True,
                components=["client/src/components/rag-quality/DistilledRuleCard.tsx"],
                hooks=[],
                client_tests=["client/__tests__/components/rag-quality.test.tsx"],
                e2e_tests=["client/e2e/rag-quality.spec.ts"],
                endpoint_route_hits=[],
                initiate=state(False, None, "no initiate UI"),
                in_progress=state(False),
                result=state(True, "client/src/components/rag-quality/DistilledRuleCard.tsx"),
                error=state(False),
                next_step=state(False),
                verdict="PARTIAL_UI",
                missing=["initiate", "in_progress", "error", "next_step", "route_wiring"],
            ),
        },
        {
            "processId": "RagQualityUpdater",
            "kind": "service",
            "service_class": "RagQualityUpdater",
            "service_file": "server/src/engine/flows/rag-quality-feedback/rag-quality-updater.service.ts:1",
            "taskTypeId": None,
            "archetype": "updater",
            "public_methods": ["update"],
            "events_emitted": ["RagQualityScoreUpdated"],
            "events_consumed": [],
            "endpoints": [],
            "ui_reflection": ui(
                applicable=False,
                components=[],
                hooks=[],
                client_tests=[],
                e2e_tests=[],
                endpoint_route_hits=[],
                initiate=state(False, None, "internal score updater — no user-facing surface"),
                in_progress=state(False),
                result=state(False),
                error=state(False),
                next_step=state(False),
                verdict="INTERNAL_ONLY",
                missing=[],
            ),
        },
        {
            "processId": "RagQualitySeedsService",
            "kind": "service",
            "service_class": "RagQualitySeedsService",
            "service_file": "server/src/engine/flows/rag-quality-feedback/rag-quality-seeds.service.ts:1",
            "taskTypeId": None,
            "archetype": "seeder",
            "public_methods": ["seed"],
            "events_emitted": [],
            "events_consumed": [],
            "endpoints": [],
            "ui_reflection": ui(
                applicable=False,
                components=[],
                hooks=[],
                client_tests=[],
                e2e_tests=[],
                endpoint_route_hits=[],
                initiate=state(False, None, "internal bootstrap seeder — no UI"),
                in_progress=state(False),
                result=state(False),
                error=state(False),
                next_step=state(False),
                verdict="INTERNAL_ONLY",
                missing=[],
            ),
        },
    ],
}

# -------------------------------- FLOW-39 ----------------------------------
# oss-curriculum: orphan Screen exists, e2e exists; no /oss-curriculum route.
flow39 = {
    "flowId": "FLOW-39",
    "slug": "oss-curriculum",
    "processes": [
        {
            "processId": "T597-OssCurriculumOrchestrator",
            "kind": "service",
            "service_class": "OssCurriculumOrchestrator",
            "service_file": "server/src/engine/flows/oss-curriculum/oss-curriculum-orchestrator.service.ts:1",
            "taskTypeId": "T597",
            "archetype": "orchestrator",
            "public_methods": ["orchestrate"],
            "events_emitted": ["OssCurriculumStepStarted", "OssCurriculumStepCompleted"],
            "events_consumed": [],
            "endpoints": [],
            "ui_reflection": ui(
                applicable=True,
                components=["client/src/components/oss-curriculum/OssCurriculumScreen.tsx",
                            "client/src/components/oss-curriculum/CurriculumTierBadge.tsx"],
                hooks=[],
                client_tests=["client/__tests__/components/oss-curriculum.test.tsx"],
                e2e_tests=["client/e2e/oss-curriculum.spec.ts"],
                endpoint_route_hits=[],
                initiate=state(False, None, "OssCurriculumScreen exists but NOT imported by App.tsx — no /oss-curriculum route"),
                in_progress=state(True, "client/src/components/oss-curriculum/ShadowRunStatusCard.tsx — shadow run status"),
                result=state(True, "client/src/components/oss-curriculum/CurriculumTierBadge.tsx — tier badge"),
                error=state(False),
                next_step=state(False),
                verdict="PARTIAL_UI",
                missing=["initiate", "error", "next_step", "route_wiring"],
            ),
        },
        {
            "processId": "T598-OssShadowRunner",
            "kind": "service",
            "service_class": "OssShadowRunner",
            "service_file": "server/src/engine/flows/oss-curriculum/oss-shadow-runner.service.ts:1",
            "taskTypeId": "T598",
            "archetype": "runner",
            "public_methods": ["runShadow"],
            "events_emitted": ["OssShadowRunCompleted"],
            "events_consumed": [],
            "endpoints": [],
            "ui_reflection": ui(
                applicable=True,
                components=["client/src/components/oss-curriculum/ShadowRunStatusCard.tsx"],
                hooks=[],
                client_tests=["client/__tests__/components/oss-curriculum.test.tsx"],
                e2e_tests=["client/e2e/oss-curriculum.spec.ts"],
                endpoint_route_hits=[],
                initiate=state(False, None, "no initiate UI"),
                in_progress=state(True, "client/src/components/oss-curriculum/ShadowRunStatusCard.tsx"),
                result=state(True, "ShadowRunStatusCard renders status outcome"),
                error=state(False),
                next_step=state(False),
                verdict="PARTIAL_UI",
                missing=["initiate", "error", "next_step", "route_wiring"],
            ),
        },
        {
            "processId": "T599-LearningSignalAggregator",
            "kind": "service",
            "service_class": "LearningSignalAggregator",
            "service_file": "server/src/engine/flows/oss-curriculum/learning-signal-aggregator.service.ts:1",
            "taskTypeId": "T599",
            "archetype": "aggregator",
            "public_methods": ["aggregate"],
            "events_emitted": ["LearningSignalsAggregated"],
            "events_consumed": [],
            "endpoints": [],
            "ui_reflection": ui(
                applicable=True,
                components=["client/src/components/oss-curriculum/LearningSignalRow.tsx"],
                hooks=[],
                client_tests=["client/__tests__/components/oss-curriculum.test.tsx"],
                e2e_tests=["client/e2e/oss-curriculum.spec.ts"],
                endpoint_route_hits=[],
                initiate=state(False, None, "no initiate UI"),
                in_progress=state(False),
                result=state(True, "client/src/components/oss-curriculum/LearningSignalRow.tsx"),
                error=state(False),
                next_step=state(False),
                verdict="PARTIAL_UI",
                missing=["initiate", "in_progress", "error", "next_step", "route_wiring"],
            ),
        },
        {
            "processId": "T600-DpoCorpusBuilder",
            "kind": "service",
            "service_class": "DpoCorpusBuilder",
            "service_file": "server/src/engine/flows/oss-curriculum/dpo-corpus-builder.service.ts:1",
            "taskTypeId": "T600",
            "archetype": "builder",
            "public_methods": ["buildCorpus"],
            "events_emitted": ["DpoCorpusBuilt"],
            "events_consumed": [],
            "endpoints": [],
            "ui_reflection": ui(
                applicable=False,
                components=[],
                hooks=[],
                client_tests=[],
                e2e_tests=[],
                endpoint_route_hits=[],
                initiate=state(False, None, "internal corpus builder — no UI"),
                in_progress=state(False),
                result=state(False),
                error=state(False),
                next_step=state(False),
                verdict="INTERNAL_ONLY",
                missing=[],
            ),
        },
    ],
}

# -------------------------------- FLOW-40 ----------------------------------
# client-push: orphan Screen exists, e2e exists; no /client-push route.
flow40 = {
    "flowId": "FLOW-40",
    "slug": "client-push",
    "processes": [
        {
            "processId": "T587-ClientPushSseGateway",
            "kind": "service",
            "service_class": "ClientPushSseGateway",
            "service_file": "server/src/engine/flows/client-push/client-push-sse-gateway.service.ts:1",
            "taskTypeId": "T587",
            "archetype": "gateway",
            "public_methods": ["openStream"],
            "events_emitted": ["SseClientConnected"],
            "events_consumed": [],
            "endpoints": ["GET /api/client-push/stream"],
            "ui_reflection": ui(
                applicable=True,
                components=["client/src/components/client-push/ClientPushScreen.tsx",
                            "client/src/components/client-push/SseConnectionStatusBadge.tsx"],
                hooks=[],
                client_tests=["client/__tests__/components/client-push.test.tsx"],
                e2e_tests=["client/e2e/client-push.spec.ts"],
                endpoint_route_hits=[],
                initiate=state(False, None, "ClientPushScreen exists but NOT imported by App.tsx — no /client-push route"),
                in_progress=state(True, "client/src/components/client-push/SseConnectionStatusBadge.tsx — connection state"),
                result=state(True, "client/src/components/client-push/EventDeliveryTag.tsx — delivery confirm"),
                error=state(False, None, "no error surface in client-push components"),
                next_step=state(False),
                verdict="PARTIAL_UI",
                missing=["initiate", "error", "next_step", "route_wiring"],
            ),
        },
        {
            "processId": "T588-ClientPushKeepalive",
            "kind": "service",
            "service_class": "ClientPushKeepalive",
            "service_file": "server/src/engine/flows/client-push/client-push-keepalive.service.ts:1",
            "taskTypeId": "T588",
            "archetype": "keepalive",
            "public_methods": ["tick"],
            "events_emitted": ["SseKeepaliveSent"],
            "events_consumed": [],
            "endpoints": [],
            "ui_reflection": ui(
                applicable=True,
                components=["client/src/components/client-push/KeepaliveStatusRow.tsx"],
                hooks=[],
                client_tests=["client/__tests__/components/client-push.test.tsx"],
                e2e_tests=["client/e2e/client-push.spec.ts"],
                endpoint_route_hits=[],
                initiate=state(False, None, "no initiate UI"),
                in_progress=state(True, "client/src/components/client-push/KeepaliveStatusRow.tsx"),
                result=state(True, "KeepaliveStatusRow renders last-tick timestamp"),
                error=state(False),
                next_step=state(False),
                verdict="PARTIAL_UI",
                missing=["initiate", "error", "next_step", "route_wiring"],
            ),
        },
        {
            "processId": "T589-ClientPushEventDispatcher",
            "kind": "service",
            "service_class": "ClientPushEventDispatcher",
            "service_file": "server/src/engine/flows/client-push/client-push-event-dispatcher.service.ts:1",
            "taskTypeId": "T589",
            "archetype": "dispatcher",
            "public_methods": ["dispatch"],
            "events_emitted": ["SseEventDispatched"],
            "events_consumed": ["CloudEventReceived"],
            "endpoints": [],
            "ui_reflection": ui(
                applicable=True,
                components=["client/src/components/client-push/EventDeliveryTag.tsx"],
                hooks=[],
                client_tests=["client/__tests__/components/client-push.test.tsx"],
                e2e_tests=["client/e2e/client-push.spec.ts"],
                endpoint_route_hits=[],
                initiate=state(False, None, "no initiate UI"),
                in_progress=state(False),
                result=state(True, "client/src/components/client-push/EventDeliveryTag.tsx"),
                error=state(False),
                next_step=state(False),
                verdict="PARTIAL_UI",
                missing=["initiate", "in_progress", "error", "next_step", "route_wiring"],
            ),
        },
    ],
}

# -------------------------- FLOW-41/42/43/44 -------------------------------
# All EXTERNAL_REPO adapters — no XIIGen server impl, no UI.
def external_adapter(flow_id, slug, adapter_name):
    return {
        "flowId": flow_id,
        "slug": slug,
        "processes": [
            {
                "processId": f"{adapter_name}Adapter",
                "kind": "external_adapter",
                "service_class": f"{adapter_name}Adapter",
                "service_file": f"docs/sessions/{flow_id}/{flow_id}-IMPL-STATE.json:1",
                "taskTypeId": None,
                "archetype": "external_repo_adapter",
                "public_methods": [],
                "events_emitted": [],
                "events_consumed": [],
                "endpoints": [],
                "ui_reflection": ui(
                    applicable=False,
                    components=[],
                    hooks=[],
                    client_tests=[],
                    e2e_tests=[],
                    endpoint_route_hits=[],
                    initiate=state(False, None, "EXTERNAL_REPO — adapter lives in vendor SDK, no XIIGen UI"),
                    in_progress=state(False),
                    result=state(False),
                    error=state(False),
                    next_step=state(False),
                    verdict="INTERNAL_ONLY",
                    missing=[],
                ),
            }
        ],
    }

flow41 = external_adapter("FLOW-41", "canva-adapter", "Canva")
flow42 = external_adapter("FLOW-42", "miro-adapter", "Miro")
flow43 = external_adapter("FLOW-43", "webflow-adapter", "Webflow")
flow44 = external_adapter("FLOW-44", "framer-adapter", "Framer")

# -------------------------------- FLOW-45 ----------------------------------
# history-bootstrap: orphan Screen exists, e2e exists; no route.
flow45 = {
    "flowId": "FLOW-45",
    "slug": "history-bootstrap",
    "processes": [
        {
            "processId": "T602-HistoryBootstrapSeeder",
            "kind": "service",
            "service_class": "HistoryBootstrapSeeder",
            "service_file": "server/src/engine/flows/history-bootstrap/history-bootstrap-seeder.service.ts:1",
            "taskTypeId": "T602",
            "archetype": "seeder",
            "public_methods": ["seed"],
            "events_emitted": ["HistoryBootstrapSeeded"],
            "events_consumed": [],
            "endpoints": [],
            "ui_reflection": ui(
                applicable=True,
                components=["client/src/components/history-bootstrap/HistoryBootstrapScreen.tsx",
                            "client/src/components/history-bootstrap/BootstrapStatusBadge.tsx"],
                hooks=["client/src/hooks/useBootstrapStatus.ts"],
                client_tests=["client/__tests__/components/history-bootstrap.test.tsx"],
                e2e_tests=["client/e2e/history-bootstrap.spec.ts"],
                endpoint_route_hits=[],
                initiate=state(False, None, "HistoryBootstrapScreen exists but NOT imported by App.tsx — no /history-bootstrap route"),
                in_progress=state(True, "client/src/components/history-bootstrap/BootstrapStatusBadge.tsx — status badge"),
                result=state(True, "client/src/components/history-bootstrap/PhilosophySummaryRow.tsx — summary row"),
                error=state(False),
                next_step=state(False),
                verdict="PARTIAL_UI",
                missing=["initiate", "error", "next_step", "route_wiring"],
            ),
        },
        {
            "processId": "T603-ArchPatternIngester",
            "kind": "service",
            "service_class": "ArchPatternIngester",
            "service_file": "server/src/engine/flows/history-bootstrap/arch-pattern-ingester.service.ts:1",
            "taskTypeId": "T603",
            "archetype": "ingester",
            "public_methods": ["ingest"],
            "events_emitted": ["ArchPatternIngested"],
            "events_consumed": [],
            "endpoints": [],
            "ui_reflection": ui(
                applicable=True,
                components=["client/src/components/history-bootstrap/ArchPatternCard.tsx"],
                hooks=[],
                client_tests=["client/__tests__/components/history-bootstrap.test.tsx"],
                e2e_tests=["client/e2e/history-bootstrap.spec.ts"],
                endpoint_route_hits=[],
                initiate=state(False, None, "no initiate UI"),
                in_progress=state(False),
                result=state(True, "client/src/components/history-bootstrap/ArchPatternCard.tsx"),
                error=state(False),
                next_step=state(False),
                verdict="PARTIAL_UI",
                missing=["initiate", "in_progress", "error", "next_step", "route_wiring"],
            ),
        },
        {
            "processId": "T604-PhilosophyDigestor",
            "kind": "service",
            "service_class": "PhilosophyDigestor",
            "service_file": "server/src/engine/flows/history-bootstrap/philosophy-digestor.service.ts:1",
            "taskTypeId": "T604",
            "archetype": "digestor",
            "public_methods": ["digest"],
            "events_emitted": ["PhilosophyDigested"],
            "events_consumed": [],
            "endpoints": [],
            "ui_reflection": ui(
                applicable=True,
                components=["client/src/components/history-bootstrap/PhilosophySummaryRow.tsx"],
                hooks=[],
                client_tests=["client/__tests__/components/history-bootstrap.test.tsx"],
                e2e_tests=["client/e2e/history-bootstrap.spec.ts"],
                endpoint_route_hits=[],
                initiate=state(False, None, "no initiate UI"),
                in_progress=state(False),
                result=state(True, "client/src/components/history-bootstrap/PhilosophySummaryRow.tsx"),
                error=state(False),
                next_step=state(False),
                verdict="PARTIAL_UI",
                missing=["initiate", "in_progress", "error", "next_step", "route_wiring"],
            ),
        },
    ],
}

# -------------------------------- FLOW-46 ----------------------------------
# platform-agent: ChatPage at /chat is FULL; AgentSessionsPanel within Tenants.
flow46 = {
    "flowId": "FLOW-46",
    "slug": "platform-agent",
    "processes": [
        {
            "processId": "T650-AgentSessionService",
            "kind": "service",
            "service_class": "AgentSessionService",
            "service_file": "server/src/engine/flows/platform-agent/agent-session.service.ts:1",
            "taskTypeId": "T650",
            "archetype": "session",
            "public_methods": ["startSession", "completeSession"],
            "events_emitted": ["AgentSessionStarted", "AgentSessionCompleted"],
            "events_consumed": [],
            "endpoints": ["POST /api/platform-agent/sessions", "GET /api/platform-agent/sessions"],
            "ui_reflection": ui(
                applicable=True,
                components=["client/src/pages/ChatPage.tsx",
                            "client/src/pages/TenantsPage.tsx"],
                hooks=["client/src/hooks/useAgentSession.ts",
                       "client/src/hooks/useAgentSessions.ts"],
                client_tests=["client/__tests__/flows/platform-agent/agent-chat.test.tsx"],
                e2e_tests=["client/e2e/platform-agent-teaching-pipeline.spec.ts"],
                endpoint_route_hits=["/chat"],
                initiate=state(True, "client/src/pages/ChatPage.tsx:44 — <form onSubmit={onSubmit}> + chat-submit button"),
                in_progress=state(True, "client/src/pages/ChatPage.tsx:62 — status === 'SUBMITTING' renders 'Running…'"),
                result=state(True, "client/src/pages/ChatPage.tsx:81 — session && <div data-testid='chat-session'> + super-judge-verdict pill"),
                error=state(True, "client/src/pages/ChatPage.tsx:75 — error && <div data-testid='chat-error'>"),
                next_step=state(True, "client/src/pages/ChatPage.tsx:107 — session.actions.map → ActionCard with each proposed next step"),
                verdict="FULL_UI",
                missing=[],
            ),
        },
        {
            "processId": "T651-AgentIntakeService",
            "kind": "service",
            "service_class": "AgentIntakeService",
            "service_file": "server/src/engine/flows/platform-agent/agent-intake.service.ts:1",
            "taskTypeId": "T651",
            "archetype": "intake",
            "public_methods": ["normalizeIntent"],
            "events_emitted": [],
            "events_consumed": ["AgentSessionStarted"],
            "endpoints": [],
            "ui_reflection": ui(
                applicable=False,
                components=[],
                hooks=[],
                client_tests=[],
                e2e_tests=[],
                endpoint_route_hits=[],
                initiate=state(False, None, "internal intent normalizer — no UI"),
                in_progress=state(False),
                result=state(False),
                error=state(False),
                next_step=state(False),
                verdict="INTERNAL_ONLY",
                missing=[],
            ),
        },
        {
            "processId": "T652-AgentRetrievalService",
            "kind": "service",
            "service_class": "AgentRetrievalService",
            "service_file": "server/src/engine/flows/platform-agent/agent-retrieval.service.ts:1",
            "taskTypeId": "T652",
            "archetype": "retrieval",
            "public_methods": ["retrieveContext"],
            "events_emitted": [],
            "events_consumed": [],
            "endpoints": [],
            "ui_reflection": ui(
                applicable=False,
                components=[],
                hooks=[],
                client_tests=[],
                e2e_tests=[],
                endpoint_route_hits=[],
                initiate=state(False, None, "internal RAG retrieval — no UI"),
                in_progress=state(False),
                result=state(False),
                error=state(False),
                next_step=state(False),
                verdict="INTERNAL_ONLY",
                missing=[],
            ),
        },
        {
            "processId": "T653-AgentDecisionService",
            "kind": "service",
            "service_class": "AgentDecisionService",
            "service_file": "server/src/engine/flows/platform-agent/agent-decision.service.ts:1",
            "taskTypeId": "T653",
            "archetype": "decision",
            "public_methods": ["decide"],
            "events_emitted": ["AgentDecisionRendered"],
            "events_consumed": [],
            "endpoints": [],
            "ui_reflection": ui(
                applicable=True,
                components=["client/src/pages/ChatPage.tsx"],
                hooks=["client/src/hooks/useAgentSession.ts"],
                client_tests=["client/__tests__/flows/platform-agent/agent-chat.test.tsx"],
                e2e_tests=["client/e2e/platform-agent-teaching-pipeline.spec.ts"],
                endpoint_route_hits=["/chat"],
                initiate=state(False, None, "decisions render in result block — no separate initiate"),
                in_progress=state(False),
                result=state(True, "client/src/pages/ChatPage.tsx:86 — <span data-testid='super-judge-verdict'>{session.superJudgeVerdict}</span>"),
                error=state(False),
                next_step=state(False),
                verdict="PARTIAL_UI",
                missing=["initiate", "in_progress", "error", "next_step"],
            ),
        },
        {
            "processId": "T654-AgentActionService",
            "kind": "service",
            "service_class": "AgentActionService",
            "service_file": "server/src/engine/flows/platform-agent/agent-action.service.ts:1",
            "taskTypeId": "T654",
            "archetype": "action",
            "public_methods": ["emitAction"],
            "events_emitted": ["AgentActionEmitted"],
            "events_consumed": ["AgentDecisionRendered"],
            "endpoints": [],
            "ui_reflection": ui(
                applicable=True,
                components=["client/src/pages/ChatPage.tsx",
                            "client/src/components/platform-agent/ActionCard.tsx"],
                hooks=["client/src/hooks/useAgentSession.ts"],
                client_tests=["client/__tests__/flows/platform-agent/agent-chat.test.tsx"],
                e2e_tests=["client/e2e/platform-agent-teaching-pipeline.spec.ts"],
                endpoint_route_hits=["/chat"],
                initiate=state(False, None, "no initiate — actions are emitted server-side"),
                in_progress=state(False),
                result=state(True, "client/src/components/platform-agent/ActionCard.tsx — renders ADVISE/PROPOSE_EDIT/CREATE_FLOW/APPLY_GLOBAL"),
                error=state(False),
                next_step=state(True, "client/src/pages/ChatPage.tsx:107 — session.actions.map → action-list"),
                verdict="PARTIAL_UI",
                missing=["initiate", "in_progress", "error"],
            ),
        },
        {
            "processId": "T655-AgentLearningService",
            "kind": "service",
            "service_class": "AgentLearningService",
            "service_file": "server/src/engine/flows/platform-agent/agent-learning.service.ts:1",
            "taskTypeId": "T655",
            "archetype": "learning",
            "public_methods": ["recordContribution"],
            "events_emitted": ["AgentContributionRecorded"],
            "events_consumed": ["AgentActionEmitted"],
            "endpoints": [],
            "ui_reflection": ui(
                applicable=False,
                components=[],
                hooks=[],
                client_tests=[],
                e2e_tests=[],
                endpoint_route_hits=[],
                initiate=state(False, None, "internal learning loop — no UI"),
                in_progress=state(False),
                result=state(False),
                error=state(False),
                next_step=state(False),
                verdict="INTERNAL_ONLY",
                missing=[],
            ),
        },
        {
            "processId": "T656-AgentChatClient",
            "kind": "client_surface",
            "service_class": "AgentChatClient",
            "service_file": "client/src/pages/ChatPage.tsx:20",
            "taskTypeId": "T656",
            "archetype": "client_surface",
            "public_methods": [],
            "events_emitted": [],
            "events_consumed": [],
            "endpoints": [],
            "ui_reflection": ui(
                applicable=True,
                components=["client/src/pages/ChatPage.tsx",
                            "client/src/components/platform-agent/ActionCard.tsx",
                            "client/src/pages/TenantsPage.tsx"],
                hooks=["client/src/hooks/useAgentSession.ts",
                       "client/src/hooks/useAgentSessions.ts"],
                client_tests=["client/__tests__/flows/platform-agent/agent-chat.test.tsx"],
                e2e_tests=["client/e2e/platform-agent-teaching-pipeline.spec.ts"],
                endpoint_route_hits=["/chat", "/tenants"],
                initiate=state(True, "client/src/pages/ChatPage.tsx:44 — form onSubmit + chat-submit button (data-testid='chat-submit')"),
                in_progress=state(True, "client/src/pages/ChatPage.tsx:62 — status === 'SUBMITTING' shows 'Running…'"),
                result=state(True, "client/src/pages/ChatPage.tsx:81 — session && session block + super-judge-verdict pill + action-list"),
                error=state(True, "client/src/pages/ChatPage.tsx:75 — error && <div data-testid='chat-error'>{error}</div>"),
                next_step=state(True, "client/src/pages/ChatPage.tsx:107 — session.actions.map → <ActionCard> per proposed next step"),
                verdict="FULL_UI",
                missing=[],
            ),
        },
    ],
}

# -------------------------------- FLOW-47 ----------------------------------
# Module-lifecycle: MarketplacePage (T658) is FULL_UI; TenantProvisioningPage
# (T661) is PARTIAL_UI (stubbed setTimeout); T657/T659/T660/T662/T663/T664 internal.
flow47 = {
    "flowId": "FLOW-47",
    "slug": "module-lifecycle",
    "processes": [
        {
            "processId": "T657-BootstrapSeedingService",
            "kind": "service",
            "service_class": "BootstrapSeedingService",
            "service_file": "server/src/engine/flows/module-lifecycle/bootstrap-seeding.service.ts:1",
            "taskTypeId": "T657",
            "archetype": "seeder",
            "public_methods": ["seed"],
            "events_emitted": ["BootstrapSeeded"],
            "events_consumed": [],
            "endpoints": [],
            "ui_reflection": ui(
                applicable=False,
                components=[],
                hooks=[],
                client_tests=[],
                e2e_tests=[],
                endpoint_route_hits=[],
                initiate=state(False, None, "internal bootstrap seeder — no UI"),
                in_progress=state(False),
                result=state(False),
                error=state(False),
                next_step=state(False),
                verdict="INTERNAL_ONLY",
                missing=[],
            ),
        },
        {
            "processId": "T658-MarketplacePackageService",
            "kind": "service",
            "service_class": "MarketplacePackageService",
            "service_file": "server/src/engine/flows/module-lifecycle/marketplace-package.service.ts:1",
            "taskTypeId": "T658",
            "archetype": "marketplace",
            "public_methods": ["listPackages", "installPackage"],
            "events_emitted": ["PackageInstalled"],
            "events_consumed": [],
            "endpoints": ["GET /api/marketplace/packages", "POST /api/marketplace/packages/:id/install"],
            "ui_reflection": ui(
                applicable=True,
                components=["client/src/pages/MarketplacePage.tsx"],
                hooks=["client/src/hooks/useMarketplace.ts"],
                client_tests=[],
                e2e_tests=[],
                endpoint_route_hits=["/marketplace"],
                initiate=state(True, "client/src/pages/MarketplacePage.tsx — install button per package row"),
                in_progress=state(True, "client/src/pages/MarketplacePage.tsx — installing state during POST install"),
                result=state(True, "client/src/pages/MarketplacePage.tsx — packages table + post-install navigate('/flow-library')"),
                error=state(True, "client/src/pages/MarketplacePage.tsx — error display from useMarketplace hook"),
                next_step=state(True, "client/src/pages/MarketplacePage.tsx — navigates to /flow-library after install"),
                verdict="FULL_UI",
                missing=[],
            ),
        },
        {
            "processId": "T659-DesignTimeSnapshotService",
            "kind": "service",
            "service_class": "DesignTimeSnapshotService",
            "service_file": "server/src/engine/flows/module-lifecycle/design-time-snapshot.service.ts:1",
            "taskTypeId": "T659",
            "archetype": "snapshot",
            "public_methods": ["snapshot", "getSnapshot"],
            "events_emitted": ["DesignTimeSnapshotCreated"],
            "events_consumed": [],
            "endpoints": ["POST /api/snapshots", "GET /api/snapshots/:id"],
            "ui_reflection": ui(
                applicable=True,
                components=[],
                hooks=[],
                client_tests=[],
                e2e_tests=[],
                endpoint_route_hits=[],
                initiate=state(False, None, "no React UI for snapshot create"),
                in_progress=state(False),
                result=state(False, None, "FLOW-47/SNAPSHOTS/ folder exists in docs but no PNG/component proof"),
                error=state(False),
                next_step=state(False),
                verdict="NO_UI",
                missing=["initiate", "in_progress", "result", "error", "next_step"],
            ),
        },
        {
            "processId": "T660-PortabilityReportService",
            "kind": "service",
            "service_class": "PortabilityReportService",
            "service_file": "server/src/engine/flows/module-lifecycle/portability-report.service.ts:1",
            "taskTypeId": "T660",
            "archetype": "report",
            "public_methods": ["generateReport"],
            "events_emitted": ["PortabilityReportGenerated"],
            "events_consumed": [],
            "endpoints": ["GET /api/portability/report/:tenantId"],
            "ui_reflection": ui(
                applicable=True,
                components=[],
                hooks=[],
                client_tests=[],
                e2e_tests=[],
                endpoint_route_hits=[],
                initiate=state(False, None, "no React UI for portability report"),
                in_progress=state(False),
                result=state(False),
                error=state(False),
                next_step=state(False),
                verdict="NO_UI",
                missing=["initiate", "in_progress", "result", "error", "next_step"],
            ),
        },
        {
            "processId": "T661-TenantProvisioningController",
            "kind": "service",
            "service_class": "TenantProvisioningController",
            "service_file": "server/src/api/tenant-provisioning.controller.ts:1",
            "taskTypeId": "T661",
            "archetype": "controller",
            "public_methods": ["provisionTenant"],
            "events_emitted": ["TenantProvisioned"],
            "events_consumed": [],
            "endpoints": ["POST /api/tenants/provision"],
            "ui_reflection": ui(
                applicable=True,
                components=["client/src/pages/saas-multi-tenancy/TenantProvisioningPage.tsx"],
                hooks=[],
                client_tests=[],
                e2e_tests=[],
                endpoint_route_hits=[],
                initiate=state(True, "client/src/pages/saas-multi-tenancy/TenantProvisioningPage.tsx — provision button"),
                in_progress=state(True, "TenantProvisioningPage status='loading' state"),
                result=state(True, "TenantProvisioningPage status='success' state"),
                error=state(True, "TenantProvisioningPage status='error' state"),
                next_step=state(False, None, "stubbed setTimeout(300) — does NOT call /api/tenants/provision; no real next step"),
                verdict="PARTIAL_UI",
                missing=["next_step", "real_api_call"],
            ),
        },
        {
            "processId": "T662-CycleChainE2EService",
            "kind": "service",
            "service_class": "CycleChainE2EService",
            "service_file": "server/src/engine/flows/module-lifecycle/cycle-chain-e2e.service.ts:1",
            "taskTypeId": "T662",
            "archetype": "test_orchestrator",
            "public_methods": ["runChain"],
            "events_emitted": [],
            "events_consumed": [],
            "endpoints": [],
            "ui_reflection": ui(
                applicable=False,
                components=[],
                hooks=[],
                client_tests=[],
                e2e_tests=[],
                endpoint_route_hits=[],
                initiate=state(False, None, "internal e2e harness — no UI"),
                in_progress=state(False),
                result=state(False),
                error=state(False),
                next_step=state(False),
                verdict="INTERNAL_ONLY",
                missing=[],
            ),
        },
        {
            "processId": "T663-CanonicalTopologyBackfill",
            "kind": "service",
            "service_class": "CanonicalTopologyBackfill",
            "service_file": "server/src/engine/flows/module-lifecycle/canonical-topology-backfill.service.ts:1",
            "taskTypeId": "T663",
            "archetype": "backfill",
            "public_methods": ["backfill"],
            "events_emitted": [],
            "events_consumed": [],
            "endpoints": [],
            "ui_reflection": ui(
                applicable=False,
                components=[],
                hooks=[],
                client_tests=[],
                e2e_tests=[],
                endpoint_route_hits=[],
                initiate=state(False, None, "internal backfill — no UI"),
                in_progress=state(False),
                result=state(False),
                error=state(False),
                next_step=state(False),
                verdict="INTERNAL_ONLY",
                missing=[],
            ),
        },
        {
            "processId": "T664-FixtureRoutingExtender",
            "kind": "service",
            "service_class": "FixtureRoutingExtender",
            "service_file": "server/src/engine/flows/module-lifecycle/fixture-routing-extender.service.ts:1",
            "taskTypeId": "T664",
            "archetype": "extender",
            "public_methods": ["extend"],
            "events_emitted": [],
            "events_consumed": [],
            "endpoints": [],
            "ui_reflection": ui(
                applicable=False,
                components=[],
                hooks=[],
                client_tests=[],
                e2e_tests=[],
                endpoint_route_hits=[],
                initiate=state(False, None, "internal fixture routing — no UI"),
                in_progress=state(False),
                result=state(False),
                error=state(False),
                next_step=state(False),
                verdict="INTERNAL_ONLY",
                missing=[],
            ),
        },
    ],
}

ALL_FLOWS = [flow37, flow38, flow39, flow40, flow41, flow42, flow43, flow44, flow45, flow46, flow47]

# ---------------------------------------------------------------------------
# Verdict counter + writer
# ---------------------------------------------------------------------------
def summarize(processes):
    counts = {"FULL_UI": 0, "PARTIAL_UI": 0, "NO_UI": 0, "INTERNAL_ONLY": 0, "EVENT_ONLY_NO_OBSERVER": 0}
    for p in processes:
        counts[p["ui_reflection"]["verdict"]] += 1
    return {"total_processes": len(processes), "verdict_counts": counts}

def write_json(flow):
    out_dir = DOCS / flow["flowId"]
    out_dir.mkdir(parents=True, exist_ok=True)
    payload = {
        "flowId": flow["flowId"],
        "slug": flow["slug"],
        "generated_at": GENERATED_AT,
        "branch": BRANCH,
        "summary": summarize(flow["processes"]),
        "processes": flow["processes"],
    }
    out_path = out_dir / "UI-REFLECTION-STATE.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    return out_path

def write_md(flow):
    out_dir = DOCS / flow["flowId"]
    out_dir.mkdir(parents=True, exist_ok=True)
    s = summarize(flow["processes"])
    vc = s["verdict_counts"]

    lines = []
    lines.append(f"# {flow['flowId']} {flow['slug']} - UI Reflection State")
    lines.append("")
    lines.append(f"_Generated: {GENERATED_AT} | Branch: {BRANCH}_")
    lines.append("")
    lines.append("## Summary")
    lines.append(f"- Total processes: {s['total_processes']}")
    lines.append(f"- FULL_UI: {vc['FULL_UI']} | PARTIAL_UI: {vc['PARTIAL_UI']} | NO_UI: {vc['NO_UI']} | "
                 f"INTERNAL_ONLY: {vc['INTERNAL_ONLY']} | EVENT_ONLY_NO_OBSERVER: {vc['EVENT_ONLY_NO_OBSERVER']}")
    lines.append("")
    lines.append("## Per-Process Verdict Table")
    lines.append("")
    lines.append("| processId | initiate | in_progress | result | error | next_step | verdict | missing |")
    lines.append("|-----------|----------|-------------|--------|-------|-----------|---------|---------|")
    def y(found):
        return "Y" if found else "."
    for p in flow["processes"]:
        si = p["ui_reflection"]["state_indicators"]
        verdict = p["ui_reflection"]["verdict"]
        missing = ", ".join(p["ui_reflection"]["missing"]) if p["ui_reflection"]["missing"] else "-"
        lines.append(
            f"| {p['processId']} | {y(si['initiate']['found'])} | {y(si['in_progress']['found'])} | "
            f"{y(si['result']['found'])} | {y(si['error']['found'])} | {y(si['next_step']['found'])} | "
            f"{verdict} | {missing} |"
        )
    lines.append("")
    lines.append("## Process Details")
    lines.append("")
    for p in flow["processes"]:
        ur = p["ui_reflection"]
        lines.append(f"### {p['processId']} ({p['service_class']})")
        lines.append(f"- File: `{p['service_file']}`")
        if p["events_emitted"]:
            lines.append(f"- Events emitted: {', '.join(p['events_emitted'])}")
        if p["events_consumed"]:
            lines.append(f"- Events consumed: {', '.join(p['events_consumed'])}")
        if p["endpoints"]:
            lines.append(f"- Endpoints: {', '.join(p['endpoints'])}")
        lines.append(f"- React components: {', '.join(ur['react_components_found']) or '_none_'}")
        lines.append(f"- Hooks: {', '.join(ur['hooks_found']) or '_none_'}")
        lines.append(f"- Client tests: {', '.join(ur['client_tests_found']) or '_none_'}")
        lines.append(f"- E2E tests: {', '.join(ur['e2e_tests_found']) or '_none_'}")
        lines.append("- State indicators:")
        for state_name in ("initiate", "in_progress", "result", "error", "next_step"):
            sd = ur["state_indicators"][state_name]
            if sd["found"]:
                lines.append(f"  - **{state_name}**: YES - {sd['evidence']}")
            else:
                note = sd.get("note")
                if note:
                    lines.append(f"  - **{state_name}**: no ({note})")
                else:
                    lines.append(f"  - **{state_name}**: no")
        lines.append(f"- **Verdict**: {ur['verdict']}")
        if ur["missing"]:
            lines.append(f"- Missing: {', '.join(ur['missing'])}")
        lines.append("")
    out_path = out_dir / "UI-REFLECTION-STATE.md"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return out_path

# ---------------------------------------------------------------------------
# Drive
# ---------------------------------------------------------------------------
totals = {"FULL_UI": 0, "PARTIAL_UI": 0, "NO_UI": 0, "INTERNAL_ONLY": 0, "EVENT_ONLY_NO_OBSERVER": 0}
total_processes = 0
per_flow_summary = []

for flow in ALL_FLOWS:
    j = write_json(flow)
    m = write_md(flow)
    s = summarize(flow["processes"])
    total_processes += s["total_processes"]
    for k in totals:
        totals[k] += s["verdict_counts"][k]
    per_flow_summary.append((flow["flowId"], flow["slug"], s["total_processes"], s["verdict_counts"]))
    print(f"WROTE {j.name} + {m.name} for {flow['flowId']} ({flow['slug']}): {s['total_processes']} processes")

print()
print(f"TOTAL processes scored: {total_processes}")
print(f"TOTALS: {totals}")
print()
print("PER-FLOW:")
for fid, slug, n, vc in per_flow_summary:
    print(f"  {fid} {slug}: total={n} FULL={vc['FULL_UI']} PARTIAL={vc['PARTIAL_UI']} NO_UI={vc['NO_UI']} INTERNAL={vc['INTERNAL_ONLY']}")
