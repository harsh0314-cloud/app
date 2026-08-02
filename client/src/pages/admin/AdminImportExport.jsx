import { useState } from 'react';
import api from '../../services/api';
import { Upload, Download, FileSpreadsheet, FileText as FileCsv, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import PermissionGate from '../../components/PermissionGate';
import { PERMISSIONS as P } from '../../lib/permissions';

export default function AdminImportExport() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState(null);
  const [exportFilters, setExportFilters] = useState({ filter: 'all', category: '', brand: '', search: '' });

  const doPreview = async () => {
    if (!file) return toast.error('Choose a CSV or Excel file first');
    setLoading(true); setReport(null); setPreview(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/admin/import/products/preview', fd);
      setPreview(res.data);
      toast.success(`Previewed ${res.data.summary.total} rows`);
    } catch (e) { toast.error(e.message || 'Preview failed'); }
    finally { setLoading(false); }
  };

  const doImport = async () => {
    if (!file) return toast.error('Choose a file first');
    setImporting(true); setReport(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/admin/import/products', fd);
      setReport(res.data.report);
      toast.success(`Imported: ${res.data.report.imported} · Updated: ${res.data.report.updated}`);
    } catch (e) { toast.error(e.message || 'Import failed'); }
    finally { setImporting(false); }
  };

  const downloadTemplate = async (format) => {
    try {
      const res = await api.get(`/admin/import/products/template?format=${format}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = `products-template.${format}`; a.click(); URL.revokeObjectURL(url);
    } catch (e) { toast.error(e.message || 'Download failed'); }
  };

  const downloadErrors = async (format) => {
    if (!report?.errors?.length) return;
    try {
      const data = btoa(unescape(encodeURIComponent(JSON.stringify(report.errors))));
      const res = await api.get(`/admin/import/products/errors?format=${format}&data=${encodeURIComponent(data)}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = `import-errors.${format}`; a.click(); URL.revokeObjectURL(url);
    } catch (e) { toast.error(e.message || 'Download failed'); }
  };

  const doExport = async (format) => {
    try {
      const params = new URLSearchParams({ format });
      Object.entries(exportFilters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await api.get(`/admin/export/products?${params}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = `products.${format}`; a.click(); URL.revokeObjectURL(url);
    } catch (e) { toast.error(e.message || 'Export failed'); }
  };

  return (
    <div className="space-y-8" data-testid="admin-import-export">
      <div>
        <h1 className="text-2xl font-bold">Bulk Import &amp; Export</h1>
        <p className="text-sm text-muted-foreground mt-1">Import products from CSV/Excel with preview &amp; validation. Export filtered lists in either format.</p>
      </div>

      <PermissionGate perm={P.IMPORT} fallback={<Blocked title="Import" />}>
        <section className="border border-border rounded-xl p-6 bg-white dark:bg-gray-800 space-y-4">
          <header className="flex items-center gap-2">
            <Upload size={18}/>
            <h2 className="text-lg font-semibold">Import products</h2>
          </header>
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => downloadTemplate('csv')} data-testid="tpl-csv-btn" className="inline-flex items-center gap-2 px-3 py-2 text-xs rounded-lg border border-border hover:bg-gray-50 dark:hover:bg-gray-700"><FileCsv size={12}/> CSV template</button>
            <button onClick={() => downloadTemplate('xlsx')} data-testid="tpl-xlsx-btn" className="inline-flex items-center gap-2 px-3 py-2 text-xs rounded-lg border border-border hover:bg-gray-50 dark:hover:bg-gray-700"><FileSpreadsheet size={12}/> Excel template</button>
          </div>
          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
            <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => { setFile(e.target.files?.[0] || null); setPreview(null); setReport(null); }} data-testid="import-file-input" className="hidden" id="import-file-input"/>
            <label htmlFor="import-file-input" className="cursor-pointer">
              <div className="mx-auto w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3"><Upload size={18}/></div>
              <p className="text-sm font-medium">{file ? file.name : 'Click to select CSV or Excel file'}</p>
              <p className="text-xs text-muted-foreground mt-1">Max 25 MB · Required columns: name, sku, price, category</p>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={doPreview} disabled={!file || loading} data-testid="import-preview-btn" className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-border hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">{loading ? 'Analyzing…' : 'Preview'}</button>
            <button onClick={doImport} disabled={!file || importing} data-testid="import-run-btn" className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-foreground text-white disabled:opacity-50">{importing ? 'Importing…' : 'Import now'}</button>
          </div>

          {preview && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="grid grid-cols-4 divide-x divide-border text-center bg-gray-50 dark:bg-gray-900/40 border-b border-border">
                <Metric label="Total"      value={preview.summary.total}/>
                <Metric label="Will create" value={preview.summary.willCreate}   tone="green"/>
                <Metric label="Will update" value={preview.summary.willUpdate}   tone="blue"/>
                <Metric label="Will skip"   value={preview.summary.willSkip}     tone={preview.summary.willSkip ? 'amber' : null}/>
              </div>
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-900/40"><tr>
                    <th className="text-left px-3 py-2">Row</th><th className="text-left px-3 py-2">Action</th><th className="text-left px-3 py-2">SKU</th><th className="text-left px-3 py-2">Name</th><th className="text-left px-3 py-2">Errors</th>
                  </tr></thead>
                  <tbody>
                    {preview.preview.slice(0, 500).map((r) => (
                      <tr key={r.rowNumber} className="border-t border-border">
                        <td className="px-3 py-1.5">{r.rowNumber}</td>
                        <td className="px-3 py-1.5"><span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${r.action === 'CREATE' ? 'bg-emerald-50 text-emerald-700' : r.action === 'UPDATE' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>{r.action}</span></td>
                        <td className="px-3 py-1.5 font-mono">{r.data.sku}</td>
                        <td className="px-3 py-1.5">{r.data.name}</td>
                        <td className="px-3 py-1.5 text-red-600">{r.errors.join('; ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {report && (
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                <Metric label="Total"    value={report.total}/>
                <Metric label="Imported" value={report.imported} tone="green" icon={<CheckCircle2 size={14}/>}/>
                <Metric label="Updated"  value={report.updated}  tone="blue"/>
                <Metric label="Skipped"  value={report.skipped}  tone="amber" icon={<AlertTriangle size={14}/>}/>
                <Metric label="Failed"   value={report.failed}   tone={report.failed ? 'red' : null} icon={<XCircle size={14}/>}/>
              </div>
              {report.errors.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => downloadErrors('csv')} data-testid="import-errors-csv-btn" className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded border border-border hover:bg-gray-50 dark:hover:bg-gray-700"><Download size={12}/> Error report (CSV)</button>
                  <button onClick={() => downloadErrors('xlsx')} data-testid="import-errors-xlsx-btn" className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded border border-border hover:bg-gray-50 dark:hover:bg-gray-700"><Download size={12}/> Error report (Excel)</button>
                </div>
              )}
            </div>
          )}
        </section>
      </PermissionGate>

      <PermissionGate perm={P.EXPORT} fallback={<Blocked title="Export" />}>
        <section className="border border-border rounded-xl p-6 bg-white dark:bg-gray-800 space-y-4">
          <header className="flex items-center gap-2">
            <Download size={18}/>
            <h2 className="text-lg font-semibold">Export products</h2>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select value={exportFilters.filter} onChange={(e) => setExportFilters({ ...exportFilters, filter: e.target.value })} data-testid="export-filter-select" className="px-3 py-2 border border-border rounded-lg text-sm bg-transparent">
              <option value="all">All products</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
            <input placeholder="Category slug (optional)" value={exportFilters.category} onChange={(e) => setExportFilters({ ...exportFilters, category: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm bg-transparent"/>
            <input placeholder="Brand slug (optional)" value={exportFilters.brand} onChange={(e) => setExportFilters({ ...exportFilters, brand: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm bg-transparent"/>
            <input placeholder="Search name/SKU" value={exportFilters.search} onChange={(e) => setExportFilters({ ...exportFilters, search: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm bg-transparent md:col-span-3"/>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => doExport('csv')} data-testid="export-csv-btn" className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-foreground text-white hover:opacity-90"><Download size={14}/> CSV</button>
            <button onClick={() => doExport('xlsx')} data-testid="export-xlsx-btn" className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:opacity-90"><Download size={14}/> Excel</button>
          </div>
        </section>
      </PermissionGate>
    </div>
  );
}

function Metric({ label, value, tone, icon }) {
  const map = { green: 'text-emerald-600', blue: 'text-blue-600', amber: 'text-amber-600', red: 'text-red-600' };
  return (
    <div className="p-3">
      <p className={`text-2xl font-bold inline-flex items-center gap-1 ${map[tone] || ''}`}>{icon}{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
function Blocked({ title }) {
  return (
    <div className="border border-dashed border-border rounded-xl p-6 text-center text-sm text-muted-foreground bg-white dark:bg-gray-800">
      You do not have permission to use {title.toLowerCase()}. Contact an administrator to request access.
    </div>
  );
}
