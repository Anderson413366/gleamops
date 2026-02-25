import { expect, test } from '@playwright/test';

type ViewportSize = { width: number; height: number };

const ROUTES = [
  '/reports',
  '/money',
  '/pipeline',
  '/clients',
  '/crm',
  '/team',
] as const;

const VIEWPORTS: ViewportSize[] = [
  { width: 1024, height: 900 },
  { width: 880, height: 900 },
  { width: 768, height: 900 },
];

test.describe('Responsive KPI cards', () => {
  for (const route of ROUTES) {
    for (const viewport of VIEWPORTS) {
      test(`${route} keeps KPI values visible at ${viewport.width}px`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
        await page.waitForTimeout(500);

        const clippedValues = await page.evaluate(() => {
          const rows = Array.from(document.querySelectorAll<HTMLElement>('main .grid p'));
          const offenders: Array<{ text: string; className: string }> = [];

          for (const node of rows) {
            const text = (node.textContent ?? '').trim();
            if (!text || !/[0-9$%]/.test(text)) continue;

            const style = window.getComputedStyle(node);
            if ((Number(style.fontWeight) || 0) < 600) continue;
            if ((parseFloat(style.fontSize) || 0) < 16) continue;

            const parent = node.parentElement;
            if (!parent) continue;

            const peers = Array.from(parent.querySelectorAll<HTMLElement>(':scope > p'));
            const hasLabelPeer = peers.some((peer) => peer !== node && peer.className.includes('text-xs'));
            if (!hasLabelPeer) continue;

            if (node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 2) {
              offenders.push({ text, className: node.className });
            }
          }

          return offenders;
        });

        expect(clippedValues, `Clipped KPI values on ${route} at ${viewport.width}px`).toEqual([]);
      });
    }
  }
});
