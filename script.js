document.addEventListener("DOMContentLoaded", function () {

  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchButton");
  const results = document.getElementById("results");

  // Ligacao ao Supabase (chave publica, so permite ler)
  const SUPABASE_URL = "https://uuswtafwkgrzmzbkgnjq.supabase.co";
  const SUPABASE_KEY = "sb_publishable_vd6DmOxZuXD0cVhIJMtbfQ_-8cWtU7P";

  let dados = [];

  function normalizar(texto) {
    return String(texto).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function limpar(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
  }

  async function carregarDados() {
    try {
      const resposta = await fetch(SUPABASE_URL + "/rest/v1/profissionais?select=*&order=nome", {
        headers: { apikey: SUPABASE_KEY }
      });

      if (!resposta.ok) {
        throw new Error("Erro " + resposta.status);
      }

      dados = await resposta.json();
    } catch (erro) {
      console.error("Nao foi possivel carregar os dados:", erro);
      results.innerHTML = "<p style='text-align:center'>Não foi possível carregar os dados. Verifique a internet e atualize a página.</p>";
    }
  }

  function mostrar(lista, titulo) {
    if (lista.length === 0) {
      results.innerHTML = `
        <h3 class="results-title">Nenhum resultado encontrado.</h3>
        <p style="text-align:center">Tente pesquisar outro produto ou serviço.</p>
      `;
      return;
    }

    let html = `<h3 class="results-title">${limpar(titulo)}</h3>`;

    lista.forEach(function (item) {
      const msg = encodeURIComponent("Olá " + item.nome + ", vi o seu perfil no MZLINK e gostaria de falar consigo.");
      const numero = String(item.whatsapp).replace(/\D/g, "");
      html += `
        <div class="result-card">
          <div class="avatar">${limpar(item.nome.charAt(0))}</div>
          <div class="info">
            <h3>${limpar(item.nome)}</h3>
            <span class="tag">${limpar(item.tipo)}</span>
            <p>📍 ${limpar(item.local)}</p>
          </div>
          <a class="btn-contactar" href="https://wa.me/${numero}?text=${msg}" target="_blank" rel="noopener">Contactar</a>
        </div>
      `;
    });

    results.innerHTML = html;
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

  carregarDados();

});
