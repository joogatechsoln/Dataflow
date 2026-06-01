/**
 * Analyze.tsx — DataFlow Suite Web
 * Real DuckDB-WASM SQL + Pyodide Python + Spreadsheet view.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { runQuery, initDuckDB, listTables, isDuckDBReady, QueryResult } from "../../../lib/duckdb";
import { ComponentErrorBoundary } from "../../../components/ErrorBoundary/ErrorBoundary";
import { VirtualList } from "../../../components/ui/VirtualList";

type SubTab = "sql" | "python" | "spreadsheet";

export default function Analyze() {
  const [subTab, setSubTab] = useState<SubTab>("sql");
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:"#fafaf9" }}>
      <div style={{ display:"flex", gap:2, padding:"10px 16px 0", borderBottom:"0.5px solid #e8e6e0", background:"white", flexShrink:0 }}>
        {(["sql","python","spreadsheet"] as SubTab[]).map((t) => (
          <button key={t} onClick={() => setSubTab(t)} style={{ padding:"7px 16px", borderRadius:"6px 6px 0 0", fontSize:12, fontWeight:subTab===t?600:400, cursor:"pointer", border:"0.5px solid", borderBottom:"none", borderColor:subTab===t?"#e8e6e0":"transparent", background:subTab===t?"#fafaf9":"transparent", color:subTab===t?"#1a1a18":"#73726c" }}>
            {t==="sql"?"⚡ SQL Editor":t==="python"?"🐍 Python":"📋 Spreadsheet"}
          </button>
        ))}
      </div>
      <div style={{ flex:1, overflow:"hidden" }}>
        {subTab==="sql"         && <ComponentErrorBoundary name="SQL"><SQLEditor /></ComponentErrorBoundary>}
        {subTab==="python"      && <ComponentErrorBoundary name="Python"><PythonNotebook /></ComponentErrorBoundary>}
        {subTab==="spreadsheet" && <ComponentErrorBoundary name="Spreadsheet"><SpreadsheetView /></ComponentErrorBoundary>}
      </div>
    </div>
  );
}

function SQLEditor() {
  const [sql, setSql] = useState("SELECT 'Hello from DuckDB! 🦆' AS message, now() AS ts");
  const [result, setResult] = useState<QueryResult|null>(null);
  const [running, setRunning] = useState(false);
  const [dbReady, setDbReady] = useState(isDuckDBReady());
  const [tables, setTables] = useState<string[]>([]);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    if (!isDuckDBReady()) {
      initDuckDB().then(() => { setDbReady(true); listTables().then(setTables).catch(()=>{}); }).catch((e) => setError(e.message));
    } else {
      listTables().then(setTables).catch(()=>{});
    }
  }, []);

  const runSQL = useCallback(async () => {
    if (!sql.trim()||running) return;
    setRunning(true); setError(null);
    try {
      const res = await runQuery(sql, {useCache:false});
      setResult(res);
      if (res.error) setError(res.error);
      listTables().then(setTables).catch(()=>{});
    } catch(e) { setError(e instanceof Error?e.message:String(e)); }
    finally { setRunning(false); }
  }, [sql, running]);

  return (
    <div style={{ display:"flex", height:"100%", overflow:"hidden" }}>
      <div style={{ width:180, borderRight:"0.5px solid #e8e6e0", background:"white", flexShrink:0, overflowY:"auto" }}>
        <div style={{ padding:"10px 12px 6px", fontSize:10, fontWeight:700, letterSpacing:"0.08em", color:"#b0aea6", textTransform:"uppercase" }}>Tables</div>
        {tables.length===0 ? <div style={{ padding:"8px 12px", fontSize:11, color:"#b0aea6" }}>Upload data in Collect tab</div>
          : tables.map((t) => <button key={t} onClick={()=>setSql(`SELECT * FROM "${t}" LIMIT 100`)} style={{ padding:"6px 12px", display:"block", width:"100%", textAlign:"left", fontSize:12, background:"none", border:"none", cursor:"pointer", color:"#534AB7" }}>{t}</button>)
        }
        <div style={{ padding:"10px 12px 4px", fontSize:10, fontWeight:700, letterSpacing:"0.08em", color:"#b0aea6", textTransform:"uppercase" }}>Engine</div>
        <div style={{ padding:"0 12px 10px", fontSize:11, color:dbReady?"#1D9E75":"#b0aea6" }}>{dbReady?"● DuckDB WASM ready":"○ Initialising…"}</div>
      </div>
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderBottom:"0.5px solid #e8e6e0", background:"white", flexShrink:0 }}>
          <button className="btn btn-primary" style={{ padding:"6px 14px", fontSize:12 }} onClick={runSQL} disabled={running||!dbReady}>
            {running?"Running…":"▶ Run"} <span style={{ fontSize:10, opacity:0.7 }}>Ctrl+Enter</span>
          </button>
          {result && <span style={{ fontSize:11, color:"#73726c" }}>{result.rowCount.toLocaleString()} rows · {result.durationMs}ms</span>}
          {error && <span style={{ fontSize:11, color:"#E24B4A" }}>Error</span>}
        </div>
        <textarea value={sql} onChange={(e)=>setSql(e.target.value)}
          onKeyDown={(e)=>{ if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();runSQL();} }}
          spellCheck={false}
          style={{ flex:"0 0 160px", resize:"vertical", fontFamily:"monospace", fontSize:13, lineHeight:1.6, padding:"12px 16px", border:"none", borderBottom:"0.5px solid #e8e6e0", outline:"none", background:"#1e1e2e", color:"#cdd6f4", minHeight:100 }}
        />
        {error && <div style={{ padding:"8px 14px", background:"#FCEBEB", fontSize:12, color:"#791F1F", fontFamily:"monospace", flexShrink:0 }}>{error}</div>}
        <div style={{ flex:1, overflow:"auto" }}>
          {result&&!result.error&&result.rows.length>0 && <ResultsTable result={result} />}
          {result&&result.rows.length===0&&!result.error && <div style={{ padding:24, textAlign:"center", fontSize:13, color:"#73726c" }}>Query returned 0 rows</div>}
          {!result && <div style={{ padding:32, textAlign:"center", color:"#b0aea6", fontSize:13 }}><div style={{ fontSize:32, marginBottom:8 }}>🦆</div>Run a query to see results{!dbReady&&<div style={{ marginTop:8, fontSize:11 }}>Loading DuckDB-WASM from CDN…</div>}</div>}
        </div>
      </div>
    </div>
  );
}

function ResultsTable({ result }: { result: QueryResult }) {
  const [h, setH] = useState(400);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new ResizeObserver(([e]) => setH(e.contentRect.height));
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ height:"100%", overflow:"hidden" }}>
      <div style={{ display:"flex", background:"#f5f5f4", borderBottom:"0.5px solid #e8e6e0" }}>
        {result.columns.map((col) => <div key={col} style={{ flex:1, padding:"6px 10px", fontSize:11, fontWeight:600, color:"#5F5E5A", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", minWidth:100, borderRight:"0.5px solid #e8e6e0" }}>{col}</div>)}
      </div>
      <VirtualList items={result.rows} itemHeight={32} height={h-32} renderItem={(row, i) => (
        <div style={{ display:"flex", background:i%2===0?"white":"#fafaf9", borderBottom:"0.5px solid #f0ede8" }}>
          {result.columns.map((col) => {
            const v = row[col];
            return <div key={col} style={{ flex:1, padding:"4px 10px", fontSize:12, color:v===null?"#b0aea6":"#1a1a18", fontFamily:typeof v==="number"?"monospace":"inherit", textAlign:typeof v==="number"?"right":"left", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", minWidth:100, borderRight:"0.5px solid #f0ede8" }}>{v===null?"null":String(v)}</div>;
          })}
        </div>
      )} />
    </div>
  );
}

function PythonNotebook() {
  const [cells, setCells] = useState([
    { id:"1", code:"import sys\nprint(f'Python {sys.version}')\n'Ready! 🐍'", output:"", running:false },
    { id:"2", code:"# pandas works too!\nimport pandas as pd\npd.DataFrame({'x':[1,2,3],'y':[4,5,6]})", output:"", running:false },
  ]);
  const [pyReady, setPyReady] = useState(false);
  const [pyLoading, setPyLoading] = useState(false);
  const pyRef = useRef<unknown>(null);

  const loadPyodide = async () => {
    if (pyRef.current||pyLoading) return;
    setPyLoading(true);
    try {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js";
      document.head.appendChild(s);
      await new Promise((res,rej)=>{ s.onload=res; s.onerror=rej; });
      // @ts-ignore
      const py = await window.loadPyodide({ indexURL:"https://cdn.jsdelivr.net/pyodide/v0.26.1/full/" });
      await py.loadPackage(["pandas","numpy"]);
      pyRef.current = py; setPyReady(true);
    } catch(e) { console.error(e); }
    finally { setPyLoading(false); }
  };

  const runCell = async (id: string) => {
    if (!pyRef.current) return;
    setCells((cs)=>cs.map((c)=>c.id===id?{...c,running:true,output:""}:c));
    const cell = cells.find((c)=>c.id===id);
    if (!cell) return;
    try {
      const py = pyRef.current as any;
      await py.runPythonAsync("import sys,io\n_buf=io.StringIO()\nsys.stdout=_buf");
      const result = await py.runPythonAsync(cell.code);
      const stdout = await py.runPythonAsync("_buf.getvalue()");
      await py.runPythonAsync("sys.stdout=sys.__stdout__");
      const output = stdout||(result!==undefined&&result!==null?String(result):"");
      setCells((cs)=>cs.map((c)=>c.id===id?{...c,running:false,output}:c));
    } catch(e) {
      setCells((cs)=>cs.map((c)=>c.id===id?{...c,running:false,output:`Error: ${e instanceof Error?e.message:String(e)}`}:c));
    }
  };

  return (
    <div style={{ height:"100%", overflowY:"auto", padding:16 }}>
      {!pyReady && (
        <div style={{ background:"#EEEDFE", border:"0.5px solid #AFA9EC", borderRadius:10, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:20 }}>🐍</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:600, color:"#534AB7" }}>Python via Pyodide</div>
            <div style={{ fontSize:11, color:"#73726c" }}>Loads Python + pandas + numpy in your browser (~12MB, once per session)</div>
          </div>
          <button className="btn btn-primary" style={{ fontSize:12 }} onClick={loadPyodide} disabled={pyLoading}>{pyLoading?"Loading…":"Load Python"}</button>
        </div>
      )}
      {cells.map((cell,idx) => (
        <div key={cell.id} style={{ marginBottom:12, border:"0.5px solid #e8e6e0", borderRadius:10, overflow:"hidden", background:"white" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px", background:"#f5f5f4", borderBottom:"0.5px solid #e8e6e0" }}>
            <span style={{ fontSize:11, color:"#b0aea6", fontFamily:"monospace" }}>In [{idx+1}]</span>
            <button className="btn btn-primary" style={{ padding:"3px 10px", fontSize:11 }} onClick={()=>runCell(cell.id)} disabled={!pyReady||cell.running}>{cell.running?"⏳":"▶ Run"}</button>
            <button className="btn btn-ghost" style={{ fontSize:11, marginLeft:"auto" }} onClick={()=>setCells((cs)=>cs.filter((c)=>c.id!==cell.id))}>✕</button>
          </div>
          <textarea value={cell.code} onChange={(e)=>setCells((cs)=>cs.map((c)=>c.id===cell.id?{...c,code:e.target.value}:c))}
            onKeyDown={(e)=>{ if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();runCell(cell.id);} }}
            style={{ width:"100%", minHeight:80, fontFamily:"monospace", fontSize:13, padding:"10px 12px", border:"none", outline:"none", resize:"vertical", boxSizing:"border-box", background:"#1e1e2e", color:"#cdd6f4", lineHeight:1.6 }}
          />
          {cell.output && <div style={{ padding:"8px 12px", background:"#f5f5f4", borderTop:"0.5px solid #e8e6e0", fontSize:12, fontFamily:"monospace", color:cell.output.startsWith("Error:")?"#E24B4A":"#1a1a18", whiteSpace:"pre-wrap" }}>{cell.output}</div>}
        </div>
      ))}
      <button className="btn btn-ghost" style={{ width:"100%", fontSize:12 }} onClick={()=>setCells((cs)=>[...cs,{id:String(Date.now()),code:"",output:"",running:false}])}>+ Add cell</button>
    </div>
  );
}

function SpreadsheetView() {
  const [tableData, setTableData] = useState<{columns:string[];rows:Record<string,unknown>[]}|null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { listTables().then(setTables).catch(()=>{}); }, []);

  const loadTable = async (t: string) => {
    setLoading(true); setSelected(t);
    try { const res = await runQuery(`SELECT * FROM "${t}" LIMIT 500`); setTableData({columns:res.columns,rows:res.rows}); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", borderBottom:"0.5px solid #e8e6e0", background:"white", flexShrink:0 }}>
        <span style={{ fontSize:12, color:"#73726c" }}>Table:</span>
        <select value={selected} onChange={(e)=>loadTable(e.target.value)} style={{ fontSize:12, padding:"4px 8px" }}>
          <option value="">— select —</option>
          {tables.map((t)=><option key={t} value={t}>{t}</option>)}
        </select>
        {loading&&<span style={{ fontSize:11, color:"#b0aea6" }}>Loading…</span>}
        {tableData&&<span style={{ fontSize:11, color:"#73726c" }}>{tableData.rows.length} rows (max 500)</span>}
      </div>
      {!tableData ? (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:"#b0aea6", fontSize:13 }}>
          <div style={{ textAlign:"center" }}><div style={{ fontSize:32, marginBottom:8 }}>📋</div>Select a table above</div>
        </div>
      ) : (
        <div style={{ flex:1, overflow:"auto" }}>
          <table style={{ borderCollapse:"collapse", fontSize:12, width:"100%" }}>
            <thead style={{ position:"sticky", top:0, zIndex:1 }}>
              <tr style={{ background:"#f5f5f4" }}>
                <th style={{ width:40, padding:"6px 8px", borderRight:"0.5px solid #e8e6e0", borderBottom:"0.5px solid #e8e6e0", color:"#b0aea6", fontWeight:400, fontSize:10 }}>#</th>
                {tableData.columns.map((col)=><th key={col} style={{ padding:"6px 10px", textAlign:"left", borderRight:"0.5px solid #e8e6e0", borderBottom:"0.5px solid #e8e6e0", fontWeight:600, color:"#3d3d3a", whiteSpace:"nowrap", minWidth:120 }}>{col}</th>)}
              </tr>
            </thead>
            <tbody>
              {tableData.rows.map((row,i)=>(
                <tr key={i} style={{ background:i%2===0?"white":"#fafaf9" }}>
                  <td style={{ padding:"4px 8px", borderRight:"0.5px solid #f0ede8", color:"#b0aea6", fontSize:10, textAlign:"right" }}>{i+1}</td>
                  {tableData.columns.map((col)=>{ const v=row[col]; return <td key={col} style={{ padding:"4px 10px", borderRight:"0.5px solid #f0ede8", color:v===null?"#b0aea6":"#1a1a18", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:200 }}>{v===null?"null":String(v)}</td>; })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
