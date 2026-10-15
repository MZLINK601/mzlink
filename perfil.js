/* ============================================================
   MZLINK · Perfil do Utilizador 👤
   ============================================================ */

(function () {
  'use strict';

  var CHAVE = "mzlink_sessao";
  var conteudo = document.getElementById("conteudo");

  if (!conteudo) return;

  var sessao = null;
  var user = null;
  var userMeta = {};
  var plano = "basico";

  function lerSessao() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE));
    } catch (e) {
      return null;
    }
  }

  function limpar(t) {
    var d = document.createElement("div");
    d.textContent = String(t == null ? "" : t);
    return d.innerHTML;
  }

  function cabecalhos() {
    return {
      apikey: MZ.key,
      Authorization: "Bearer " + sessao.access_token
    };
  }

  async function iniciar() {
    sessao = lerSessao();

    if (!sessao || !sessao.access_token) {
      window.location.href = "login.html?next=perfil.html";
      return;
    }

    if (typeof MZ === "undefined") {
      conteudo.innerHTML = '<div class="loading">Erro: sessao.js não carregou.</div>';
      return;
    }

    try {
      var rUser = await fetch(MZ.url + "/auth/v1/user", { headers: cabecalhos() });
      if (!rUser.ok) {
        localStorage.removeItem(CHAVE);
        window.location.href = "login.html?next=perfil.html";
        return;
      }
      user = await rUser.json();
      userMeta = user.user_metadata || {};

      var rPlano = await fetch(
        MZ.url + "/rest/v1/profissionais?select=plano&user_id=eq." +
        encodeURIComponent(user.id) + "&limit=1",
        { headers: cabecalhos() }
      );

      if (rPlano.ok) {
        var lista = await rPlano.json();
        plano = (lista && lista[0] && lista[0].plano) || "basico";
      }

      renderizar();
    } catch (e) {
      conteudo.innerHTML = '<div class="loading">Erro de ligação. Recarrega.</div>';
    }
  }

  function renderizar() {
    var nome = userMeta.nome || userMeta.name || user.email.split("@")[0];
    var telefone = String(userMeta.whatsapp || "").replace(/^258/, "");
    var inicial = nome.charAt(0).toUpperCase();
    var ehPremium = plano === "premium";

    var html =
      '<div class="hero">' +
        '<div class="avatar-grande ' + (ehPremium ? 'premium' : '') + '">' + limpar(inicial) + '</div>' +
        '<h1>' + limpar(nome) + '</h1>' +
        '<p class="email">' + limpar(user.email) + '</p>' +
        '<span class="plano-badge ' + (ehPremium ? 'premium' : 'basico') + '">' +
          (ehPremium ? '⭐ PREMIUM' : '🆓 Básico') +
        '</span>' +
      '</div>' +

      '<div class="card">' +
        '<h2>📝 Dados pessoais</h2>' +
        '<div class="campo">' +
          '<div class="campo-info">' +
            '<label>Nome</label>' +
            '<div class="valor">' + limpar(nome) + '</div>' +
          '</div>' +
          '<button class="btn-editar" id="btnEditNome">✏️ Editar</button>' +
        '</div>' +
        '<div class="campo">' +
          '<div class="campo-info">' +
            '<label>WhatsApp</label>' +
            '<div class="valor">' + (telefone ? '258' + limpar(telefone) : '—') + '</div>' +
          '</div>' +
          '<button class="btn-editar" id="btnEditTel">✏️ Editar</button>' +
        '</div>' +
        '<div class="campo">' +
          '<div class="campo-info">' +
            '<label>Email (não editável)</label>' +
            '<div class="valor bloqueado">' + limpar(user.email) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="aviso" id="avisoPerfil"></div>' +
      '</div>' +

      '<div class="card">' +
        '<h2>📢 Os meus anúncios</h2>' +
        '<a href="publicar.html" class="btn-acao principal">📢 Ver os meus anúncios</a>' +
      '</div>' +

      '<div class="card">' +
        '<h2>🔐 Segurança</h2>' +
        '<a href="nova-senha.html" class="btn-acao principal">🔑 Mudar palavra-passe</a>' +
        '<button class="btn-acao sair" id="btnSairPerfil">🚪 Sair da conta</button>' +
      '</div>' +

      '<a href="index.html" class="btn-voltar">← Voltar ao MZLINK</a>';

    conteudo.innerHTML = html;

    document.getElementById("btnEditNome").onclick = editarNome;
    document.getElementById("btnEditTel").onclick = editarTelefone;
    document.getElementById("btnSairPerfil").onclick = sair;
  }

  function mostrarAviso(texto, tipo) {
    var el = document.getElementById("avisoPerfil");
    if (!el) return;
    el.textContent = texto;
    el.className = "aviso visivel " + (tipo === "ok" ? "ok" : "erro");
    setTimeout(function () { el.classList.remove("visivel"); }, 3500);
  }

  function editarNome() {
    var atual = userMeta.nome || userMeta.name || "";
    var novo = prompt("✏️ Editar nome:", atual);
    if (novo === null) return;
    novo = novo.trim();
    if (novo.length < 2) { mostrarAviso("Nome muito curto.", "erro"); return; }
    if (novo.length > 60) { mostrarAviso("Nome muito longo.", "erro"); return; }
    if (novo === atual) return;
    guardar({ nome: novo });
  }

  function editarTelefone() {
    var atual = String(userMeta.whatsapp || "").replace(/^258/, "");
    var novo = prompt("✏️ Editar WhatsApp (ex: 841234567):", atual);
    if (novo === null) return;
    novo = novo.replace(/\s/g, "");
    if (!/^(8[2-7])\d{7}$/.test(novo)) { mostrarAviso("Número inválido.", "erro"); return; }
    if (novo === atual) return;
    guardar({ whatsapp: "258" + novo });
  }

  async function guardar(dados) {
    try {
      var novoMeta = Object.assign({}, userMeta, dados);

      var r = await fetch(MZ.url + "/auth/v1/user", {
        method: "PUT",
        headers: Object.assign({ "Content-Type": "application/json" }, cabecalhos()),
        body: JSON.stringify({ data: novoMeta })
      });

      if (!r.ok) {
        mostrarAviso("Erro ao guardar. Tenta de novo.", "erro");
        return;
      }

      userMeta = novoMeta;

      try {
        var s = JSON.parse(localStorage.getItem(CHAVE)) || {};
        if (dados.nome) s.nome = dados.nome;
        if (dados.whatsapp) s.whatsapp = dados.whatsapp;
        localStorage.setItem(CHAVE, JSON.stringify(s));
      } catch (e) {}

      renderizar();
      mostrarAviso("✅ Guardado com sucesso!", "ok");
    } catch (e) {
      mostrarAviso("Sem ligação à internet.", "erro");
    }
  }

  function sair() {
    if (!confirm("Queres sair da conta?")) return;
    try { localStorage.removeItem(CHAVE); } catch (e) {}
    window.location.href = "index.html";
  }

  iniciar();

})();
