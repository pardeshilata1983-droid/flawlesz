import { jsPDF } from 'jspdf';
import { ValidationResult } from '../types.ts';

/**
 * Escapes HTML characters to prevent XSS in the generated document
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates an executive-ready, high-resolution HTML string for printing to PDF.
 */
export function generateReportHtml(result: ValidationResult): string {
  const formattedDate = new Date(result.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const highSeverityCount = result.flaws.filter((f) => f.severity === 'high').length;
  const competitorCount = result.similar_products.length;
  const pivotCount = result.refined_versions.length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Flawlesz AI Analysis Report - ${escapeHtml(result.idea.slice(0, 40))}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 18mm 16mm 20mm 16mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #111111;
      background-color: #ffffff;
      line-height: 1.5;
      font-size: 13px;
      margin: 0;
      padding: 0;
    }

    .report-header {
      border-bottom: 2px solid #111111;
      padding-bottom: 16px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-icon {
      width: 32px;
      height: 32px;
      background-color: #000000;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .brand-name {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.04em;
      color: #111111;
      margin: 0;
      line-height: 1;
    }

    .brand-tagline {
      font-size: 10px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #5A5A5A;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-top: 4px;
    }

    .meta-box {
      text-align: right;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 10px;
      color: #5A5A5A;
      line-height: 1.6;
    }

    .concept-card {
      background-color: #F8F7F4;
      border: 1px solid #E0DEDA;
      border-radius: 6px;
      padding: 16px 20px;
      margin-bottom: 24px;
      page-break-inside: avoid;
    }

    .concept-label {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #5A5A5A;
      margin-bottom: 6px;
    }

    .concept-title {
      font-size: 16px;
      font-weight: 700;
      color: #111111;
      line-height: 1.4;
      margin: 0 0 12px 0;
    }

    .metrics-bar {
      display: flex;
      gap: 20px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 10px;
      color: #111111;
      border-top: 1px solid #E0DEDA;
      padding-top: 10px;
    }

    .metric-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .metric-badge {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 3px;
      font-weight: 600;
    }

    .badge-alert {
      background-color: #E8481C;
      color: #ffffff;
    }

    .badge-neutral {
      background-color: #EAE8E4;
      color: #111111;
    }

    .section-title-wrap {
      border-bottom: 1px solid #E0DEDA;
      padding-bottom: 6px;
      margin-bottom: 16px;
      margin-top: 24px;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      page-break-after: avoid;
    }

    .section-title {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      margin: 0;
      color: #111111;
    }

    .section-desc {
      font-size: 10px;
      color: #5A5A5A;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .card-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .item-card {
      border: 1px solid #E0DEDA;
      border-radius: 6px;
      padding: 14px 16px;
      background-color: #ffffff;
      page-break-inside: avoid;
    }

    .flaw-card {
      border-left: 3px solid #111111;
    }

    .flaw-card.severity-high {
      border-left: 3px solid #E8481C;
      background-color: #FEFAF9;
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .item-name {
      font-size: 13px;
      font-weight: 700;
      color: #111111;
      margin: 0;
    }

    .severity-tag {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 2px 6px;
      border-radius: 3px;
    }

    .tag-high {
      background-color: #E8481C;
      color: #ffffff;
    }

    .tag-medium, .tag-low {
      background-color: #EAE8E4;
      color: #111111;
      border: 1px solid #D0CECA;
    }

    .item-body {
      font-size: 12px;
      color: #4A4A4A;
      line-height: 1.45;
      margin: 0;
    }

    .source-link {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 10px;
      color: #111111;
      text-decoration: underline;
      margin-top: 6px;
      display: inline-block;
    }

    .pivot-card {
      background-color: #F8F7F4;
      border: 1px solid #D0CECA;
    }

    .pivot-idea {
      font-size: 13px;
      font-weight: 700;
      color: #111111;
      margin-bottom: 6px;
    }

    .pivot-reasoning {
      font-size: 12px;
      color: #4A4A4A;
      line-height: 1.45;
    }

    .report-footer {
      margin-top: 36px;
      padding-top: 14px;
      border-top: 1px solid #E0DEDA;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 9px;
      color: #7A7A7A;
      page-break-inside: avoid;
    }

    @media screen {
      body {
        max-width: 800px;
        margin: 20px auto;
        padding: 24px;
        background-color: #f4f4f0;
      }
      .page-container {
        background: white;
        padding: 32px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.06);
        border-radius: 8px;
      }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <!-- Header -->
    <div class="report-header">
      <div class="brand-section">
        <div class="brand-icon">
          <svg viewBox="0 0 100 100" width="20" height="20" fill="none">
            <path d="M 31 38 L 31 28.5 L 72.5 28.5 L 72.5 70.5 L 63 70.5 L 63 44 Q 46 57 28 71.5 L 28 62 L 55.5 38 Z" fill="#FFFFFF"/>
          </svg>
        </div>
        <div>
          <h1 class="brand-name">Flawlesz AI</h1>
          <div class="brand-tagline">Know Before You Build • Autonomous Idea Stress-Testing</div>
        </div>
      </div>
      <div class="meta-box">
        <div>REPORT ID: ${escapeHtml(result.id.slice(0, 8))}</div>
        <div>DATE: ${formattedDate}</div>
        <div>GROUNDING: LIVE WEB SEARCH</div>
        ${result.userEmail ? `<div>VALIDATOR: ${escapeHtml(result.userEmail)}</div>` : ''}
      </div>
    </div>

    <!-- Executive Summary / Concept -->
    <div class="concept-card">
      <div class="concept-label">Stress-Tested Concept</div>
      <p class="concept-title">"${escapeHtml(result.idea)}"</p>
      
      <div class="metrics-bar">
        <div class="metric-item">
          <span>Found Competitors:</span>
          <span class="metric-badge badge-neutral">${competitorCount} Located</span>
        </div>
        <div class="metric-item">
          <span>Vulnerabilities:</span>
          <span class="metric-badge ${highSeverityCount > 0 ? 'badge-alert' : 'badge-neutral'}">
            ${result.flaws.length} Total (${highSeverityCount} High Severity)
          </span>
        </div>
        <div class="metric-item">
          <span>Refined Pivots:</span>
          <span class="metric-badge badge-neutral">${pivotCount} Formulated</span>
        </div>
      </div>
    </div>

    <!-- Section A: Competitors -->
    <div class="section-title-wrap">
      <h2 class="section-title">1. Existing Market Competitors (${competitorCount})</h2>
      <span class="section-desc">Live web discovery via search grounding</span>
    </div>

    <div class="card-grid">
      ${
        result.similar_products.length > 0
          ? result.similar_products
              .map(
                (p, idx) => `
        <div class="item-card">
          <div class="item-header">
            <h3 class="item-name">${idx + 1}. ${escapeHtml(p.name)}</h3>
            <span class="severity-tag tag-medium">CITED INCUMBENT</span>
          </div>
          <p class="item-body">${escapeHtml(p.description)}</p>
          ${
            p.source_url
              ? `<div class="source-link">${escapeHtml(p.source_url)}</div>`
              : ''
          }
        </div>
      `
              )
              .join('')
          : '<div class="item-card"><p class="item-body">No exact direct competitors identified in live search index.</p></div>'
      }
    </div>

    <!-- Section B: Flaws -->
    <div class="section-title-wrap" style="margin-top: 28px;">
      <h2 class="section-title">2. Critical Structural Flaws (${result.flaws.length})</h2>
      <span class="section-desc">Unit economics, distribution &amp; execution risks</span>
    </div>

    <div class="card-grid">
      ${
        result.flaws.length > 0
          ? result.flaws
              .map(
                (f, idx) => `
        <div class="item-card flaw-card ${f.severity === 'high' ? 'severity-high' : ''}">
          <div class="item-header">
            <h3 class="item-name">#${idx + 1} ${escapeHtml(f.title)}</h3>
            <span class="severity-tag ${f.severity === 'high' ? 'tag-high' : 'tag-medium'}">
              ${f.severity.toUpperCase()} SEVERITY
            </span>
          </div>
          <p class="item-body">${escapeHtml(f.explanation)}</p>
        </div>
      `
              )
              .join('')
          : '<div class="item-card"><p class="item-body">No critical structural flaws diagnosed.</p></div>'
      }
    </div>

    <!-- Section C: Refined Pivots -->
    <div class="section-title-wrap" style="margin-top: 28px;">
      <h2 class="section-title">3. Refined Strategic Pivots (${pivotCount})</h2>
      <span class="section-desc">Hypotheses engineered to circumvent identified failure modes</span>
    </div>

    <div class="card-grid">
      ${
        result.refined_versions.length > 0
          ? result.refined_versions
              .map(
                (rv, idx) => `
        <div class="item-card pivot-card">
          <div class="item-header">
            <h3 class="item-name">Strategic Pivot Option 0${idx + 1}</h3>
            <span class="severity-tag tag-medium">SURVIVAL HYPOTHESIS</span>
          </div>
          <div class="pivot-idea">"${escapeHtml(rv.idea)}"</div>
          <p class="pivot-reasoning">${escapeHtml(rv.reasoning)}</p>
        </div>
      `
              )
              .join('')
          : '<div class="item-card"><p class="item-body">No pivots formulated.</p></div>'
      }
    </div>

    <!-- Footer -->
    <div class="report-footer">
      <div>Generated by Flawlesz AI Autonomous Idea Stress-Testing Engine</div>
      <div>CONFIDENTIAL &amp; PROPRIETARY • PAGE 1 OF 1</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Clean, lightweight print-to-PDF utility.
 * Works seamlessly in sandboxed iframes without popup-blocker restrictions:
 * creates a hidden off-screen print iframe, populates the styled document,
 * and calls contentWindow.print().
 */
export function exportAnalysisToPdf(result: ValidationResult): void {
  const htmlContent = generateReportHtml(result);

  // Use a hidden iframe approach which reliably works inside web apps and sandbox environments
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('id', 'flaw-pdf-print-frame');

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    console.error('[PDF EXPORT] Could not access print iframe document');
    // Fallback: Open in new window if possible
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
    return;
  }

  doc.open();
  doc.write(htmlContent);
  doc.close();

  // Allow styles and font rendering before invoking print dialog
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.warn('[PDF EXPORT] Direct iframe print failed, trying window open fallback:', err);
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.write(htmlContent);
        printWin.document.close();
        printWin.focus();
        printWin.print();
      }
    } finally {
      // Clean up the temporary iframe after print interaction completes
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }
  }, 350);
}

/**
 * Generates and downloads a professional, branded PDF report directly in the browser using jsPDF.
 */
export function exportAnalysisToJsPdf(result: ValidationResult): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 16;
  const contentWidth = pageWidth - (margin * 2);
  let cursorY = 20;

  const checkPageBreak = (neededHeight: number) => {
    if (cursorY + neededHeight > pageHeight - 20) {
      doc.addPage();
      cursorY = 20;
      addHeaderFooter();
    }
  };

  const addHeaderFooter = () => {
    // Header brand
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(17, 17, 17);
    doc.text('FLAWLESZ AI', margin, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text('EXECUTIVE VALIDATION REPORT', pageWidth - margin, 12, { align: 'right' });

    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.3);
    doc.line(margin, 15, pageWidth - margin, 15);

    // Footer
    const pageNum = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('Confidential & Proprietary • Flawlesz AI Autonomous Engine', margin, pageHeight - 10);
    doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  };

  // First page header
  addHeaderFooter();
  cursorY = 24;

  // Concept / Title Card
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(17, 17, 17);
  const titleLines = doc.splitTextToSize(result.idea, contentWidth);
  doc.text(titleLines, margin, cursorY);
  cursorY += (titleLines.length * 6.5) + 6;

  // Metadata
  doc.setFont('courier', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(90, 90, 90);
  const dateStr = new Date(result.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  doc.text(`Generated: ${dateStr} | Skill: ${result.skill.toUpperCase()}`, margin, cursorY);
  cursorY += 10;

  doc.setDrawColor(230, 230, 230);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 8;

  // Executive Summary
  if (result.short_answer) {
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 17, 17);
    doc.text('EXECUTIVE SUMMARY', margin, cursorY);
    cursorY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(50, 50, 50);
    const summaryLines = doc.splitTextToSize(result.short_answer, contentWidth);
    doc.text(summaryLines, margin, cursorY);
    cursorY += (summaryLines.length * 4.5) + 10;
  }

  // Key Findings / Flaws
  if (result.flaws && result.flaws.length > 0) {
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 17, 17);
    doc.text('ADVERSARIAL STRESS-TEST FINDINGS', margin, cursorY);
    cursorY += 8;

    result.flaws.forEach((flaw, idx) => {
      checkPageBreak(25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(17, 17, 17);
      const severityLabel = `[${flaw.severity.toUpperCase()}]`;
      doc.text(`${idx + 1}. ${severityLabel} ${flaw.title}`, margin, cursorY);
      cursorY += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(70, 70, 70);
      const descLines = doc.splitTextToSize(flaw.explanation, contentWidth);
      doc.text(descLines, margin, cursorY);
      cursorY += (descLines.length * 4) + 6;
    });
  }

  // Strategic Pivots / Refinements
  if (result.refined_versions && result.refined_versions.length > 0) {
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 17, 17);
    doc.text('STRATEGIC PIVOTS & REFINEMENTS', margin, cursorY);
    cursorY += 8;

    result.refined_versions.forEach((ref, idx) => {
      checkPageBreak(20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(17, 17, 17);
      doc.text(`${idx + 1}. ${ref.idea}`, margin, cursorY);
      cursorY += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(70, 70, 70);
      const refLines = doc.splitTextToSize(ref.reasoning, contentWidth);
      doc.text(refLines, margin, cursorY);
      cursorY += (refLines.length * 4) + 6;
    });
  }

  // Similar Products / Competitors
  if (result.similar_products && result.similar_products.length > 0) {
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 17, 17);
    doc.text('SIMILAR PRODUCTS & MARKET CONTEXT', margin, cursorY);
    cursorY += 8;

    result.similar_products.forEach((prod, idx) => {
      checkPageBreak(18);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(17, 17, 17);
      doc.text(`${idx + 1}. ${prod.name}`, margin, cursorY);
      cursorY += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(70, 70, 70);
      const prodLines = doc.splitTextToSize(prod.description, contentWidth);
      doc.text(prodLines, margin, cursorY);
      cursorY += (prodLines.length * 4) + 6;
    });
  }

  // Save the PDF
  const safeTitle = result.idea.slice(0, 25).replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Flawlesz_AI_Report_${safeTitle}_${Date.now()}.pdf`;
  doc.save(filename);
}

