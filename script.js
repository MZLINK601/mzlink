document.addEventListener("DOMContentLoaded", function () {
  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchButton");
  const results = document.getElementById("results");

  const SUPABASE_URL = "https://uuswtafwkgrzmzbkgnjq.supabase.co";
  const SUPABASE_KEY = "sb_publishable_vd6DmOxZuXD0cVhIJMtbfQ_-8cWtU7P";

  let dados = [];
  let userAtual = null;

  window.registarCliqueContato = async function(idAnuncio) {
    try {
      await fetch(SUPABASE_URL + "/rest/v1/rpc/registar_clique", {
        method: "POST", headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ anuncio_id: idAnuncio })
      });
    } catch (e) { }
  };

  function normalizar(texto) { return String(texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim(); }
  function limpar(texto) { const div = document.createElement("div"); div.textContent = texto; return div.innerHTML; }
  function ordenarPremiumPrimeiro(lista) { return lista.slice().sort((a, b) => { const aP = a.plano === "premium"; const bP = b.plano === "premium"; if (aP && !bP) return -1; if (!aP && bP) return 1; return 0; }); }
  function ordenarLista(lista) { const filtro = document.getElementById("filtroOrdenacao"); const tipo = filtro ? filtro.value : "recentes"; let l = lista.slice(); if (tipo === "menor_preco") l.sort((a, b) => (parseFloat(a.preco) || 999999) - (parseFloat(b.preco) || 999999)); else if (tipo === "maior_preco") l.sort((a, b) => (parseFloat(b.preco) || 0) - (parseFloat(a.preco) || 0)); else l.sort((a, b) => new Date(b.criado_em || 0) - new Date(a.criado_em || 0)); return l; }
  function gerarEstrelasHTML(media) { const num = Number(media) || 0; let html = ""; for (let i = 1; i <= 5; i++) { if (num >= i) html += "★"; else if (num >= i - 0.5) html += "½"; else html += "☆"; } return html; }

  async function carregarUserLogado() {
    try {
      if (typeof MZ === "undefined" || !MZ.sessaoValida) return;
      const sessao = await MZ.sessaoValida(); if (!sessao || !sessao.access_token) return;
      const r = await fetch(SUPABASE_URL + "/auth/v1/user", { headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + sessao.access_token } });
      if (r.ok) userAtual = await r.json();
    } catch (e) { }
  }

  async function verificarNotificacoesVendedor() {
    try {
        if (typeof MZ === "undefined") return;
        const sessao = await MZ.sessaoValida(); if (!sessao) return;
        const userRes = await fetch(MZ.url + "/auth/v1/user", { headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token } });
        const user = await userRes.json();
        const r = await fetch(MZ.url + "/rest/v1/vendas_protegidas?vendedor_id=eq." + user.id + "&status=eq.pago&select=id", { headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token } });
        if (r.ok) {
            const vendas = await r.json();
            const sino = document.getElementById('sinoNotificacoes');
            if (vendas.length > 0 && sino) { sino.style.display = 'inline-block'; sino.innerText = '🔔 ' + vendas.length; }
        }
    } catch (e) { }
  }

  async function carregarDados() {
    try {
      const resposta = await fetch(SUPABASE_URL + "/rest/v1/profissionais?select=id,nome,tipo,local,preco,fotos,plano,tipo_conta,user_id,estado,media_estrelas,total_avaliacoes,whatsapp,avatar_url,categoria&categoria=neq.loja&vendido=eq.false&order=criado_em.desc&limit=30", { headers: { apikey: SUPABASE_KEY } });
      if (!resposta.ok) throw new Error("Erro " + resposta.status);
      dados = await resposta.json();
      filtrarEExibir();
    } catch (erro) { results.innerHTML = "<p style='text-align:center'>Não foi possível carregar os dados.</p>"; }
  }

  async function carregarProvaSocial() {
    const divProva = document.getElementById("provaSocial"); if (!divProva) return;
    try {
      const resposta = await fetch(SUPABASE_URL + "/rest/v1/profissionais?select=id", { headers: { apikey: SUPABASE_KEY } });
      if (resposta.ok) {
        const lista = await resposta.json(); const total = lista.length;
        divProva.innerHTML = total > 0 ? `🔥 Já somos <strong style="font-size: 1.1rem;">${total}</strong> vendedores!` : `🚀 Sê o primeiro a publicar!`;
      }
    } catch (e) { divProva.style.display = "none"; }
  }

  async function carregarTopVendedores() {
    const secao = document.getElementById("seccaoTopVendedores"); const listaDiv = document.getElementById("listaTopVendedores"); if (!secao || !listaDiv) return;
    try {
      const resposta = await fetch(SUPABASE_URL + "/rest/v1/profissionais?select=id,nome,avatar_url,media_estrelas,total_avaliacoes,plano&media_estrelas=gt.0&order=media_estrelas.desc,total_avaliacoes.desc&limit=5", { headers: { apikey: SUPABASE_KEY } });
      if (!resposta.ok) return; const top5 = await resposta.json(); if (top5.length === 0) return; 
      secao.style.display = "block"; let html = "";
      top5.forEach(function(v, index) {
        const medalha = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🏅";
        const avatar = v.avatar_url ? `<img src="${v.avatar_url}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; margin: 0 auto 10px;">` : `<div style="width: 50px; height: 50px; border-radius: 50%; background: #1E40AF; color: white; display: flex; justify-content: center; align-items: center; font-weight: bold; font-size: 1.2rem; margin: 0 auto 10px;">${v.nome.charAt(0)}</div>`;
        html += `<div style="min-width: 120px; background: #fff; border: 2px solid ${index === 0 ? '#d4af37' : '#e2e8f0'}; border-radius: 12px; padding: 15px 10px; display: flex; flex-direction: column; align-items: center;"><div style="font-size: 1.5rem; margin-bottom: 5px;">${medalha}</div>${avatar}<strong style="font-size: 0.85rem; color: #0f1115; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px;">${v.nome}</strong><span style="color: #d4af37; font-weight: bold; font-size: 0.9rem; margin-top: 5px;">⭐ ${Number(v.media_estrelas).toFixed(1)}</span><span style="font-size: 0.7rem; color: #667085;">(${v.total_avaliacoes} aval.)</span></div>`;
      });
      listaDiv.innerHTML = html;
    } catch (e) { }
  }

  function guardarVisto(idProduto) {
      let vistos = JSON.parse(localStorage.getItem("mzlink_vistos") || "[]");
      vistos = vistos.filter(id => id !== String(idProduto));
      vistos.unshift(String(idProduto));
      if (vistos.length > 5) vistos.pop();
      localStorage.setItem("mzlink_vistos", JSON.stringify(vistos));
  }

  async function carregarVistos() {
      const secao = document.getElementById("seccaoVistos"); const lista = document.getElementById("listaVistos"); if (!secao || !lista) return;
      let vistos = JSON.parse(localStorage.getItem("mzlink_vistos") || "[]"); if (vistos.length === 0) { secao.style.display = "none"; return; }
      try {
          const resposta = await fetch(SUPABASE_URL + "/rest/v1/profissionais?id=in.(" + vistos.join(",") + ")&select=id,nome,tipo,preco,fotos&vendido=eq.false", { headers: { apikey: SUPABASE_KEY } });
          if (!resposta.ok) return; let produtos = await resposta.json(); if (produtos.length === 0) { secao.style.display = "none"; return; }
          secao.style.display = "block"; let html = "";
          produtos.sort((a, b) => vistos.indexOf(String(a.id)) - vistos.indexOf(String(b.id)));
          produtos.forEach(function(item) {
              const foto = (item.fotos && item.fotos.length > 0) ? item.fotos[0] : "https://via.placeholder.com/150?text=Sem+Foto";
              const precoBase = Number(item.preco) || 0; let taxa = precoBase * 0.04; if (taxa > 500) taxa = 500;
              const precoFinal = precoBase > 0 ? (precoBase + taxa).toFixed(2) + " MT" : "A combinar";
              html += `<div onclick="guardarVisto('${item.id}')" style="min-width: 140px; max-width: 140px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; cursor: pointer;"><img src="${foto}" style="width: 100%; height: 100px; object-fit: cover;"><div style="padding: 10px;"><p style="font-size: 0.75rem; font-weight: 800; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.tipo}</p><p style="font-size: 0.8rem; color: #16a34a; font-weight: 900; margin: 4px 0 0 0;">${precoFinal}</p></div></div>`;
          });
          lista.innerHTML = html;
      } catch (e) { }
    }

                       function mostrar(lista, titulo) {
    if (lista.length === 0) { results.innerHTML = '<h3 class="results-title">Nenhum resultado encontrado.</h3>'; return; }
    lista = ordenarLista(lista); lista = ordenarPremiumPrimeiro(lista);
    let html = '<h3 class="results-title">' + limpar(titulo) + '</h3>';

    lista.forEach(function (item) {
      const msg = encodeURIComponent("Olá " + item.nome + ", vi o seu anúncio no MZLINK.");
      let numero = String(item.whatsapp || "").replace(/\D/g, ""); if (numero && !numero.startsWith("258")) numero = "258" + numero;
      
      const ehPremium = item.plano === "premium"; const ehEmpresa = item.tipo_conta === "empresa";
      const media = Number(item.media_estrelas) || 0; const total = Number(item.total_avaliacoes) || 0;

      const badgePremium = ehPremium ? '<span class="badge-premium-card">👑 PREMIUM</span>' : '';
      const badgeEmpresa = ehEmpresa ? '<span style="background: #E0F2FE; color: #0369A1; font-size: 0.6rem; padding: 2px 6px; border-radius: 4px; font-weight: 800; margin-left: 4px;">🏢 EMPRESA</span>' : '';
      const badgeEstado = item.estado ? `<span style="background: #f3f4f6; color: #4b5563; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; margin-left: 4px;">${item.estado}</span>` : '';

      let avaliacaoHTML = total > 0 ? '<div style="font-size: 0.75rem; color: #d4af37; font-weight: bold; margin-top: 2px;">' + gerarEstrelasHTML(media) + ' ' + media.toFixed(1) + ' <span style="color:#667085;font-size:0.65rem;">(' + total + ')</span></div>' : '<div style="font-size: 0.7rem; color: #94a3b8; font-style: italic; margin-top: 2px;">Sem avaliações</div>';

      const fotos = item.fotos || []; let fotoHTML = "";
      if (fotos.length > 0) {
        const fotosJSON = encodeURIComponent(JSON.stringify(fotos));
        fotoHTML = `<div class="foto-principal-card" data-fotos="${fotosJSON}" data-nome="${limpar(item.nome)}" style="width: 100%; height: 100%; position: relative; cursor: pointer;"><img src="${fotos[0]}" alt="${limpar(item.nome)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;" loading="lazy">${fotos.length > 1 ? '<span style="position: absolute; bottom: 5px; right: 5px; background: rgba(0,0,0,0.7); color: white; font-size: 0.6rem; padding: 2px 5px; border-radius: 4px;">📸 ' + fotos.length + '</span>' : ''}</div>`;
      } else { fotoHTML = `<div style="width: 100%; height: 100%; background: #eef1f5; display: flex; align-items: center; justify-content: center; color: #a0a0a0; font-size: 1.5rem; border-radius: 8px;">📸</div>`; }

      let precoHTML = ""; let botoesHTML = "";
      const isServico = (item.categoria === "servicos" || item.categoria === "profissionais" || item.categoria === "instituicoes" || item.categoria === "empresas");

      if (isServico) {
        precoHTML = `<p style="color: #667085; font-size: 0.8rem; margin: 0; font-style: italic;">${item.preco ? 'A partir de ' + item.preco + ' MT' : 'Preço a combinar'}</p>`;
        botoesHTML = `<button onclick="event.stopPropagation(); iniciarOrcamento('${item.id}')" style="flex: 1; background: #1E40AF; color: white; border: none; border-radius: 6px; font-weight: 800; font-size: 0.75rem; cursor: pointer; padding: 8px 0;">📝 Pedir Orçamento</button><a class="btn-contactar" style="flex: 1; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; display: flex; justify-content: center; align-items: center; font-weight: 800; font-size: 0.75rem; text-decoration: none; padding: 8px 0;" href="tel:+${numero}">📞 Ligar</a>`;
      } else if (item.preco && Number(item.preco) > 0) {
        const precoBase = Number(item.preco); let taxa = precoBase * 0.04; if (taxa > 500) taxa = 500; const precoFinal = precoBase + taxa;
        precoHTML = `<p style="color: #16a34a; font-weight: 900; font-size: 1rem; margin: 0;">💰 ${precoFinal.toFixed(2)} MT</p><p style="color: #667085; font-size: 0.6rem; margin: 0;">🛡️ Proteção MZLINK</p>`;
        botoesHTML = `<button onclick="event.stopPropagation(); iniciarCompraProtegida('${item.id}', ${precoFinal})" style="flex: 1; background: #16a34a; color: white; border: none; border-radius: 6px; font-weight: 800; font-size: 0.75rem; cursor: pointer; padding: 8px 0;">🛡️ Comprar</button>`;
      } else {
        precoHTML = `<p style="color: #667085; font-size: 0.8rem; margin: 0; font-style: italic;">Preço a combinar</p>`;
        botoesHTML = `<a class="btn-contactar" style="flex: 1; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; display: flex; justify-content: center; align-items: center; font-weight: 800; font-size: 0.75rem; text-decoration: none; padding: 8px 0;" href="tel:+${numero}">📞 Ligar</a><a class="btn-contactar btn-contactar-wa" data-id="${item.id}" style="flex: 1; background: #25D366; color: white; border-radius: 6px; display: flex; justify-content: center; align-items: center; font-weight: 800; font-size: 0.75rem; text-decoration: none; padding: 8px 0;" href="https://wa.me/${numero}?text=${msg}" target="_blank" rel="noopener">💬 WhatsApp</a>`;
      }

      html += `<div class="result-card ${ehPremium ? 'card-premium' : ''}" onclick="guardarVisto('${item.id}')" style="display: flex; flex-direction: row; padding: 10px; gap: 12px; align-items: stretch; margin-bottom: 15px; cursor: pointer;"><div style="width: 110px; min-width: 110px; height: 130px;">${fotoHTML}</div><div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;"><div><div style="display: flex; justify-content: space-between; align-items: flex-start;"><a href="vendedor.html?id=${item.user_id}" onclick="event.stopPropagation();" style="text-decoration: none; color: inherit; display: block; max-width: 70%;"><h3 style="margin: 0; font-size: 0.95rem; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${limpar(item.nome)}</h3></a>${badgePremium}</div><div style="margin: 4px 0; display: flex; align-items: center; gap: 5px; flex-wrap: wrap;"><span style="font-size: 0.65rem; background: #f0f4f9; color: #475569; padding: 2px 6px; border-radius: 4px;">${limpar(item.tipo)}</span>${badgeEmpresa}<span style="font-size: 0.7rem; color: #667085;">📍 ${limpar(item.local)}</span></div>${avaliacaoHTML}</div><div style="margin-top: 5px;">${precoHTML}<div style="display: flex; gap: 6px; margin-top: 5px;">${botoesHTML}</div></div></div></div>`;
    });

    results.innerHTML = html;
    results.querySelectorAll(".foto-principal-card[data-fotos]").forEach(function (el) { el.onclick = function (e) { e.stopPropagation(); try { const fotosData = JSON.parse(decodeURIComponent(el.getAttribute("data-fotos"))); const nome = el.getAttribute("data-nome") || ""; if (window.MZGaleria) window.MZGaleria.abrir(fotosData, nome); } catch (err) { } }; });
    results.querySelectorAll(".btn-contactar-wa").forEach(function (btn) { btn.addEventListener("click", function (e) { e.stopPropagation(); const id = this.getAttribute("data-id"); if (id) { window.registarCliqueContato(id); } }); });
  }

  function filtrarEExibir() {
    const termo = searchInput ? normalizar(searchInput.value) : "";
    const cat = document.getElementById("filtroCategoria") ? document.getElementById("filtroCategoria").value : "";
    const prov = document.getElementById("filtroProvincia") ? document.getElementById("filtroProvincia").value : "";
    const est = document.getElementById("filtroEstado") ? document.getElementById("filtroEstado").value : "";
    let l = dados;
    if (cat) l = l.filter(i => normalizar(i.categoria) === normalizar(cat));
    if (prov) l = l.filter(i => normalizar(i.local).includes(normalizar(prov)));
    if (est) l = l.filter(i => normalizar(i.estado) === normalizar(est));
    if (termo) l = l.filter(i => normalizar(i.nome).includes(termo) || normalizar(i.tipo).includes(termo) || normalizar(i.local).includes(termo) || normalizar(i.categoria).includes(termo));
    let titulo = (termo || cat || prov || est) ? "Resultados da busca" : "Anúncios Recentes";
    mostrar(l, titulo);
    const resultsDiv = document.getElementById("results"); if (resultsDiv) setTimeout(() => { resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
  }

  if (searchButton) searchButton.addEventListener("click", filtrarEExibir);
  if (searchInput) searchInput.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); filtrarEExibir(); } });
  document.querySelectorAll("[data-categoria]").forEach(botao => botao.addEventListener("click", function () { const cat = botao.dataset.categoria; const drop = document.getElementById("filtroCategoria"); if (drop) drop.value = cat; filtrarEExibir(); }));
  ["filtroCategoria", "filtroProvincia", "filtroEstado", "filtroOrdenacao"].forEach(id => { const el = document.getElementById(id); if (el) el.addEventListener("change", filtrarEExibir); });

  (async function init() {
    await carregarUserLogado(); 
    await carregarDados(); 
    await carregarProvaSocial(); 
    await carregarTopVendedores(); 
    await carregarVistos(); 
    await verificarNotificacoesVendedor();
  })();

}); // <--- FIM DA FUNÇÃO PRINCIPAL AQUI (NÃO APAGAR)

// ==========================================
// MODAL DE PAGAMENTO PROTEGIDO (COM TRAVA DE VALOR)
// ==========================================
let produtoAtualCompra = null; let valorAtualCompra = 0;

window.iniciarCompraProtegida = function(produtoId, valorTotal) {
    let sessao = null; try { sessao = JSON.parse(localStorage.getItem("mzlink_sessao")); } catch(e) {}
    if (!sessao || !sessao.access_token) { alert("⚠️ Para comprar com Proteção MZLINK, precisas de estar logado.\n\nVais ser redirecionado para o login."); window.location.href = "login.html"; return; }
    produtoAtualCompra = produtoId; valorAtualCompra = valorTotal;
    document.getElementById('valorTotalPagamento').innerText = valorTotal.toFixed(2) + " MT";
    document.getElementById('inputComprovativoCompra').value = ""; document.getElementById('msgCodigoCompra').innerText = "";
    document.getElementById('modalPagamento').style.display = 'flex';
};

function fecharModalPagamento() { document.getElementById('modalPagamento').style.display = 'none'; }

document.getElementById('inputComprovativoCompra')?.addEventListener('input', function() {
    const texto = this.value.trim(); const msg = document.getElementById('msgCodigoCompra');
    const regexMpesa = /(?:Confirmado|ID|TxID|Ref)\s*([A-Z0-9]{9,10})/i; const matchMpesa = texto.match(regexMpesa);
    const regexEmola = /\b\d{10}\b/; const matchEmola = texto.match(regexEmola);
    let codigo = null; let valido = false; const apenasCodigo = /^[A-Z0-9]{9,10}$/i.test(texto);
    if (apenasCodigo) { codigo = texto.toUpperCase(); valido = true; }
    else if (matchMpesa && matchMpesa[1]) { codigo = matchMpesa[1].toUpperCase(); if (texto.includes("852337913") || texto.toUpperCase().includes("AMÓS")) valido = true; }
    else if (matchEmola && matchEmola[0]) { codigo = matchEmola[0]; if (texto.includes("879608566") || texto.toUpperCase().includes("CELESTE")) valido = true; }
    if (codigo) { this.value = codigo; if (valido) { msg.innerText = "✅ Código detetado com sucesso!"; msg.style.color = "#16a34a"; } else { msg.innerText = "⚠️ Pagamento para outro número! Verifica."; msg.style.color = "#dc2626"; } } else { msg.innerText = ""; }
});

document.getElementById('btnConfirmarPagamento')?.addEventListener('click', async function() {
    const comprovativo = document.getElementById('inputComprovativoCompra').value.trim(); const msg = document.getElementById('msgCodigoCompra');
    if (!comprovativo) return alert("Cola o código do comprovativo primeiro.");
    if (msg.style.color === 'rgb(220, 38, 38)') return alert("❌ O pagamento não foi feito para os números do MZLINK.");

    const confirmouValor = confirm(`⚠️ ATENÇÃO!\n\nConfirmas que transferiste o valor TOTAL de ${valorAtualCompra.toFixed(2)} MT para o MZLINK?\n\nSe pagaste um valor diferente, o teu pedido será rejeitado pelo administrador.`);
    if (!confirmouValor) return;

    this.innerText = "A processar..."; this.disabled = true;
    try {
        let sessao = JSON.parse(localStorage.getItem("mzlink_sessao"));
        const SUPABASE_URL = "https://uuswtafwkgrzmzbkgnjq.supabase.co"; const SUPABASE_KEY = "sb_publishable_vd6DmOxZuXD0cVhIJMtbfQ_-8cWtU7P";
        const userRes = await fetch(SUPABASE_URL + "/auth/v1/user", { headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + sessao.access_token } }); const user = await userRes.json();
        const produtoRes = await fetch(SUPABASE_URL + "/rest/v1/profissionais?id=eq." + produtoAtualCompra + "&select=user_id,whatsapp,nome", { headers: { apikey: SUPABASE_KEY } }); const produtoDados = await produtoRes.json();
        if (produtoDados.length === 0) throw new Error("Produto não encontrado.");
        const vendedorId = produtoDados[0].user_id; const vendedorWhatsapp = produtoDados[0].whatsapp;

        const vendaRes = await fetch(SUPABASE_URL + "/rest/v1/vendas_protegidas", {
            method: "POST", headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + sessao.access_token, "Content-Type": "application/json" },
            body: JSON.stringify({ produto_id: produtoAtualCompra, comprador_id: user.id, vendedor_id: vendedorId, valor_produto: valorAtualCompra / 1.04, taxa_mzlink: valorAtualCompra - (valorAtualCompra / 1.04), valor_total: valorAtualCompra, status: "pago", comprovativo: comprovativo, whatsapp_comprador: user.user_metadata?.whatsapp || user.phone || "Não fornecido", whatsapp_vendedor: vendedorWhatsapp })
        });

        if (vendaRes.ok) {
            alert("🎉 Pagamento Confirmado!\n\nO vendedor vai ser notificado agora no WhatsApp.");
            fecharModalPagamento();
            try {
                const nomeProduto = produtoDados[0].nome || "Produto MZLINK";
                const msgTexto = `Olá! Acabei de fazer um pagamento no MZLINK. 🛡️\n\n📦 Produto: *${nomeProduto}*\n💰 Valor: *${valorAtualCompra.toFixed(2)} MT*\n🧾 Comprovativo: *${comprovativo}*\n\nJá estou a enviar o print! Podes confirmar a entrega?`;
                const msgZap = encodeURIComponent(msgTexto); let numVendedor = String(vendedorWhatsapp).replace(/\D/g, ""); if (numVendedor && !numVendedor.startsWith("258")) numVendedor = "258" + numVendedor;
                setTimeout(() => { window.open(`https://wa.me/${numVendedor}?text=${msgZap}`, "_blank"); }, 500);
            } catch (err) { }
        } else { throw new Error("Erro ao registar."); }
    } catch (err) { alert("❌ Erro ao processar pagamento."); } finally { this.innerText = "✅ Confirmar Pagamento"; this.disabled = false; }
});

// ==========================================
// MODAL DE ORÇAMENTO RÁPIDO (SERVIÇOS)
// ==========================================
let dadosOrcamentoAtual = null;
window.iniciarOrcamento = function(produtoId) {
    // Encontra o item na lista global 'dados'
    if (typeof dados === 'undefined') return;
    const item = dados.find(i => String(i.id) === String(produtoId));
    if (!item) return;
    
    let numero = String(item.whatsapp || "").replace(/\D/g, "");
    if (numero && !numero.startsWith("258")) numero = "258" + numero;
    
    dadosOrcamentoAtual = { id: item.id, nomeVendedor: item.nome, numeroZap: numero, tipoServico: item.tipo };
    document.getElementById('orcamentoDetalhes').value = ""; document.getElementById('orcamentoLocal').value = ""; document.getElementById('orcamentoUrgencia').value = "Hoje / Urgente";
    document.getElementById('modalOrcamento').style.display = 'flex';
};
function fecharModalOrcamento() { document.getElementById('modalOrcamento').style.display = 'none'; }

document.getElementById('btnEnviarOrcamento')?.addEventListener('click', function() {
    if (!dadosOrcamentoAtual) return;
    const detalhes = document.getElementById('orcamentoDetalhes').value.trim(); const local = document.getElementById('orcamentoLocal').value.trim(); const urgencia = document.getElementById('orcamentoUrgencia').value;
    if (!detalhes || !local) { alert("Por favor, preenche os detalhes e o local."); return; }
    const msgTexto = `Olá *${dadosOrcamentoAtual.nomeVendedor}*, vi o teu serviço no MZLINK e gostaria de pedir um orçamento! 📝\n\n🛠️ *Serviço:* ${dadosOrcamentoAtual.tipoServico}\n📍 *Local:* ${local}\n⏰ *Urgência:* ${urgencia}\n📋 *Detalhes:* ${detalhes}\n\nPodes dizer-me quanto fica? Obrigado!`;
    const msgZap = encodeURIComponent(msgTexto); 
    let numLimpo = String(dadosOrcamentoAtual.numeroZap).replace(/\D/g, ""); 
    if (numLimpo && !numLimpo.startsWith("258")) numLimpo = "258" + numLimpo;
    window.open(`https://wa.me/${numLimpo}?text=${msgZap}`, "_blank");
    if (window.registarCliqueContato) window.registarCliqueContato(dadosOrcamentoAtual.id);
    fecharModalOrcamento();
});     
