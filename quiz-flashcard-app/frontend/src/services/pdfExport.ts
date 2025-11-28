import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { AnalyticsDashboard } from '../types';

interface ExportOptions {
  filename?: string;
  includeCharts?: boolean;
  includeRecommendations?: boolean;
}

/**
 * Generate a PDF report from analytics data
 */
export async function exportAnalyticsToPDF(
  dashboard: AnalyticsDashboard,
  categoryName: string | undefined,
  days: number,
  options: ExportOptions = {}
): Promise<void> {
  const {
    filename = `StudyForge_Analytics_${new Date().toISOString().split('T')[0]}.pdf`,
    includeRecommendations = true,
  } = options;

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Colors
  const primaryColor: [number, number, number] = [3, 59, 76]; // #033B4C
  const textColor: [number, number, number] = [31, 41, 55]; // gray-800
  const mutedColor: [number, number, number] = [107, 114, 128]; // gray-500

  // Helper functions
  const addText = (
    text: string,
    x: number,
    y: number,
    options: { fontSize?: number; color?: [number, number, number]; bold?: boolean; maxWidth?: number } = {}
  ): number => {
    const { fontSize = 10, color = textColor, bold = false, maxWidth } = options;
    pdf.setFontSize(fontSize);
    pdf.setTextColor(...color);
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');

    if (maxWidth) {
      const lines = pdf.splitTextToSize(text, maxWidth);
      pdf.text(lines, x, y);
      return lines.length * (fontSize * 0.4);
    }

    pdf.text(text, x, y);
    return fontSize * 0.4;
  };

  const checkNewPage = (requiredSpace: number): void => {
    if (yPos + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      yPos = margin;
    }
  };

  const addSection = (title: string): void => {
    checkNewPage(20);
    yPos += 5;
    addText(title, margin, yPos, { fontSize: 14, color: primaryColor, bold: true });
    yPos += 8;
    // Underline
    pdf.setDrawColor(...primaryColor);
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
    yPos += 3;
  };

  // === HEADER ===
  // Title
  addText('StudyForge', margin, yPos, { fontSize: 24, color: primaryColor, bold: true });
  yPos += 8;
  addText('Learning Analytics Report', margin, yPos, { fontSize: 16, color: textColor, bold: true });
  yPos += 10;

  // Report metadata
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  addText(`Generated: ${dateStr}`, margin, yPos, { fontSize: 9, color: mutedColor });
  yPos += 5;
  addText(`Period: Last ${days} days`, margin, yPos, { fontSize: 9, color: mutedColor });
  if (categoryName) {
    yPos += 5;
    addText(`Category: ${categoryName}`, margin, yPos, { fontSize: 9, color: mutedColor });
  }
  yPos += 10;

  // === AI LEARNING SCORE ===
  if (dashboard.learning_score) {
    addSection('AI Learning Score');

    const score = dashboard.learning_score;

    // Score box
    pdf.setFillColor(243, 244, 246); // gray-100
    pdf.roundedRect(margin, yPos, pageWidth - margin * 2, 30, 3, 3, 'F');

    // Main score - vertically centered in box
    const boxCenterY = yPos + 15;
    const scoreColor = getScoreColorRGB(score.total_score);
    const scoreText = score.total_score.toFixed(0);
    addText(scoreText, margin + 8, boxCenterY + 4, { fontSize: 28, color: scoreColor, bold: true });

    // /100 positioned right after score
    const scoreWidth = scoreText.length * 8; // Approximate width based on font size
    addText('/100', margin + 8 + scoreWidth, boxCenterY + 4, { fontSize: 12, color: mutedColor });

    // Grade badge - positioned after /100
    addText(`Grade: ${score.grade}`, margin + 50, boxCenterY, { fontSize: 12, color: textColor, bold: true });

    // Component scores - organized in a clean 2x2 grid on the right side
    const gridStartX = margin + 95;
    const col1X = gridStartX;
    const col2X = gridStartX + 45;
    const row1Y = yPos + 10;
    const row2Y = yPos + 18;

    // Row 1: Accuracy and Improvement
    addText('Accuracy:', col1X, row1Y, { fontSize: 9, color: mutedColor });
    addText(score.accuracy_score.toFixed(0), col1X + 22, row1Y, { fontSize: 9, bold: true });

    addText('Improvement:', col2X, row1Y, { fontSize: 9, color: mutedColor });
    addText(score.improvement_score.toFixed(0), col2X + 28, row1Y, { fontSize: 9, bold: true });

    // Row 2: Consistency and Difficulty
    addText('Consistency:', col1X, row2Y, { fontSize: 9, color: mutedColor });
    addText(score.consistency_score.toFixed(0), col1X + 26, row2Y, { fontSize: 9, bold: true });

    addText('Difficulty:', col2X, row2Y, { fontSize: 9, color: mutedColor });
    addText(score.difficulty_score.toFixed(0), col2X + 22, row2Y, { fontSize: 9, bold: true });

    yPos += 35;

    // Recommendation
    if (includeRecommendations && score.recommendation) {
      addText('Recommendation:', margin, yPos, { fontSize: 10, bold: true });
      yPos += 5;
      const recHeight = addText(score.recommendation, margin, yPos, {
        fontSize: 9,
        color: mutedColor,
        maxWidth: pageWidth - margin * 2,
      });
      yPos += recHeight + 5;
    }
  }

  // === OVERVIEW STATISTICS ===
  if (dashboard.overview) {
    addSection('Overview Statistics');

    const overview = dashboard.overview;
    const colWidth = (pageWidth - margin * 2) / 3;

    // Row 1
    const stats = [
      { label: 'Questions Attempted', value: overview.total_attempts.toString() },
      { label: 'Correct Answers', value: overview.correct_count.toString() },
      { label: 'Accuracy Rate', value: `${overview.accuracy.toFixed(1)}%` },
    ];

    stats.forEach((stat, i) => {
      const x = margin + i * colWidth;
      addText(stat.value, x, yPos + 5, { fontSize: 16, bold: true });
      addText(stat.label, x, yPos + 11, { fontSize: 8, color: mutedColor });
    });
    yPos += 18;

    // Row 2
    const stats2 = [
      { label: 'Sessions Completed', value: overview.sessions_completed.toString() },
      { label: 'Day Streak', value: `${overview.streak_days} days` },
      { label: 'Total Study Time', value: `${overview.total_time_minutes.toFixed(0)} min` },
    ];

    stats2.forEach((stat, i) => {
      const x = margin + i * colWidth;
      addText(stat.value, x, yPos + 5, { fontSize: 16, bold: true });
      addText(stat.label, x, yPos + 11, { fontSize: 8, color: mutedColor });
    });
    yPos += 18;

    // Row 3
    addText(`Average Time per Question: ${overview.avg_time_per_question.toFixed(1)} seconds`, margin, yPos, {
      fontSize: 9,
      color: mutedColor,
    });
    yPos += 8;
  }

  // === DIFFICULTY BREAKDOWN ===
  if (dashboard.difficulty_breakdown) {
    addSection('Performance by Difficulty');

    const difficulties = ['easy', 'medium', 'hard'] as const;
    const diffColors: Record<string, [number, number, number]> = {
      easy: [34, 197, 94], // green
      medium: [245, 158, 11], // yellow
      hard: [239, 68, 68], // red
    };

    const colWidth = (pageWidth - margin * 2) / 3;

    difficulties.forEach((diff, i) => {
      const data = dashboard.difficulty_breakdown[diff];
      if (!data) return;

      const x = margin + i * colWidth;

      // Difficulty label
      addText(diff.charAt(0).toUpperCase() + diff.slice(1), x, yPos, {
        fontSize: 11,
        color: diffColors[diff],
        bold: true,
      });

      // Stats
      addText(`${data.accuracy.toFixed(1)}% accuracy`, x, yPos + 6, { fontSize: 9, color: textColor });
      addText(`${data.correct}/${data.total} correct`, x, yPos + 11, { fontSize: 8, color: mutedColor });
    });

    yPos += 18;
  }

  // === QUESTION TYPE BREAKDOWN ===
  if (dashboard.question_type_breakdown) {
    addSection('Performance by Question Type');

    const types = Object.entries(dashboard.question_type_breakdown);
    const colWidth = (pageWidth - margin * 2) / Math.min(types.length, 4);

    types.slice(0, 4).forEach(([type, data], i) => {
      const x = margin + i * colWidth;
      const formattedType = type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

      addText(formattedType, x, yPos, { fontSize: 9, bold: true });
      addText(`${data.accuracy.toFixed(1)}%`, x, yPos + 5, { fontSize: 8, color: textColor });
      addText(`${data.total} attempts`, x, yPos + 9, { fontSize: 7, color: mutedColor });
    });

    yPos += 16;

    // If more than 4 types, add second row
    if (types.length > 4) {
      types.slice(4).forEach(([type, data], i) => {
        const x = margin + i * colWidth;
        const formattedType = type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

        addText(formattedType, x, yPos, { fontSize: 9, bold: true });
        addText(`${data.accuracy.toFixed(1)}%`, x, yPos + 5, { fontSize: 8, color: textColor });
        addText(`${data.total} attempts`, x, yPos + 9, { fontSize: 7, color: mutedColor });
      });
      yPos += 16;
    }
  }

  // === CATEGORY PERFORMANCE ===
  if (dashboard.category_performance && dashboard.category_performance.length > 0) {
    addSection('Performance by Category');

    dashboard.category_performance.forEach((cat) => {
      checkNewPage(10);

      // Category name and accuracy
      addText(cat.category_name, margin, yPos, { fontSize: 10, bold: true });
      addText(`${cat.accuracy.toFixed(1)}%`, margin + 80, yPos, { fontSize: 10, color: textColor });
      addText(`(${cat.attempts} attempts)`, margin + 100, yPos, { fontSize: 8, color: mutedColor });

      // Progress bar
      const barY = yPos + 3;
      const barWidth = pageWidth - margin * 2 - 30;
      const barHeight = 4;

      // Background
      pdf.setFillColor(229, 231, 235); // gray-200
      pdf.roundedRect(margin, barY, barWidth, barHeight, 1, 1, 'F');

      // Progress
      const progressWidth = (cat.accuracy / 100) * barWidth;
      const color = hexToRgb(cat.color || '#6366f1');
      pdf.setFillColor(color[0], color[1], color[2]);
      pdf.roundedRect(margin, barY, progressWidth, barHeight, 1, 1, 'F');

      yPos += 12;
    });
  }

  // === HARDEST QUESTIONS ===
  if (dashboard.hardest_questions && dashboard.hardest_questions.length > 0) {
    addSection('Questions to Review');

    addText('These questions need more practice:', margin, yPos, { fontSize: 9, color: mutedColor });
    yPos += 6;

    dashboard.hardest_questions.slice(0, 5).forEach((q, index) => {
      checkNewPage(15);

      // Number badge
      pdf.setFillColor(254, 226, 226); // red-100
      pdf.circle(margin + 3, yPos + 2, 3, 'F');
      addText((index + 1).toString(), margin + 1.5, yPos + 3.5, { fontSize: 8, color: [185, 28, 28] });

      // Question text (truncated)
      const questionText = q.question_text.length > 80 ? q.question_text.substring(0, 80) + '...' : q.question_text;
      const textHeight = addText(questionText, margin + 10, yPos + 3, {
        fontSize: 9,
        maxWidth: pageWidth - margin * 2 - 15,
      });

      // Stats
      yPos += Math.max(textHeight, 5) + 2;
      addText(`${q.attempts} attempts | ${q.accuracy.toFixed(0)}% accuracy | ${q.difficulty}`, margin + 10, yPos, {
        fontSize: 7,
        color: mutedColor,
      });

      yPos += 8;
    });
  }

  // === FOOTER ===
  const footerY = pageHeight - 10;
  pdf.setFontSize(8);
  pdf.setTextColor(...mutedColor);
  pdf.text('Generated by StudyForge - AI-Powered Learning Analytics', pageWidth / 2, footerY, { align: 'center' });

  // Save the PDF
  pdf.save(filename);
}

/**
 * Export a specific DOM element to PDF (for charts)
 */
export async function exportElementToPDF(
  element: HTMLElement,
  filename: string = 'export.pdf'
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pageWidth - 20;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let yOffset = 10;

  // If image is taller than page, scale it
  if (imgHeight > pageHeight - 20) {
    const scale = (pageHeight - 20) / imgHeight;
    pdf.addImage(imgData, 'PNG', 10, yOffset, imgWidth * scale, imgHeight * scale);
  } else {
    pdf.addImage(imgData, 'PNG', 10, yOffset, imgWidth, imgHeight);
  }

  pdf.save(filename);
}

// Helper function to convert hex to RGB
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [99, 102, 241]; // default indigo
}

// Helper function to get score color as RGB
function getScoreColorRGB(score: number): [number, number, number] {
  if (score < 30) return [239, 68, 68]; // red
  if (score < 50) return [245, 158, 11]; // orange
  if (score < 70) return [234, 179, 8]; // yellow
  if (score < 85) return [34, 197, 94]; // green
  return [16, 185, 129]; // emerald
}

export default { exportAnalyticsToPDF, exportElementToPDF };
