export interface ISimpleCondition {
	type: "simple";
	field: string;
	operator:
		| "eq"
		| "ne"
		| "gt"
		| "gte"
		| "lt"
		| "lte"
		| "contains"
		| "in"
		| "notEmpty";
	value: unknown;
	valueType?: "literal" | "field"; // "field" means value references another field
}
export interface ICompoundCondition {
	type: "compound";
	operator: "AND" | "OR" | "NOT";
	conditions: ISimpleCondition[]; // Recursive array of conditions
}

// TODO: document it
/**
 * @example
 * ```ts
 * {
 *   type: "simple",
 *   field: "age",
 *   operator: "gte",  // "eq", "ne", "gt", "gte", "lt", "lte", "contains", "in", "notEmpty"
 *   value: 18,
 *   valueType: "literal"  // or "field" for field references
 * }
 * // OR
 * {
 *   type: "compound",
 *   operator: "AND",  // "AND", "OR", "NOT"
 *   conditions: [
 *     { type: "simple", field: "status", operator: "eq", value: "active" },
 *     { type: "simple", field: "age", operator: "gte", value: 18 }
 *   ]
 * }
 * // OR
 * // Field a > field b
 * {
 *   type: "simple",
 *   field: "salary",
 *   operator: "gt",
 *   value: { type: "field", field: "minimumSalary" },
 *   valueType: "field"
 * }
 * // OR
 * // (status = "active" AND role = "admin") OR department = "IT"
 * visibilityConditions: [
 *   {
 *     type: "compound",
 *     operator: "OR",
 *     conditions: [
 *       {
 *         type: "compound",
 *         operator: "AND",
 *         conditions: [
 *           { type: "simple", field: "status", operator: "eq", value: "active" },
 *           { type: "simple", field: "role", operator: "eq", value: "admin" }
 *         ]
 *       },
 *       { type: "simple", field: "department", operator: "eq", value: "IT" }
 *     ]
 *   }
 * ]
 * // OR
 * {
 *   type: "simple",
 *   field: "status",
 *   operator: "in",
 *   value: ["active", "pending", "approved"]
 * }
 * // Show section only for adult users in the US
 * visibilityConditions: [
 *   {
 *     type: "compound",
 *     operator: "AND",
 *     conditions: [
 *       { type: "simple", field: "age", operator: "gte", value: 18 },
 *       { type: "simple", field: "country", operator: "eq", value: "US" }
 *     ]
 *   }
 * ]
 * {
 *   type: "simple",
 *   field: "salary",
 *   operator: "gt",
 *   value: { type: "field", field: "minimumSalary" },
 *   valueType: "field"
 * }
```
 */
