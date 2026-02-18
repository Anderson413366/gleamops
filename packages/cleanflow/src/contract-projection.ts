/**
 * Contract Revenue Projection — calculates total contract value over its full term
 * with annual escalation applied.
 */
import type { ContractTerms } from './types';

export interface ContractProjectionYear {
  year: number;
  monthly: number;
  annual: number;
}

export interface ContractProjection {
  years: ContractProjectionYear[];
  total_contract_value: number;
  effective_monthly_avg: number;
}

/**
 * Calculates total contract value over the full term with annual escalation.
 *
 * Example: 24 months at $8,500/mo with 3% annual escalation:
 *   Year 1: $8,500/mo × 12 = $102,000
 *   Year 2: $8,755/mo × 12 = $105,060
 *   Total: $207,060 — effective avg ~$8,627.50/mo
 */
export function calculateContractProjection(
  monthly_price: number,
  terms: ContractTerms,
): ContractProjection {
  const { length_months, annual_escalation_pct } = terms;
  if (length_months <= 0 || monthly_price <= 0) {
    return { years: [], total_contract_value: 0, effective_monthly_avg: 0 };
  }

  const escalation = 1 + (annual_escalation_pct / 100);
  const totalYears = Math.ceil(length_months / 12);
  const years: ContractProjectionYear[] = [];
  let totalValue = 0;
  let remainingMonths = length_months;

  for (let y = 0; y < totalYears; y++) {
    const monthlyRate = monthly_price * Math.pow(escalation, y);
    const monthsThisYear = Math.min(12, remainingMonths);
    const annualValue = monthlyRate * monthsThisYear;

    years.push({
      year: y + 1,
      monthly: Math.round(monthlyRate * 100) / 100,
      annual: Math.round(annualValue * 100) / 100,
    });

    totalValue += annualValue;
    remainingMonths -= monthsThisYear;
  }

  return {
    years,
    total_contract_value: Math.round(totalValue * 100) / 100,
    effective_monthly_avg: Math.round((totalValue / length_months) * 100) / 100,
  };
}
