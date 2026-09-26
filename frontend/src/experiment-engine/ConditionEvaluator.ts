/**
 * ConditionEvaluator.ts
 *
 * Evaluates dynamic conditions for branching logic in cognitive experiments.
 * Supports comparison operators (==, !=, >, <, in) and nested logic.
 */

export interface TrialStateContext {
  lastResponse?: {
    key?: string;
    button?: string;
    choice?: string;
    reaction_time?: number;
    is_correct?: boolean;
    accuracy?: number;
    [key: string]: any;
  };
  variables: Record<string, any>;
  trialSequence: number;
}

export class ConditionEvaluator {
  /**
   * Evaluate a condition rule against the current experiment state context
   */
  public static evaluate(
    variableName: string,
    operator: string = '==',
    targetValue: any,
    context: TrialStateContext
  ): boolean {
    if (!variableName) return true;

    // Resolve variable from context
    let actualValue: any = undefined;
    if (context.lastResponse && variableName in context.lastResponse) {
      actualValue = context.lastResponse[variableName];
    } else if (variableName in context.variables) {
      actualValue = context.variables[variableName];
    } else if (variableName === 'sequence') {
      actualValue = context.trialSequence;
    }

    // Coerce booleans and numbers if target is string
    if (typeof targetValue === 'string') {
      if (targetValue.toLowerCase() === 'true') targetValue = true;
      else if (targetValue.toLowerCase() === 'false') targetValue = false;
      else if (!isNaN(Number(targetValue)) && targetValue.trim() !== '') {
        targetValue = Number(targetValue);
      }
    }

    switch (operator) {
      case '==':
      case '=':
        return actualValue === targetValue || String(actualValue).toLowerCase() === String(targetValue).toLowerCase();

      case '!=':
        return actualValue !== targetValue && String(actualValue).toLowerCase() !== String(targetValue).toLowerCase();

      case '>':
        return Number(actualValue) > Number(targetValue);

      case '<':
        return Number(actualValue) < Number(targetValue);

      case '>=':
        return Number(actualValue) >= Number(targetValue);

      case '<=':
        return Number(actualValue) <= Number(targetValue);

      case 'in':
      case 'contains':
        if (Array.isArray(targetValue)) {
          return targetValue.includes(actualValue);
        }
        if (typeof targetValue === 'string') {
          return targetValue.split(',').map((s) => s.trim()).includes(String(actualValue));
        }
        return false;

      default:
        return actualValue == targetValue;
    }
  }
}
