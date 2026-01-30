import { useState, useCallback } from 'react';
import { FileSpreadsheet, Download, AlertCircle, CheckCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileUpload } from './FileUpload';
import * as XLSX from 'xlsx';
import type { CSVRow } from '@/types/generator';

interface CSVUploaderProps {
  onDataLoaded: (data: CSVRow[]) => void;
  data: CSVRow[];
}

export function CSVUploader({ onDataLoaded, data }: CSVUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);

  const parseCSV = useCallback((content: string): { rows: CSVRow[]; headers: string[] } => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have a header row and at least one data row');
    }
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const headerLower = headers.map(h => h.toLowerCase());
    const nameIndex = headerLower.findIndex(h => h === 'name' || h === 'names' || h === 'full name' || h === 'fullname');
    const idIndex = headerLower.findIndex(h => h === 'id' || h === 'serial' || h === 'number' || h === 'serial number' || h === 'employee id');
    
    if (nameIndex === -1) {
      throw new Error('CSV must have a "Name" column');
    }
    
    const rows: CSVRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      if (values[nameIndex]) {
        const row: CSVRow = {
          name: values[nameIndex],
          id: idIndex !== -1 ? values[idIndex] : undefined,
        };
        
        // Add all other columns as custom fields
        headers.forEach((header, index) => {
          if (index !== nameIndex && index !== idIndex && values[index]) {
            const fieldName = header.toLowerCase().replace(/\s+/g, '_');
            row[fieldName] = values[index];
          }
        });
        
        rows.push(row);
      }
    }
    
    return { rows, headers };
  }, []);

  const parseExcel = useCallback(async (file: File): Promise<{ rows: CSVRow[]; headers: string[] }> => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { header: 1 });
    
    if (jsonData.length < 2) {
      throw new Error('Excel file must have a header row and at least one data row');
    }
    
    const headers = (jsonData[0] as string[]).map(h => String(h || '').trim());
    const headersLower = headers.map(h => h.toLowerCase());
    const nameIndex = headersLower.findIndex(h => h === 'name' || h === 'names' || h === 'full name' || h === 'fullname');
    const idIndex = headersLower.findIndex(h => h === 'id' || h === 'serial' || h === 'number' || h === 'serial number' || h === 'employee id');
    
    if (nameIndex === -1) {
      throw new Error('Excel file must have a "Name" column');
    }
    
    const rows: CSVRow[] = [];
    for (let i = 1; i < jsonData.length; i++) {
      const rowData = jsonData[i] as (string | number | undefined)[];
      if (rowData && rowData[nameIndex]) {
        const row: CSVRow = {
          name: String(rowData[nameIndex]),
          id: idIndex !== -1 && rowData[idIndex] !== undefined ? String(rowData[idIndex]) : undefined,
        };
        
        // Add all other columns as custom fields
        headers.forEach((header, index) => {
          if (index !== nameIndex && index !== idIndex && rowData[index] !== undefined) {
            const fieldName = header.toLowerCase().replace(/\s+/g, '_');
            row[fieldName] = String(rowData[index]);
          }
        });
        
        rows.push(row);
      }
    }
    
    return { rows, headers };
  }, []);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setError(null);
    setFile(selectedFile);
    
    try {
      let result: { rows: CSVRow[]; headers: string[] };
      
      if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        result = await parseExcel(selectedFile);
      } else {
        const content = await selectedFile.text();
        result = parseCSV(content);
      }
      
      setColumns(result.headers);
      onDataLoaded(result.rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
      onDataLoaded([]);
    }
  }, [onDataLoaded, parseCSV, parseExcel]);

  const handleDownloadSample = () => {
    const sampleCSV = `Name,ID,Department,Title,Date
John Doe,EMP-001,Engineering,Software Engineer,2024-01-15
Jane Smith,EMP-002,Marketing,Marketing Manager,2024-01-16
Robert Johnson,EMP-003,Sales,Sales Director,2024-01-17
Emily Davis,EMP-004,HR,HR Specialist,2024-01-18
Michael Brown,EMP-005,Finance,Financial Analyst,2024-01-19`;
    
    const blob = new Blob([sampleCSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-data.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setFile(null);
    setError(null);
    setColumns([]);
    onDataLoaded([]);
  };

  // Get all unique keys from data for table display
  const getDisplayColumns = (): string[] => {
    const cols = ['name'];
    if (data.length > 0 && data[0].id !== undefined) {
      cols.push('id');
    }
    // Add any other columns from the data
    if (data.length > 0) {
      Object.keys(data[0]).forEach(key => {
        if (key !== 'name' && key !== 'id' && !cols.includes(key)) {
          cols.push(key);
        }
      });
    }
    return cols;
  };

  const displayColumns = getDisplayColumns();

  return (
    <div className="space-y-6">
      <FileUpload
        accept=".csv,.xlsx,.xls"
        title="Upload your data file"
        description="CSV or Excel file with Name and ID (optional) columns"
        icon={<FileSpreadsheet className="w-8 h-8 text-muted-foreground" />}
        onFileSelect={handleFileSelect}
        selectedFile={file}
        onClear={handleClear}
      />
      
      {error && (
        <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-xl animate-fade-in">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Error parsing file</p>
            <p className="text-sm text-destructive/80">{error}</p>
          </div>
        </div>
      )}
      
      {data.length > 0 && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="font-medium text-foreground">Data loaded successfully</p>
                <p className="text-sm text-muted-foreground">
                  {data.length} records found • {displayColumns.length} columns
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">{data.length}</span>
            </div>
          </div>
          
          {/* Preview table */}
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="max-h-64 overflow-auto">
              <table className="w-full">
                <thead className="bg-secondary sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      #
                    </th>
                    {displayColumns.map(col => (
                      <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {col.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.slice(0, 10).map((row, index) => (
                    <tr key={index} className="hover:bg-secondary/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {index + 1}
                      </td>
                      {displayColumns.map(col => (
                        <td key={col} className={`px-4 py-3 text-sm ${col === 'name' ? 'font-medium text-foreground' : 'text-muted-foreground'} ${col === 'id' ? 'font-mono' : ''}`}>
                          {row[col] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.length > 10 && (
              <div className="px-4 py-3 bg-secondary/50 border-t border-border text-sm text-muted-foreground text-center">
                and {data.length - 10} more records...
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-center gap-2 pt-4">
        <span className="text-sm text-muted-foreground">Need a sample file?</span>
        <Button variant="link" size="sm" onClick={handleDownloadSample} className="gap-2">
          <Download className="w-4 h-4" />
          Download Sample CSV
        </Button>
      </div>
    </div>
  );
}
