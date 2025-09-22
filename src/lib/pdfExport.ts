// PDF Export utility using built-in browser APIs
// This implementation uses the browser's native print functionality for PDF generation
// which is more reliable and doesn't require additional dependencies

export interface ExportOptions {
  filename?: string;
  title?: string;
  orientation?: 'portrait' | 'landscape';
  format?: 'A4' | 'letter';
  margins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

export class PDFExporter {
  private static createPrintableContent(element: HTMLElement, options: ExportOptions): string {
    const { title = 'Analytics Report', orientation = 'portrait' } = options;
    
    // Clone the element to avoid modifying the original
    const clonedElement = element.cloneNode(true) as HTMLElement;
    
    // Apply print-specific styles
    const printStyles = `
      <style>
        @page {
          size: ${orientation === 'landscape' ? 'landscape' : 'portrait'};
          margin: 1in;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 12px;
          line-height: 1.4;
          color: #000;
          background: white;
        }
        
        .print-header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
        }
        
        .print-header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: bold;
        }
        
        .print-header .date {
          margin: 5px 0 0 0;
          font-size: 14px;
          color: #666;
        }
        
        .print-content {
          margin: 0;
          padding: 0;
        }
        
        /* Hide interactive elements */
        button, .hover\\:*, [role="button"] {
          display: none !important;
        }
        
        /* Ensure charts and graphics print well */
        canvas, img, svg {
          max-width: 100%;
          height: auto;
          page-break-inside: avoid;
        }
        
        /* Table styling for better print */
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          page-break-inside: avoid;
        }
        
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        
        th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        
        /* Card styling */
        .bg-white, .bg-gray-50, .bg-blue-50, .bg-green-50, .bg-yellow-50, .bg-red-50 {
          background: white !important;
          border: 1px solid #ddd;
          margin: 10px 0;
          padding: 15px;
          page-break-inside: avoid;
        }
        
        /* Color adjustments for print */
        .text-blue-600, .text-green-600, .text-red-600, .text-yellow-600, .text-purple-600 {
          color: #000 !important;
        }
        
        /* Grid layout adjustments */
        .grid {
          display: block;
        }
        
        .grid > div {
          margin: 10px 0;
          page-break-inside: avoid;
        }
        
        /* Hide navigation and non-essential elements */
        nav, .sticky, .fixed, .z-10, .z-20, .z-30, .z-40, .z-50 {
          display: none !important;
        }
        
        /* Page breaks */
        .page-break {
          page-break-before: always;
        }
        
        .avoid-break {
          page-break-inside: avoid;
        }
      </style>
    `;
    
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          ${printStyles}
        </head>
        <body>
          <div class="print-header">
            <h1>${title}</h1>
            <div class="date">Generated on ${currentDate}</div>
          </div>
          <div class="print-content">
            ${clonedElement.outerHTML}
          </div>
        </body>
      </html>
    `;
  }

  public static async exportToPDF(
    element: HTMLElement | string, 
    options: ExportOptions = {}
  ): Promise<void> {
    const { filename = 'analytics-report.pdf' } = options;
    
    try {
      let targetElement: HTMLElement;
      
      if (typeof element === 'string') {
        const found = document.querySelector(element) as HTMLElement;
        if (!found) {
          throw new Error(`Element with selector "${element}" not found`);
        }
        targetElement = found;
      } else {
        targetElement = element;
      }

      // Create printable content
      const printContent = this.createPrintableContent(targetElement, options);
      
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Could not open print window. Please allow popups for this site.');
      }

      // Write content to the new window
      printWindow.document.write(printContent);
      printWindow.document.close();

      // Wait for content to load
      await new Promise<void>((resolve) => {
        printWindow.onload = () => {
          // Small delay to ensure all styles are applied
          setTimeout(resolve, 100);
        };
      });

      // Focus the window and trigger print
      printWindow.focus();
      printWindow.print();

      // Close the window after printing
      setTimeout(() => {
        printWindow.close();
      }, 1000);

    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw error;
    }
  }

  public static async exportTableToCSV(
    tableElement: HTMLTableElement | string,
    filename: string = 'export.csv'
  ): Promise<void> {
    try {
      let table: HTMLTableElement;
      
      if (typeof tableElement === 'string') {
        const found = document.querySelector(tableElement) as HTMLTableElement;
        if (!found) {
          throw new Error(`Table with selector "${tableElement}" not found`);
        }
        table = found;
      } else {
        table = tableElement;
      }

      const csvContent = this.tableToCSV(table);
      this.downloadCSV(csvContent, filename);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      throw error;
    }
  }

  private static tableToCSV(table: HTMLTableElement): string {
    const rows = Array.from(table.querySelectorAll('tr'));
    
    return rows.map(row => {
      const cells = Array.from(row.querySelectorAll('th, td'));
      return cells.map(cell => {
        // Get text content and clean it up
        let text = cell.textContent || '';
        text = text.trim();
        
        // Escape quotes and wrap in quotes if necessary
        if (text.includes(',') || text.includes('"') || text.includes('\n')) {
          text = '"' + text.replace(/"/g, '""') + '"';
        }
        
        return text;
      }).join(',');
    }).join('\n');
  }

  private static downloadCSV(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // Fallback for browsers that don't support download attribute
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      URL.revokeObjectURL(url);
    }
  }

  // Export multiple elements as a single PDF report
  public static async exportMultiSectionReport(
    sections: Array<{
      element: HTMLElement | string;
      title: string;
      pageBreak?: boolean;
    }>,
    options: ExportOptions = {}
  ): Promise<void> {
    const { filename = 'multi-section-report.pdf', title = 'Analytics Report' } = options;
    
    try {
      const sectionContents = await Promise.all(
        sections.map(async (section, index) => {
          let targetElement: HTMLElement;
          
          if (typeof section.element === 'string') {
            const found = document.querySelector(section.element) as HTMLElement;
            if (!found) {
              throw new Error(`Element with selector "${section.element}" not found`);
            }
            targetElement = found;
          } else {
            targetElement = section.element;
          }

          const clonedElement = targetElement.cloneNode(true) as HTMLElement;
          
          return `
            ${section.pageBreak && index > 0 ? '<div class="page-break"></div>' : ''}
            <div class="avoid-break">
              <h2 style="margin-top: 30px; margin-bottom: 20px; font-size: 18px; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 10px;">
                ${section.title}
              </h2>
              ${clonedElement.outerHTML}
            </div>
          `;
        })
      );

      // Create a temporary container with all sections
      const container = document.createElement('div');
      container.innerHTML = sectionContents.join('');
      
      await this.exportToPDF(container, { ...options, title, filename });
    } catch (error) {
      console.error('Error exporting multi-section report:', error);
      throw error;
    }
  }
}

// Utility functions for common export scenarios
export const exportAnalyticsDashboard = async (
  dashboardSelector: string = '.analytics-dashboard',
  filename: string = 'analytics-dashboard.pdf'
) => {
  return PDFExporter.exportToPDF(dashboardSelector, {
    filename,
    title: 'CryptoCraze Analytics Dashboard',
    orientation: 'landscape'
  });
};

export const exportRetentionReport = async (
  retentionSelector: string = '.retention-analytics',
  filename: string = 'retention-report.pdf'
) => {
  return PDFExporter.exportToPDF(retentionSelector, {
    filename,
    title: 'User Retention Analytics Report'
  });
};

export const exportRegionalReport = async (
  regionalSelector: string = '.regional-analytics',
  filename: string = 'regional-report.pdf'
) => {
  return PDFExporter.exportToPDF(regionalSelector, {
    filename,
    title: 'Regional Analytics Report',
    orientation: 'landscape'
  });
};

export const exportMonetizationReport = async (
  monetizationSelector: string = '.monetization-analytics',
  filename: string = 'monetization-report.pdf'
) => {
  return PDFExporter.exportToPDF(monetizationSelector, {
    filename,
    title: 'Monetization Analytics Report'
  });
};