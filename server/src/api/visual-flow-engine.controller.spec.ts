/**
 * Tests for VisualFlowEngineController (Track 0 Turn 15).
 * Thin-route behavior: delegate to T617-T620 services, translate DataProcessResult → HTTP body.
 */

import { DataProcessResult } from '../kernel/data-process-result';
import { VisualFlowEngineController } from './visual-flow-engine.controller';
import { FlowCanvasWriterService } from '../engine/flows/visual-flow-engine/flow-canvas-writer.service';
import { FlowPublicationOrchestratorService } from '../engine/flows/visual-flow-engine/flow-publication-orchestrator.service';
import { NodeTypeRegistrarService } from '../engine/flows/visual-flow-engine/node-type-registrar.service';
import { CodeInjectionProcessorService } from '../engine/flows/visual-flow-engine/code-injection-processor.service';

function makeCtrl(
  opts: {
    writeCanvas?: jest.Mock;
    publishFlow?: jest.Mock;
    registerNodeType?: jest.Mock;
    processInjection?: jest.Mock;
  } = {},
) {
  const canvasWriter = {
    writeCanvas:
      opts.writeCanvas ??
      jest.fn().mockResolvedValue(DataProcessResult.success({ flowId: 'f', written: true })),
  } as unknown as FlowCanvasWriterService;
  const publisher = {
    publishFlow:
      opts.publishFlow ??
      jest.fn().mockResolvedValue(DataProcessResult.success({ flowId: 'f', status: 'PUBLISHED' })),
  } as unknown as FlowPublicationOrchestratorService;
  const nodeTypeRegistrar = {
    registerNodeType:
      opts.registerNodeType ??
      jest.fn().mockResolvedValue(DataProcessResult.success({ nodeTypeId: 'nt' })),
  } as unknown as NodeTypeRegistrarService;
  const injector = {
    processInjection:
      opts.processInjection ??
      jest.fn().mockResolvedValue(DataProcessResult.success({ nodeId: 'n' })),
  } as unknown as CodeInjectionProcessorService;
  return {
    ctrl: new VisualFlowEngineController(canvasWriter, publisher, nodeTypeRegistrar, injector),
    canvasWriter,
    publisher,
    nodeTypeRegistrar,
    injector,
  };
}

describe('VisualFlowEngineController', () => {
  it('POST /canvas delegates to FlowCanvasWriterService.writeCanvas and returns data on success', async () => {
    const { ctrl, canvasWriter } = makeCtrl();
    const res = await ctrl.canvas({ flowId: 'f-1', canvasData: {} });
    expect(canvasWriter.writeCanvas).toHaveBeenCalledWith({ flowId: 'f-1', canvasData: {} });
    expect(res).toEqual({ flowId: 'f', written: true });
  });

  it('POST /publish delegates to FlowPublicationOrchestratorService.publishFlow', async () => {
    const { ctrl, publisher } = makeCtrl();
    const res = await ctrl.publish({ flowId: 'f-2', expectedVersion: '1' });
    expect(publisher.publishFlow).toHaveBeenCalledWith({ flowId: 'f-2', expectedVersion: '1' });
    expect(res).toEqual({ flowId: 'f', status: 'PUBLISHED' });
  });

  it('POST /node-types delegates to NodeTypeRegistrarService.registerNodeType', async () => {
    const { ctrl, nodeTypeRegistrar } = makeCtrl();
    await ctrl.nodeTypes({ nodeTypeId: 'A', capabilities: [] });
    expect(nodeTypeRegistrar.registerNodeType).toHaveBeenCalledWith({
      nodeTypeId: 'A',
      capabilities: [],
    });
  });

  it('POST /inject-code delegates to CodeInjectionProcessorService.processInjection', async () => {
    const { ctrl, injector } = makeCtrl();
    await ctrl.injectCode({ nodeId: 'n', version: 'v1', payload: {} });
    expect(injector.processInjection).toHaveBeenCalledWith({
      nodeId: 'n',
      version: 'v1',
      payload: {},
    });
  });

  it('translates service failure → { error, code } response body', async () => {
    const { ctrl } = makeCtrl({
      writeCanvas: jest
        .fn()
        .mockResolvedValue(DataProcessResult.failure<never>('FLOW_IMMUTABLE', 'already published')),
    });
    const res = (await ctrl.canvas({ flowId: 'x' })) as { error: string; code: string };
    expect(res.code).toBe('FLOW_IMMUTABLE');
    expect(res.error).toBe('already published');
  });
});
