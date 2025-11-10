// miniAI.js — local interpreter with emotional variability and language support
const LANG = { "pt-BR": "pt-BR", "en-US": "en-US", "ja-JP": "ja-JP" };

const STYLE_TOKENS = {
  "fofo": { suffix:["~", "uwu", "😊"], tones:["gentil","carinhoso"] },
  "romântico": { suffix:["💖","💘"], tones:["apaixonado","doce"] },
  "engraçado": { suffix:["😂","rs"], tones:["brincalhão","leve"] },
  "frio": { suffix:["."], tones:["distante","calmo"] },
  "misterioso": { suffix:["..."], tones:["enigmático"] },
  "possessivo": { suffix:["🔒"], tones:["protetor","ciumento"] },
  "default": { suffix:[""], tones:["neutro"] }
};

// analyze user input for intent and sentiment (very simple heuristics)
function analyzeInput(text){
  const t = (text||"").toLowerCase();
  return {
    greeting: /^(oi|ol[áa]|ola|hey|hello|hi)\b/.test(t),
    question: /\?$/.test(t.trim()),
    praise: /(gosto|amo|adoro|love|like)/i.test(t),
    negative: /(não gosto|odeio|ruim|bad|hate)/i.test(t),
    short: t.length < 12
  };
}

// emotional variability: small state machine per character (stored in character.emotion)
function varyEmotion(character, userAnalysis){
  // small chance to shift emotion slightly
  const rand = Math.random();
  if(rand < 0.12){
    // flip to a random tone from style tokens
    const s = STYLE_TOKENS[character.style] || STYLE_TOKENS["default"];
    character.emotion = s.tones[Math.floor(Math.random()*s.tones.length)] || character.emotion;
  }
  // if user praises and character is romantic/fofo, become happier
  if(userAnalysis.praise && (character.style==="romântico" || character.style==="fofo")){
    character.emotion = "feliz";
  }
  if(userAnalysis.negative){
    character.emotion = "chateado";
  }
}

// generate reply text based on style, analysis and language
function generateReply(character, userText, lang="pt-BR"){
  const analysis = analyzeInput(userText);
  varyEmotion(character, analysis);
  const style = STYLE_TOKENS[character.style] || STYLE_TOKENS["default"];
  // base responses per analysis
  let base = "";
  if(analysis.greeting) base = (lang==="pt-BR")? `Olá, sou ${character.name}` : (lang==="en-US")? `Hi, I'm ${character.name}` : `こんにちは、私は${character.name}です`;
  else if(analysis.question) base = (lang==="pt-BR")? "Boa pergunta…" : (lang==="en-US")? "Good question..." : "いい質問ですね…";
  else if(analysis.praise) base = (lang==="pt-BR")? "Ah, obrigado! Isso me deixa feliz" : (lang==="en-US")? "Ah, thank you! That makes me happy" : "ありがとう！うれしいです";
  else base = (lang==="pt-BR")? "Entendo..." : (lang==="en-US")? "I see..." : "なるほど…";
  // add style suffix
  const suf = style.suffix[Math.floor(Math.random()*style.suffix.length)];
  const reply = `${character.name}: ${base} ${suf}`;
  // attach meta JSON
  const meta = JSON.stringify({ emotion: character.emotion || "neutro", tone: character.style || "padrão", lang });
  return `${reply}\n\n${meta}`;
}

// TTS wrapper using selected language
function speakText(text, lang="pt-BR"){
  if(!("speechSynthesis" in window)) return;
  try{
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }catch(e){}
}
