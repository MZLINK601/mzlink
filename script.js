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
        method: "POST",
        headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ anuncio_id: idAnuncio })
      });
    } catch (e) { /* silencioso */ }
  };

  function normalizar(texto) {
    return String(texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  }

  function limpar(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
  }

  function ordenarPremiumPrimeiro(lista) {
    return lista.slice().sort(function (a, b) {
      const aPremium = a.plano === "premium";
      const bPremium = b.plano === "premium";
      if (aPremium && !bPremium) return -1;
      if (!aPremium && bPremium) return 1;
      return 0;
    });
  }

  function ordenarLista(lista) {
    const filtroOrdenacao = document.getElementById("filtroOrdenacao");
    const tipoOrdem = filtroOrdenacao ? filtroOrdenacao.value : "recentes";
    
    let listaOrdenada = lista.slice();

    if (tipoOrdem === "menor_preco") {
      listaOrdenada.sort((a, b) => {
        const precoA = parseFloat(a.preco) || 999999999;
        const precoB = parseFloat(b.preco) || 999999999;
        return precoA - precoB;
      });
    } else if (tipoOrdem === "maior_preco") {
      listaOrdenada.sort((a, b) => {
        const precoA = parseFloat(a.preco) || 0;
        const precoB = parseFloat(b.preco) || 0;
        return precoB - precoA;
      });
    } else {
      listaOrdenada.sort((a, b) => {
        return new Date(b.criado_em || 0) - new Date(a.criado_em || 0);
      });
    }

    return listaOrdenada;
  }

  function gerarEstrelasHTML(media) {
    const num = Number(media) || 0;
    let html = "";
    for (let i = 1; i <= 5; i++) {
      if (num >= i) { html += "★"; } 
      else if (num >= i - 0.5) { html += "½"; } 
      else { html += "☆"; }
    }
    return html;
  }

  async function carregarUserLogado() {
    try {
      if (typeof MZ === "undefined" || !MZ.sessaoValida) return;
      const sessao = await MZ.sessaoValida();
      if (!sessao || !sessao.access_token) return;

      const r = await fetch(SUPABASE_URL + "/auth/v1/user", {
        headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + sessao.access_token }
      });
      if (r.ok) userAtual = await r.json();
    } catch (e) { /* silencioso */ }
  }

  async function carregarDados() {
    try {
      const resposta = await fetch(
        SUPABASE_URL + "/rest/v1/profissionais?select=id,nome,tipo,local,preco,fotos,plano,tipo_conta,user_id,estado,media_estrelas,total_avaliacoes,whatsapp,avatar_url,categoria&categoria=neq.loja&vendido=eq.false&order=criado_em.desc&limit=30",
        { headers: { apikey: SUPABASE_KEY } }
      );

      if (!resposta.ok) throw new Error("Erro " + resposta.status);
      dados = await resposta.json();
      
      filtrarEExibir();

    } catch (erro) {
      console.error("Nao foi possivel carregar os dados:", erro);
      results.innerHTML = "<p style='text-align:center'>Não foi possível carregar os dados. Verifique a internet e atualize a página.</p>";
    }
  }

  async function carregarProvaSocial() {
    const divProva = document.getElementById("provaSocial");
    if (!divProva) return;

    try {
      const resposta = await fetch(SUPABASE_URL + "/rest/v1/profissionais?select=id", {
        headers: { apikey: SUPABASE_KEY }
      });

      if (resposta.ok) {
        const lista = await resposta.json();
        const total = lista.length;
        if (total > 0) {
          divProva.innerHTML = `🔥 Já somos <strong style="font-size: 1.1rem;">${total}</strong> vendedores a crescer no MZLINK!`;
        } else {
          divProva.innerHTML = `🚀 Sê o primeiro a publicar no MZLINK!`;
        }
      }
    } catch (e) {
      divProva.style.display = "none"; 
    }
  }

  async function carregarTopVendedores() {
    const secao = document.getElementById("seccaoTopVendedores");
    const listaDiv = document.getElementById("listaTopVendedores");
    if (!secao || !listaDiv) return;

    try {
      const resposta = await fetch(
        SUPABASE_URL + "/rest/v1/profissionais?select=id,nome,avatar_url,media_estrelas,total_avaliacoes,plano&media_estrelas=gt.0&order=media_estrelas.desc,total_avaliacoes.desc&limit=5",
        { headers: { apikey: SUPABASE_KEY } }
      );

      if (!resposta.ok) return;
      const top5 = await resposta.json();

      if (top5.length === 0) return; 

      secao.style.display = "block"; 

      let html = "";
      top5.forEach(function(v, index) {
        const medalha = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🏅";
        const avatar = v.avatar_url ? `<img src="${v.avatar_url}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; margin: 0 auto 10px;">` : `<div style="width: 50px; height: 50px; border-radius: 50%; background: #1E40AF; color: white; display: flex; justify-content: center; align-items: center; font-weight: bold; font-size: 1.2rem; margin: 0 auto 10px;">${v.nome.charAt(0)}</div>`;

        html += `
          <div style="min-width: 120px; background: #fff; border: 2px solid ${index === 0 ? '#d4af37' : '#e2e8f0'}; border-radius: 12px; padding: 15px 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); display: flex; flex-direction: column; align-items: center;">
            <div style="font-size: 1.5rem; margin-bottom: 5px;">${medalha}</div>
            ${avatar}
            <strong style="font-size: 0.85rem; color: #0f1115; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px;">${v.nome}</strong>
            <span style="color: #d4af37; font-weight: bold; font-size: 0.9rem; margin-top: 5px;">⭐ ${Number(v.media_estrelas).toFixed(1)}</span>
            <span style="font-size: 0.7rem; color: #667085;">(${v.total_avaliacoes} aval.)</span>
          </div>
        `;
      });

      listaDiv.innerHTML = html;
      listaDiv.style.overflowX = "auto";

    } catch (e) {
      console.log("Erro ao carregar Top Vendedores", e);
    }
  }

  function mostrar(lista, titulo) {
    if (lista.length === 0) {
      results.innerHTML = '<h3 class="results-title">Nenhum resultado encontrado.</h3><p style="text-align:center">Tente pesquisar outro produto ou serviço, ou limpar os filtros.</p>';
      return;
    }

    lista = ordenarLista(lista);
    lista = ordenarPremiumPrimeiro(lista);

    let html = '<h3 class="results-title">' + limpar(titulo) + '</h3>';

    lista.forEach(function (item) {
      const msg = encodeURIComponent("Olá " + item.nome + ", vi o seu anúncio no MZLINK e gostaria de falar consigo.");
      
      let numero = String(item.whatsapp || "").replace(/\D/g, "");
      if (numero && !numero.startsWith("258")) {
          numero = "258" + numero;
      }
      
      const ehPremium = item.plano === "premium";
      const ehEmpresa = item.tipo_conta === "empresa";
      const media = Number(item.media_estrelas) || 0;
      const total = Number(item.total_avaliacoes) || 0;

      const msgPartilha = encodeURIComponent(
        "Olha este anúncio no MZLINK: " + item.nome + " (" + item.tipo + " em " + item.local + "). Fala com ele aqui: https://mzlink.co.mz/"
      );

      const badgePremium = ehPremium ? '<span class="badge-premium-card">👑 PREMIUM</span>' : '';
      const badgeEmpresa = ehEmpresa ? '<span style="background: #E0F2FE; color: #0369A1; font-size: 0.6rem; padding: 2px 6px; border-radius: 4px; font-weight: 800; vertical-align: middle; margin-left: 4px;">🏢 EMPRESA</span>' : '';
      const badgeEstado = item.estado ? `<span style="background: #f3f4f6; color: #4b5563; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; margin-left: 4px;">${item.estado}</span>` : '';

      let avaliacaoHTML = "";
      if (total > 0) {
        avaliacaoHTML = '<div class="avaliacao-info"><span class="estrelas-mini">' + gerarEstrelasHTML(media) + '</span><span class="media">' + media.toFixed(1) + '</span><span class="total">(' + total + ' avalia' + (total === 1 ? 'ção' : 'ções') + ')</span></div>';
      } else {
        avaliacaoHTML = '<div class="avaliacao-info sem-avaliacoes">Ainda sem avaliações</div>';
      }

      let btnAvaliar = "";
      if (userAtual && String(userAtual.id) !== String(item.user_id)) {
        btnAvaliar = '<button class="btn-avaliar" data-anuncio-id="' + item.id + '" data-anuncio-nome="' + limpar(item.nome) + '">⭐ Avaliar</button>';
      }

      const fotos = item.fotos || [];
      let fotoHTML = "";
      if (fotos.length > 0) {
        const fotosJSON = encodeURIComponent(JSON.stringify(fotos));
        fotoHTML = '<div class="foto-principal-card" data-fotos="' + fotosJSON + '" data-nome="' + limpar(item.nome) + '"><img src="' + fotos[0] + '" alt="' + limpar(item.nome) + '" loading="lazy">' + (fotos.length > 1 ? '<span class="contador-fotos">📸 ' + fotos.length + '</span>' : '') + '<span class="icone-zoom">🔍 Ver fotos</span></div>';
      } else {
        fotoHTML = '<div class="foto-principal-card sem-foto"><span>📸</span><small>Sem fotos</small></div>';
      }

      // ===== CÁLCULO DA COMISSÃO E BOTÕES =====
      let precoHTML = "";
      let botoesHTML = "";

      if (item.preco && Number(item.preco) > 0) {
        // PRODUTO COM PREÇO FIXO -> SÓ COMPRA PROTEGIDA
        const precoBase = Number(item.preco);
        let taxa = precoBase * 0.04; // 4% de comissão
        if (taxa > 500) taxa = 500; // Teto máximo de 500 MT
        const precoFinal = precoBase + taxa;

        precoHTML = `
          <p style="color: #16a34a; font-weight: 900; font-size: 1.1rem; margin-top: 4px;">💰 ${precoFinal.toFixed(2)} MT</p>
          <p style="color: #667085; font-size: 0.65rem; margin-top: 0;">🛡️ Inclui taxa de Proteção MZLINK</p>
        `;

        botoesHTML = `
          <div style="display: flex; gap: 6px; margin-top: 10px;">
            <button onclick="iniciarCompraProtegida('${item.id}', ${precoFinal})" style="flex: 1; background: #16a34a; color: white; border: none; border-radius: 8px; display: flex; justify-content: center; align-items: center; font-weight: 800; font-size: 0.9rem; cursor: pointer; padding: 12px 0;">🛡️ Comprar Protegido</button>
          </div>
        `;
      } else {
        // PRODUTO COM PREÇO A COMBINAR -> CONTACTO DIRETO
        precoHTML = `<p style="color: #667085; font-size: 0.85rem; margin-top: 4px; font-style: italic;">Preço a combinar</p>`;
        
        botoesHTML = `
          <div style="display: flex; gap: 6px; margin-top: 10px;">
            <a class="btn-contactar" style="flex: 1; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 8px; display: flex; justify-content: center; align-items: center; font-weight: 800; font-size: 0.85rem; text-decoration: none; padding: 10px 0;" href="tel:+${numero}">📞 Ligar</a>
            <a class="btn-contactar btn-contactar-wa" data-id="${item.id}" style="flex: 2; background: #25D366; color: white; border-radius: 8px; display: flex; justify-content: center; align-items: center; font-weight: 800; font-size: 0.85rem; text-decoration: none; padding: 10px 0;" href="https://wa.me/${numero}?text=${msg}" target="_blank" rel="noopener">💬 WhatsApp</a>
            <a class="btn-partilhar" style="flex: 1; padding: 10px 0; display: flex; justify-content: center; align-items: center; font-weight: 800; font-size: 0.85rem; border: 1px solid #1E40AF; color: #1E40AF; border-radius: 8px; text-decoration: none;" href="https://wa.me/?text=${msgPartilha}" target="_blank" rel="noopener">📤</a>
          </div>
        `;
        }

                        html +=
        '<div class="result-card ' + (ehPremium ? 'card-premium' : '') + '">' +
          fotoHTML +
          '<div class="card-conteudo">' +
            '<div class="linha-topo">' +
              '<a href="vendedor.html?id=' + item.user_id + '" class="avatar-link">' +
                '<div class="avatar" style="' + (item.avatar_url ? 'background-image: url(' + item.avatar_url + '); background-size: cover; background-position: center; color: transparent;' : '') + '">' + limpar(item.nome.charAt(0)) + '</div>' +
              '</a>' +
              '<div class="info">' +
                '<a href="vendedor.html?id=' + item.user_id + '" style="text-decoration:none; color:inherit;">' +
                  '<h3>' + limpar(item.nome) + ' ' + badgePremium + ' ' + badgeEmpresa + '</h3>' +
                '</a>' +
                '<span class="tag">' + limpar(item.tipo) + '</span>' + badgeEstado +
                '<p>📍 ' + limpar(item.local) + '</p>' +
                precoHTML +
              '</div>' +
            '</div>' +
            avaliacaoHTML +
            btnAvaliar +
            botoesHTML +
          '</div>' +
        '</div>';
    });

    results.innerHTML = html;

    results.querySelectorAll(".btn-avaliar").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const id = btn.getAttribute("data-anuncio-id");
        const nome = btn.getAttribute("data-anuncio-nome");
        if (window.MZAvaliacao) window.MZAvaliacao.abrir(id, nome);
      });
    });

    results.querySelectorAll(".foto-principal-card[data-fotos]").forEach(function (el) {
      el.onclick = function () {
        try {
          const fotosData = JSON.parse(decodeURIComponent(el.getAttribute("data-fotos")));
          const nome = el.getAttribute("data-nome") || "";
          if (window.MZGaleria) window.MZGaleria.abrir(fotosData, nome);
        } catch (err) { console.warn("Erro ao abrir galeria:", err); }
      };
    });

    results.querySelectorAll(".btn-contactar-wa").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const id = this.getAttribute("data-id");
        if (id) {
          window.registarCliqueContato(id);
        }
      });
    });
  }

  function filtrarEExibir() {
    const termo = searchInput ? normalizar(searchInput.value) : "";
    const catSelecionada = document.getElementById("filtroCategoria") ? document.getElementById("filtroCategoria").value : "";
    const provSelecionada = document.getElementById("filtroProvincia") ? document.getElementById("filtroProvincia").value : "";
    const estadoSelecionado = document.getElementById("filtroEstado") ? document.getElementById("filtroEstado").value : "";
    
    let listaFiltrada = dados;

    if (catSelecionada) {
      listaFiltrada = listaFiltrada.filter(item => normalizar(item.categoria) === normalizar(catSelecionada));
    }

    if (provSelecionada) {
      listaFiltrada = listaFiltrada.filter(item => normalizar(item.local).includes(normalizar(provSelecionada)));
    }

    if (estadoSelecionado) {
      listaFiltrada = listaFiltrada.filter(item => normalizar(item.estado) === normalizar(estadoSelecionado));
    }

    if (termo) {
      listaFiltrada = listaFiltrada.filter(item => {
        const nome = normalizar(item.nome);
        const tipo = normalizar(item.tipo);
        const local = normalizar(item.local);
        const categoria = normalizar(item.categoria);
        
        return nome.includes(termo) || tipo.includes(termo) || local.includes(termo) || categoria.includes(termo);
      });
    }

    let titulo = "Anúncios Recentes";
    if (termo || catSelecionada || provSelecionada || estadoSelecionado) {
      titulo = "Resultados da busca";
    }

    mostrar(listaFiltrada, titulo);

    const resultsDiv = document.getElementById("results");
    if (resultsDiv) {
      setTimeout(() => {
        resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }

  if (searchButton) searchButton.addEventListener("click", filtrarEExibir);
  if (searchInput) {
    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        filtrarEExibir();
      }
    });
  }

  document.querySelectorAll("[data-categoria]").forEach(function (botao) {
    botao.addEventListener("click", function () {
      const cat = botao.dataset.categoria;
      const dropdown = document.getElementById("filtroCategoria");
      if (dropdown) dropdown.value = cat;
      filtrarEExibir();
    });
  });

  const filtroCategoria = document.getElementById("filtroCategoria");
  const filtroProvincia = document.getElementById("filtroProvincia");
  const filtroEstado = document.getElementById("filtroEstado");
  const filtroOrdenacao = document.getElementById("filtroOrdenacao");

  if (filtroCategoria) filtroCategoria.addEventListener("change", filtrarEExibir);
  if (filtroProvincia) filtroProvincia.addEventListener("change", filtrarEExibir);
  if (filtroEstado) filtroEstado.addEventListener("change", filtrarEExibir);
  if (filtroOrdenacao) filtroOrdenacao.addEventListener("change", filtrarEExibir);

  (async function init() {
    await carregarUserLogado();
    await carregarDados();
    await carregarProvaSocial();
    await carregarTopVendedores();
  })();
});

// ==========================================
// LÓGICA DO MODAL DE PAGAMENTO PROTEGIDO
// ==========================================
let produtoAtualCompra = null;
let valorAtualCompra = 0;

window.iniciarCompraProtegida = function(produtoId, valorTotal) {
    const chave = "mzlink_sessao";
    let sessao = null;
    try { sessao = JSON.parse(localStorage.getItem(chave)); } catch(e) {}

    if (!sessao || !sessao.access_token) {
        alert("⚠️ Para comprar com Proteção MZLINK, precisas de estar logado.\n\nVais ser redirecionado para o login.");
        window.location.href = "login.html";
        return;
    }

    produtoAtualCompra = produtoId;
    valorAtualCompra = valorTotal;

    document.getElementById('valorTotalPagamento').innerText = valorTotal.toFixed(2) + " MT";
    document.getElementById('inputComprovativoCompra').value = "";
    document.getElementById('msgCodigoCompra').innerText = "";
    document.getElementById('modalPagamento').style.display = 'flex';
};

function fecharModalPagamento() {
    document.getElementById('modalPagamento').style.display = 'none';
}

document.getElementById('inputComprovativoCompra')?.addEventListener('input', function() {
    const texto = this.value.trim();
    const msg = document.getElementById('msgCodigoCompra');
    
    const regexMpesa = /(?:Confirmado|ID|TxID|Ref)\s*([A-Z0-9]{9,10})/i;
    const matchMpesa = texto.match(regexMpesa);
    const regexEmola = /\b\d{10}\b/;
    const matchEmola = texto.match(regexEmola);

    let codigo = null;
    let valido = false;
    const apenasCodigo = /^[A-Z0-9]{9,10}$/i.test(texto);

    if (apenasCodigo) {
        codigo = texto.toUpperCase();
        valido = true;
    } else if (matchMpesa && matchMpesa[1]) {
        codigo = matchMpesa[1].toUpperCase();
        if (texto.includes("852337913") || texto.toUpperCase().includes("AMÓS")) valido = true;
    } else if (matchEmola && matchEmola[0]) {
        codigo = matchEmola[0];
        if (texto.includes("879608566") || texto.toUpperCase().includes("CELESTE")) valido = true;
    }

    if (codigo) {
        this.value = codigo; 
        if (valido) {
            msg.innerText = "✅ Código detetado com sucesso!";
            msg.style.color = "#16a34a";
        } else {
            msg.innerText = "⚠️ Pagamento para outro número! Verifica.";
            msg.style.color = "#dc2626";
        }
    } else {
        msg.innerText = "";
    }
});

document.getElementById('btnConfirmarPagamento')?.addEventListener('click', async function() {
    const comprovativo = document.getElementById('inputComprovativoCompra').value.trim();
    const msg = document.getElementById('msgCodigoCompra');
    
    if (!comprovativo) return alert("Cola o código do comprovativo primeiro.");
    if (msg.style.color === 'rgb(220, 38, 38)') return alert("❌ O pagamento não foi feito para os números do MZLINK.");

    this.innerText = "A processar...";
    this.disabled = true;

    try {
        const chave = "mzlink_sessao";
        let sessao = JSON.parse(localStorage.getItem(chave));
        const SUPABASE_URL = "https://uuswtafwkgrzmzbkgnjq.supabase.co";
        const SUPABASE_KEY = "sb_publishable_vd6DmOxZuXD0cVhIJMtbfQ_-8cWtU7P";

        const userRes = await fetch(SUPABASE_URL + "/auth/v1/user", { headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + sessao.access_token } });
        const user = await userRes.json();

        const produtoRes = await fetch(SUPABASE_URL + "/rest/v1/profissionais?id=eq." + produtoAtualCompra + "&select=user_id,whatsapp,nome", { headers: { apikey: SUPABASE_KEY } });
        const produtoDados = await produtoRes.json();
        
        if (produtoDados.length === 0) throw new Error("Produto não encontrado.");
        const vendedorId = produtoDados[0].user_id;
        const vendedorWhatsapp = produtoDados[0].whatsapp;

        const vendaRes = await fetch(SUPABASE_URL + "/rest/v1/vendas_protegidas", {
            method: "POST",
            headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + sessao.access_token, "Content-Type": "application/json" },
            body: JSON.stringify({
                produto_id: produtoAtualCompra,
                comprador_id: user.id,
                vendedor_id: vendedorId,
                valor_produto: valorAtualCompra / 1.04,
                taxa_mzlink: valorAtualCompra - (valorAtualCompra / 1.04),
                valor_total: valorAtualCompra,
                status: "pago",
                comprovativo: comprovativo,
                whatsapp_comprador: user.user_metadata?.whatsapp || user.phone || "Não fornecido",
                whatsapp_vendedor: vendedorWhatsapp
            })
        });

        if (vendaRes.ok) {
            alert("🎉 Pagamento Confirmado!\n\nO vendedor foi notificado e vai contactar-te em breve. O teu dinheiro está seguro no MZLINK.");
            fecharModalPagamento();
        } else {
            throw new Error("Erro ao registar no banco de dados.");
        }

    } catch (err) {
        console.error(err);
        alert("❌ Erro ao processar pagamento. Tenta novamente.");
    } finally {
        this.innerText = "✅ Confirmar Pagamento";
        this.disabled = false;
    }
});
