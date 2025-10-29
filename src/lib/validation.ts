export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateMedicine(input: {
  name: string;
  dosage: string;
  totalStock: number;
  currentStock: number;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!input.name?.trim()) errors.push('Medicine name is required');
  if (!input.dosage?.trim()) errors.push('Dosage is required');
  if (!Number.isFinite(input.totalStock) || input.totalStock <= 0) errors.push('Total stock must be > 0');
  if (!Number.isFinite(input.currentStock) || input.currentStock < 0) errors.push('Current stock must be >= 0');
  if (input.currentStock > input.totalStock) warnings.push('Current stock exceeds total stock');
  return { isValid: errors.length === 0, errors, warnings };
}

export function validateGlucose(input: { value: number }): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!Number.isFinite(input.value) || input.value <= 0) errors.push('Glucose value must be > 0');
  if (input.value < 40) warnings.push('Glucose unusually low');
  if (input.value > 400) warnings.push('Glucose unusually high');
  return { isValid: errors.length === 0, errors, warnings };
}


