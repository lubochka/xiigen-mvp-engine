<!--
  Source: business flows.zip / 25 - Business flow arbitr.md
  Canonical since: 2026-04-22
  Canonical flow: FLOW-25 bfa-cross-flow-governance
  Related deep-research: docs/business-flows/_deep-research/bfa-cross-flow-governance/ (if present)
  Related legacy engine artifacts: docs/business-flows/_legacy-engine-artifacts/bfa-cross-flow-governance/ (if present)
-->

We would like to be able add an "business flow" arbitr that validates the code changes do not apply on othe business logic, which was defined previously. It need to look in relevant flows, documentation, database entities

Examples: some flow add a deletion or edit of entity that participates in other flow \- we need to check 1\. we do not break the business logic

2\. If we do \- we need to request the user what to do about that and explain which processes will be affected and how

## To implement a **Business Flow Arbiter** that prevents code changes from breaking existing business logic across your system, we need to introduce a dedicated "Impact Analysis" validation step into your orchestration pipeline.

## Based on the architecture of the **Multimodel Orchestrator** (specifically utilizing your existing 09-flow-orchestrator, 16-ai-context-service, and 07-ai-dispatcher), here is the architectural design and workflow for adding this arbiter.

### **1\. Architectural Integration**

## The Business Flow Arbiter acts as a "Gatekeeper Node" in your execution DAG (Directed Acyclic Graph) before any code is finalized or deployed.

* ## **Context Aggregation (16-ai-context-service & 00-rag-interfaces):** When a change is proposed (e.g., modifying an entity), the Context Service queries the vector database (Elasticsearch/Pinecone) and your 08-flow-definition registry. It retrieves all existing flows, documentation, and database schemas that reference the modified entity.

* ## **Impact Analysis Engine (07-ai-dispatcher & 12-ai-review):** The proposed changes are packaged alongside the retrieved context and sent to an LLM. The LLM is specifically prompted to act as an architect, looking for logical collisions, broken dependencies, or state changes that invalidate existing flows.

* ## **Human-in-the-Loop Orchestration (09-flow-orchestrator & Interactive UI):** If the LLM flags a high-severity impact, the Orchestrator pauses the execution thread (yielding the state) and routes an interactive prompt to the user (via the CLI, Web Editor, or Chat Service) explaining the conflict and requesting a resolution.

### **2\. The Arbiter Workflow (Example: Entity Deletion)**

## Let's trace your exact example: A developer (or AI agent) proposes a flow that deletes or heavily edits a UserProfile entity, but that entity is currently participating in the 06-marketplace-listing-flow.json.

## **Step 1: Change Detection & Context Gathering**

## The Arbiter detects a CRUD operation on UserProfile. It automatically pulls:

* ## The new proposed code/schema.

* ## Existing database schema for UserProfile.

* ## The JSON flow definitions and documentation for 06-marketplace-listing-flow and any other flows relying on that entity.

## **Step 2: AI Validation (The Arbiter Prompt)**

## The AiDispatcher runs a specialized evaluation prompt:

## *"You are a Business Logic Arbiter. A change is being proposed that modifies the UserProfile entity. Review the provided context of existing system flows and documentation. Determine if this modification breaks existing business rules, causes missing data dependencies, or invalidates other flows. If it breaks existing logic, output a detailed impact report."*

## **Step 3: Conflict Detection & Resolution Request**

## The AI detects that deleting UserProfile.BillingAddress will break the marketplace checkout flow. The FlowOrchestrator transitions to a PendingUserResolution state and sends the following to the user:

## ⚠️ **Business Logic Conflict Detected**

## **Proposed Change:** Deletion of BillingAddress from UserProfile.

## **Impacted Processes:** \> 1\. Marketplace Checkout Flow: Relies on BillingAddress for tax calculation.

## 2\. Subscription Renewal Flow: Requires BillingAddress for monthly invoicing.

## **How would you like to proceed?**

## \[A\] **Refactor dependent flows:** Automatically update Marketplace and Subscription flows to use the new PaymentMethod entity instead.

## \[B\] **Reject the change:** Cancel this modification and keep BillingAddress on the UserProfile.

## \[C\] **Modify the proposal:** Keep BillingAddress but mark it as \[Obsolete\] for backward compatibility.

## \[D\] **Force proceed:** I know what I'm doing, apply the change anyway.

### **3\. Implementation Strategy**

## To add this to your current codebase, you should create a new service interface (or add to your AiReviewService):

## C\#

## public interface IBusinessFlowArbiter

## {

##     // 1\. Analyze the proposed change against global context

##     Task\<ArbiterResult\> AnalyzeImpactAsync(ProposedChange change, OrchestratorContext context);

## 

##     // 2\. Format the human-readable explanation of affected processes

##     Task\<ImpactReport\> GenerateImpactReportAsync(ArbiterResult analysisResult);

## 

##     // 3\. Handle the user's decision and apply the resolution strategy

##     Task\<ResolutionOutcome\> ApplyUserResolutionAsync(ProposedChange change, UserDecision decision);

## }

## 

## **Key Data Models:**

* ## ProposedChange: Contains the AST (Abstract Syntax Tree), diffs, or flow JSON changes.

* ## ArbiterResult: A boolean HasConflicts flag, plus a list of ImpactedFlows and SeverityLevel.

* ## UserDecision: The explicit choice made by the developer to resolve the conflict.

## By implementing this arbiter, you ensure that your system remains strictly cohesive. No AI agent or developer will be able to silently introduce regressions into previously established, complex business domains.

## Deep research suggestion:

To implement the **"Business Flow Arbitrator"** within the Multimodel Orchestrator framework (XIIGen V18), you can add a new governance-level skill—**Skill 64: Business Flow Arbitrator**. This skill will act as a meta-reviewer that cross-references proposed changes against the established "Source of Truth" (Genie DNA, Flow Definitions, and Entity Schemas).

### **1\. Skill Identity: Skill 64 — Business Flow Arbitrator**

* **Layer**: L1 (Orchestration) or L12 (Governance).  
* **Purpose**: To prevent regression in established business logic by performing a cross-flow impact analysis before any code change is committed.  
* **Primary Triggers**: logic check, flow validation, impact analysis, business arbitration.  
* **Core Dependencies**:  
  * **Skill 08 (Flow Definition)**: For parsing existing logic sequences.  
  * **Skill 16 (AI Context Service)**: For gathering relevant documentation and state.  
  * **Skill 12 (AI Review Executor)**: For the analytical engine that scores the change against the DNA.  
  * **Skill 55 (Validation Service)**: For enforcing configurable business rules.

### **2\. Implementation Logic**

The Arbitrator should follow a five-step execution sequence:

1. **Entity Extraction**:  
   * Analyze the proposed code change to identify which **Database Entities** (from genie-dna/config-schemas/) are being modified.  
   * Example: If the change edits the wallet\_configs, the Arbitrator flags this as a high-risk change.  
2. **Context Discovery (RAG)**:  
   * Utilize **Skill 00b (RAG Context Planner)** to search for all **Flow Definitions** (.json) where these entities are registered.  
   * Example: Search V17-skills/flow-definitions/ to find every flow that consumes the Post or Event entities.  
3. **Cross-Flow Logic Analysis**:  
   * Compare the "Proposed Logic" with the "Established Logic" defined in the **Genie DNA — Non-Negotiable Rules**.  
   * Specifically check for **Breaking Changes**:  
     * Deletion of fields required by other flows.  
     * Changes in state transitions (e.g., a flow expecting Status: Pending but the new code skips it).  
     * Side effects on downstream topological nodes in the DAG.  
4. **Impact Reporting**:  
   * Generate a **Business Impact Report** highlighting:  
     * **Affected Processes**: e.g., "Deleting UserId from EventRegistration breaks the Event Participation Flow".  
     * **DNA Violation**: e.g., "Violates Rule 4.2: Data Integrity across Multi-Site configurations".  
5. **User Arbitration (Hard Stop)**:  
   * If a conflict is found, the system must trigger a **Hard Stop**.  
   * Present the user with an interactive prompt: *"The proposed change breaks Flow X. Do you want to: A) Refactor the change, B) Update Flow X to accommodate the change, or C) Cancel?"*

### **3\. Integration with Existing "Genie DNA"**

The Arbitrator must use the **Genie DNA — Module Architecture** as its primary constraint index.

* **Database Guardrails**: It looks in the 21 Elasticsearch Config Indices to ensure entity modifications don't break cross-index relations.  
* **Generic Module Compliance**: It ensures that a change in one of the 20 Generic Modules doesn't affect the 15 Site Types (e.g., Blog, Store, Social Network) that share that core logic.

### **4\. Implementation Plan**

1. **Define the Arbitrator Prompt**: Create a system prompt in the AiReviewExecutor that specifically instructs the AI to look for "Logical Sequence Disruption" rather than just syntax.  
2. **Register the Skill**: Add Skill 64 to the **Master Skills Index**.  
3. **Update the Flow Orchestrator**: Insert the BusinessFlowArbitrator step after the **Skill 17 (Code Generator)** and before **Skill 27 (Deployment)**.

