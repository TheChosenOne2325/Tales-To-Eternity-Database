// Monstros: troca os valores da ficha pelo Level/Role escolhidos e calcula os pontos (Rupture Of The Cosmos, cap. 1).
// Também roda o Encounter Builder (encounters.html).
(() => {
  const VIDA = { // Level: Fragile, Weak, Medium, Strong
    1: [6, 9, 12, 15], 2: [8, 12, 15, 19], 3: [9, 13, 17, 22], 4: [10, 15, 20, 25], 5: [11, 17, 22, 28], 6: [13, 19, 25, 32],
    7: [14, 21, 27, 34], 8: [15, 23, 30, 38], 9: [16, 24, 32, 40], 10: [18, 27, 35, 44], 11: [19, 28, 37, 47], 12: [20, 30, 40, 50],
  };
  const CATS = ["Fragile", "Weak", "Medium", "Strong"];
  const DADOS = { Weak: ["d4", "d6", "d8", "d10"], Medium: ["d6", "d8", "d10", "d12"], Strong: ["d8", "d10", "d12", "3d4"], Brutal: ["2d4", "2d6", "2d8", "2d10"] };
  const MEDIA = { Weak: [2.5, 3.5, 4.5, 5.5], Medium: [3.5, 4.5, 5.5, 6.5], Strong: [4.5, 5.5, 6.5, 7.5], Brutal: [5, 7, 9, 11] };
  const ATAQUES = { Minion: 1, Standard: 1, Elite: 2, Boss: 4 }; // Boss: 2 ataques + 2 Boss Actions
  const HABS_PAPEL = { Minion: 0, Standard: 1, Elite: 2, Boss: 3 };
  const PONTOS_DIF = [["Easy", 4], ["Normal", 6], ["Hard", 8], ["Deadly", 12]];
  const NOMES = { STR: "Strength", DEX: "Dexterity", AGI: "Agility", INT: "Intellect", SPI: "Spirit", CHA: "Charisma" };
  const tier = (L) => Math.floor((L - 1) / 3);
  const sinal = (v) => (v >= 0 ? "+" : "") + v;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // Valores do monstro no Level/Role escolhidos. extras = habilidades acrescentadas além das dele.
  // Lg = level do grupo: os pontos comparam com um Standard Medium do level do GRUPO (livro, cap. 1).
  function valores(e, L, papel, pjs = 4, extras = [], Lg = L) {
    const t = tier(L), tg = tier(Lg);
    // Habilidades extras: Regeneration/Undying somam 10% na Resistência (como no livro); ações, reações e Boss Actions somam 10% na Ameaça; outros traços não mudam os pontos.
    const extraT = extras.filter((h) => ["Regeneration", "Undying"].includes(h.nome)).length;
    const extraH = extras.filter((h) => h.categoria !== "Trait").length;
    const attr = (k) => { const [tipo, v] = e.attrs[k]; return tipo === "scale" ? Math.min(v + t, 5) : v; };
    const mult = { Minion: 0.5, Standard: 1, Elite: 2, Boss: pjs }[papel];
    const vida = Math.ceil(VIDA[L][CATS.indexOf(e.life)] * mult);
    const def = e.def + t;
    // Pontos: 8 × √(Resistência × Ameaça), comparando com um Standard Medium do level do grupo.
    let T = (vida / VIDA[Lg][2]) * (1 + 0.08 * (def - (10 + tg))) * (1 + (e.res >= 3 ? 0.5 : e.res ? 0.25 : 0)) * (1 + 0.1 * (e.extra + extraT));
    const golpes = e.ataques.map(([a, c]) => {
      const media = papel === "Minion" ? 3 + t : MEDIA[c === "Minion" ? "Medium" : c][t];
      return (media / MEDIA.Medium[tg]) * (1 + 0.08 * (attr(a) - (2 + tg)));
    });
    let H = ATAQUES[papel] * Math.max(0.5, ...golpes) * (1 + 0.1 * extraH);
    let pontos = 8 * Math.sqrt(Math.max(T, 0) * Math.max(H, 0)) * (papel === "Minion" ? 0.75 : 1);
    return { t, attr, vida, def, pontos };
  }

  // Troca o texto da ficha (que vem em notação de tier "A > B > C > D") pelos números do level.
  function aplicar(raiz, e, L, papel, pjs, extras = []) {
    const v = valores(e, L, papel, pjs, extras);
    raiz.querySelectorAll(".esc-vida").forEach((s) => (s.textContent = v.vida));
    raiz.querySelectorAll(".esc-atk").forEach((s) => (s.textContent = `${sinal(v.attr(s.dataset.a))} (${NOMES[s.dataset.a]})`));
    raiz.querySelectorAll(".esc-dc").forEach((s) => (s.textContent = String(10 + v.attr(s.dataset.a))));
    raiz.querySelectorAll(".esc-dmg").forEach((s) => {
      const c = s.dataset.c;
      s.textContent = papel === "Minion" ? `Fixed (${3 + v.t})` : `${c === "Minion" ? "Medium" : c} (${DADOS[c === "Minion" ? "Medium" : c][v.t]})`;
    });
    const andar = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    const nos = [];
    while (andar.nextNode()) if (andar.currentNode.nodeValue.includes(" > ")) nos.push(andar.currentNode);
    nos.forEach((n) => (n.nodeValue = n.nodeValue.replace(/(\S+) > (\S+) > (\S+) > (\S+)/g, (...m) => m[1 + v.t])));
    return v;
  }

  // Coloca habilidades extras na seção certa da ficha (Traits, Actions, Reactions, Boss Actions).
  function acrescentar(raiz, habs) {
    const ordem = ["Traits", "Actions", "Reactions", "Boss Actions"];
    for (const h of habs) {
      const titulo = h.categoria + "s";
      const h3s = [...raiz.querySelectorAll("h3")];
      let alvo = h3s.find((x) => x.textContent.trim() === titulo);
      const p = document.createElement("div");
      p.className = "hab-extra";
      p.innerHTML = h.html;
      if (!alvo) {
        alvo = document.createElement("h3");
        alvo.textContent = titulo;
        const depois = h3s.find((x) => ordem.indexOf(x.textContent.trim()) > ordem.indexOf(titulo));
        depois ? depois.before(alvo) : raiz.append(alvo);
      }
      let fim = alvo;
      while (fim.nextElementSibling && fim.nextElementSibling.tagName !== "H3") fim = fim.nextElementSibling;
      fim.after(p);
    }
  }

  const opcoes = (lista, atual) => lista.map((o) => `<option${String(o) === String(atual) ? " selected" : ""}>${o}</option>`).join("");
  const LEVELS = Array.from({ length: 12 }, (_, i) => i + 1);
  const PAPEIS = ["Minion", "Standard", "Elite", "Boss"];

  // Ficha do Bestiary: seletor de Level, Role e número de personagens (para Boss).
  function controles(ficha, item) {
    const e = item.escala;
    const texto = ficha.querySelector(".ficha-texto");
    if (!e || !texto) return;
    const original = texto.innerHTML;
    const barra = document.createElement("div");
    barra.className = "escala";
    barra.innerHTML = `<label>Level <select data-l>${opcoes(LEVELS, e.level)}</select></label>
      <label>Role <select data-r>${opcoes(PAPEIS, e.role)}</select></label>
      <label data-pj-rotulo>Characters <select data-pj>${opcoes([1, 2, 3, 4, 5, 6, 7, 8], 4)}</select></label>
      <span class="escala-pontos" data-pts></span>
      <button type="button" data-sug title="Back to the suggested Level and Role">Suggested</button>`;
    texto.before(barra);
    const [sl, sr, sp] = ["[data-l]", "[data-r]", "[data-pj]"].map((s) => barra.querySelector(s));
    const atualizar = () => {
      texto.innerHTML = original;
      const papel = sr.value;
      barra.querySelector("[data-pj-rotulo]").hidden = papel !== "Boss";
      const v = aplicar(texto, e, +sl.value, papel, +sp.value);
      barra.querySelector("[data-pts]").textContent = `${Math.round(v.pontos)} points`;
    };
    barra.addEventListener("change", atualizar);
    barra.querySelector("[data-sug]").addEventListener("click", () => { sl.value = e.level; sr.value = e.role; atualizar(); });
    atualizar();
  }

  // ---- Encounter Builder ----
  function construtor(raiz, dados, base) {
    const M = Object.fromEntries(dados.monstros.map((m) => [m.id, m]));
    const H = Object.fromEntries(dados.habilidades.map((h) => [h.id, h]));
    const comBase = (html) => html.replaceAll('src="@img/', `src="${base}img/`);
    const CHAVE = "tte-encontro";
    let st = { pjs: 4, nivel: 1, linhas: [] };
    try { st = Object.assign(st, JSON.parse(localStorage.getItem(CHAVE)) || {}); } catch {}
    st.linhas = st.linhas.filter((l) => M[l.m]);
    const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(st)); } catch {} };
    let seq = st.linhas.reduce((n, l) => Math.max(n, l.k || 0), 0);
    const abertas = new Set();

    raiz.innerHTML = `<section class="enc-lado">
      <div class="lista-titulo"><img class="icone mini" src="${base}img/encounters.svg" alt="" width="512" height="512"><h1>Encounter Builder</h1></div>
      <div class="enc-grupo">
        <label>Characters <select data-pjs>${opcoes([1, 2, 3, 4, 5, 6, 7, 8], st.pjs)}</select></label>
        <label>Group level <select data-nivel>${opcoes(LEVELS, st.nivel)}</select></label>
      </div>
      <input type="search" placeholder="Find monsters…" aria-label="Find monsters" data-busca-m>
      <div class="enc-catalogo" data-catalogo></div>
    </section>
    <section class="enc-principal">
      <div class="enc-resumo" data-resumo></div>
      <div class="enc-linhas" data-linhas></div>
    </section>`;
    const $ = (s) => raiz.querySelector(s);

    const catalogo = () => {
      const q = $("[data-busca-m]").value.trim().toLowerCase();
      $("[data-catalogo]").innerHTML = dados.monstros.filter((m) => !q || m.nome.toLowerCase().includes(q) || m.tipo.toLowerCase().includes(q))
        .map((m) => `<button type="button" class="enc-item" data-add="${m.id}"><img class="icone micro" src="${base}img/${m.icone}" alt="" width="512" height="512"><span><strong>${esc(m.nome)}</strong><small>${esc(m.escala.role)} · Level ${m.escala.level} · ${esc(m.tipo)}</small></span><b aria-hidden="true">+</b></button>`).join("")
        || `<p class="vazio">No monsters.</p>`;
    };

    const desenhar = () => {
      salvar();
      let total = 0;
      const linhas = st.linhas.map((l) => {
        const m = M[l.m];
        const extras = l.h.map((id) => H[id]).filter(Boolean);
        const v = valores(m.escala, l.nivel, l.papel, st.pjs, extras, st.nivel);
        total += v.pontos * l.n;
        const livres = dados.habilidades.filter((h) => !l.h.includes(h.id));
        return `<article class="enc-linha" data-k="${l.k}">
          <div class="enc-topo">
            <img class="icone mini" src="${base}img/${m.icone}" alt="" width="512" height="512">
            <a class="enc-nome" href="${base}monsters.html#${m.id}">${esc(m.nome)}</a>
            <span class="enc-qtd"><button type="button" data-menos aria-label="Fewer">−</button><b>${l.n}</b><button type="button" data-mais aria-label="More">+</button></span>
            <label>Level <select data-lv>${opcoes(LEVELS, l.nivel)}</select></label>
            <label>Role <select data-pp>${opcoes(PAPEIS, l.papel)}</select></label>
            <span class="enc-pts" title="Points each × quantity">${Math.round(v.pontos)} × ${l.n} = <b>${Math.round(v.pontos * l.n)}</b></span>
            <button type="button" class="enc-x" data-tirar aria-label="Remove">×</button>
          </div>
          <div class="enc-habs">
            <span class="enc-vida">Life ${v.vida} · Defense ${v.def}</span>
            ${extras.map((h) => `<span class="enc-hab">${esc(h.nome)}<button type="button" data-tirar-hab="${h.id}" aria-label="Remove ${esc(h.nome)}">×</button></span>`).join("")}
            <select data-hab aria-label="Add an ability"><option value="">+ Ability…</option>${["Trait", "Action", "Reaction", "Boss Action"].map((c) => `<optgroup label="${c}s">${livres.filter((h) => h.categoria === c).map((h) => `<option value="${h.id}">${esc(h.nome)}</option>`).join("")}</optgroup>`).join("")}</select>
            <button type="button" class="enc-ver" data-ver>${abertas.has(l.k) ? "Hide sheet" : "Show sheet"}</button>
          </div>
          ${abertas.has(l.k) ? `<div class="ficha-texto enc-ficha" data-ficha-m></div>` : ""}
        </article>`;
      }).join("");
      $("[data-linhas]").innerHTML = linhas || `<p class="vazio">Add monsters from the list.</p>`;
      st.linhas.forEach((l) => {
        if (!abertas.has(l.k)) return;
        const alvo = raiz.querySelector(`[data-k="${l.k}"] [data-ficha-m]`);
        alvo.innerHTML = comBase(M[l.m].html);
        acrescentar(alvo, l.h.map((id) => H[id]).filter(Boolean));
        aplicar(alvo, M[l.m].escala, l.nivel, l.papel, st.pjs);
      });
      // Orçamento e dificuldade
      const orc = PONTOS_DIF.map(([n, p]) => [n, p * st.pjs]);
      let dif = "Trivial";
      for (const [n, p] of orc) if (total >= p) dif = n;
      const xpNormal = ((st.nivel + 1) * 100) / 4;
      const fator = { Trivial: 0, Easy: 0.5, Normal: 1, Hard: 1.5, Deadly: 2 }[dif];
      $("[data-resumo]").innerHTML = `<div class="enc-total"><span>Total</span><strong>${Math.round(total)} points</strong><em class="dif-${dif.toLowerCase()}">${dif}</em></div>
        <ul class="enc-orc">${orc.map(([n, p]) => `<li class="${n === dif ? "ativo" : ""}"><span>${n}</span><b>${p}</b></li>`).join("")}</ul>
        <p class="enc-xp">XP per character: <b>${Math.round(xpNormal * fator)}</b>${st.linhas.length ? ` <button type="button" data-limpar-enc>Clear</button>` : ""}</p>`;
    };

    const linha = (alvo) => st.linhas.find((l) => l.k === +alvo.closest("[data-k]")?.dataset.k);
    raiz.addEventListener("click", (ev) => {
      const b = ev.target.closest("button");
      if (!b) return;
      if (b.dataset.add) {
        const m = M[b.dataset.add];
        const igual = st.linhas.find((l) => l.m === m.id && l.nivel === st.nivel && l.papel === m.escala.role && !l.h.length);
        if (igual) igual.n++;
        else st.linhas.push({ k: ++seq, m: m.id, n: 1, nivel: st.nivel, papel: m.escala.role, h: [] });
      } else if (b.hasAttribute("data-limpar-enc")) st.linhas = [];
      else {
        const l = linha(b);
        if (!l) return;
        if (b.hasAttribute("data-mais")) l.n++;
        else if (b.hasAttribute("data-menos")) l.n = Math.max(1, l.n - 1);
        else if (b.hasAttribute("data-tirar")) st.linhas = st.linhas.filter((x) => x !== l);
        else if (b.dataset.tirarHab) l.h = l.h.filter((id) => id !== b.dataset.tirarHab);
        else if (b.hasAttribute("data-ver")) abertas.has(l.k) ? abertas.delete(l.k) : abertas.add(l.k);
        else return;
      }
      desenhar();
    });
    raiz.addEventListener("change", (ev) => {
      const s = ev.target;
      if (s.matches("[data-pjs]")) st.pjs = +s.value;
      else if (s.matches("[data-nivel]")) { st.nivel = +s.value; st.linhas.forEach((l) => (l.nivel = st.nivel)); }
      else {
        const l = linha(s);
        if (!l) return;
        if (s.matches("[data-lv]")) l.nivel = +s.value;
        else if (s.matches("[data-pp]")) l.papel = s.value;
        else if (s.matches("[data-hab]") && s.value) l.h.push(s.value);
        else return;
      }
      desenhar();
    });
    $("[data-busca-m]").addEventListener("input", catalogo);
    catalogo();
    desenhar();
  }

  window.TTE_Monstro = { valores, aplicar, acrescentar, controles, construtor };
})();
