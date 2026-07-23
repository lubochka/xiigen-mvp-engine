/**
 * ESLint rule: no-enqueue-before-storedocument
 *
 * Detects enqueue() calls that appear before storeDocument() in the same function scope.
 * Enforces INV-15-1 (DNA-8, CF-386).
 *
 * GAP-21-02 fix: Ensures PERSISTENCE archetype tasks always write to DB before emitting queue events.
 */
module.exports = {
  meta: {
    type: 'error',
    docs: {
      description: 'DNA-8: enqueue() must not precede storeDocument() in PERSISTENCE archetype tasks',
      category: 'Correctness',
    },
    messages: {
      violation: 'DNA-8 violation: enqueue() must not precede storeDocument(). Use persistThenEmit() template method.',
    },
  },
  create(context) {
    function checkFunctionBody(body) {
      if (!body || !body.body) return;

      let enqueuePos = -1;
      let storeDocPos = -1;

      body.body.forEach((stmt, idx) => {
        const stmtStr = context.getSourceCode().getText(stmt);
        if (stmtStr.includes('.enqueue(') && enqueuePos === -1) {
          enqueuePos = idx;
        }
        if (stmtStr.includes('.storeDocument(') && storeDocPos === -1) {
          storeDocPos = idx;
        }
      });

      // Violation: enqueue() appears before storeDocument() in the same scope
      if (enqueuePos !== -1 && storeDocPos !== -1 && enqueuePos < storeDocPos) {
        context.report({
          node: body.body[enqueuePos],
          messageId: 'violation',
        });
      }
    }

    return {
      FunctionDeclaration(node) {
        checkFunctionBody(node.body);
      },
      ArrowFunctionExpression(node) {
        if (node.body && node.body.type === 'BlockStatement') {
          checkFunctionBody(node.body);
        }
      },
      MethodDefinition(node) {
        if (node.value && node.value.body) {
          checkFunctionBody(node.value.body);
        }
      },
    };
  },
};
