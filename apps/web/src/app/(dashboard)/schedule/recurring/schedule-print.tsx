'use client';

import { useCallback } from 'react';
import type { RecurringScheduleRow } from './schedule-list';

interface SchedulePrintProps {
  rows: RecurringScheduleRow[];
  visibleDates: string[];
  rangeLabel: string;
}

function formatDateHeading(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`);
  return `${date.toLocaleDateString('en-US', { weekday: 'short' })} ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function groupByStaff(rows: RecurringScheduleRow[]) {
  return rows.reduce<Record<string, RecurringScheduleRow[]>>((acc, row) => {
    const key = row.staffName?.trim() || 'Unassigned';
    acc[key] = acc[key] ? [...acc[key], row] : [row];
    return acc;
  }, {});
}

function rowsForDate(rows: RecurringScheduleRow[], dateKey: string) {
  return rows.filter((row) => row.scheduledDates.includes(dateKey));
}

export function useSchedulePrint({ rows, visibleDates, rangeLabel }: SchedulePrintProps) {
  const handlePrint = useCallback(() => {
    const grouped = groupByStaff(rows);
    const staffNames = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

    const tableRows = staffNames.map((staffName) => {
      const staffRows = grouped[staffName];
      const cells = visibleDates.map((dateKey) => {
        const dayRows = rowsForDate(staffRows, dateKey);
        if (dayRows.length === 0) return '<td style="padding:4px 8px;border:1px solid #ddd;color:#999;text-align:center">OFF</td>';
        const content = dayRows.map((r) => {
          const position = r.positionType.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
          return `<div style="margin-bottom:2px"><strong>${position}</strong><br/>${r.siteName}<br/>${r.startTime}-${r.endTime}</div>`;
        }).join('');
        return `<td style="padding:4px 8px;border:1px solid #ddd;vertical-align:top;font-size:11px">${content}</td>`;
      });
      return `<tr><td style="padding:6px 8px;border:1px solid #ddd;font-weight:bold;white-space:nowrap">${staffName}</td>${cells.join('')}</tr>`;
    });

    const headerCells = visibleDates.map((d) =>
      `<th style="padding:6px 8px;border:1px solid #ddd;background:#f5f5f5;font-size:11px;text-align:center">${formatDateHeading(d)}</th>`
    ).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Schedule - ${rangeLabel}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 20px; }
          table { border-collapse: collapse; width: 100%; }
          @media print { body { margin: 10px; } }
        </style>
      </head>
      <body>
        <h2 style="margin-bottom:8px">Schedule: ${rangeLabel}</h2>
        <p style="color:#666;font-size:12px;margin-bottom:16px">Generated ${new Date().toLocaleDateString()}</p>
        <table>
          <thead>
            <tr>
              <th style="padding:6px 8px;border:1px solid #ddd;background:#f5f5f5;text-align:left">Employee</th>
              ${headerCells}
            </tr>
          </thead>
          <tbody>
            ${tableRows.join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }, [rows, visibleDates, rangeLabel]);

  return { handlePrint };
}
