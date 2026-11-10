// Comportamento do site: busca no site todo e listas com filtro.
// Tudo roda no navegador, sem internet e sem servidor.
const base = document.body.dataset.base;

// Ícone que ainda não existe em img/: troca pela inicial do nome.
const semIcone = (img) => {
  const s = document.createElement("span");
  s.className = img.className + " sem-imagem";
  s.setAttribute("aria-hidden", "true");
  s.textContent = img.dataset.inicial || "";
  img.replaceWith(s);
};
document.querySelectorAll("img[data-inicial]").forEach((img) => { if (img.complete && !img.naturalWidth) semIcone(img); });
document.addEventListener("error", (e) => { if (e.target.matches?.("img[data-inicial]")) semIcone(e.target); }, true);
// Fichas geradas apontam imagens para "@img/"; aqui vira o caminho certo da página.
const comBase = (html) => html.replaceAll('src="@img/', `src="${base}img/`);
const imgIcone = (arquivo, nome, classe) =>
  arquivo ? `<img class="${classe}" src="${base}img/${arquivo}" alt="" width="512" height="512" data-inicial="${escapar(nome.charAt(0))}">` : "";
const indice = window.TTE_BUSCA || [];
const normalizar = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const escapar = (t) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// Procura todas as palavras da busca no título e no texto; título conta mais.
function buscar(consulta) {
  const palavras = normalizar(consulta).split(/\s+/).filter(Boolean);
  if (!palavras.length) return [];
  return indice.map((item) => {
    const t = normalizar(item.t), x = normalizar(item.x || "");
    if (!palavras.every((p) => t.includes(p) || x.includes(p))) return null;
    const pontos = palavras.reduce((s, p) => s + (t.startsWith(p) ? 4 : t.includes(p) ? 3 : 1), 0);
    return { item, pontos };
  }).filter(Boolean).sort((a, b) => b.pontos - a.pontos).map((r) => r.item);
}

// Pedaço do texto em volta da primeira palavra encontrada, com destaque.
function trecho(item, consulta) {
  const texto = item.x || "";
  const palavras = normalizar(consulta).split(/\s+/).filter(Boolean);
  const n = normalizar(texto);
  let i = Math.min(...palavras.map((p) => n.indexOf(p)).filter((v) => v >= 0));
  if (!isFinite(i)) i = 0;
  const ini = Math.max(0, i - 60);
  let s = escapar((ini > 0 ? "…" : "") + texto.slice(ini, ini + 180) + (texto.length > ini + 180 ? "…" : ""));
  for (const p of palavras) {
    s = s.replace(new RegExp(`(${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"), "<mark>$1</mark>");
  }
  return s;
}

const link = (item, consulta, comTrecho) =>
  `<a href="${base}${item.u}"><span class="r-titulo">${escapar(item.t)}</span><small>${escapar(item.l)}</small>${comTrecho ? `<p>${trecho(item, consulta)}</p>` : ""}</a>`;

// Caixa de busca do topo
const campo = document.querySelector("[data-busca]");
const caixa = document.querySelector(".resultados");
campo.addEventListener("input", () => {
  const q = campo.value.trim();
  if (!q) { caixa.hidden = true; return; }
  const achados = buscar(q);
  caixa.innerHTML = achados.length
    ? achados.slice(0, 8).map((i) => link(i, q, false)).join("") +
      `<a class="ver-tudo" href="${base}busca.html?q=${encodeURIComponent(q)}">See all ${achados.length} result${achados.length === 1 ? "" : "s"}</a>`
    : `<p class="nada">No results.</p>`;
  caixa.hidden = false;
});
campo.addEventListener("keydown", (e) => { if (e.key === "Escape") { caixa.hidden = true; campo.blur(); } });
document.addEventListener("click", (e) => { if (!e.target.closest(".busca")) caixa.hidden = true; });

// Menus suspensos do topo: clique abre/fecha (no celular não há hover).
document.addEventListener("click", (e) => {
  const botao = e.target.closest(".menu-grupo > button");
  document.querySelectorAll(".menu-grupo.aberto").forEach((g) => {
    if (g !== botao?.parentElement) { g.classList.remove("aberto"); g.firstElementChild.setAttribute("aria-expanded", "false"); }
  });
  if (botao) botao.setAttribute("aria-expanded", String(botao.parentElement.classList.toggle("aberto")));
});

// Página de busca (busca.html?q=...)
const campoPagina = document.querySelector("[data-busca-pagina]");
if (campoPagina) {
  const lista = document.querySelector(".resultados-pagina");
  const mostrar = () => {
    const q = campoPagina.value.trim();
    const achados = buscar(q);
    lista.innerHTML = !q ? "" : achados.length
      ? `<p class="contagem">${achados.length} result${achados.length === 1 ? "" : "s"}</p>` + achados.map((i) => link(i, q, true)).join("")
      : `<p class="vazio">No results for “${escapar(q)}”.</p>`;
    history.replaceState(null, "", q ? `?q=${encodeURIComponent(q)}` : location.pathname);
  };
  campoPagina.value = new URLSearchParams(location.search).get("q") || "";
  campoPagina.addEventListener("input", mostrar);
  campoPagina.focus();
  mostrar();
}

// Ao chegar num título pelo link da busca, destaca a seção por um instante.
function destacar() {
  const alvo = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (alvo && alvo.matches("h1, h2, h3")) {
    alvo.classList.remove("piscar"); void alvo.offsetWidth; alvo.classList.add("piscar");
  }
}
addEventListener("hashchange", destacar);
destacar();

// Fichas ao passar o mouse sobre {@tags} (skills, sentidos...), como no 5etools.
const fichas = window.TTE_FICHAS || {};
const pop = document.createElement("div");
pop.className = "pop-ficha";
pop.hidden = true;
document.body.append(pop);
document.addEventListener("mouseover", (e) => {
  const tag = e.target.closest("[data-pop]");
  const f = tag && fichas[tag.dataset.pop];
  if (!f) return;
  pop.innerHTML = `<header>${imgIcone(f.i, f.n, "icone mini")}<strong>${escapar(f.n)}</strong><span class="ficha-sigla">${escapar(f.f)}</span></header><p class="ficha-tipo">${escapar(f.t)}</p>${comBase(f.h)}`;
  pop.hidden = false;
  const r = tag.getBoundingClientRect(), largura = Math.min(340, innerWidth - 24);
  pop.style.width = largura + "px";
  pop.style.left = Math.max(12, Math.min(r.left, innerWidth - largura - 12)) + "px";
  const altura = pop.offsetHeight;
  pop.style.top = (r.bottom + 8 + altura > innerHeight ? Math.max(8, r.top - altura - 8) : r.bottom + 8) + "px";
});
document.addEventListener("mouseout", (e) => { if (e.target.closest("[data-pop]")) pop.hidden = true; });
addEventListener("scroll", () => { pop.hidden = true; }, { passive: true });

// Livro: marca no sumário a seção que está na tela.
const sumario = document.querySelector(".sumario");
if (sumario) {
  const links = new Map([...sumario.querySelectorAll('a[href^="#"]')].map((a) => [a.getAttribute("href").slice(1), a]));
  const alvos = [...links.keys()].map((id) => document.getElementById(id)).filter(Boolean);
  const marcar = () => {
    let atual = alvos[0];
    for (const a of alvos) if (a.getBoundingClientRect().top < 120) atual = a;
    sumario.querySelectorAll(".atual").forEach((e) => e.classList.remove("atual"));
    const link = atual && links.get(atual.id);
    if (link) {
      link.classList.add("atual");
      link.closest(".indice > li")?.classList.add("atual");
    }
  };
  addEventListener("scroll", marcar, { passive: true });
  marcar();
}

// Bancos (skills...): busca, filtros por fonte e colunas, ordenação, ficha pelo #id.
// Filtros funcionam como no 5etools: clique = incluir (azul), de novo = excluir (vermelho), de novo = neutro.
const banco = window.TTE_BANCO;
if (banco) {
  const $ = (s) => document.querySelector(s);
  const campoTexto = $("[data-filtro-texto]"), painel = $("[data-painel-filtro]"), botaoFiltro = $("[data-abrir-filtro]");
  const ativos = $("[data-filtros-ativos]"), cabecalho = $("[data-cabecalho]"), lista = $("[data-linhas]");
  const contagem = $("[data-contagem]"), ficha = $("[data-ficha]");
  const grupos = [{ campo: "fonte", titulo: "Source", valor: (i) => i.fonte, nome: (v) => banco.fontes[v] || v }]
    .concat([...banco.colunas.filter((c) => c.filtro !== false), ...(banco.filtros || [])].map((c) => ({ campo: c.campo, titulo: c.titulo, lista: c.lista, valor: (i) => i.campos[c.campo], nome: (v) => v })));
  const colunas = [{ campo: "nome", titulo: "Name", valor: (i) => i.nome }]
    .concat(banco.colunas.map((c) => ({ campo: c.campo, titulo: c.titulo, valor: (i) => i.campos[c.campo], extra: c.celular === false ? " so-largo" : "" })))
    .concat([{ campo: "fonte", titulo: "Source", valor: (i) => i.fonte }]);
  // Campos com "lista" guardam vários valores ("Healer, Mage"); cada um vira uma pílula.
  const valoresDe = (g, i) => (g.lista ? String(g.valor(i) || "").split(", ") : [g.valor(i)]);
  const estado = Object.fromEntries(grupos.map((g) => [g.campo, {}])); // valor -> 1 incluir, 2 excluir
  let ordem = { campo: "nome", dir: 1 };
  let visiveis = [];

  // Painel de filtros
  painel.innerHTML = grupos.map((g) => {
    const valores = [...new Set(banco.itens.flatMap((i) => valoresDe(g, i)).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
    return `<div class="grupo-filtro"><div class="grupo-topo"><strong>${escapar(g.titulo)}</strong><span><button type="button" data-todos="${g.campo}">All</button><button type="button" data-nenhum="${g.campo}">Clear</button></span></div>
      <div class="pilulas">${valores.map((v) => `<button type="button" class="pilula" data-grupo="${g.campo}" data-valor="${escapar(v)}" title="${escapar(g.nome(v))}">${escapar(v)}</button>`).join("")}</div></div>`;
  }).join("") + `<p class="dica-filtro">Click once to include, twice to exclude.</p>`;
  botaoFiltro.addEventListener("click", () => {
    painel.hidden = !painel.hidden;
    botaoFiltro.setAttribute("aria-expanded", String(!painel.hidden));
  });
  painel.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.grupo) {
      const g = estado[b.dataset.grupo], v = b.dataset.valor;
      g[v] = ((g[v] || 0) + 1) % 3;
    } else if (b.dataset.todos) {
      painel.querySelectorAll(`[data-grupo="${b.dataset.todos}"]`).forEach((p) => { estado[b.dataset.todos][p.dataset.valor] = 1; });
    } else if (b.dataset.nenhum) {
      estado[b.dataset.nenhum] = {};
    }
    atualizar();
  });
  ativos.addEventListener("click", (e) => {
    const b = e.target.closest("[data-remover]");
    if (b) { delete estado[b.dataset.remover][b.dataset.valor]; atualizar(); }
  });
  $("[data-limpar]").addEventListener("click", () => {
    campoTexto.value = "";
    for (const g of grupos) estado[g.campo] = {};
    atualizar();
  });
  campoTexto.addEventListener("input", () => atualizar());

  // Cabeçalho com ordenação
  const desenharCabecalho = () => {
    cabecalho.innerHTML = colunas.map((c) =>
      `<button type="button" data-ordem="${c.campo}" class="${c.campo === "nome" ? "col-nome" : "col"}${c.extra || ""}${ordem.campo === c.campo ? " ativo" : ""}">${escapar(c.titulo)}${ordem.campo === c.campo ? (ordem.dir > 0 ? " ▲" : " ▼") : ""}</button>`
    ).join("");
  };
  cabecalho.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ordem]");
    if (!b) return;
    ordem = { campo: b.dataset.ordem, dir: ordem.campo === b.dataset.ordem ? -ordem.dir : 1 };
    atualizar();
  });

  const passa = (item) => {
    const q = normalizar(campoTexto.value.trim());
    if (q && !normalizar(item.nome).includes(q)) return false;
    return grupos.every((g) => {
      const marcados = estado[g.campo], vs = valoresDe(g, item);
      if (vs.some((v) => marcados[v] === 2)) return false;
      const incluidos = Object.keys(marcados).filter((k) => marcados[k] === 1);
      return !incluidos.length || incluidos.some((k) => vs.includes(k));
    });
  };

  function atualizar() {
    // pílulas e resumo dos filtros ativos
    painel.querySelectorAll(".pilula").forEach((p) => { p.dataset.estado = estado[p.dataset.grupo][p.dataset.valor] || 0; });
    ativos.innerHTML = grupos.flatMap((g) => Object.entries(estado[g.campo]).filter(([, s]) => s).map(([v, s]) =>
      `<button type="button" class="pilula pequena" data-estado="${s}" data-remover="${g.campo}" data-valor="${escapar(v)}" title="Remove">${s === 2 ? "not " : ""}${escapar(g.titulo)}: ${escapar(v)} ✕</button>`
    )).join("");
    botaoFiltro.classList.toggle("com-filtro", grupos.some((g) => Object.values(estado[g.campo]).some(Boolean)));

    const col = colunas.find((c) => c.campo === ordem.campo);
    visiveis = banco.itens.filter(passa).sort((a, b) =>
      ordem.dir * String(col.valor(a)).localeCompare(String(col.valor(b)), undefined, { numeric: true }) || a.nome.localeCompare(b.nome));
    desenharCabecalho();
    const atual = idAtual();
    lista.innerHTML = visiveis.map((i) =>
      `<a class="lista-linha${i.id === atual ? " ativo" : ""}" href="#${i.id}" role="option" aria-selected="${i.id === atual}">` +
      colunas.map((c) => `<span class="${c.campo === "nome" ? "col-nome" : "col"}${c.extra || ""}"${c.campo === "fonte" ? ` title="${escapar(banco.fontes[i.fonte] || "")}"` : ""}>${c.campo === "nome" ? imgIcone(i.icone, i.nome, "icone micro") : ""}${escapar(c.valor(i))}</span>`).join("") + `</a>`
    ).join("") || `<p class="vazio">No results.</p>`;
    contagem.textContent = `${visiveis.length} / ${banco.itens.length}`;
  }

  const idAtual = () => decodeURIComponent(location.hash.slice(1)) || banco.itens.slice().sort((a, b) => a.nome.localeCompare(b.nome))[0]?.id;

  function mostrarFicha() {
    const item = banco.itens.find((i) => i.id === idAtual());
    lista.querySelectorAll(".lista-linha").forEach((l) => {
      const sel = l.getAttribute("href") === "#" + item?.id;
      l.classList.toggle("ativo", sel);
      l.setAttribute("aria-selected", String(sel));
    });
    if (!item) { ficha.innerHTML = `<p class="vazio">Select an entry from the list.</p>`; return; }
    document.title = `${item.nome} · ${banco.titulo} · ${document.title.split(" · ").pop()}`;
    ficha.innerHTML = `<article class="ficha-bloco">
      <header>${imgIcone(item.icone, item.nome, banco.retrato ? "icone retrato" : "icone medio")}<h2>${escapar(item.nome)}</h2><span class="ficha-sigla" title="${escapar(banco.fontes[item.fonte] || "")}">${escapar(item.fonte)}</span></header>
      <p class="ficha-tipo">${escapar(item.tipo)}</p>
      <div class="ficha-texto">${comBase(item.html)}</div>
      ${item.origem ? `<footer>Source: <a href="${base}${item.origem.url}">${escapar(item.origem.titulo)}</a></footer>` : ""}
    </article>`;
    // Monstros: seletor de Level/Role (monstros.js)
    if (item.escala) window.TTE_Monstro?.controles(ficha, item);
  }

  // Setas para cima/baixo andam pela lista, como no 5etools.
  lista.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const i = visiveis.findIndex((v) => v.id === idAtual());
    const prox = visiveis[Math.max(0, Math.min(visiveis.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)))];
    if (prox) {
      history.replaceState(null, "", "#" + prox.id);
      mostrarFicha();
      lista.querySelector(".ativo")?.scrollIntoView({ block: "nearest" });
    }
  });
  addEventListener("hashchange", () => {
    mostrarFicha();
    if (matchMedia("(max-width: 820px)").matches) ficha.scrollIntoView({ behavior: "smooth" });
  });

  atualizar();
  mostrarFicha();
  lista.querySelector(".ativo")?.scrollIntoView({ block: "nearest" });
}
