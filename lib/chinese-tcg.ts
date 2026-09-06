import type { PokemonCard, PokemonSet } from "./types"

const API_BASE = "https://guardiantcg.app/api/v1"
const GAME = "pokemon-chn"
const CACHE_SECONDS = 21600

type GSet={id:number;name:string;slug:string;game:string;totalCards:number;releaseDate:string|null;logo:string|null}
type SetsResponse={success:boolean;count:number;data:GSet[];attribution?:string}
type CardsResponse={success?:boolean;count?:number;data?:unknown[];attribution?:string}

function key(){
  const v=process.env.GUARDIAN_TCG_API_KEY?.trim()
  if(!v) throw new Error("Missing GUARDIAN_TCG_API_KEY in .env.local")
  return v
}
async function api<T>(path:string):Promise<T>{
  const r=await fetch(`${API_BASE}${path}`,{
    headers:{"X-Api-Key":key(),Accept:"application/json"},
    next:{revalidate:CACHE_SECONDS},
  })
  if(!r.ok){
    const body=await r.text().catch(()=>"")
    console.error("Guardian API error",r.status,path,body.slice(0,800))
    if(r.status===401||r.status===403) throw new Error("Guardian rejected GUARDIAN_TCG_API_KEY")
    if(r.status===429) throw new Error("Guardian API request limit reached")
    throw new Error(`Guardian request failed (${r.status})`)
  }
  return r.json() as Promise<T>
}
function setOf(s:GSet):PokemonSet{
  return{
    id:s.slug,
    name:s.name||s.slug,
    series:"Pokemon Chinese",
    printedTotal:Number(s.totalCards||0),
    total:Number(s.totalCards||0),
    releaseDate:s.releaseDate||"",
    updatedAt:"",
    images:{logo:s.logo||"",symbol:""},
  }
}
export async function getAllChineseSets():Promise<PokemonSet[]>{
  const r=await api<SetsResponse>(`/sets/${GAME}`)
  return r.success&&Array.isArray(r.data)?r.data.filter(s=>s.game===GAME).map(setOf):[]
}
export async function getChineseSetById(slug:string):Promise<PokemonSet|null>{
  const sets=await getAllChineseSets()
  return sets.find(s=>s.id===slug)||null
}
function pick(o:Record<string,unknown>,...ks:string[]){
  for(const k of ks){const v=o[k];if(v!==undefined&&v!==null&&v!=="")return v}
}
function txt(v:unknown){return typeof v==="string"||typeof v==="number"?String(v):""}
function img(c:Record<string,unknown>,large=false){
  const x=c.images
  if(x&&typeof x==="object"&&!Array.isArray(x)){
    const i=x as Record<string,unknown>
    const v=large?pick(i,"large","front","url","small"):pick(i,"small","front","url","large")
    if(typeof v==="string")return v
  }
  const v=large?pick(c,"imageLarge","image_large","imageUrl","image_url","image"):pick(c,"imageSmall","image_small","imageUrl","image_url","image")
  return typeof v==="string"?v:""
}
function cardOf(raw:unknown,set:PokemonSet):PokemonCard|null{
  if(!raw||typeof raw!=="object"||Array.isArray(raw))return null
  const c=raw as Record<string,unknown>
  const rid=pick(c,"id","cardId","card_id","canonicalId","canonical_id")
  const name=txt(pick(c,"name","cardName","card_name","productName","product_name"))
  const number=txt(pick(c,"number","cardNumber","card_number","localId","local_id"))
  const rarity=txt(pick(c,"rarity"))
  const small=img(c),large=img(c,true)||small
  return{
    id:`zh-${txt(rid)||`${set.id}-${number}-${name}`}`,
    name:name||"Unknown Card",number,supertype:"Pokémon",subtypes:[],hp:undefined,types:[],
    evolvesFrom:undefined,evolvesTo:[],rules:[],attacks:[],weaknesses:[],resistances:[],
    retreatCost:[],convertedRetreatCost:0,artist:undefined,rarity:rarity||undefined,
    flavorText:undefined,nationalPokedexNumbers:[],legalities:{},images:{small,large},
    tcgplayer:undefined,cardmarket:undefined,set,
  }
}
export async function getChineseCardsBySet(slug:string):Promise<PokemonCard[]>{
  const set=await getChineseSetById(slug)
  if(!set)throw new Error(`Chinese set ${slug} was not found`)
  const r=await api<CardsResponse>(`/sets/${GAME}/${encodeURIComponent(slug)}/cards`)
  return(Array.isArray(r.data)?r.data:[])
    .map(x=>cardOf(x,set))
    .filter((x):x is PokemonCard=>x!==null)
    .sort((a,b)=>(a.number||"").localeCompare(b.number||"",undefined,{numeric:true}))
}