/* Método PMDF — classificador local exclusivo dos flashcards.
   Rede 6→8→3 extraída do motor original; apenas atribui escores de apoio.
   Não gera conteúdo, não acessa serviços externos e não carrega outras ferramentas. */
(function(root){
"use strict";
const storageKey="pmdf:flashcards:classifier:v1";
const legacyKey="pesos_ia_sb_v5";
const matrix=(rows,columns)=>Array.from({length:rows},()=>Array.from({length:columns},()=>Math.random()*2-1));
const validMatrix=(value,rows,columns)=>Array.isArray(value)&&value.length===rows&&
 value.every(row=>Array.isArray(row)&&row.length===columns&&row.every(Number.isFinite));

class FlashcardClassifier {
 constructor(){
  this.taxaAprendizado=.35;
  this.ciclosTreino=0;
  this.inicializarModelo();
 }
 sigmoid(value){return 1/(1+Math.exp(-value));}
 derivadaSigmoid(value){return value*(1-value);}
 extrairFeatures(texto){
  const t=String(texto??"").toLowerCase(),words=t.split(/\s+/).filter(Boolean);
  return [
   Math.min((t.match(/\b(somente|apenas|vedado|defeso)\b/g)||[]).length/2,1),
   Math.min((t.match(/\b(salvo|exceto|ressalvado|desde que)\b/g)||[]).length/2,1),
   Math.min((t.match(/\b(\d+|dias|meses|anos)\b/g)||[]).length/2,1),
   Math.min((t.match(/\b(deve|pode|facultado|compete)\b/g)||[]).length/2,1),
   Math.min((t.match(/\b(não|jamais|independe)\b/g)||[]).length/2,1),
   Math.min(words.length/50,1)
  ];
 }
 preverVetor(entradas){
  const oculta=this.pesosOculta[0].map((_,j)=>{
   let sum=0;
   for(let i=0;i<entradas.length;i++)sum+=entradas[i]*this.pesosOculta[i][j];
   return this.sigmoid(sum);
  });
  const saida=this.pesosSaida[0].map((_,k)=>{
   let sum=0;
   for(let j=0;j<oculta.length;j++)sum+=oculta[j]*this.pesosSaida[j][k];
   return this.sigmoid(sum);
  });
  return {oculta,saida};
 }
 treinarPasso(entradas,esperado){
  const {oculta,saida}=this.preverVetor(entradas);
  const outputAdjust=saida.map((value,k)=>(esperado[k]-value)*this.derivadaSigmoid(value));
  const hiddenAdjust=oculta.map((value,j)=>{
   let error=0;
   for(let k=0;k<outputAdjust.length;k++)error+=outputAdjust[k]*this.pesosSaida[j][k];
   return error*this.derivadaSigmoid(value);
  });
  for(let j=0;j<oculta.length;j++)
   for(let k=0;k<outputAdjust.length;k++)
    this.pesosSaida[j][k]+=oculta[j]*outputAdjust[k]*this.taxaAprendizado;
  for(let i=0;i<entradas.length;i++)
   for(let j=0;j<hiddenAdjust.length;j++)
    this.pesosOculta[i][j]+=entradas[i]*hiddenAdjust[j]*this.taxaAprendizado;
 }
 inicializarModelo(){
  // Reaproveita pesos compatíveis sem alterar os dados da plataforma original.
  for(const key of [storageKey,legacyKey]){
   try{
    const stored=JSON.parse(root.localStorage?.getItem(key)||"null");
    if(!stored||!validMatrix(stored.pesosOculta,6,8)||!validMatrix(stored.pesosSaida,8,3))continue;
    this.pesosOculta=stored.pesosOculta;
    this.pesosSaida=stored.pesosSaida;
    this.ciclosTreino=Number.isFinite(stored.ciclosTreino)?stored.ciclosTreino:3000;
    if(key===legacyKey)this.salvarModelo();
    return;
   }catch(_){/* Armazenamento bloqueado ou pesos inválidos: inicializar localmente. */}
  }
  this.pesosOculta=matrix(6,8);
  this.pesosSaida=matrix(8,3);
  const samples=[
   {in:[0,0,0,0,0,.2],out:[.15,.10,.20]},
   {in:[1,0,0,.5,0,.5],out:[.65,.85,.45]},
   {in:[0,1,1,.5,.5,.8],out:[.90,.90,.88]}
  ];
  for(let epoch=0;epoch<3000;epoch++)
   for(const sample of samples)this.treinarPasso(sample.in,sample.out);
  this.ciclosTreino=3000;
  this.salvarModelo();
 }
 salvarModelo(){
  try{root.localStorage?.setItem(storageKey,JSON.stringify({
   pesosOculta:this.pesosOculta,pesosSaida:this.pesosSaida,ciclosTreino:this.ciclosTreino
  }));}catch(_){/* A geração continua disponível sem armazenamento local. */}
 }
}
let model=null;
root.PMDFFlashcardClassifier=Object.freeze({
 getModel:()=>model||(model=new FlashcardClassifier()),
 version:"20261124-flashcards-v1"
});
})(window);
