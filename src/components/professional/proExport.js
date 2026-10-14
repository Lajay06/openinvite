/**
 * src/components/professional/proExport.js
 *
 * EXPORTS: CSV for every table, and PDF tables in A4 or Letter, landscape.
 * goals/2026-10-14-professional.md, What a professional gets, 3, 4 and 14.
 * Openinvite stays in the footer; an Agency workspace's own name leads.
 */

const csvCell = (v) => {
  const s = String(v ?? '');
  // A leading =, +, - or @ is a formula to a spreadsheet; quote it as text.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) || safe !== s ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function toCsv(headers, rows) {
  return [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
}

export function downloadText(filename, text, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([`﻿${text}`], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const downloadCsv = (filename, headers, rows) => downloadText(filename, toCsv(headers, rows));

/** A safe file name from a title: "Maya and Theo run sheet" reads "maya-and-theo-run-sheet". */
export const fileSlug = (s) => String(s || 'export').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'export';

/**
 * A table as a landscape PDF. `columns` are [{ label, weight }]; widths are
 * shared out by weight. `groups` optionally start a new labeled block (a
 * sheet, a table). Rows wrap their cells and break across pages with the
 * header repeated.
 */
export async function downloadTablePdf({ title, subtitle = '', columns, rows, groups = null, format = 'a4', filename, brand = '' }) {
  const { default: jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const M = 12;
  const usable = W - M * 2;
  const totalWeight = columns.reduce((t, c) => t + (c.weight || 1), 0);
  const widths = columns.map((c) => ((c.weight || 1) / totalWeight) * usable);
  let y = M;

  const footer = () => {
    pdf.setFontSize(7);
    pdf.setTextColor(120, 120, 120);
    pdf.text(`${brand ? `${brand}. ` : ''}Made with Openinvite Professional`, M, H - 6);
    pdf.text(`Page ${pdf.getNumberOfPages()}`, W - M, H - 6, { align: 'right' });
  };
  const header = () => {
    pdf.setFontSize(8);
    pdf.setTextColor(90, 90, 90);
    pdf.setFont('helvetica', 'bold');
    let x = M;
    columns.forEach((c, i) => { pdf.text(c.label, x + 1, y + 4); x += widths[i]; });
    pdf.setDrawColor(200, 200, 200);
    pdf.line(M, y + 6, W - M, y + 6);
    pdf.setFont('helvetica', 'normal');
    y += 8;
  };
  const newPage = () => { footer(); pdf.addPage(); y = M; header(); };

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.setTextColor(10, 10, 10);
  pdf.text(title, M, y + 5);
  y += 9;
  if (subtitle) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(90, 90, 90);
    pdf.text(subtitle, M, y + 3);
    y += 7;
  }
  y += 2;
  header();

  const blocks = groups || [{ label: '', rows }];
  for (const block of blocks) {
    if (block.label) {
      if (y + 12 > H - 12) newPage();
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(10, 10, 10);
      pdf.text(block.label, M, y + 5);
      pdf.setFont('helvetica', 'normal');
      y += 8;
    }
    for (const row of block.rows) {
      pdf.setFontSize(8.5);
      const lines = row.map((v, i) => pdf.splitTextToSize(String(v ?? ''), widths[i] - 2));
      const h = Math.max(...lines.map((l) => l.length)) * 3.8 + 2.5;
      if (y + h > H - 12) newPage();
      pdf.setTextColor(10, 10, 10);
      let x = M;
      lines.forEach((l, i) => { pdf.text(l, x + 1, y + 3.5); x += widths[i]; });
      y += h;
      pdf.setDrawColor(230, 230, 230);
      pdf.line(M, y - 0.8, W - M, y - 0.8);
    }
    y += 2;
  }
  footer();
  pdf.save(filename);
}
