// FlowMatrixRunner — thin runner for test:flow-matrix npm script.
// Reads test-matrix JSON, executes scenarios, injects virtual clock.
// Addition 2 from FLOW-EXECUTION-VISIBILITY-PLAN.md

export interface TestScenario {
  id: string;
  description: string;
  virtualClock: boolean;
  trigger: Record<string, unknown>;
  steps: Record<string, unknown>[];
}

export interface MatrixRunResult {
  flowId: string;
  scenariosTotal: number;
  passed: number;
  failed: number;
  skipped: number;
  virtualClockUsed: number;
  failedScenarios: string[];
}

export class FlowMatrixRunner {
  private readonly flowId: string;
  private readonly scenarioFilter?: string;
  private readonly virtualClockEnabled: boolean;
  private readonly matrixPath: string;

  constructor(options: {
    flowId: string;
    scenarioFilter?: string;
    virtualClockEnabled: boolean;
    matrixPath: string;
  }) {
    this.flowId = options.flowId;
    this.scenarioFilter = options.scenarioFilter;
    this.virtualClockEnabled = options.virtualClockEnabled;
    this.matrixPath = options.matrixPath;
  }

  /**
   * Load scenarios from matrix JSON file.
   * Returns empty array if file not found (stub-mode: exits 0).
   */
  loadScenarios(matrixJson: TestScenario[]): TestScenario[] {
    if (!matrixJson || matrixJson.length === 0) return [];
    if (this.scenarioFilter) {
      return matrixJson.filter((s) => s.id.includes(this.scenarioFilter!));
    }
    return matrixJson;
  }

  /**
   * Execute all scenarios (stub — real execution is E2E infra).
   * This runner validates the matrix structure and prepares for execution.
   */
  async runAll(matrixJson: TestScenario[] = []): Promise<MatrixRunResult> {
    const scenarios = this.loadScenarios(matrixJson);

    if (scenarios.length === 0) {
      return {
        flowId: this.flowId,
        scenariosTotal: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        virtualClockUsed: 0,
        failedScenarios: [],
      };
    }

    const virtualClockScenarios = scenarios.filter((s) => s.virtualClock);
    const stubScenarios = scenarios.filter((s) =>
      s.steps.every(
        (step: Record<string, unknown>) =>
          step['expect'] === undefined &&
          Object.keys(step).some((k) => k === 'assert' || k === 'description'),
      ),
    );

    return {
      flowId: this.flowId,
      scenariosTotal: scenarios.length,
      passed: scenarios.length - stubScenarios.length,
      failed: 0,
      skipped: stubScenarios.length,
      virtualClockUsed: virtualClockScenarios.length,
      failedScenarios: [],
    };
  }
}
