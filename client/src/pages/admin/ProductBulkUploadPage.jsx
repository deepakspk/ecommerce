import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import * as adminApi from "../../api/admin";
import { downloadBlob } from "../../utils/downloadBlob";
import { H1_CLASS, CARD_CLASS, BUTTON_PRIMARY, BUTTON_SECONDARY } from "../../utils/ui";

export default function ProductBulkUploadPage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingSample, setDownloadingSample] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const fileInputRef = useRef();

  async function handleDownloadSample() {
    setDownloadingSample(true);
    try {
      const blob = await adminApi.downloadBulkUploadSample();
      downloadBlob(blob, "product-bulk-upload-sample.xlsx");
    } catch {
      setError("Failed to download the sample file");
    } finally {
      setDownloadingSample(false);
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) { setError("Please choose an .xlsx file to upload"); return; }
    setError("");
    setResult(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const data = await adminApi.bulkUploadProducts(fd);
      setResult(data);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      setError(e.response?.data?.message || "Failed to upload the file");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/products" className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm">← Products</Link>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <h1 className={H1_CLASS}>Bulk Upload Products</h1>
      </div>

      <div className={`${CARD_CLASS} p-5 mb-5`}>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">1. Download the sample file</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Fill it in following the column headers, then upload it below. Categories must already
          exist and are matched by name (comma-separate multiple categories). Leave SKU, Size, and
          Color blank to auto-create a default variant, or fill in all three for a specific variant.
        </p>
        <button type="button" onClick={handleDownloadSample} disabled={downloadingSample} className={BUTTON_SECONDARY}>
          {downloadingSample ? "Downloading…" : "Download Sample .xlsx"}
        </button>
      </div>

      <div className={`${CARD_CLASS} p-5 mb-5`}>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">2. Upload your file</h2>
        <form onSubmit={handleUpload} className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={(e) => setFile(e.target.files[0] || null)}
            className="text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 dark:file:bg-gray-800 dark:file:text-gray-200"
          />
          <button type="submit" disabled={uploading || !file} className={BUTTON_PRIMARY}>
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </form>
        {error && (
          <p className="text-red-700 dark:text-red-400 text-sm bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 mt-3">
            {error}
          </p>
        )}
      </div>

      {result && (
        <div className={`${CARD_CLASS} p-5`}>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Results</h2>
          <div className="flex gap-4 mb-4 text-sm">
            <span className="text-gray-600 dark:text-gray-300">Total: {result.summary.total}</span>
            <span className="text-green-700 dark:text-green-400 font-medium">Created: {result.summary.created}</span>
            <span className="text-red-700 dark:text-red-400 font-medium">Failed: {result.summary.failed}</span>
          </div>
          {result.results.length === 0 ? (
            <p className="text-sm text-gray-400">No rows were found in the file.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="pb-2 pr-3 font-medium">Row</th>
                    <th className="pb-2 pr-3 font-medium">Name</th>
                    <th className="pb-2 pr-3 font-medium">Status</th>
                    <th className="pb-2 font-medium">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {result.results.map((r) => (
                    <tr key={r.row}>
                      <td className="py-2 pr-3 text-gray-500 dark:text-gray-400">{r.row}</td>
                      <td className="py-2 pr-3 text-gray-800 dark:text-gray-100">{r.name || "—"}</td>
                      <td className="py-2 pr-3">
                        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          r.status === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                        }`}>
                          {r.status === "success" ? "Created" : "Failed"}
                        </span>
                      </td>
                      <td className="py-2 text-gray-600 dark:text-gray-300">{r.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
