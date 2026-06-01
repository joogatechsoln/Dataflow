/**
 * Collect.tsx — DataFlow Suite Web
 * File upload → DuckDB-WASM table registration.
 * Supports drag-and-drop CSV, Excel, JSON.
 */
import { useState, useRef, useCallback } from "react";
import { useProjectStore } from "../../../store/projectStore";
import { importFile, formatFileSize, ImportResult } from "../../../lib/fileImport";
import { initDuckDB } from "../../../lib/duckdb";

interface ImportedTable {
  result: ImportResult;
  importedAt: string;
}

export default function Collect() {
  const { activeProjectId, addDataSource } = useProjectStore();
  const [tables, setTables] = useState<ImportedTable[]>([]);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setImporting(true); setError(null);
    await initDuckDB();
    const arr = Array.from(files);
    const results: ImportedTable[] = [];
    for (const file of arr) {
      const result = await importFile(file, undefined, activeProjectId ?? undefined);
      results.push({ result, importedAt: new Date().toISOString() });
      if (activeProjectId && result.fileId && !result.error) {
        addDataSource(activeProjectId, {
          id: result.fileId,
          type: result.fileName.toLowerCase().endsWith(".json")
            ? "api"
            : result.fileName.toLowerCase().endsWith(".csv") || result.fileName.toLowerCase().endsWith(".tsv")
              ? "csv"
              : "excel",
          name: result.fileName,
          connected: true,
          config: { tableName: result.tableName },
        });
      }
    }
    setTables((prev) => [...prev, ...results]);
    const errors = results.filter((r) => r.result.error);
    if (errors.length) setError(errors.map((r) => `${r.result.fileName}: ${r.result.error}`).join("\n"));
    setImporting(false);
  }, [activeProjectId, addDataSource]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  return (
    <div style={{ padding:24, overflowY:"auto", height:"100%" }}>
      <h2 style={{ fontSize:16, fontWeight:600, margin:"0 0 4px" }}>Collect Data</h2>
      <p style={{ fontSize:12, color:"#73726c", margin:"0 0 20px" }}>Upload CSV, Excel, or JSON files. They'll be registered as DuckDB tables you can query in the Analyze tab.</p>

      {/* Drop zone */}
      <div
        onDragOver={(e)=>{e.preventDefault();setDragging(true);}}
        onDragLeave={()=>setDragging(false)}
        onDrop={onDrop}
        onClick={()=>fileInputRef.current?.click()}
        style={{ border:`2px dashed ${dragging?"#534AB7":"#d0cec6"}`, borderRadius:14, padding:"40px 24px", textAlign:"center", cursor:"pointer", background:dragging?"#EEEDFE":"white", transition:"all 0.15s", marginBottom:20 }}
      >
        <div style={{ fontSize:40, marginBottom:10 }}>{importing?"⏳":"📂"}</div>
        <div style={{ fontSize:14, fontWeight:600, color:"#1a1a18", marginBottom:4 }}>
          {importing ? "Importing…" : dragging ? "Drop to import" : "Drag & drop files here"}
        </div>
        <div style={{ fontSize:12, color:"#73726c", marginBottom:12 }}>CSV, Excel (.xlsx), JSON — or click to browse</div>
        <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" }}>
          {["CSV","Excel","JSON"].map((f)=>(
            <span key={f} style={{ fontSize:11, padding:"3px 10px", background:"#f0ede8", borderRadius:20, color:"#73726c", border:"0.5px solid #e8e6e0" }}>{f}</span>
          ))}
        </div>
        <input ref={fileInputRef} type="file" multiple accept=".csv,.tsv,.xlsx,.xls,.json" style={{ display:"none" }} onChange={(e)=>{if(e.target.files)handleFiles(e.target.files);}} />
      </div>

      {error && (
        <div style={{ background:"#FCEBEB", border:"0.5px solid #F0A0A0", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#791F1F", marginBottom:16, whiteSpace:"pre-wrap" }}>
          {error}
        </div>
      )}

      {/* Imported tables */}
      {tables.length > 0 && (
        <>
          <h3 style={{ fontSize:13, fontWeight:600, margin:"0 0 10px" }}>Imported tables ({tables.length})</h3>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {tables.map(({ result: r, importedAt }, i) => (
              <div key={i} style={{ background:"white", border:`0.5px solid ${r.error?"#F0A0A0":"#e8e6e0"}`, borderRadius:10, padding:"12px 16px", display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:r.error?"#FCEBEB":"#EEEDFE", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
                  {r.error?"⚠️":r.fileName.endsWith(".csv")?"📄":r.fileName.endsWith(".json")?"📋":"📊"}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{r.fileName}</div>
                  {r.error ? (
                    <div style={{ fontSize:11, color:"#E24B4A", marginTop:2 }}>{r.error}</div>
                  ) : (
                    <div style={{ fontSize:11, color:"#73726c", marginTop:2 }}>
                      Table: <code style={{ background:"#f0ede8", padding:"1px 5px", borderRadius:4, color:"#534AB7" }}>{r.tableName}</code>
                      {" · "}{r.rowCount.toLocaleString()} rows · {r.columns.length} cols · {formatFileSize(r.sizeBytes)} · {r.durationMs}ms
                    </div>
                  )}
                </div>
                {!r.error && (
                  <span style={{ fontSize:10, padding:"3px 8px", background:"#ECFDF5", color:"#1D9E75", borderRadius:20, border:"0.5px solid #7DCFB6" }}>✓ Ready</span>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop:14, padding:"10px 14px", background:"#f0f9ff", borderRadius:8, fontSize:12, color:"#0369a1" }}>
            💡 Go to the <strong>Analyze</strong> tab to query these tables with SQL or Python.
          </div>
        </>
      )}

      {tables.length === 0 && !importing && (
        <div style={{ marginTop:8 }}>
          <h3 style={{ fontSize:13, fontWeight:600, margin:"0 0 10px", color:"#73726c" }}>Supported sources</h3>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, maxWidth:480 }}>
            {[
              { icon:"📄", name:"CSV / TSV", desc:"Comma or tab-separated values" },
              { icon:"📊", name:"Excel", desc:".xlsx and .xls workbooks" },
              { icon:"📋", name:"JSON", desc:"Arrays of objects" },
              { icon:"🔗", name:"Database connectors", desc:"PostgreSQL, MySQL — coming soon", locked:true },
              { icon:"📡", name:"REST API", desc:"JSON API endpoints — coming soon", locked:true },
              { icon:"📈", name:"Google Sheets", desc:"Read-only sheet import — coming soon", locked:true },
            ].map((s)=>(
              <div key={s.name} style={{ padding:"10px 12px", border:"0.5px solid #e8e6e0", borderRadius:10, background:s.locked?"#fafaf9":"white", opacity:s.locked?0.6:1 }}>
                <div style={{ fontSize:16, marginBottom:4 }}>{s.icon}</div>
                <div style={{ fontSize:12, fontWeight:600 }}>{s.name}{s.locked&&" 🔒"}</div>
                <div style={{ fontSize:11, color:"#73726c" }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
