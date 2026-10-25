document.addEventListener("DOMContentLoaded", function () {

  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchButton");
  const results = document.getElementById("results");

  const SUPABASE_URL = "https://uuswtafwkgrzmzbkgnjq.supabase.co";
  const SUPABASE_KEY = "sb_publishable_vd6DmOxZuXD0cVhIJMtbfQ_-8cWtU7P";

  let dados = [];
  let userAtual = null;

  function normalizar(texto) {
    return String(texto).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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

  function gerarEstrelasHTML(media) {
    const num = Number(media) || 0;
    let html = "";
    for (let i = 1; i <= 5; i++) {
      if (num >= i) {
        html += "★";
      } else if (num >= i - 0.5) {
        html += "½";
      } else {
        html += "☆";
      }
    }
    return html;
  }

  async function carregarUserLogado() {
    try {
      if (typeof MZ === "undefined" || !MZ.sessaoValida) return;
      const sessao = await MZ.sessaoValida();
      if (!sessao || !sessao.access_token) return;

      const r = await fetch(SUPABASE_URL + "/auth/v1/user", {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: "Bearer " + sessao.access_token
        }
      });
      if (r.ok) userAtual = await r.json();
    } catch (e) { /* silencioso */ }
  }

  async function carregarDados() {
    try {
      const resposta = await fetch(
        SUPABASE_URL + "/rest/v1/profissionais?select=*&order=nome",
        { headers: { apikey: SUPABASE_KEY } }
      );

      if (!resposta.ok) throw new Error("Erro " + resposta.status);
      dados = await resposta.json();
    } catch (erro) {
      console.error("Nao foi possivel carregar os dados:", erro);
      results.innerHTML = "<p style='text-align:center'>Não foi possível carregar os dados. Verifique a internet e atualize a página.</p>";
    }
  }

  function mostrar(lista, titulo) {
    if (lista.length === 0) {
      results.innerHTML =
        '<h3 class="results-title">Nenhum resultado encontrado.</h3>' +
        '<p style="text-align:center">Tente pesquisar outro produto ou serviço.</p>';
      return;
    }

    lista = ordenarPremiumPrimeiro(lista);

    let html = '<h3 class="results-title">' + limpar(titulo) + '</h3>';

    lista.forEach(function (item) {
      const msg = encodeURIComponent("Olá " + item.nome + ", vi o seu perfil no MZLINK e gostaria de falar consigo.");
      const numero = String(item.whatsapp).replace(/\D/g, "");
      const ehPremium = item.plano === "premium";
      const media = Number(item.media_estrelas) || 0;
      const total = Number(item.total_avaliacoes) || 0;

      // Mensagem para partilhar no WhatsApp
      const msgPartilha = encodeURIComponent(
        "Olha este anúncio no MZLINK: " + item.nome + " (" + item.tipo + " em " + item.local + "). Fala com ele aqui: https://mzlink601.github.io/mzlink/"
      );

      const badgePremium = ehPremium
        ? '<span class="badge-premium-card">👑 PREMIUM</span>'
        : '';

      let avaliacaoHTML = "";
      if (total > 0) {
        avaliacaoHTML =
          '<div class="avaliacao-info">' +
            '<span class="estrelas-mini">' + gerarEstrelasHTML(media) + '</span>' +
            '<span class="media">' + media.toFixed(1) + '</span>' +
            '<span class="total">(' + total + ' avalia' + (total === 1 ? 'ção' : 'ções') + ')</span>' +
          '</div>';
      } else {
        avaliacaoHTML = '<div class="avaliacao-info sem-avaliacoes">Ainda sem avaliações</div>';
      }

      let btnAvaliar = "";
      if (userAtual && String(userAtual.id) !== String(item.user_id)) {
        btnAvaliar = '<button class="btn-avaliar" data-anuncio-id="' + item.id +
          '" data-anuncio-nome="' + limpar(item.nome) + '">⭐ Avaliar</button>';
      }

      // ⭐ FOTO PRINCIPAL (clicável)
      const fotos = item.fotos || [];
      let fotoHTML = "";
      if (fotos.length > 0) {
        const fotosJSON = encodeURIComponent(JSON.stringify(fotos));
        fotoHTML =
          '<div class="foto-principal-card" data-fotos="' + fotosJSON + '" data-nome="' + limpar(item.nome) + '">' +
            '<img src="' + fotos[0] + '" alt="' + limpar(item.nome) + '" loading="lazy">' +
            (fotos.length > 1 ? '<span class="contador-fotos">📸 ' + fotos.length + '</span>' : '') +
            '<span class="icone-zoom">🔍 Ver fotos</span>' +
          '</div>';
      } else {
        fotoHTML =
          '<div class="foto-principal-card sem-foto">' +
            '<span>📸</span>' +
            '<small>Sem fotos</small>' +
          '</div>';
      }

      html +=
        '<div class="result-card ' + (ehPremium ? 'card-premium' : '') + '">' +
          fotoHTML +
          '<div class="card-conteudo">' +
            '<div class="linha-topo">' +
              '<div class="avatar">' + limpar(item.nome.charAt(0)) + '</div>' +
              '<div class="info">' +
                '<h3>' + limpar(item.nome) + ' ' + badgePremium + '</h3>' +
                '<span class="tag">' + limpar(item.tipo) + '</span>' +
                '<p>📍 ' + limpar(item.local) + '</p>' +
                (item.preco ? '<p style="color: #16a34a; font-weight: 900; font-size: 1.1rem; margin-top: 4px;">💰 ' + item.preco + ' MT</p>' : '<p style="color: #667085; font-size: 0.85rem; margin-top: 4px; font-style: italic;">Preço a combinar</p>') +
              '</div>' +
            '</div>' +
            avaliacaoHTML +
            btnAvaliar +
            '<div style="display: flex; gap: 8px; margin-top: 10px;">' +
              '<a class="btn-contactar" style="flex: 2; margin-top: 0;" href="https://wa.me/' + numero + '?text=' + msg + '" target="_blank" rel="noopener">Contactar</a>' +
              '<a class="btn-partilhar" style="flex: 1;" href="https://wa.me/?text=' + msgPartilha + '" target="_blank" rel="noopener">📤 Partilhar</a>' +
            '</div>' +
          '</div>' +
        '</div>';
    });

    results.innerHTML = html;

    // Ligar botões "Avaliar"
    results.querySelectorAll(".btn-avaliar").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const id = btn.getAttribute("data-anuncio-id");
        const nome = btn.getAttribute("data-anuncio-nome");
        if (window.MZAvaliacao) {
          window.MZAvaliacao.abrir(id, nome);
        }
      });
    });

    // ⭐ Tornar fotos clicáveis (PC + TELEMÓVEL)
    results.querySelectorAll(".foto-principal-card[data-fotos]").forEach(function (el) {
      el.onclick = function () {
        try {
          const fotosData = JSON.parse(decodeURIComponent(el.getAttribute("data-fotos")));
          const nome = el.getAttribute("data-nome") || "";
          if (window.MZGaleria) {
            window.MZGaleria.abrir(fotosData, nome);
          }
        } catch (err) {
          console.warn("Erro ao abrir galeria:", err);
        }
      };
    });
  }

  function pesquisar() {
    const termo = normalizar(searchInput.value.trim());

    if (termo === "") {
      results.innerHTML = "<p style='text-align:center'>Digite o que você procura.</p>";
      return;
    }

    const encontrados = dados.filter(function (item) {
      return (
        normalizar(item.nome).includes(termo) ||
        normalizar(item.tipo).includes(termo) ||
        normalizar(item.local).includes(termo)
      );
    });

    mostrar(encontrados, "Resultados encontrados");
  }

  searchButton.addEventListener("click", pesquisar);

  searchInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") pesquisar();
  });

  document.querySelectorAll("[data-categoria]").forEach(function (botao) {
    botao.addEventListener("click", function () {
      const cat = botao.dataset.categoria;
      const filtrados = dados.filter(function (item) {
        return item.categoria === cat;
      });
      mostrar(filtrados, "Categoria: " + botao.textContent);
    });
  });

  // Iniciar
  (async function init() {
    await carregarUserLogado();
    await carregarDados();
  })();
});
