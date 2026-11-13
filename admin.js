(function () {
  'use strict';

  /* ⚠️⚠️⚠️  O TEU EMAIL DE ADMIN  ⚠️⚠️⚠️ */
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
    await carregarAnuncios(); 
  }

  /* ---------- Carregar Utilizadores e Estatísticas ---------- */
  async function carregarTudo() {
    var sessao = await MZ.sessaoValida();

    // Vai buscar a tabela principal
    var r = await fetch(MZ.url + "/rest/v1/profissionais?select=id, user_id, nome, whatsapp, criado_em, plano, premium_ate&order=criado_em.desc", {
      headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token }
    });

    if (!r.ok) {
      $("#tbodyUsers").innerHTML = '<tr><td colspan="4" class="sem-resultados">Erro ao carregar utilizadores.</td></tr>';
      return;
    }

    var lista = await r.json();
    todosUsers = lista || [];

    $("#statUsers").textContent = todosUsers.length;

    var totalPremium = 0;
    for (var k = 0; k < todosUsers.length; k++) {
      if (todosUsers[k].plano === "premium") totalPremium++;
    }
    var elPremium = $("#statPremium");
    if (elPremium) elPremium.textContent = totalPremium;

    // Atualiza os contadores de Anúncios e Visitas
    await atualizarEstatisticasExtras(sessao);

    renderTabela(todosUsers);
  }

  async function atualizarEstatisticasExtras(sessao) {
    try {
        // Contar Anúncios (Lendo da tabela 'profissionais' para bater certo com o site)
        var rAnuncios = await fetch(MZ.url + "/rest/v1/profissionais?select=id", {
            headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token }
        });
        if (rAnuncios.ok) {
            var anuncios = await rAnuncios.json();
            var elAnuncios = $("#statAnuncios");
            if (elAnuncios) elAnuncios.textContent = anuncios.length;
        }

        // Contar Visitas
        var rVisitas = await fetch(MZ.url + "/rest/v1/visitas?select=id", {
            headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token }
        });
        if (rVisitas.ok) {
            var visitas = await rVisitas.json();
            var elVisitas = $("#statVisitas");
            if (elVisitas) elVisitas.textContent = visitas.length;
        }
    } catch (e) {
        console.log("Erro ao buscar extras", e);
    }
  }

  /* ---------- Render Tabela Utilizadores ---------- */
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
     MODERAÇÃO DE ANÚNCIOS (A ler da tabela correta)
     ========================================== */
  async function carregarAnuncios() {
    var div = document.getElementById("listaAnuncios");
    if (!div) return;

    try {
        var sessao = await MZ.sessaoValida();
        
        // Vamos ler da tabela 'profissionais' onde o teu site guarda os anúncios reais
        var r = await fetch(MZ.url + "/rest/v1/profissionais?select=id, nome, preco, criado_em&order=criado_em.desc&limit=20", {
            headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token }
        });

        if (!r.ok) {
            var erro = await r.text();
            div.innerHTML = `<p style="padding:15px; color:red; background:#fee2e2; border-radius:8px;">
                <strong>Erro ao carregar anúncios.</strong><br>
                <small style="font-size:10px;">Detalhe: ${erro}</small>
            </p>`;
            return;
        }

        var anuncios = await r.json();

        if (anuncios.length === 0) {
            div.innerHTML = "<p style='padding:15px; color:#16a34a; font-weight:bold;'>✅ Nenhum anúncio publicado ainda.</p>";
            return;
        }

        var html = `<table style="width:100%; border-collapse: collapse; text-align: left;">
            <tr style="background: #f8f9fb; border-bottom: 2px solid #eee;">
                <th style="padding: 15px;">Título</th>
                <th style="padding: 15px;">Preço</th>
                <th style="padding: 15px;">Ação</th>
            </tr>`;

        anuncios.forEach(function(a) {
            // O teu site usa 'nome' em vez de 'titulo'. Vamos adaptar!
            html += `<tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 15px; font-weight: bold;">${esc(a.nome)}</td>
                <td style="padding: 15px; color: #16a34a; font-weight: bold;">${esc(a.preco || 'A combinar')} MT</td>
                <td style="padding: 15px;">
                    <button onclick="window.apagarAnuncio('${a.id}')" style="background: #dc2626; color: white; border: none; padding: 8px 14px; border-radius: 6px; font-weight: 700; cursor: pointer;">🗑 Apagar</button>
                </td>
            </tr>`;
        });
        html += `</table>`;
        div.innerHTML = html;

    } catch (e) {
        div.innerHTML = `<p style="padding:15px; color:red;">Erro de ligação ao servidor.</p>`;
    }
  }

  // Função global para o botão de apagar funcionar (na tabela profissionais)
  window.apagarAnuncio = async function(id) {
    if (!confirm("Tem a certeza que quer apagar este anúncio permanentemente?")) return;
    var sessao = await MZ.sessaoValida();
    var r = await fetch(MZ.url + "/rest/v1/profissionais?id=eq." + id, {
        method: "DELETE",
        headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token }
    });
    if (r.ok) {
        alert("🗑 Anúncio apagado com sucesso!");
        carregarAnuncios();
        carregarTudo(); // Atualiza o contador de anúncios
    } else {
        alert("Erro ao apagar anúncio.");
    }
  };

  /* ==========================================
     PEDIDOS PREMIUM PENDENTES
     ========================================== */
  async function carregarPendentes() {
    var div = document.getElementById("tabelaPendentes");
    if (!div) return;

    try {
      var sessao = await MZ.sessaoValida();
      if (!sessao) return;

      var r = await fetch(MZ.url + "/rest/v1/pedidos_premium?status=eq.pendente&select=*", {
        headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token }
      });
      
      if (!r.ok) return;

      var pedidos = await r.json();
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
                  <button class="btn-aprovar-pedido" data-id="${esc(p.id)}" data-user="${esc(p.user_id)}" style="background: #16a34a; color: white; border: none; padding: 8px 14px; border-radius: 6px; font-weight: 700; cursor: pointer;">✅ Aprovar</button>
              </td>
          </tr>`;
      });
      html += `</table>`;
      div.innerHTML = html;

      var btns = div.querySelectorAll(".btn-aprovar-pedido");
      for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener("click", function() {
            aprovarPremium(this.getAttribute("data-id"), this.getAttribute("data-user"));
        });
      }

    } catch (e) {
      console.error(e);
    }
  }

  async function aprovarPremium(idPedido, userId) {
    if (!confirm("Confirmas que recebeste o pagamento e queres ativar o Premium por 30 dias?")) return;
    var sessao = await MZ.sessaoValida();
    
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
