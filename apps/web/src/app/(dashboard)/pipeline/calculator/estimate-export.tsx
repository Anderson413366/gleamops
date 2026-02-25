'use client';

import { useMemo } from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@gleamops/ui';
import type { BidTypeCode, PricingResult, WorkloadResult } from '@gleamops/cleanflow';

interface ExportArea {
  name: string;
  sqft: number;
  floorTypeCode: string;
}

interface EstimateExportProps {
  serviceType: BidTypeCode;
  buildingTypeCode: string;
  pricingMethod: string;
  targetMarginPct: number;
  areas: ExportArea[];
  pricing: PricingResult | null;
  workload: WorkloadResult | null;
}

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function buildPrintHtml({
  serviceType,
  buildingTypeCode,
  pricingMethod,
  targetMarginPct,
  areas,
  pricing,
  workload,
}: EstimateExportProps): string {
  const generatedAt = new Date().toLocaleString();
  const areaRows = areas
    .map(
      (area) =>
        `<tr>
          <td>${area.name}</td>
          <td>${area.floorTypeCode}</td>
          <td style="text-align:right;">${area.sqft.toLocaleString()} sqft</td>
        </tr>`,
    )
    .join('');

  const pricingRows = pricing
    ? `
      <tr><td>Monthly Revenue</td><td style="text-align:right;">${money.format(pricing.recommended_price)}</td></tr>
      <tr><td>Total Monthly Cost</td><td style="text-align:right;">${money.format(pricing.total_monthly_cost)}</td></tr>
      <tr><td>Burdened Labor</td><td style="text-align:right;">${money.format(pricing.burdened_labor_cost)}</td></tr>
      <tr><td>Supplies</td><td style="text-align:right;">${money.format(pricing.supplies_cost)}</td></tr>
      <tr><td>Equipment</td><td style="text-align:right;">${money.format(pricing.equipment_cost)}</td></tr>
      <tr><td>Overhead</td><td style="text-align:right;">${money.format(pricing.overhead_cost)}</td></tr>
      <tr><td>Effective Margin</td><td style="text-align:right;">${pricing.effective_margin_pct.toFixed(1)}%</td></tr>
    `
    : '';

  const workloadRows = workload
    ? `
      <tr><td>Monthly Hours</td><td style="text-align:right;">${workload.monthly_hours.toFixed(1)}</td></tr>
      <tr><td>Cleaners Needed</td><td style="text-align:right;">${workload.cleaners_needed}</td></tr>
      <tr><td>Hours Per Visit</td><td style="text-align:right;">${workload.hours_per_visit.toFixed(2)}</td></tr>
      <tr><td>Warnings</td><td style="text-align:right;">${workload.warnings.length}</td></tr>
    `
    : '';

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>GleamOps Estimate Export</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 28px; color: #111; }
          h1, h2 { margin: 0 0 8px; }
          p { margin: 0 0 6px; color: #444; }
          .section { margin-top: 22px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
          th { text-align: left; background: #f5f5f5; }
          .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
          .meta div { border: 1px solid #ddd; border-radius: 8px; padding: 10px; }
        </style>
      </head>
      <body>
        <h1>Standalone Estimate</h1>
        <p>Generated: ${generatedAt}</p>

        <div class="meta">
          <div><strong>Service Type</strong><br/>${serviceType}</div>
          <div><strong>Building Type</strong><br/>${buildingTypeCode}</div>
          <div><strong>Pricing Strategy</strong><br/>${pricingMethod}</div>
          <div><strong>Target Margin</strong><br/>${targetMarginPct.toFixed(1)}%</div>
        </div>

        <div class="section">
          <h2>Area Mix</h2>
          <table>
            <thead>
              <tr><th>Area</th><th>Floor</th><th style="text-align:right;">Square Feet</th></tr>
            </thead>
            <tbody>${areaRows}</tbody>
          </table>
        </div>

        <div class="section">
          <h2>Financial Summary</h2>
          <table>
            <tbody>${pricingRows}</tbody>
          </table>
        </div>

        <div class="section">
          <h2>Workload Summary</h2>
          <table>
            <tbody>${workloadRows}</tbody>
          </table>
        </div>
      </body>
    </html>
  `;
}

function triggerDownload(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function EstimateExport(props: EstimateExportProps) {
  const hasEstimate = !!(props.pricing && props.workload);

  const payload = useMemo(() => ({
    generated_at: new Date().toISOString(),
    service_type: props.serviceType,
    building_type: props.buildingTypeCode,
    pricing_method: props.pricingMethod,
    target_margin_pct: props.targetMarginPct,
    areas: props.areas,
    pricing: props.pricing,
    workload: props.workload,
  }), [
    props.areas,
    props.buildingTypeCode,
    props.pricing,
    props.pricingMethod,
    props.serviceType,
    props.targetMarginPct,
    props.workload,
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Estimate Export</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Generate a printable summary for PDF export, or download the estimate payload.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!hasEstimate}
            onClick={() => {
              if (!hasEstimate) return;
              const html = buildPrintHtml(props);
              const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1080,height=760');
              if (!printWindow) return;
              printWindow.document.open();
              printWindow.document.write(html);
              printWindow.document.close();
              printWindow.focus();
              window.setTimeout(() => {
                printWindow.print();
              }, 250);
            }}
          >
            <Printer className="h-4 w-4" />
            Print / Save PDF
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!hasEstimate}
            onClick={() =>
              triggerDownload(
                `gleamops-estimate-${Date.now()}.json`,
                JSON.stringify(payload, null, 2),
                'application/json',
              )
            }
          >
            <Download className="h-4 w-4" />
            Export JSON
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={!hasEstimate}
            onClick={() =>
              triggerDownload(
                `gleamops-estimate-${Date.now()}.html`,
                buildPrintHtml(props),
                'text/html',
              )
            }
          >
            <FileText className="h-4 w-4" />
            Export HTML
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
