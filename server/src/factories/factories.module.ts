/**
 * FactoriesModule — wires all 6 per-fabric service factories + FactoryRegistry.
 *
 * On module init, auto-registers all 6 bridge factories in the FactoryRegistry
 * so they're discoverable by factoryId, fabricType, and family.
 *
 * Phase 6.2: Factory-to-fabric bridge wiring.
 */

import { Module, OnModuleInit } from '@nestjs/common';
import { FactoryRegistry } from './factory-registry';
import { FabricType } from './fabric-type';
import { createRegistryEntry, FactoryRegistryEntry } from './factory-interfaces';

// Import bridge factories
import { DatabaseServiceFactory } from '../fabrics/database/database-service.factory';
import { QueueServiceFactory } from '../fabrics/queue/queue-service.factory';
import { AiServiceFactory } from '../fabrics/ai-engine/ai-service.factory';
import { RagServiceFactory } from '../fabrics/rag/rag-service.factory';
import { FlowServiceFactory } from '../fabrics/flow-engine/flow-service.factory';
import { SecretsServiceFactory } from '../fabrics/secrets/secrets-service.factory';

/** Metadata for auto-registration of fabric bridge factories. */
const FABRIC_BRIDGE_ENTRIES: Array<{
  factoryId: string;
  interfaceName: string;
  fabricType: FabricType;
  description: string;
  methods: string[];
}> = [
  {
    factoryId: DatabaseServiceFactory.FACTORY_ID,
    interfaceName: DatabaseServiceFactory.INTERFACE_NAME,
    fabricType: FabricType.DATABASE,
    description: 'Bridge factory: resolves IDatabaseService through DATABASE fabric',
    methods: ['storeDocument', 'searchDocuments', 'deleteDocument', 'getDocument'],
  },
  {
    factoryId: QueueServiceFactory.FACTORY_ID,
    interfaceName: QueueServiceFactory.INTERFACE_NAME,
    fabricType: FabricType.QUEUE,
    description: 'Bridge factory: resolves IQueueService through QUEUE fabric',
    methods: ['enqueueAsync', 'dequeueAsync', 'acknowledgeAsync'],
  },
  {
    factoryId: AiServiceFactory.FACTORY_ID,
    interfaceName: AiServiceFactory.INTERFACE_NAME,
    fabricType: FabricType.AI_ENGINE,
    description: 'Bridge factory: resolves IAiProvider through AI_ENGINE fabric',
    methods: ['generateAsync', 'streamAsync'],
  },
  {
    factoryId: RagServiceFactory.FACTORY_ID,
    interfaceName: RagServiceFactory.INTERFACE_NAME,
    fabricType: FabricType.RAG,
    description: 'Bridge factory: resolves IRagService through RAG fabric',
    methods: ['searchAsync', 'indexAsync', 'deleteAsync'],
  },
  {
    factoryId: FlowServiceFactory.FACTORY_ID,
    interfaceName: FlowServiceFactory.INTERFACE_NAME,
    fabricType: FabricType.FLOW_ENGINE,
    description:
      'Bridge factory: resolves IFlowDefinition|IFlowOrchestrator through FLOW_ENGINE fabric',
    methods: ['saveDefinition', 'getDefinition', 'executeFlow'],
  },
  {
    factoryId: SecretsServiceFactory.FACTORY_ID,
    interfaceName: SecretsServiceFactory.INTERFACE_NAME,
    fabricType: FabricType.SECRETS,
    description: 'Bridge factory: resolves ISecretsService through SECRETS fabric',
    methods: ['getSecret', 'setSecret', 'deleteSecret'],
  },
];

@Module({
  providers: [
    FactoryRegistry,
    DatabaseServiceFactory,
    QueueServiceFactory,
    AiServiceFactory,
    RagServiceFactory,
    FlowServiceFactory,
    SecretsServiceFactory,
  ],
  exports: [
    FactoryRegistry,
    DatabaseServiceFactory,
    QueueServiceFactory,
    AiServiceFactory,
    RagServiceFactory,
    FlowServiceFactory,
    SecretsServiceFactory,
  ],
})
export class FactoriesModule implements OnModuleInit {
  constructor(private readonly registry: FactoryRegistry) {}

  onModuleInit(): void {
    for (const meta of FABRIC_BRIDGE_ENTRIES) {
      const entry: FactoryRegistryEntry = createRegistryEntry({
        factoryId: meta.factoryId,
        interfaceName: meta.interfaceName,
        familyId: 'FABRIC_BRIDGES',
        fabricType: meta.fabricType,
        provider: 'fabric_resolver',
        description: meta.description,
        methods: meta.methods,
        status: 'CORE',
        version: '1.0.0',
      });

      this.registry.register(entry);
    }
  }
}

/** Re-export the bridge metadata for testing. */
export { FABRIC_BRIDGE_ENTRIES };
