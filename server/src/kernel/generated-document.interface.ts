// server/src/kernel/generated-document.interface.ts
// Interface for all generated documents.
// CN-03: all generated documents must include schemaVersion field.

export interface GeneratedDocument {
  schemaVersion: string; // e.g. "2.1.0" — required on all generated output
  taskTypeId: string;
  targetStack: string;
  generatedAt: string;
  [key: string]: unknown;
}
