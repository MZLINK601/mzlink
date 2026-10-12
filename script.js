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

  // ⭐ Premium primeiro
  function ordenarPremiumPrimeiro(lista) {
    return lista.slice().sort(function (a, b) {
      const aPremium = a.plano === "premium";
      const bPremium = b.plano === "premium";
      if (aPremium && !bPremium) return -1;
      if (!aPremium && bPremium) return 1;
      return 0;
    });
  }

  // ⭐ Gerar estrelas visuais (ex: 4.5 → ★★★★½)
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

  // Buscar user logado (para saber se pode avaliar)
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

      const badgePremium = ehPremium
        ? '<span class="badge-premium-card">👑 PREMIUM</span>'
        : '';

      // Info de avaliação
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

      // Botão avaliar (só para users logados que não são o dono)
      let btnAvaliar = "";
      if (userAtual && String(userAtual.id) !== String(item.user_id)) {
        btnAvaliar = '<button class="btn-avaliar" data-anuncio-id="' + item.id +
          '" data-anuncio-nome="' + limpar(item.nome) + '">⭐ Avaliar</button>';
      }

      html +=
        '<div class="result-card ' + (ehPremium ? 'card-premium' : '') + '">' +
          '<div class="avatar">' + limpar(item.nome.charAt(0)) + '</div>' +
          '<div class="info">' +
            '<h3>' + limpar(item.nome) + ' ' + badgePremium + '</h3>' +
            '<span class="tag">' + limpar(item.tipo) + '</span>' +
            '<p>📍 ' + limpar(item.local) + '</p>' +
            avaliacaoHTML +
            btnAvaliar +
          '</div>' +
          '<a class="btn-contactar" href="https://wa.me/' + numero + '?text=' + msg + '" target="_blank" rel="noopener">Contactar</a>' +
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
