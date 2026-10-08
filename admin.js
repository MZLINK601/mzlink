(function () {
  'use strict';

  /* ⚠️⚠️⚠️  COLOCA AQUI O TEU EMAIL DE ADMIN  ⚠️⚠️⚠️ */
  var ADMINS = [
    "amoselidiomavie258@gmail.com"
  ];

  var $ = function (s) { return document.querySelector(s); };

  var todosUsers = [];

  /* ---------- Iniciar ---------- */
  iniciar();

  async function iniciar() {
    var sessao = await MZ.sessaoValida();

    if (!sessao) {
      window.location.href = "login.html";
      return;
    }

    // Ir buscar o user
    var r = await fetch(MZ.url + "/auth/v1/user", {
      headers: {
        apikey: MZ.key,
        Authorization: "Bearer " + sessao.access_token
      }
    });

    if (!r.ok) {
      window.location.href = "login.html";
      return;
    }

    var user = await r.json();

    if (ADMINS.indexOf(user.email) === -1) {
      var aviso = $("#avisoAcesso");
      aviso.style.display = "block";
      aviso.innerHTML =
        "⛔ Acesso restrito.<br><br>" +
        "Esta conta (<strong>" + esc(user.email) + "</strong>) não é admin.";
      return;
    }

    $("#painelAdmin").style.display = "block";
    await carregarTudo();
  }

  /* ---------- Carregar utilizadores ---------- */
  async function carregarTudo() {
    var sessao = await MZ.sessaoValida();

    var r = await fetch(MZ.url + "/rest/v1/profissionais?select=id,user_id,nome,whatsapp,criado_em,plano&order=criado_em.desc", {
      headers: {
        apikey: MZ.key,
        Authorization: "Bearer " + sessao.access_token
      }
    });

    if (!r.ok) {
      $("#tbodyUsers").innerHTML =
        '<tr><td colspan="4" class="sem-resultados">Erro ao carregar.</td></tr>';
      return;
    }

    var lista = await r.json();
    todosUsers = lista || [];

    $("#statUsers").textContent = todosUsers.length;
    $("#statAnuncios").textContent = todosUsers.length;

    // Contar premium
    var totalPremium = 0;
    for (var k = 0; k < todosUsers.length; k++) {
      if (todosUsers[k].plano === "premium") totalPremium++;
    }
    var elPremium = $("#statPremium");
    if (elPremium) elPremium.textContent = totalPremium;

    renderTabela(todosUsers);
  }

  function renderTabela(lista) {
    var tbody = $("#tbodyUsers");

    if (!lista.length) {
      tbody.innerHTML =
        '<tr><td colspan="4" class="sem-resultados">Nenhum utilizador.</td></tr>';
      return;
    }

    var html = "";

    for (var i = 0; i < lista.length; i++) {
      var u = lista[i];
      var ehPremium = u.plano === "premium";

      html +=
        "<tr>" +
          "<td><strong>" + (esc(u.nome) || "—") + "</strong></td>" +
          "<td>" + (esc(u.whatsapp) || "—") + "</td>" +
          '<td><span class="tag-plano ' + (ehPremium ? "premium" : "basico") + '">' +
            (ehPremium ? "⭐ Premium" : "Básico") +
          '</span></td>' +
          "<td>" +
            (ehPremium
              ? '<button class="btn-acao btn-rebaixar" data-id="' + esc(u.id) + '" data-acao="rebaixar">Rebaixar</button>'
              : '<button class="btn-acao btn-promover" data-id="' + esc(u.id) + '" data-acao="promover">⭐ Promover</button>'
            ) +
          "</td>" +
        "</tr>";
    }

    tbody.innerHTML = html;

    // Ligar botões
    var botoes = tbody.querySelectorAll("[data-id]");
    for (var j = 0; j < botoes.length; j++) {
      botoes[j].addEventListener("click", function () {
        var id = this.getAttribute("data-id");
        var acao = this.getAttribute("data-acao");
        alterarPlano(id, acao);
      });
    }
  }

  async function alterarPlano(id, acao) {
    var novoPlano = acao === "promover" ? "premium" : "basico";
    var pergunta = acao === "promover"
      ? "Promover este utilizador a Premium?"
      : "Rebaixar este utilizador para Básico?";

    if (!confirm(pergunta)) return;

    try {
      var sessao = await MZ.sessaoValida();
      if (!sessao) {
        alert("Sessão expirada. Faz login de novo.");
        return;
      }

      var r = await fetch(
        MZ.url + "/rest/v1/profissionais?id=eq." + encodeURIComponent(id),
        {
          method: "PATCH",
          headers: {
            apikey: MZ.key,
            Authorization: "Bearer " + sessao.access_token,
            "Content-Type": "application/json",
            Prefer: "return=minimal"
          },
          body: JSON.stringify({ plano: novoPlano })
        }
      );

      if (!r.ok) {
        alert("❌ Erro ao atualizar. Tenta de novo.");
        return;
      }

      alert(acao === "promover"
        ? "✅ Utilizador promovido a Premium!"
        : "✅ Utilizador rebaixado a Básico!"
      );
      await carregarTudo();

    } catch (e) {
      alert("❌ Erro de ligação.");
    }
  }

  /* ---------- Escape (evita XSS) ---------- */
  function esc(t) {
    var d = document.createElement("div");
    d.textContent = String(t == null ? "" : t);
    return d.innerHTML;
  }

  /* ---------- Sair ---------- */
  var btnSair = $("#btnSair");
  if (btnSair) {
    btnSair.addEventListener("click", function (e) {
      e.preventDefault();
      if (typeof MZ.limparSessao === "function") MZ.limparSessao();
      localStorage.removeItem("mzlink_sessao");
      window.location.href = "index.html";
    });
  }

})();
