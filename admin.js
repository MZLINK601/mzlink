(function () {
  'use strict';

  /* ⚠️⚠️⚠️  COLOCA AQUI O TEU EMAIL DE ADMIN  ⚠️⚠️⚠️ */
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

    var r = await fetch(MZ.url + "/auth/v1/user", {
      headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token }
    });

    if (!r.ok) {
      window.location.href = "login.html";
      return;
    }

    var user = await r.json();

    if (ADMINS.indexOf(user.email) === -1) {
      var aviso = $("#avisoAcesso");
      aviso.style.display = "block";
      aviso.innerHTML = "⛔ Acesso restrito.<br><br>Esta conta (<strong>" + esc(user.email) + "</strong>) não é admin.";
      return;
    }

    $("#painelAdmin").style.display = "block";
    
    await carregarTudo();
    await carregarPendentes(); 
  }

  /* ---------- Carregar utilizadores ---------- */
  async function carregarTudo() {
    var sessao = await MZ.sessaoValida();

    var r = await fetch(MZ.url + "/rest/v1/profissionais?select=id, user_id, nome, whatsapp, criado_em, plano, premium_ate&order=criado_em.desc", {
      headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token }
    });

    if (!r.ok) {
      $("#tbodyUsers").innerHTML = '<tr><td colspan="4" class="sem-resultados">Erro ao carregar.</td></tr>';
      return;
    }

    var lista = await r.json();
    todosUsers = lista || [];

    $("#statUsers").textContent = todosUsers.length;
    $("#statAnuncios").textContent = todosUsers.length;

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
      tbody.innerHTML = '<tr><td colspan="4" class="sem-resultados">Nenhum utilizador.</td></tr>';
      return;
    }

    var html = "";

    for (var i = 0; i < lista.length; i++) {
      var u = lista[i];
      var ehPremium = u.plano === "premium";

      var textoPremium = "⭐ Premium";
      if (ehPremium && u.premium_ate) {
        var dataExpiracao = new Date(u.premium_ate);
        textoPremium += " (até " + dataExpiracao.toLocaleDateString('pt-MZ') + ")";
      }

      html +=
        "<tr>" +
          "<td><strong>" + (esc(u.nome) || "—") + "</strong></td>" +
          "<td>" + (esc(u.whatsapp) || "—") + "</td>" +
          '<td><span class="tag-plano ' + (ehPremium ? "premium" : "basico") + '">' +
            (ehPremium ? textoPremium : "Básico") +
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
    var pergunta = acao === "promover" ? "Promover este utilizador a Premium por 30 dias?" : "Rebaixar este utilizador para Básico?";

    if (!confirm(pergunta)) return;

    try {
      var sessao = await MZ.sessaoValida();
      if (!sessao) { alert("Sessão expirada. Faz login de novo."); return; }

      var dataExpiracao = null;
      if (novoPlano === "premium") {
        var dataFutura = new Date();
        dataFutura.setDate(dataFutura.getDate() + 30);
        dataExpiracao = dataFutura.toISOString();
      }

      var r = await fetch(MZ.url + "/rest/v1/profissionais?id=eq." + encodeURIComponent(id), {
          method: "PATCH",
          headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({ plano: novoPlano, premium_ate: dataExpiracao })
        }
      );

      if (!r.ok) { alert("❌ Erro ao atualizar. Tenta de novo."); return; }

      alert(acao === "promover" ? "✅ Utilizador promovido a Premium por 30 dias!" : "✅ Utilizador rebaixado a Básico!");
      await carregarTudo();

    } catch (e) {
      alert("❌ Erro de ligação.");
    }
  }

  /* ==========================================
     NOVA SECÇÃO: PEDIDOS PREMIUM PENDENTES
     ========================================== */
  async function carregarPendentes() {
    var div = document.getElementById("tabelaPendentes");
    if (!div) return;

    try {
      var sessao = await MZ.sessaoValida();
      if (!sessao) {
        div.innerHTML = "<p style='padding:20px; color:red;'>Erro: Sessão expirada. Faz login de novo.</p>";
        return;
      }

      var r = await fetch(MZ.url + "/rest/v1/pedidos_premium?status=eq.pendente&select=*", {
        headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token }
      });
      
      if (!r.ok) {
        div.innerHTML = "<p style='padding:20px; color:red;'>Erro ao ligar à base de dados (Código: " + r.status + "). Verifica se criaste a tabela e as regras de segurança.</p>";
        return;
      }

      var pedidos = await r.json();

      if (!Array.isArray(pedidos)) {
         div.innerHTML = "<p style='padding:20px; color:red;'>Erro: Resposta da base de dados inválida.</p>";
         return;
      }

      if (pedidos.length === 0) {
        div.innerHTML = "<p style='padding:20px; color:#16a34a; font-weight:bold;'>✅ Nenhum pedido pendente. Tudo em dia!</p>";
        return;
      }

      var html = `<table style="width:100%; border-collapse: collapse; text-align: left;">
          <tr style="background: #f8f9fb; border-bottom: 2px solid #eee;">
              <th style="padding: 15px;">Loja</th>
              <th style="padding: 15px;">Comprovativo</th>
              <th style="padding: 15px;">Ação</th>
          </tr>`;

      pedidos.forEach(function(p) {
          html += `<tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 15px; font-weight: bold;">${esc(p.nome_loja) || 'Sem nome'}</td>
              <td style="padding: 15px; color: #d4af37; font-weight: bold; font-size: 1.1rem;">${esc(p.numero_comprovativo)}</td>
              <td style="padding: 15px;">
                  <button class="btn-acao btn-aprovar-pedido" data-id="${esc(p.id)}" data-user="${esc(p.user_id)}" style="background: #16a34a; color: white; border: none; padding: 8px 14px; border-radius: 6px; font-weight: 700; cursor: pointer;">✅ Aprovar</button>
              </td>
          </tr>`;
      });
      html += `</table>`;
      div.innerHTML = html;

      var btns = div.querySelectorAll(".btn-aprovar-pedido");
      for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener("click", function() {
            var idPedido = this.getAttribute("data-id");
            var userId = this.getAttribute("data-user");
            aprovarPremium(idPedido, userId);
        });
      }

    } catch (e) {
      console.error(e);
      div.innerHTML = "<p style='padding:20px; color:red;'>Erro de ligação ao servidor.</p>";
    }
  }

  async function aprovarPremium(idPedido, userId) {
    if (!confirm("Confirmas que recebeste o pagamento e queres ativar o Premium por 30 dias?")) return;

    var sessao = await MZ.sessaoValida();
    if (!sessao) return;

    try {
      await fetch(MZ.url + "/rest/v1/pedidos_premium?id=eq." + idPedido, {
        method: "PATCH",
        headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "aprovado" })
      });

      var dataFutura = new Date();
      dataFutura.setDate(dataFutura.getDate() + 30);

      await fetch(MZ.url + "/rest/v1/profissionais?user_id=eq." + userId, {
        method: "PATCH",
        headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token, "Content-Type": "application/json" },
        body: JSON.stringify({ plano: "premium", premium_ate: dataFutura.toISOString() })
      });

      alert("✅ Cliente promovido a Premium com sucesso!");
      await carregarTudo(); 
      await carregarPendentes(); 

    } catch (e) {
      console.error(e);
      alert("Erro ao aprovar o pedido.");
    }
  }

  function esc(t) {
    var d = document.createElement("div");
    d.textContent = String(t == null ? "" : t);
    return d.innerHTML;
  }

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
