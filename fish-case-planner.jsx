import { useState, useRef, useEffect, useMemo } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────
const PAN_WIDTHS = [3, 6, 8, 12];
const PAN_DEPTHS_SPLIT = ["full", "half", "third"];
const DEPTH_UNITS = { full: 12, half: 6, third: 4 };
const CASE_DEPTH = 12;
const DEFAULT_CASE_WIDTH = 81;
const PRODUCT_COLORS = {
  red: { bg: "#dc2626", label: "Red" },
  white: { bg: "#9ca3af", label: "White" },
  orange: { bg: "#f97316", label: "Orange" },
  blue: { bg: "#3b82f6", label: "Blue" },
};
const COOK_TYPES = ["Raw", "Cooked", "Unassigned"];
const FISH_TYPES = ["Finfish", "Shellfish", "Unassigned"];
const toProperCase = (s) => s.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
const uid = () => Math.random().toString(36).slice(2, 10);
const canSplitDepth = (w) => w === 3 || w === 6;
const getDepthSlots = (d) => d === "half" ? [0,1] : d === "third" ? [0,1,2] : [0];
const getSlotLabel = (d, i) => {
  if (d === "full") return "";
  if (d === "half") return i === 0 ? "Front" : "Back";
  return i === 0 ? "Front" : i === 1 ? "Mid" : "Back";
};
const loadData = (key, fb) => { try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : fb; } catch { return fb; } };
const saveData = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} };

const FONT = `'JetBrains Mono','SF Mono','Fira Code',monospace`;
const DFONT = `'DM Sans','Segoe UI',system-ui,sans-serif`;
const T = {
  bg:"#0a0e17",surface:"#111827",surfaceAlt:"#1a2235",
  border:"#1e293b",borderLight:"#334155",
  text:"#e2e8f0",textMuted:"#94a3b8",textDim:"#64748b",
  accent:"#38bdf8",accentDim:"#0c4a6e",
  danger:"#ef4444",success:"#22c55e",warning:"#f59e0b",
};

const DEFAULT_PRODUCTS = [
  { id:"p1",name:"Atlantic Fillet",plu:"12345",color:"orange",cookType:"Raw",fishType:"Finfish",maxPan:12,minPan:6,deepShallow:"shallow",demand:9 },
  { id:"p2",name:"Atlantic Centers",plu:"12346",color:"orange",cookType:"Raw",fishType:"Finfish",maxPan:8,minPan:3,deepShallow:"shallow",demand:6 },
  { id:"p3",name:"King Salmon",plu:"22001",color:"red",cookType:"Raw",fishType:"Finfish",maxPan:8,minPan:3,deepShallow:"shallow",demand:7 },
  { id:"p4",name:"Sockeye Salmon",plu:"22002",color:"red",cookType:"Raw",fishType:"Finfish",maxPan:8,minPan:3,deepShallow:"shallow",demand:6 },
  { id:"p5",name:"Cod",plu:"33001",color:"white",cookType:"Raw",fishType:"Finfish",maxPan:8,minPan:6,deepShallow:"shallow",demand:7 },
  { id:"p6",name:"Halibut",plu:"33002",color:"white",cookType:"Raw",fishType:"Finfish",maxPan:6,minPan:3,deepShallow:"shallow",demand:5 },
  { id:"p7",name:"Catfish",plu:"33003",color:"white",cookType:"Raw",fishType:"Finfish",maxPan:8,minPan:6,deepShallow:"shallow",demand:6 },
  { id:"p8",name:"Orange Roughy",plu:"33004",color:"white",cookType:"Raw",fishType:"Finfish",maxPan:6,minPan:3,deepShallow:"shallow",demand:4 },
  { id:"p9",name:"Chilean Seabass",plu:"44001",color:"white",cookType:"Raw",fishType:"Finfish",maxPan:6,minPan:3,deepShallow:"shallow",demand:5 },
  { id:"p10",name:"Whitefish",plu:"44002",color:"white",cookType:"Raw",fishType:"Finfish",maxPan:6,minPan:3,deepShallow:"shallow",demand:3 },
  { id:"p11",name:"26/30 Shrimp",plu:"55001",color:"red",cookType:"Raw",fishType:"Shellfish",maxPan:6,minPan:3,deepShallow:"deep",demand:7 },
  { id:"p12",name:"Mahi Mahi",plu:"66001",color:"white",cookType:"Raw",fishType:"Finfish",maxPan:8,minPan:3,deepShallow:"shallow",demand:5 },
];
// ─── part2: Components ───────────────────────────────────────────────────────

function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel="Delete" }) {
  return (
    <div style={S.ov} onClick={onCancel}>
      <div style={{...S.mod,maxWidth:360}} onClick={e=>e.stopPropagation()}>
        <p style={{margin:0,fontSize:14,color:T.text,lineHeight:1.5}}>{message}</p>
        <div style={{display:"flex",gap:8,marginTop:16,justifyContent:"flex-end"}}>
          <button style={S.bs} onClick={onCancel}>Cancel</button>
          <button style={{...S.bp,background:T.danger}} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function ProductFormModal({ product, onSave, onClose }) {
  const [f, setF] = useState(product || {
    id:uid(),name:"",plu:"",color:"white",cookType:"Unassigned",
    fishType:"Unassigned",maxPan:8,minPan:3,deepShallow:"shallow",demand:5,
  });
  const s = (k,v) => setF(o => ({...o,[k]:v}));
  return (
    <div style={S.ov} onClick={onClose}>
      <div style={S.mod} onClick={e=>e.stopPropagation()}>
        <h3 style={{margin:0,fontFamily:DFONT,fontSize:18,color:T.text}}>{product?"Edit Product":"Add Product"}</h3>
        <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:16}}>
          <label style={S.fl}>Name<input style={S.inp} value={f.name} onChange={e=>s("name",e.target.value)} placeholder="e.g. Atlantic Fillet"/></label>
          <label style={S.fl}>PLU (optional)<input style={S.inp} value={f.plu} onChange={e=>s("plu",e.target.value.replace(/\D/g,"").slice(0,5))} placeholder="5 digits"/></label>
          <label style={S.fl}>Color
            <div style={{display:"flex",gap:8}}>
              {Object.entries(PRODUCT_COLORS).map(([k,v])=>(
                <button key={k} onClick={()=>s("color",k)} style={{
                  width:40,height:30,borderRadius:5,border:"none",cursor:"pointer",background:v.bg,
                  outline:f.color===k?`2px solid ${T.accent}`:"2px solid transparent",outlineOffset:2,
                  display:"flex",alignItems:"center",justifyContent:"center",
                }}><span style={{fontSize:10,color:k==="white"?"#333":"#fff",fontWeight:600}}>{v.label}</span></button>
              ))}
            </div>
          </label>
          <div style={{display:"flex",gap:12}}>
            <label style={{...S.fl,flex:1}}>Cook Type<select style={S.inp} value={f.cookType} onChange={e=>s("cookType",e.target.value)}>{COOK_TYPES.map(t=><option key={t}>{t}</option>)}</select></label>
            <label style={{...S.fl,flex:1}}>Fish Type<select style={S.inp} value={f.fishType} onChange={e=>s("fishType",e.target.value)}>{FISH_TYPES.map(t=><option key={t}>{t}</option>)}</select></label>
          </div>
          <div style={{display:"flex",gap:12}}>
            <label style={{...S.fl,flex:1}}>Min Pan<select style={S.inp} value={f.minPan} onChange={e=>s("minPan",+e.target.value)}>{PAN_WIDTHS.map(w=><option key={w} value={w}>{w}</option>)}</select></label>
            <label style={{...S.fl,flex:1}}>Max Pan<select style={S.inp} value={f.maxPan} onChange={e=>s("maxPan",+e.target.value)}>{PAN_WIDTHS.map(w=><option key={w} value={w}>{w}</option>)}</select></label>
          </div>
          <div style={{display:"flex",gap:12}}>
            <label style={{...S.fl,flex:1}}>Depth Pref<select style={S.inp} value={f.deepShallow} onChange={e=>s("deepShallow",e.target.value)}><option value="shallow">Shallow</option><option value="deep">Deep</option></select></label>
            <label style={{...S.fl,flex:1}}>Demand (1-10)<select style={S.inp} value={f.demand} onChange={e=>s("demand",+e.target.value)}>
              {[1,2,3,4,5,6,7,8,9,10].map(n=><option key={n} value={n}>{n}{n<=3?" — Low":n<=6?" — Med":" — High"}</option>)}
            </select></label>
          </div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:20,justifyContent:"flex-end"}}>
          <button style={S.bs} onClick={onClose}>Cancel</button>
          <button style={S.bp} onClick={()=>{if(f.name.trim())onSave({...f,name:toProperCase(f.name.trim())})}}>Save</button>
        </div>
      </div>
    </div>
  );
}

function ProductPool({ products, filters, setFilters, onEdit, onDelete }) {
  const [search, setSearch] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);
  const filtered = useMemo(() => {
    let l = [...products];
    if (search) l = l.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.plu.includes(search));
    if (filters.color) l = l.filter(p => p.color === filters.color);
    if (filters.cookType) l = l.filter(p => p.cookType === filters.cookType);
    if (filters.fishType) l = l.filter(p => p.fishType === filters.fishType);
    if (filters.deepShallow) l = l.filter(p => p.deepShallow === filters.deepShallow);
    const sk = filters.sort || "name";
    l.sort((a,b) => sk==="name"?a.name.localeCompare(b.name):sk==="demand"?b.demand-a.demand:sk==="color"?a.color.localeCompare(b.color):a.fishType.localeCompare(b.fishType));
    return l;
  }, [products, search, filters]);

  const selStyle = (v,fv) => ({...S.sel, background: v===fv ? T.accentDim+"44" : T.surfaceAlt});

  return (
    <div style={{display:"flex",flexDirection:"column",gap:6,flex:1,minHeight:0}}>
      <input style={S.inp} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name / PLU..."/>
      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
        <select style={S.sel} value={filters.color||""} onChange={e=>setFilters(f=>({...f,color:e.target.value||""}))}><option value="">All Colors</option>{Object.entries(PRODUCT_COLORS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select>
        <select style={S.sel} value={filters.cookType||""} onChange={e=>setFilters(f=>({...f,cookType:e.target.value||""}))}><option value="">All Cook</option>{COOK_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select>
        <select style={S.sel} value={filters.fishType||""} onChange={e=>setFilters(f=>({...f,fishType:e.target.value||""}))}><option value="">All Type</option>{FISH_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select>
      </div>
      <div style={{display:"flex",gap:4}}>
        <select style={S.sel} value={filters.deepShallow||""} onChange={e=>setFilters(f=>({...f,deepShallow:e.target.value||""}))}><option value="">All Depth</option><option value="shallow">Shallow</option><option value="deep">Deep</option></select>
        <select style={S.sel} value={filters.sort||"name"} onChange={e=>setFilters(f=>({...f,sort:e.target.value}))}><option value="name">Sort: Name</option><option value="demand">Sort: Demand</option><option value="color">Sort: Color</option><option value="type">Sort: Type</option></select>
      </div>
      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:2}}>
        {filtered.map(p=>(
          <div key={p.id} draggable onDragStart={e=>{e.dataTransfer.setData("productId",p.id);e.dataTransfer.setData("dragType","product");}}
            style={{display:"flex",alignItems:"center",gap:6,padding:"5px 8px",borderRadius:5,background:T.surfaceAlt,border:`1px solid ${T.border}`,cursor:"grab",userSelect:"none"}}>
            <span style={{width:10,height:10,borderRadius:2,background:PRODUCT_COLORS[p.color]?.bg,flexShrink:0}}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,color:T.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</div>
              <div style={{fontSize:9,color:T.textDim,fontFamily:FONT}}>{p.plu||"—"} · {p.fishType} · {p.cookType} · D:<span style={{color:p.demand>=7?T.success:p.demand>=4?T.warning:T.danger}}>{p.demand}</span></div>
            </div>
            <span style={{fontSize:7,padding:"1px 4px",borderRadius:3,fontFamily:FONT,textTransform:"uppercase",background:p.deepShallow==="deep"?"#3b82f622":"#f59e0b22",color:p.deepShallow==="deep"?"#60a5fa":"#fbbf24"}}>{p.deepShallow}</span>
            <button style={{...S.tb,color:T.accent}} onClick={e=>{e.stopPropagation();onEdit(p)}}>✎</button>
            <button style={{...S.tb,color:T.danger}} onClick={e=>{e.stopPropagation();setConfirmDel(p)}}>×</button>
          </div>
        ))}
        {filtered.length===0&&<div style={{color:T.textDim,fontSize:12,padding:8,textAlign:"center"}}>No products match</div>}
      </div>
      {confirmDel&&<ConfirmDialog message={`Delete "${confirmDel.name}"? This removes it from all pans. Consider editing instead.`} onConfirm={()=>{onDelete(confirmDel.id);setConfirmDel(null)}} onCancel={()=>setConfirmDel(null)}/>}
    </div>
  );
}

function PanSlot({ pan, slotIdx, products, onAssignProduct, onClearSlot, totalDepthSlots }) {
  const [dOver, setDOver] = useState(false);
  const product = pan.slots[slotIdx] ? products.find(p=>p.id===pan.slots[slotIdx]) : null;
  const color = product ? PRODUCT_COLORS[product.color] : null;
  const depthLabel = getSlotLabel(pan.depth, slotIdx);
  const slotH = (DEPTH_UNITS[pan.depth]/CASE_DEPTH)*100;

  return (
    <div onDragOver={e=>{e.preventDefault();e.stopPropagation();setDOver(true)}} onDragLeave={()=>setDOver(false)}
      onDrop={e=>{
        e.preventDefault();e.stopPropagation();setDOver(false);
        const dt=e.dataTransfer.getData("dragType"),pid=e.dataTransfer.getData("productId");
        if(dt==="product"&&pid){onAssignProduct(pan.id,slotIdx,pid)}
        else if(dt==="slotProduct"&&pid){
          const sPan=e.dataTransfer.getData("srcPanId"),sIdx=+e.dataTransfer.getData("srcSlotIdx");
          const cur=pan.slots[slotIdx];
          onAssignProduct(pan.id,slotIdx,pid);
          if(cur)onAssignProduct(sPan,sIdx,cur);else onClearSlot(sPan,sIdx);
        }
      }}
      style={{width:"100%",height:`${slotH}%`,background:dOver?T.accentDim+"66":color?color.bg+"18":T.surfaceAlt,
        borderBottom:slotIdx<totalDepthSlots-1?`1px dashed ${T.borderLight}`:"none",
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
        position:"relative",overflow:"hidden",transition:"background 0.12s"}}>
      {color&&<div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:color.bg,opacity:0.8}}/>}
      {depthLabel&&<span style={{position:"absolute",top:2,right:4,fontSize:7,color:T.textDim,fontFamily:FONT,textTransform:"uppercase"}}>{depthLabel}</span>}
      {product?(
        <div draggable onDragStart={e=>{e.stopPropagation();e.dataTransfer.setData("productId",product.id);e.dataTransfer.setData("dragType","slotProduct");e.dataTransfer.setData("srcPanId",pan.id);e.dataTransfer.setData("srcSlotIdx",String(slotIdx))}}
          onClick={()=>onClearSlot(pan.id,slotIdx)}
          style={{cursor:"grab",textAlign:"center",padding:"0 4px",userSelect:"none"}}
          title={`${product.name}${product.plu?` (${product.plu})`:""}\nDrag to swap · Click to remove`}>
          <span style={{fontSize:pan.width<=3?8:10,fontWeight:700,color:color.bg,fontFamily:DFONT,lineHeight:1.2,wordBreak:"break-word"}}>{product.name}</span>
          {product.plu&&pan.width>3&&<div style={{fontSize:8,color:T.textDim,fontFamily:FONT,marginTop:1}}>{product.plu}</div>}
        </div>
      ):<span style={{fontSize:16,color:T.borderLight+"88",fontWeight:300,pointerEvents:"none"}}>+</span>}
    </div>
  );
}

function PanColumn({ pan, products, onAssignProduct, onClearSlot, unitSize, onRemovePan, onSetPanType, insertIndicator, onPanDragStart, onPanDragOver, onPanDrop, onPanDragEnd }) {
  const ds = getDepthSlots(pan.depth);
  return (
    <div style={{position:"relative",display:"flex",height:"100%"}}>
      {insertIndicator==="left"&&<div style={{position:"absolute",left:-2,top:0,bottom:0,width:4,background:T.accent,borderRadius:2,zIndex:10}}/>}
      <div draggable
        onDragStart={e=>{e.dataTransfer.setData("dragType","pan");e.dataTransfer.setData("panId",pan.id);onPanDragStart(e,pan.id)}}
        onDragOver={e=>onPanDragOver(e,pan.id)} onDrop={e=>onPanDrop(e,pan.id)} onDragEnd={onPanDragEnd}
        style={{width:pan.width*unitSize,minWidth:pan.width*unitSize,height:"100%",borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",position:"relative",cursor:"grab"}}>
        <div style={{height:30,background:T.surfaceAlt,borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",gap:3,flexShrink:0,position:"relative"}}>
          <span style={{fontSize:12,fontWeight:800,color:T.accent,fontFamily:FONT}}>{pan.width}</span>
          {pan.depth!=="full"&&<span style={{fontSize:9,color:T.textDim,fontFamily:FONT}}>{pan.depth==="half"?"½":"⅓"}</span>}
          <span onClick={e=>{e.stopPropagation();onSetPanType(pan.id,pan.panType==="deep"?"shallow":"deep")}}
            style={{position:"absolute",bottom:1,left:"50%",transform:"translateX(-50%)",fontSize:6,padding:"0 3px",borderRadius:2,cursor:"pointer",fontFamily:FONT,textTransform:"uppercase",
              background:pan.panType==="deep"?"#3b82f622":"#f59e0b22",color:pan.panType==="deep"?"#60a5fa":"#fbbf24"}}
            title="Toggle deep/shallow">{pan.panType}</span>
          <button onClick={e=>{e.stopPropagation();onRemovePan(pan.id)}} style={{position:"absolute",top:1,right:2,background:"none",border:"none",color:T.textDim,cursor:"pointer",fontSize:12,padding:"0 2px",lineHeight:1,opacity:0.4}} title="Remove pan">×</button>
        </div>
        <div style={{flex:1,display:"flex",flexDirection:"column"}}>
          {ds.map(idx=><PanSlot key={idx} pan={pan} slotIdx={idx} products={products} onAssignProduct={onAssignProduct} onClearSlot={onClearSlot} totalDepthSlots={ds.length}/>)}
        </div>
      </div>
      {insertIndicator==="right"&&<div style={{position:"absolute",right:-2,top:0,bottom:0,width:4,background:T.accent,borderRadius:2,zIndex:10}}/>}
    </div>
  );
}

function AddPanControls({ onAddPan, remainingWidth }) {
  const [w, setW] = useState(6);
  const [d, setD] = useState("full");
  const [pt, setPt] = useState("shallow");
  const ad = canSplitDepth(w) ? PAN_DEPTHS_SPLIT : ["full"];
  useEffect(() => { if (!canSplitDepth(w)) setD("full"); }, [w]);
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",padding:"8px 12px",background:T.surfaceAlt,borderRadius:8,border:`1px solid ${T.border}`}}>
      <span style={{fontSize:11,color:T.textMuted,fontFamily:FONT,fontWeight:700}}>Add Pan</span>
      <div style={{display:"flex",gap:3}}>
        {PAN_WIDTHS.map(v=><button key={v} onClick={()=>setW(v)} style={{...S.ch,background:w===v?T.accent:T.surface,color:w===v?T.bg:T.textMuted,fontWeight:w===v?800:500}}>{v}</button>)}
      </div>
      <div style={{display:"flex",gap:3}}>
        {ad.map(v=><button key={v} onClick={()=>setD(v)} style={{...S.ch,fontSize:10,background:d===v?T.accent:T.surface,color:d===v?T.bg:T.textMuted}}>{v==="full"?"Full":v==="half"?"Half":"Third"}</button>)}
      </div>
      <div style={{display:"flex",gap:3}}>
        {["shallow","deep"].map(v=><button key={v} onClick={()=>setPt(v)} style={{...S.ch,fontSize:10,background:pt===v?(v==="deep"?"#3b82f6":"#f59e0b"):T.surface,color:pt===v?"#fff":T.textMuted}}>{v==="shallow"?"Shallow":"Deep"}</button>)}
      </div>
      <button style={{...S.bp,opacity:w>remainingWidth?0.3:1,fontSize:12,padding:"5px 14px"}} disabled={w>remainingWidth} onClick={()=>onAddPan(w,d,pt)}>+ Add</button>
      <span style={{fontSize:10,color:T.textDim,fontFamily:FONT}}>{remainingWidth} left</span>
    </div>
  );
}
// ─── part3: AutoGen, Print, Saved, Main App ─────────────────────────────────

function checkColorConflicts(pans, products) {
  const w = [];
  for (let i = 0; i < pans.length - 1; i++) {
    const pA = Object.values(pans[i].slots).filter(Boolean).map(id=>products.find(p=>p.id===id)).filter(Boolean);
    const pB = Object.values(pans[i+1].slots).filter(Boolean).map(id=>products.find(p=>p.id===id)).filter(Boolean);
    for (const a of pA) for (const b of pB) {
      if (a.color===b.color&&a.color!=="white") w.push(`"${a.name}" & "${b.name}" adjacent — both ${PRODUCT_COLORS[a.color].label}`);
    }
  }
  return w;
}

function autoGenerateCase(items, caseWidth) {
  const sorted = [...items].sort((a,b) => (b.product.demand+(b.onSale?4:0)) - (a.product.demand+(a.onSale?4:0)));
  const assignments = sorted.map(item => {
    const p=item.product, eff=p.demand+(item.onSale?4:0);
    let ts;
    if(eff>=10) ts=p.maxPan;
    else if(eff>=7){const sz=PAN_WIDTHS.filter(w=>w>=p.minPan&&w<=p.maxPan);ts=sz[Math.min(sz.length-1,Math.floor(sz.length*0.75))]||p.maxPan}
    else if(eff>=4){const sz=PAN_WIDTHS.filter(w=>w>=p.minPan&&w<=p.maxPan);ts=sz[Math.floor(sz.length/2)]||p.minPan}
    else ts=p.minPan;
    return {...item,targetSize:ts};
  });
  let total=assignments.reduce((s,a)=>s+a.targetSize,0);
  if(total>caseWidth){const rev=[...assignments].reverse();for(const a of rev){if(total<=caseWidth)break;const old=a.targetSize;const sz=PAN_WIDTHS.filter(w=>w>=a.product.minPan&&w<old);a.targetSize=sz.length>0?sz[sz.length-1]:a.product.minPan;total-=(old-a.targetSize)}}
  const arranged=[];const pool=[...assignments];let lc=null;
  while(pool.length>0){let idx=pool.findIndex(a=>a.product.color!==lc);if(idx===-1)idx=0;arranged.push(pool.splice(idx,1)[0]);lc=arranged[arranged.length-1].product.color}
  let rem=caseWidth;
  return arranged.filter(a=>{if(a.targetSize<=rem){rem-=a.targetSize;return true}return false}).map(a=>({id:uid(),width:a.targetSize,depth:"full",panType:a.product.deepShallow||"shallow",slots:{0:a.product.id}}));
}

function AutoGenModal({ products, onGenerate, onClose }) {
  const [sel, setSel] = useState({});
  const [cw, setCw] = useState(DEFAULT_CASE_WIDTH);
  const toggle = pid => setSel(s=>{const c={...s};if(c[pid])delete c[pid];else c[pid]={onSale:false};return c});
  return (
    <div style={S.ov} onClick={onClose}>
      <div style={{...S.mod,maxWidth:500,maxHeight:"80vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <h3 style={{margin:0,fontFamily:DFONT,fontSize:18,color:T.text}}>Auto Generate Case</h3>
        <label style={{...S.fl,marginTop:12}}>Case Width<input type="number" style={{...S.inp,width:80}} value={cw} onChange={e=>setCw(Math.max(1,+e.target.value))}/></label>
        <p style={{fontSize:11,color:T.textDim,margin:"8px 0 4px"}}>Pan sizes based on product <strong style={{color:T.textMuted}}>demand</strong>. "Sale" boosts size priority.</p>
        <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:3,maxHeight:350,overflowY:"auto"}}>
          {products.map(p=>{const s=sel[p.id];return(
            <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",borderRadius:6,background:s?T.accentDim+"33":"transparent",border:`1px solid ${s?T.accent+"44":T.border}`}}>
              <input type="checkbox" checked={!!s} onChange={()=>toggle(p.id)}/>
              <span style={{width:10,height:10,borderRadius:2,background:PRODUCT_COLORS[p.color]?.bg,flexShrink:0}}/>
              <span style={{flex:1,fontSize:12,color:T.text}}>{p.name}</span>
              <span style={{fontSize:9,color:T.textDim,fontFamily:FONT}}>D:{p.demand}</span>
              {s&&<label style={{fontSize:10,color:T.textMuted,display:"flex",alignItems:"center",gap:3}}><input type="checkbox" checked={s.onSale} onChange={e=>setSel(o=>({...o,[p.id]:{...o[p.id],onSale:e.target.checked}}))}/>Sale</label>}
            </div>
          )})}
        </div>
        <div style={{display:"flex",gap:8,marginTop:16,justifyContent:"flex-end"}}>
          <button style={S.bs} onClick={onClose}>Cancel</button>
          <button style={S.bp} onClick={()=>{const items=Object.entries(sel).map(([pid,opts])=>({product:products.find(p=>p.id===pid),...opts})).filter(i=>i.product);onGenerate(items,cw)}} disabled={!Object.keys(sel).length}>Generate</button>
        </div>
      </div>
    </div>
  );
}

function PrintView({ pans, products, caseWidth, onClose }) {
  const uw=pans.reduce((s,p)=>s+p.width,0);const up=Math.max(4,Math.min(14,850/caseWidth));
  const handlePrint=()=>{const w=window.open("","_blank");w.document.write(`<html><head><title>Fish Case</title><style>body{margin:20px;font-family:sans-serif}.case{display:flex;border:2px solid #333;height:300px}.pan{border-right:1px solid #aaa;display:flex;flex-direction:column}.hdr{height:22px;background:#eee;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;border-bottom:1px solid #aaa}.slot{flex:1;display:flex;align-items:center;justify-content:center;text-align:center;font-size:9px;padding:2px;border-bottom:1px dashed #ccc}.c-red{background:#fecaca}.c-orange{background:#fed7aa}.c-blue{background:#bfdbfe}.c-white{background:#f3f4f6}@media print{body{margin:10px}}</style></head><body><h2>Fish Case — ${caseWidth} units</h2><div style="font-size:10px;margin-bottom:6px">TOP = Front (Customer) | BOTTOM = Back</div><div class="case">${pans.map(pan=>{const sl=getDepthSlots(pan.depth);return`<div class="pan" style="width:${pan.width*up}px"><div class="hdr">${pan.width}${pan.panType==="deep"?"D":"S"}</div>${sl.map(idx=>{const pr=pan.slots[idx]?products.find(p=>p.id===pan.slots[idx]):null;return`<div class="slot ${pr?'c-'+pr.color:''}" style="height:${(DEPTH_UNITS[pan.depth]/CASE_DEPTH)*100}%">${pr?pr.name:""}</div>`}).join("")}</div>`}).join("")}${uw<caseWidth?`<div style="flex:1;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999">${caseWidth-uw} empty</div>`:""}</div><div style="font-size:10px;margin-top:8px;color:#666">Generated ${new Date().toLocaleString()}</div></body></html>`);w.document.close();w.print()};
  return (
    <div style={S.ov} onClick={onClose}>
      <div style={{...S.mod,maxWidth:"95vw",width:900,maxHeight:"85vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <h3 style={{margin:0,fontFamily:DFONT,color:T.text}}>Print / Export</h3>
        <div style={{marginTop:12,display:"flex",border:`2px solid ${T.borderLight}`,height:220,background:T.surface,borderRadius:4,overflow:"hidden"}}>
          {pans.map(pan=>{const sl=getDepthSlots(pan.depth);return(
            <div key={pan.id} style={{width:pan.width*up,minWidth:pan.width*up,borderRight:`1px solid ${T.borderLight}`,display:"flex",flexDirection:"column"}}>
              <div style={{height:20,background:T.surfaceAlt,display:"flex",alignItems:"center",justifyContent:"center",borderBottom:`1px solid ${T.border}`,fontSize:9,fontWeight:700,color:T.accent,fontFamily:FONT}}>{pan.width}<span style={{color:pan.panType==="deep"?"#60a5fa":"#fbbf24",marginLeft:1,fontSize:7}}>{pan.panType==="deep"?"D":"S"}</span></div>
              {sl.map(idx=>{const pr=pan.slots[idx]?products.find(p=>p.id===pan.slots[idx]):null;const c=pr?PRODUCT_COLORS[pr.color]:null;return(
                <div key={idx} style={{height:`${(DEPTH_UNITS[pan.depth]/CASE_DEPTH)*100}%`,background:c?c.bg+"1a":"transparent",borderBottom:idx<sl.length-1?`1px dashed ${T.borderLight}`:"none",display:"flex",alignItems:"center",justifyContent:"center",borderLeft:c?`3px solid ${c.bg}`:"none"}}>
                  {pr&&<span style={{fontSize:7,fontWeight:600,color:c.bg,textAlign:"center",wordBreak:"break-word",padding:"0 1px"}}>{pr.name}</span>}
                </div>
              )})}
            </div>
          )})}
        </div>
        <div style={{display:"flex",gap:8,marginTop:16,justifyContent:"flex-end"}}>
          <button style={S.bs} onClick={onClose}>Close</button>
          <button style={S.bp} onClick={handlePrint}>🖨 Print</button>
        </div>
      </div>
    </div>
  );
}

function SavedCasesModal({ savedCases, onLoad, onDelete, onClose }) {
  return (
    <div style={S.ov} onClick={onClose}>
      <div style={{...S.mod,maxHeight:"70vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <h3 style={{margin:0,fontFamily:DFONT,color:T.text}}>Saved Cases</h3>
        {savedCases.length===0?<p style={{color:T.textDim,fontSize:13}}>No saved cases yet.</p>:
        <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:12}}>
          {savedCases.map((c,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:6,background:T.surfaceAlt,border:`1px solid ${T.border}`}}>
              <div style={{flex:1}}><div style={{fontSize:13,color:T.text,fontWeight:600}}>{c.name}</div><div style={{fontSize:10,color:T.textDim}}>{c.pans.length} pans · {c.caseWidth}w · {new Date(c.savedAt).toLocaleDateString()}</div></div>
              <button style={{...S.ch,background:T.accent,color:T.bg}} onClick={()=>onLoad(c)}>Load</button>
              <button style={{...S.ch,background:T.danger+"33",color:T.danger}} onClick={()=>onDelete(i)}>×</button>
            </div>
          ))}
        </div>}
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:12}}><button style={S.bs} onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}
// ─── part4: Main App + Styles ────────────────────────────────────────────────

export default function FishCasePlanner() {
  const [products, setProducts] = useState(()=>loadData("fcp3_products",DEFAULT_PRODUCTS));
  const [pans, setPans] = useState(()=>loadData("fcp3_pans",[]));
  const [caseWidth, setCaseWidth] = useState(()=>loadData("fcp3_cw",DEFAULT_CASE_WIDTH));
  const [savedCases, setSavedCases] = useState(()=>loadData("fcp3_sc",[]));
  const [filters, setFilters] = useState({color:"",cookType:"",fishType:"",deepShallow:"",sort:"name"});
  const [showProductForm, setShowProductForm] = useState(null);
  const [showAutoGen, setShowAutoGen] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearSlotConfirm, setClearSlotConfirm] = useState(null);
  const [panDragId, setPanDragId] = useState(null);
  const [insertTarget, setInsertTarget] = useState(null);
  const caseRef = useRef();

  useEffect(()=>saveData("fcp3_products",products),[products]);
  useEffect(()=>saveData("fcp3_pans",pans),[pans]);
  useEffect(()=>saveData("fcp3_cw",caseWidth),[caseWidth]);
  useEffect(()=>saveData("fcp3_sc",savedCases),[savedCases]);

  const usedWidth = pans.reduce((s,p)=>s+p.width,0);
  const remainingWidth = caseWidth - usedWidth;
  const colorWarnings = useMemo(()=>checkColorConflicts(pans,products),[pans,products]);

  const addPan = (w,d,pt) => {
    if(w>remainingWidth) return;
    const sc = d==="half"?2:d==="third"?3:1;
    const slots={};for(let i=0;i<sc;i++)slots[i]=null;
    setPans(p=>[...p,{id:uid(),width:w,depth:d,panType:pt,slots}]);
  };
  const removePan = id => setPans(p=>p.filter(x=>x.id!==id));
  const setPanType = (id,t) => setPans(p=>p.map(pan=>pan.id===id?{...pan,panType:t}:pan));
  const assignProduct = (panId,slotIdx,productId) => setPans(p=>p.map(pan=>pan.id===panId?{...pan,slots:{...pan.slots,[slotIdx]:productId}}:pan));
  const directClearSlot = (panId,slotIdx) => setPans(p=>p.map(pan=>pan.id===panId?{...pan,slots:{...pan.slots,[slotIdx]:null}}:pan));
  const clearSlot = (panId,slotIdx) => setClearSlotConfirm({panId,slotIdx});
  const confirmClearSlotAction = () => { if(!clearSlotConfirm)return; directClearSlot(clearSlotConfirm.panId,clearSlotConfirm.slotIdx); setClearSlotConfirm(null); };

  const handleProductSave = prod => {
    setProducts(ps=>{const idx=ps.findIndex(p=>p.id===prod.id);if(idx>=0){const c=[...ps];c[idx]=prod;return c}return[...ps,prod]});
    setShowProductForm(null);
  };
  const deleteProduct = id => {
    setProducts(ps=>ps.filter(p=>p.id!==id));
    setPans(ps=>ps.map(pan=>{const ns={...pan.slots};Object.keys(ns).forEach(k=>{if(ns[k]===id)ns[k]=null});return{...pan,slots:ns}}));
  };
  const handleGenerate = (items,w) => { setCaseWidth(w); setPans(autoGenerateCase(items,w)); setShowAutoGen(false); };
  const saveCase = () => { if(!saveName.trim())return; setSavedCases(sc=>[...sc,{name:saveName.trim(),pans:JSON.parse(JSON.stringify(pans)),caseWidth,savedAt:new Date().toISOString()}]); setSaveName(""); setShowSaveInput(false); };
  const loadCase = c => { setPans(c.pans); setCaseWidth(c.caseWidth); setShowSaved(false); };
  const deleteCase = idx => setSavedCases(sc=>sc.filter((_,i)=>i!==idx));

  // Pan drag - insert between
  const onPanDragStart = (e,id) => setPanDragId(id);
  const onPanDragOver = (e,targetId) => {
    if(!panDragId||panDragId===targetId){setInsertTarget(null);return}
    e.preventDefault();
    const rect=e.currentTarget.getBoundingClientRect();
    setInsertTarget({panId:targetId,side:e.clientX<rect.left+rect.width/2?"left":"right"});
  };
  const onPanDrop = (e,targetId) => {
    if(!panDragId||panDragId===targetId||!insertTarget){setInsertTarget(null);setPanDragId(null);return}
    e.preventDefault();
    setPans(prev=>{const arr=[...prev];const si=arr.findIndex(p=>p.id===panDragId);const[moved]=arr.splice(si,1);let ti=arr.findIndex(p=>p.id===targetId);if(insertTarget.side==="right")ti+=1;arr.splice(ti,0,moved);return arr});
    setInsertTarget(null);setPanDragId(null);
  };
  const onPanDragEnd = () => {setPanDragId(null);setInsertTarget(null)};

  const [containerWidth, setContainerWidth] = useState(800);
  useEffect(()=>{
    const obs=new ResizeObserver(entries=>{if(entries[0])setContainerWidth(entries[0].contentRect.width)});
    if(caseRef.current)obs.observe(caseRef.current);
    return()=>obs.disconnect();
  },[]);
  const unitSize = Math.max(3,(containerWidth-2)/caseWidth);

  return (
    <div style={{minHeight:"100vh",background:T.bg,color:T.text,fontFamily:DFONT}}>
      <header style={{padding:"10px 16px",background:T.surface,borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:20}}>🐟</span>
          <h1 style={{margin:0,fontSize:16,fontWeight:800,fontFamily:DFONT,background:`linear-gradient(135deg,${T.accent},#818cf8)`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Case Planner</h1>
        </div>
        <div style={{flex:1}}/>
        <button style={S.hb} onClick={()=>setSidebarOpen(!sidebarOpen)}>{sidebarOpen?"◀ Hide":"📦 Products"}</button>
        <button style={S.hb} onClick={()=>setShowAutoGen(true)}>⚡ Auto</button>
        <button style={S.hb} onClick={()=>setShowSaved(true)}>📁 Saved</button>
        <button style={S.hb} onClick={()=>setShowPrint(true)}>🖨 Print</button>
      </header>

      <div style={{display:"flex",minHeight:"calc(100vh - 50px)"}}>
        {sidebarOpen&&(
          <aside style={{width:280,minWidth:280,padding:10,background:T.surface,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <h3 style={{margin:0,fontSize:13,color:T.textMuted,fontFamily:FONT}}>PRODUCT POOL</h3>
              <button style={{...S.bp,fontSize:10,padding:"3px 10px"}} onClick={()=>setShowProductForm("new")}>+ New</button>
            </div>
            <p style={{fontSize:10,color:T.textDim,margin:"0 0 8px",lineHeight:1.4}}>Drag products into pan slots</p>
            <ProductPool products={products} filters={filters} setFilters={setFilters} onEdit={p=>setShowProductForm(p)} onDelete={deleteProduct}/>
          </aside>
        )}

        <main style={{flex:1,padding:14,overflowX:"auto",display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <label style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:T.textMuted}}>
              Case:<input type="number" value={caseWidth} onChange={e=>setCaseWidth(Math.max(1,+e.target.value))} style={{...S.inp,width:55,textAlign:"center",padding:"4px 6px"}}/>
            </label>
            <span style={{fontSize:11,fontFamily:FONT,padding:"3px 8px",borderRadius:4,background:remainingWidth<0?T.danger+"33":T.accentDim+"33",color:remainingWidth<0?T.danger:T.accent}}>
              {usedWidth}/{caseWidth} · {remainingWidth} left
            </span>
            {showSaveInput?(
              <div style={{display:"flex",gap:4,alignItems:"center"}}>
                <input style={{...S.inp,width:130,fontSize:11,padding:"4px 8px"}} value={saveName} onChange={e=>setSaveName(e.target.value)} placeholder="Case name..." onKeyDown={e=>e.key==="Enter"&&saveCase()} autoFocus/>
                <button style={{...S.ch,background:T.accent,color:T.bg}} onClick={saveCase}>Save</button>
                <button style={S.ch} onClick={()=>setShowSaveInput(false)}>×</button>
              </div>
            ):<button style={S.ch} onClick={()=>setShowSaveInput(true)}>💾 Save</button>}
            <button style={{...S.ch,color:T.danger}} onClick={()=>setConfirmClear(true)}>🗑 Clear</button>
          </div>

          {colorWarnings.length>0&&(
            <div style={{padding:"6px 10px",borderRadius:6,background:T.warning+"12",border:`1px solid ${T.warning}22`}}>
              {colorWarnings.map((w,i)=><div key={i} style={{fontSize:10,color:T.warning}}>⚠ {w}</div>)}
            </div>
          )}

          <AddPanControls onAddPan={addPan} remainingWidth={remainingWidth}/>

          <div style={{display:"flex",justifyContent:"space-between",padding:"0 2px"}}>
            <span style={{fontSize:8,color:T.textDim,fontFamily:FONT,textTransform:"uppercase",letterSpacing:1}}>↑ Front (Customer)</span>
            <span style={{fontSize:8,color:T.textDim,fontFamily:FONT,textTransform:"uppercase",letterSpacing:1}}>Back ↓</span>
          </div>

          <div ref={caseRef} style={{display:"flex",border:`2px solid ${T.borderLight}`,borderRadius:6,height:300,background:T.surface,overflow:"hidden",position:"relative"}}
            onDragOver={e=>e.preventDefault()} onDrop={()=>{setInsertTarget(null);setPanDragId(null)}}>
            {pans.length===0?(
              <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6}}>
                <span style={{fontSize:28,opacity:0.25}}>🐟</span>
                <span style={{fontSize:12,color:T.textDim}}>Add pans or use Auto Generate</span>
                <span style={{fontSize:10,color:T.textDim}}>Drag products from the pool into slots</span>
              </div>
            ):(
              <>
                {pans.map(pan=>(
                  <PanColumn key={pan.id} pan={pan} products={products}
                    onAssignProduct={assignProduct} onClearSlot={clearSlot}
                    unitSize={unitSize} onRemovePan={removePan} onSetPanType={setPanType}
                    insertIndicator={insertTarget?.panId===pan.id?insertTarget.side:null}
                    onPanDragStart={onPanDragStart} onPanDragOver={onPanDragOver}
                    onPanDrop={onPanDrop} onPanDragEnd={onPanDragEnd}/>
                ))}
                {remainingWidth>0&&(
                  <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",borderLeft:`1px dashed ${T.borderLight}`}}>
                    <span style={{fontSize:10,color:T.textDim,fontFamily:FONT}}>{remainingWidth} empty</span>
                  </div>
                )}
              </>
            )}
          </div>

          {pans.length>0&&(
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {pans.map(pan=>{
                const prods=Object.values(pan.slots).filter(Boolean).map(id=>products.find(p=>p.id===id)).filter(Boolean);
                return(
                  <div key={pan.id} style={{fontSize:9,padding:"2px 6px",borderRadius:3,background:T.surfaceAlt,border:`1px solid ${T.border}`,color:T.textMuted,fontFamily:FONT}}>
                    <span style={{color:T.accent,fontWeight:700}}>{pan.width}</span>
                    <span style={{color:pan.panType==="deep"?"#60a5fa":"#fbbf24",marginLeft:2}}>{pan.panType==="deep"?"D":"S"}</span>
                    {pan.depth!=="full"&&<span> {pan.depth==="half"?"½":"⅓"}</span>}
                    {prods.length>0&&<span> — {prods.map(p=>p.name).join(", ")}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {showProductForm&&<ProductFormModal product={showProductForm==="new"?null:showProductForm} onSave={handleProductSave} onClose={()=>setShowProductForm(null)}/>}
      {showAutoGen&&<AutoGenModal products={products} onGenerate={handleGenerate} onClose={()=>setShowAutoGen(false)}/>}
      {showPrint&&<PrintView pans={pans} products={products} caseWidth={caseWidth} onClose={()=>setShowPrint(false)}/>}
      {showSaved&&<SavedCasesModal savedCases={savedCases} onLoad={loadCase} onDelete={deleteCase} onClose={()=>setShowSaved(false)}/>}
      {confirmClear&&<ConfirmDialog message="Clear all pans from the case?" onConfirm={()=>{setPans([]);setConfirmClear(false)}} onCancel={()=>setConfirmClear(false)} confirmLabel="Clear"/>}
      {clearSlotConfirm&&<ConfirmDialog message="Remove product from this slot? Consider editing instead if this was a mistake." onConfirm={confirmClearSlotAction} onCancel={()=>setClearSlotConfirm(null)} confirmLabel="Remove"/>}
    </div>
  );
}

const S = {
  ov:{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16},
  mod:{background:T.surface,borderRadius:12,padding:20,border:`1px solid ${T.borderLight}`,maxWidth:440,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.5)"},
  inp:{background:T.surfaceAlt,border:`1px solid ${T.border}`,borderRadius:6,padding:"6px 10px",color:T.text,fontSize:13,fontFamily:FONT,outline:"none",width:"100%",boxSizing:"border-box"},
  sel:{background:T.surfaceAlt,border:`1px solid ${T.border}`,borderRadius:4,padding:"3px 4px",color:T.text,fontSize:10,fontFamily:FONT,outline:"none",flex:1,boxSizing:"border-box"},
  fl:{display:"flex",flexDirection:"column",gap:4,fontSize:10,color:T.textMuted,fontFamily:FONT,textTransform:"uppercase",letterSpacing:0.5},
  bp:{background:T.accent,color:T.bg,border:"none",borderRadius:6,padding:"7px 16px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:DFONT},
  bs:{background:T.surfaceAlt,color:T.textMuted,border:`1px solid ${T.border}`,borderRadius:6,padding:"7px 16px",fontSize:13,cursor:"pointer",fontFamily:DFONT},
  ch:{background:T.surfaceAlt,color:T.textMuted,border:`1px solid ${T.border}`,borderRadius:5,padding:"4px 10px",fontSize:11,cursor:"pointer",fontFamily:FONT,fontWeight:600},
  hb:{background:T.surfaceAlt,color:T.textMuted,border:`1px solid ${T.border}`,borderRadius:6,padding:"5px 10px",fontSize:11,cursor:"pointer",fontFamily:DFONT,fontWeight:600},
  tb:{background:"none",border:"none",cursor:"pointer",fontSize:13,padding:"0 3px",lineHeight:1},
};
