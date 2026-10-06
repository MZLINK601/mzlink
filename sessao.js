// Sessao partilhada do MZLINK (login guardado neste navegador)
(function () {
  var SUPABASE_URL = "https://uuswtafwkgrzmzbkgnjq.supabase.co";
  var SUPABASE_KEY = "sb_publishable_vd6DmOxZuXD0cVhIJMtbfQ_-8cWtU7P";
  var CHAVE = "mzlink_sessao";

  function lerSessao() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE));
    } catch (e) {
      return null;
    }
  }

  function guardarSessao(s) {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(s));
    } catch (e) {}
  }

  function limparSessao() {
    try {
      localStorage.removeItem(CHAVE);
    } catch (e) {}
  }

  async function renovar(s) {
    if (!s || !s.refresh_token) return null;

    try {
      var resposta = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
        body: JSON.stringify({ refresh_token: s.refresh_token })
      });

      if (!resposta.ok) {
        limparSessao();
        return null;
      }

      var d = await resposta.json();
      var meta = d.user && d.user.user_metadata ? d.user.user_metadata : {};
      var nova = {
        access_token: d.access_token,
        refresh_token: d.refresh_token,
        expires_at: d.expires_at,
        nome: meta.nome || s.nome || "",
        email: (d.user && d.user.email) || s.email || ""
      };
      guardarSessao(nova);
      return nova;
    } catch (e) {
      return null;
    }
  }

  // Devolve a sessao valida (renova se estiver a expirar) ou null
  async function sessaoValida() {
    var s = lerSessao();
    if (!s || !s.access_token) return null;

    var agora = Math.floor(Date.now() / 1000);
    if (s.expires_at && s.expires_at - 60 > agora) return s;

    return await renovar(s);
  }

  async function sair() {
    var s = lerSessao();
    try {
      if (s && s.access_token) {
        await fetch(SUPABASE_URL + "/auth/v1/logout", {
          method: "POST",
          headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + s.access_token }
        });
      }
    } catch (e) {}
    limparSessao();
    window.location.href = "index.html";
  }

  window.MZ = {
    url: SUPABASE_URL,
    key: SUPABASE_KEY,
    sessaoValida: sessaoValida,
    sair: sair
  };

  // Na pagina inicial: troca "Entrar / Criar conta" por "Ola, nome / Publicar / Sair"
  document.addEventListener("DOMContentLoaded", async function () {
    var nav = document.querySelector("header nav");
    if (!nav) return;

    var s = await sessaoValida();
    if (!s) return;

    nav.innerHTML = "";

    var ola = document.createElement("span");
    ola.textContent = s.nome ? "Olá, " + s.nome : "Olá!";
    ola.style.fontWeight = "600";
    ola.style.alignSelf = "center";

    var publicar = document.createElement("button");
    publicar.textContent = "Publicar anúncio";
    publicar.addEventListener("click", function () {
      window.location.href = "publicar.html";
    });

    var botaoSair = document.createElement("button");
    botaoSair.textContent = "Sair";
    botaoSair.addEventListener("click", sair);

    nav.appendChild(ola);
    nav.appendChild(publicar);
    nav.appendChild(botaoSair);
  });
})();
