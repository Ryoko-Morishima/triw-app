// src/lib/finalize.ts
import type { Evaluated } from "@/lib/evaluate";

export type FinalizeMode = "count" | "duration";
export type AutoArtistContext = {
  mode: "single-artist" | "multi-artist" | "unknown";
  focusArtist?: string;
  reason?: string;
};

export type FinalizeOptions = {
  mode: FinalizeMode;
  maxTracks?: number;                 // count モード用
  targetDurationMin?: number;         // duration モード用（例: 30）
  maxTracksHardCap?: number;          // duration モードの安全上限（例: 30）

  maxPerArtist?: number;              // 通常時の被り上限（例: 2）
  preferRoleOrder?: Array<"anchor"|"deep"|"wildcard"|"unknown">;
  interleaveRoles?: boolean;
  lightShuffle?: boolean;
  shortReason?: boolean;

  // アーティスト被りポリシー：auto（特集なら無制限）/ strict（常に上限）/ none（常に無制限）
  artistPolicy?: "auto" | "strict" | "none";

  // ← ここから “メタ情報” （defaults には含めない）
  programTitle?: string;
  programOverview?: string;
  narrativeClassifier?: (ctx: {
    title?: string; overview?: string; picked: Evaluated[];
  }) => Promise<AutoArtistContext> | AutoArtistContext;
};

export type FinalizeHelpers = {
  getDurationMs?: (uri: string) => Promise<number | null | undefined>;
};

export type FinalizedTrack = {
  title: string; artist: string; uri: string | null | undefined;
  index: number; start_at_ms: number; duration_ms: number;
  role?: "anchor"|"deep"|"wildcard"|"unknown";
  reason: string; confidence: number;
};

export type FinalizeResult = {
  program_duration_ms: number;
  tracks: FinalizedTrack[];
  stats: {
    total_candidates: number;
    accepted_count: number;
    unique_artists: number;
    per_role: Record<string, number>;
    artist_policy_effective: "strict" | "none";
    focus_artist_auto?: string;
    focus_reason?: string;
  };
};

// ===== 内部ユーティリティ =====

// defaults は “運用パラメータ” のみ（メタ情報は含めない）
const DEFAULT_OPTS: Required<Omit<
  FinalizeOptions,
  "maxTracks" | "targetDurationMin" | "maxTracksHardCap" | "programTitle" | "programOverview" | "narrativeClassifier"
>> = {
  mode: "count",
  maxPerArtist: 2,
  preferRoleOrder: ["anchor","deep","wildcard","unknown"],
  interleaveRoles: true,
  lightShuffle: false,
  shortReason: true,
  artistPolicy: "auto",
};

function norm(s?: string|null){ return (s??"").toLowerCase().replace(/\s+/g," ").trim(); }
function pickRole(e: Evaluated){ const r=e.debug?.role; return (r==="anchor"||r==="deep"||r==="wildcard")?r:"unknown"; }
function shortReason(reason:string){
  return reason
    .replaceAll("Spotifyで実在確認済み","実在OK")
    .replaceAll("表記一致（exact）","表記=exact")
    .replaceAll("表記一致（fuzzy）","表記=fuzzy")
    .replaceAll("年代推定と一致（原盤年優先）","年代一致")
    .replaceAll("年代おおむね近似（再発の可能性）","年代近似")
    .replaceAll("年代ゲートOFF","年OFF");
}
function shuffleLight<T>(arr:T[],on:boolean){ if(!on) return arr; const out=arr.slice(); for(let i=1;i<out.length;i+=2){const j=i-1; [out[i],out[j]]=[out[j],out[i]];} return out; }
function groupByRole<T extends Evaluated>(items:T[]){ const g:Record<string,T[]>= {anchor:[],deep:[],wildcard:[],unknown:[]}; for(const it of items) g[pickRole(it)].push(it); return g; }
function* interleave<T>(groups:Record<string,T[]>,order:string[]){ const qs=order.map(k=>[...(groups[k]??[])]); let any=true; while(any){ any=false; for(const q of qs){ const x=q.shift(); if(x!==undefined){ any=true; yield x; }}}}
function uniqKey(e:Evaluated){ return `${norm(e.artist)}__${norm(e.title)}`; }
function artistKey(e:Evaluated){ return norm(e.artist); }

async function resolveDurations(items:Evaluated[],helpers?:FinalizeHelpers){
  const out:number[]=[]; for(const it of items){
    let ms:number|null|undefined=undefined;
    if(helpers?.getDurationMs && it.uri){ try{ ms=await helpers.getDurationMs(it.uri);}catch{} }
    if(!ms || !Number.isFinite(ms)) ms=225_000; // 3:45 既定
    out.push(Math.max(30_000, Math.min(ms, 9*60_000)));
  } return out;
}

// —— “特集っぽい”軽量推定（タイトル/概要 + 候補の偏り）
function looksLikeSingleArtistTitle(title?:string, overview?:string){
  const t=norm(title), o=norm(overview);
  const pats:[RegExp,string][]= [
    [/^はじめての(.+?)$/,"はじめての ${1}"],
    [/(?:入門|特集|ベスト|名曲集)\s*[:：]\s*(.+)$/,"入門/特集/ベスト ${1}"],
    [/^best of (.+)$/i,"Best of ${1}"],
    [/^the very best of (.+)$/i,"The Very Best of ${1}"],
    [/(.+?)(?:大全|特集)$/,"${1} 特集"],
  ];
  for(const [re,kind] of pats){
    const m=t.match(re)||o.match(re);
    if(m && m[1]){ const name=m[1].trim(); if(name.length>=2&&name.length<=64){ return {hit:true,name,reason:`title/overview パターン: ${kind.replace("${1}",name)}`};}}
  }
  return {hit:false};
}
function findDominantArtist(picked:Evaluated[]){
  const cnt=new Map<string,number>();
  for(const e of picked){ const k=artistKey(e); cnt.set(k,(cnt.get(k)??0)+1); }
  let bestName: string|undefined; let best=0;
  for(const [k,v] of cnt.entries()){ if(v>best){best=v; bestName=k;} }
  const share=picked.length>0? best/picked.length : 0;
  return {name:bestName, share};
}

async function autoInferContext(meta: {
  programTitle?: string;
  programOverview?: string;
  narrativeClassifier?: FinalizeOptions["narrativeClassifier"];
}, picked: Evaluated[]): Promise<AutoArtistContext> {
  const { programTitle, programOverview, narrativeClassifier } = meta;

  if(narrativeClassifier){
    try{
      const out = await narrativeClassifier({ title: programTitle, overview: programOverview, picked });
      if(out && (out.mode==="single-artist"||out.mode==="multi-artist"||out.mode==="unknown")) return out;
    }catch{}
  }

  const pat=looksLikeSingleArtistTitle(programTitle, programOverview);
  const dom=findDominantArtist(picked);
  // どちらかがヒットで “特集” とみなす（必要なら dom.share の閾値を 0.8 に上げられます）
  if((pat.hit && pat.name) || (dom.share>=0.6 && dom.name)){
    return { mode:"single-artist", focusArtist: pat.name ?? dom.name, reason: pat.hit? pat.reason : "候補の大半が同一アーティスト（特集と判断）" };
  }
  return { mode:"unknown" };
}

// ===== 本体 =====
export async function finalizeSetlist(
  picked: Evaluated[],
  options: FinalizeOptions,
  helpers?: FinalizeHelpers
): Promise<FinalizeResult> {
  // 1) メタ情報と運用パラメータを分離
  const {
    programTitle,
    programOverview,
    narrativeClassifier,
    ...rest
  } = (options ?? {});

  // 2) 運用パラメータは defaults とマージ（型は DEFAULT_OPTS に準拠）
  const cfg: typeof DEFAULT_OPTS = { ...DEFAULT_OPTS, ...(rest as Partial<typeof DEFAULT_OPTS>) };

  // 3) 重複除去
  const seen=new Set<string>();
  const dedup=picked.filter(it=>{ const k=uniqKey(it); if(seen.has(k)) return false; seen.add(k); return true; });

  // 4) 並びの土台
  const grouped=groupByRole(dedup);
  const order=cfg.preferRoleOrder ?? DEFAULT_OPTS.preferRoleOrder;
  const ordered = (cfg.interleaveRoles!==false)
    ? Array.from(interleave(grouped, order))
    : order.flatMap(k => grouped[k] ?? []);
  const base = shuffleLight(ordered, !!cfg.lightShuffle);

  // 5) auto のときは “特集っぽさ” を推定
  const inferred = (cfg.artistPolicy==="auto")
    ? await autoInferContext({ programTitle, programOverview, narrativeClassifier }, base)
    : undefined;

  // 6) アーティスト被りの抑制（auto は特集なら無制限）
  const artistCount=new Map<string,number>();
  const eff = { policy: "strict" as "strict"|"none", focusArtistAuto: undefined as string|undefined, focusReason: undefined as string|undefined };
  if(cfg.artistPolicy==="none"){ eff.policy="none"; }
  if(cfg.artistPolicy==="auto" && inferred?.mode==="single-artist"){ eff.policy="none"; eff.focusArtistAuto=inferred.focusArtist; eff.focusReason=inferred.reason; }

  const noOver = base.filter(e=>{
    const key=artistKey(e);
    const cap = eff.policy==="none" ? Number.POSITIVE_INFINITY : Math.max(1, cfg.maxPerArtist ?? 2);
    const n=(artistCount.get(key)??0)+1;
    if(n>cap) return false;
    artistCount.set(key,n);
    return true;
  });

// 7) 目的に応じて切り出し（曲数 or 分数）
const durations=await resolveDurations(noOver, helpers);
let selected:Evaluated[]=[]; let selDur:number[]=[];

if(cfg.mode==="duration"){
  // ❌ cfg.maxTracksHardCap / cfg.targetDurationMin は Omit 済みなので持っていない
  // ✅ rest から読む
  const cap = Math.max(1, (rest.maxTracksHardCap ?? 30));
  const targetMs = Math.max(1, Math.round((rest.targetDurationMin ?? 30) * 60_000));
  let total=0;
  for(let i=0;i<noOver.length && selected.length<cap;i++){
    const d=durations[i];
    if(total>0 && total+d > targetMs*1.06) continue; // +6%超過を回避
    selected.push(noOver[i]); selDur.push(d); total+=d;
    if(total>=targetMs*0.94 && total<=targetMs*1.06) break; // ±6%で止める
  }
  if(selected.length===0 && noOver.length>0){ selected.push(noOver[0]); selDur.push(durations[0]); }
}else{
  const k=Math.max(1, Math.min(noOver.length, (rest.maxTracks ?? 10)));
  selected=noOver.slice(0,k); selDur=durations.slice(0,k);
}
  // 8) タイムライン化
  let clock=0;
  const tracks:FinalizedTrack[] = selected.map((e,i)=>{
    const role=pickRole(e); const d=selDur[i]!;
    const t:FinalizedTrack = {
      title:e.title, artist:e.artist, uri:e.uri, index:i+1,
      start_at_ms: clock, duration_ms: d, role,
      reason: (cfg.shortReason??true)? shortReason(e.reason): e.reason,
      confidence: e.confidence,
    };
    clock+=d; return t;
  });

  // 9) 統計
  const perRole:{[k:string]:number}={anchor:0,deep:0,wildcard:0,unknown:0};
  for(const t of tracks) perRole[t.role ?? "unknown"]++;
  return {
    program_duration_ms: tracks.reduce((s,t)=>s+t.duration_ms,0),
    tracks,
    stats: {
      total_candidates: picked.length,
      accepted_count: tracks.length,
      unique_artists: new Set(tracks.map(t=>t.artist)).size,
      per_role: perRole,
      artist_policy_effective: eff.policy,
      focus_artist_auto: eff.focusArtistAuto,
      focus_reason: eff.focusReason,
    },
  };
}
