// avatarGen.js — offline SVG avatar generator (anime-ish chibi)
function makeAvatarSVG(seedText, style, size=240){
  const colorMap = {
    "fofo":["#FFD1DC","#FF9AA2"],
    "romântico":["#FFE4F0","#FFB3D1"],
    "engraçado":["#FFF3C4","#FCE38A"],
    "frio":["#DCECFB","#B0C4DE"],
    "misterioso":["#E6E0FF","#A390EE"],
    "possessivo":["#FFD6D6","#FF7F7F"],
    "default":["#EEE","#DDD"]
  };
  const palette = colorMap[style] || colorMap["default"];
  const bg = palette[0];
  const accent = palette[1];
  const initial = (seedText||"X")[0].toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="100%" height="100%" rx="${size*0.12}" fill="${bg}"/>
    <circle cx="${size*0.5}" cy="${size*0.36}" r="${size*0.22}" fill="${accent}" opacity="0.95"/>
    <rect x="${size*0.18}" y="${size*0.62}" width="${size*0.64}" height="${size*0.30}" rx="${size*0.06}" fill="white" opacity="0.6"/>
    <text x="50%" y="50%" font-size="${size*0.3}" text-anchor="middle" fill="#222" font-family="sans-serif" dy=".08em">${initial}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// helper to create image element
function createAvatarElement(name, style){
  const url = makeAvatarSVG(name, style, 240);
  const el = document.createElement("div");
  el.className = "avatar-preview";
  el.innerHTML = `<img src="${url}" alt="${name}" />`;
  return el;
}
