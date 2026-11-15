(function () {
  'use strict';

  var ADMINS = ["amoselidiomavie258@gmail.com"];
  var $ = function (s) { return document.querySelector(s); };
  var todosUsers = [];

  iniciar();

  async function iniciar() {
    var sessao = await MZ.sessaoValida();
    if (!sessao) { window.location.href = "login.html"; return; }

    var r = await fetch(MZ.url + "/auth/v1/user", { headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token } });
    if (!r.ok) { window.location.href = "login.html"; return; }
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
    await carregarSuporte();
    await carregarVendasProtegidas();
  }

  async function carregarTudo() {
    var sessao = await MZ.sessaoValida();
    var r = await fetch(MZ.url + "/rest/v1/profissionais?select=id, user_id, nome, whatsapp, criado_em, plano, premium_ate&order=criado_em.desc", { headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token } });
    if (!r.ok) { $("#tbodyUsers").innerHTML = '<tr><td colspan="4" class="sem-resultados">Erro ao carregar.</td></tr>'; return; }
    
    var lista = await r.json();
    todosUsers = lista || [];
    $("#statUsers").textContent = todosUsers.length;

    var totalPremium = 0;
    for (var k = 0; k < todosUsers.length; k++) { if (todosUsers[k].plano === "premium") totalPremium++; }
    var elPremium = $("#statPremium"); if (elPremium) elPremium.textContent = totalPremium;

    await atualizarEstatisticasExtras(sessao);
    renderTabela(todosUsers);
  }

  async function atualizarEstatisticasExtras(sessao) {
    try {
        var rAnuncios = await fetch(MZ.url + "/rest/v1/profissionais?select=id", { headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token } });
        if (rAnuncios.ok) { var anuncios = await rAnuncios.json(); var elAnuncios = $("#statAnuncios"); if (elAnuncios) elAnuncios.textContent = anuncios.length; }
        
        var rVisitas = await fetch(MZ.url + "/rest/v1/visitas?select=id", { headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token } });
        if (rVisitas.ok) { var visitas = await rVisitas.json(); var elVisitas = $("#statVisitas"); if (elVisitas) elVisitas.textContent = visitas.length; }
    } catch (e) { console.log("Erro extras", e); }
  }

  function renderTabela(lista) {
    var tbody = $("#tbodyUsers");
    if (!lista.length) { tbody.innerHTML = '<tr><td colspan="4" class="sem-resultados">Nenhum utilizador.</td></tr>'; return; }
    var html = "";
    for (var i = 0; i < lista.length; i++) {
      var u = lista[i];
      var ehPremium = u.plano === "premium";
      var textoPremium = "⭐ Premium";
      if (ehPremium && u.premium_ate) { var dataExpiracao = new Date(u.premium_ate); textoPremium += " (até " + dataExpiracao.toLocaleDateString('pt-MZ') + ")"; }
      html += "<tr><td><strong>" + (esc(u.nome) || "—") + "</strong></td><td>" + (esc(u.whatsapp) || "—") + "</td><td><span class='tag-plano " + (ehPremium ? "premium" : "basico") + "'>" + (ehPremium ? textoPremium : "Básico") + "</span></td><td>" + (ehPremium ? '<button class="btn-acao btn-rebaixar" data-id="' + esc(u.id) + '" data-acao="rebaixar">Rebaixar</button>' : '<button class="btn-acao btn-promover" data-id="' + esc(u.id) + '" data-acao="promover">⭐ Promover</button>') + "</td></tr>";
    }
    tbody.innerHTML = html;
    var botoes = tbody.querySelectorAll("[data-id]");
    for (var j = 0; j < botoes.length; j++) {
      botoes[j].addEventListener("click", function () { alterarPlano(this.getAttribute("data-id"), this.getAttribute("data-acao")); });
    }
  }

  async function alterarPlano(id, acao) {
    var novoPlano = acao === "promover" ? "premium" : "basico";
    if (!confirm(acao === "promover" ? "Promover a Premium por 30 dias?" : "Rebaixar para Básico?")) return;
    try {
      var sessao = await MZ.sessaoValida();
      var dataExpiracao = null;
      if (novoPlano === "premium") { var dataFutura = new Date(); dataFutura.setDate(dataFutura.getDate() + 30); dataExpiracao = dataFutura.toISOString(); }
      var r = await fetch(MZ.url + "/rest/v1/profissionais?id=eq." + encodeURIComponent(id), {
          method: "PATCH", headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({ plano: novoPlano, premium_ate: dataExpiracao })
      });
      if (!r.ok) { alert("❌ Erro ao atualizar."); return; }
      alert("✅ Atualizado!"); await carregarTudo();
    } catch (e) { alert("❌ Erro de ligação."); }
  }

  async function carregarAnuncios() {
    var div = document.getElementById("listaAnuncios");
    if (!div) return;
    try {
        var sessao = await MZ.sessaoValida();
        var r = await fetch(MZ.url + "/rest/v1/profissionais?select=id, nome, preco, criado_em&order=criado_em.desc&limit=20", { headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token } });
        if (!r.ok) { div.innerHTML = "<p style='color:red;'>Erro ao carregar.</p>"; return; }
        var anuncios = await r.json();
        if (anuncios.length === 0) { div.innerHTML = "<p style='padding:15px; color:#16a34a; font-weight:bold;'>✅ Nenhum anúncio publicado ainda.</p>"; return; }
        var html = `<table style="width:100%; table-layout: fixed; border-collapse: collapse; text-align: left;"><tr style="background: #f8f9fb; border-bottom: 2px solid #eee;"><th style="padding: 8px 5px; font-size: 0.8rem; width: 50%;">Título</th><th style="padding: 8px 5px; font-size: 0.8rem; width: 25%;">Preço</th><th style="padding: 8px 5px; font-size: 0.8rem; width: 25%; text-align: center;">Ação</th></tr>`;
        anuncios.forEach(function(a) {
            html += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 5px; font-weight: bold; font-size: 0.8rem; word-wrap: break-word;">${esc(a.nome)}</td><td style="padding: 8px 5px; color: #16a34a; font-weight: bold; font-size: 0.8rem; word-wrap: break-word;">${esc(a.preco || 'A combinar')} MT</td><td style="padding: 8px 5px; text-align: center;"><button onclick="window.apagarAnuncio('${a.id}')" style="background: #dc2626; color: white; border: none; padding: 6px 8px; border-radius: 4px; font-weight: 700; cursor: pointer; font-size: 0.7rem;">🗑 Apagar</button></td></tr>`;
        });
        html += `</table>`; div.innerHTML = html;
    } catch (e) { div.innerHTML = "<p style='color:red;'>Erro de ligação.</p>"; }
  }

  window.apagarAnuncio = async function(id) {
    if (!confirm("Apagar este anúncio permanentemente?")) return;
    var sessao = await MZ.sessaoValida();
    var r = await fetch(MZ.url + "/rest/v1/profissionais?id=eq." + id, { method: "DELETE", headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token } });
    if (r.ok) { alert("🗑 Apagado!"); carregarAnuncios(); carregarTudo(); } else { alert("Erro ao apagar."); }
  };

   async function carregarPendentes() {
    var div = document.getElementById("tabelaPendentes");
    if (!div) return;
    try {
      var sessao = await MZ.sessaoValida();
      var r = await fetch(MZ.url + "/rest/v1/pedidos_premium?status=eq.pendente&select=*", { headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token } });
      if (!r.ok) return;
      var pedidos = await r.json();
      if (pedidos.length === 0) { div.innerHTML = "<p style='padding:20px; color:#16a34a; font-weight:bold;'>✅ Nenhum pedido pendente.</p>"; return; }
      var html = `<table style="width:100%; border-collapse: collapse; text-align: left;"><tr style="background: #f8f9fb; border-bottom: 2px solid #eee;"><th style="padding: 15px;">Loja</th><th style="padding: 15px;">Comprovativo</th><th style="padding: 15px;">Ação</th></tr>`;
      pedidos.forEach(function(p) {
          html += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 15px; font-weight: bold;">${esc(p.nome_loja) || 'Sem nome'}</td><td style="padding: 15px; color: #d4af37; font-weight: bold; font-size: 1.1rem;">${esc(p.numero_comprovativo)}</td><td style="padding: 15px;"><button class="btn-aprovar-pedido" data-id="${esc(p.id)}" data-user="${esc(p.user_id)}" style="background: #16a34a; color: white; border: none; padding: 8px 14px; border-radius: 6px; font-weight: 700; cursor: pointer;">✅ Aprovar</button></td></tr>`;
      });
      html += `</table>`; div.innerHTML = html;
      var btns = div.querySelectorAll(".btn-aprovar-pedido");
      for (var i = 0; i < btns.length; i++) { btns[i].addEventListener("click", function() { aprovarPremium(this.getAttribute("data-id"), this.getAttribute("data-user")); }); }
    } catch (e) { console.error(e); }
  }

  async function aprovarPremium(idPedido, userId) {
    if (!confirm("Ativar Premium por 30 dias?")) return;
    var sessao = await MZ.sessaoValida();
    try {
      await fetch(MZ.url + "/rest/v1/pedidos_premium?id=eq." + idPedido, { method: "PATCH", headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token, "Content-Type": "application/json" }, body: JSON.stringify({ status: "aprovado" }) });
      var dataFutura = new Date(); dataFutura.setDate(dataFutura.getDate() + 30);
      await fetch(MZ.url + "/rest/v1/profissionais?user_id=eq." + userId, { method: "PATCH", headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token, "Content-Type": "application/json" }, body: JSON.stringify({ plano: "premium", premium_ate: dataFutura.toISOString() }) });
      alert("✅ Promovido!"); await carregarTudo(); await carregarPendentes(); 
    } catch (e) { alert("Erro ao aprovar."); }
  }

  async function carregarSuporte() {
    var div = document.getElementById("listaSuporte");
    if (!div) return;
    try {
        var sessao = await MZ.sessaoValida();
        var r = await fetch(MZ.url + "/rest/v1/suporte?status=eq.pendente&order=criado_em.desc", { headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token } });
        if (!r.ok) { div.innerHTML = `<p style="color:red;">Erro ao carregar suporte.</p>`; return; }
        var tickets = await r.json();
        if (tickets.length === 0) { div.innerHTML = "<p style='padding:15px; color:#16a34a; font-weight:bold;'>✅ Nenhuma mensagem pendente.</p>"; return; }
        var html = `<table style="width:100%; table-layout: fixed; border-collapse: collapse; text-align: left;"><tr style="background: #f8f9fb; border-bottom: 2px solid #eee;"><th style="padding: 8px 5px; font-size: 0.8rem; width: 30%;">Email</th><th style="padding: 8px 5px; font-size: 0.8rem; width: 50%;">Mensagem</th><th style="padding: 8px 5px; font-size: 0.8rem; width: 20%; text-align: center;">Ação</th></tr>`;
        tickets.forEach(function(t) {
            html += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 5px; font-size: 0.75rem; word-break: break-all;">${esc(t.email)}</td><td style="padding: 8px 5px; font-size: 0.8rem; word-wrap: break-word;">${esc(t.mensagem)}</td><td style="padding: 8px 5px; text-align: center;"><button onclick="window.resolverTicket('${t.id}')" style="background: #16a34a; color: white; border: none; padding: 6px 8px; border-radius: 4px; font-weight: 700; cursor: pointer; font-size: 0.7rem;">✅ Resolver</button></td></tr>`;
        });
        html += `</table>`; div.innerHTML = html;
    } catch (e) { div.innerHTML = `<p style="color:red;">Erro de ligação.</p>`; }
  }

  window.resolverTicket = async function(id) {
    if (!confirm("Marcar esta mensagem como resolvida?")) return;
    var sessao = await MZ.sessaoValida();
    var r = await fetch(MZ.url + "/rest/v1/suporte?id=eq." + id, { method: "PATCH", headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token, "Content-Type": "application/json" }, body: JSON.stringify({ status: "resolvido" }) });
    if (r.ok) { alert("✅ Resolvido!"); carregarSuporte(); }
  };

  async function carregarVendasProtegidas() {
    var divVendas = document.getElementById("listaVendasProtegidas");
    var divSaldo = document.getElementById("saldoMZLink");
    if (!divVendas) return;

    try {
        var sessao = await MZ.sessaoValida();
        var r = await fetch(MZ.url + "/rest/v1/vendas_protegidas?status=in.(pago,enviado)&order=criado_em.desc", {
            headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token }
        });

        if (!r.ok) { divVendas.innerHTML = "<p style='color:red;'>Erro ao carregar vendas.</p>"; return; }
        var vendas = await r.json();
        
        var saldoTotal = 0;
        vendas.forEach(v => saldoTotal += Number(v.taxa_mzlink));
        if (divSaldo) divSaldo.innerText = saldoTotal.toFixed(2) + " MT";

        if (vendas.length === 0) {
            divVendas.innerHTML = "<p style='padding:15px; color:#16a34a; font-weight:bold;'>✅ Nenhuma venda pendente de libertação.</p>";
            return;
        }

        var html = `<table style="width:100%; table-layout: fixed; border-collapse: collapse; text-align: left;">
            <tr style="background: #f8f9fb; border-bottom: 2px solid #eee;">
                <th style="padding: 8px 5px; font-size: 0.75rem; width: 40%;">Vendedor (WhatsApp)</th>
                <th style="padding: 8px 5px; font-size: 0.75rem; width: 30%;">Valor a Enviar</th>
                <th style="padding: 8px 5px; font-size: 0.75rem; width: 30%;">Ação</th>
            </tr>`;

        vendas.forEach(function(v) {
            html += `<tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px 5px; font-size: 0.8rem; word-break: break-all;">
                    <strong>${esc(v.whatsapp_vendedor)}</strong><br>
                    <small style="color: #667085; font-size: 0.7rem;">Status: ${v.status.toUpperCase()}</small>
                </td>
                <td style="padding: 8px 5px; font-size: 0.85rem; font-weight: bold; color: #16a34a;">
                    ${Number(v.valor_produto).toFixed(2)} MT
                </td>
                <td style="padding: 8px 5px; text-align: center;">
                    <button onclick="window.libertarPagamento('${v.id}', '${v.produto_id}')" style="background: #16a34a; color: white; border: none; padding: 6px 8px; border-radius: 4px; font-weight: 700; cursor: pointer; font-size: 0.7rem;">✅ Pago ao Vendedor</button>
                </td>
            </tr>`;
        });
        html += `</table>`;
        divVendas.innerHTML = html;

    } catch (e) { divVendas.innerHTML = "<p style='color:red;'>Erro de ligação.</p>"; }
  }

  // ===== FUNÇÃO CORRIGIDA COM VERIFICAÇÃO DE ERRO =====
  window.libertarPagamento = async function(vendaId, produtoId) {
    if (!confirm("Confirmas que já enviaste o dinheiro ao vendedor? Isto conclui a venda.")) return;
    var sessao = await MZ.sessaoValida();
    try {
        var r1 = await fetch(MZ.url + "/rest/v1/vendas_protegidas?id=eq." + vendaId, {
            method: "PATCH", headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token, "Content-Type": "application/json" },
            body: JSON.stringify({ status: "concluido" })
        });

        var r2 = await fetch(MZ.url + "/rest/v1/profissionais?id=eq." + produtoId, {
            method: "PATCH", headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token, "Content-Type": "application/json" },
            body: JSON.stringify({ vendido: true })
        });

        if (r1.ok && r2.ok) {
            alert("✅ Pagamento libertado e anúncio marcado como vendido!");
            carregarVendasProtegidas(); 
            carregarTudo(); 
        } else {
            alert("❌ Erro no banco de dados. Verifica as regras do Supabase.");
        }
    } catch (e) { alert("❌ Erro de ligação."); }
  };

  window.abrirModalSaque = function() {
      var valor = prompt("Quanto queres sacar? (MT)");
      if (!valor || isNaN(valor)) return;
      var numero = prompt("Para que número vais receber? (M-Pesa/e-Mola)");
      if (!numero) return;
      executarSaque(valor, numero);
  };

  async function executarSaque(valor, numero) {
      var sessao = await MZ.sessaoValida();
      try {
          var r = await fetch(MZ.url + "/rest/v1/saques_mzlink", {
              method: "POST",
              headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token, "Content-Type": "application/json" },
              body: JSON.stringify({ valor: Number(valor), metodo: "M-Pesa", numero: numero })
          });
          if (r.ok) { alert("✅ Saque registado!"); } else { alert("❌ Erro ao registar saque."); }
      } catch (e) { alert("❌ Erro de ligação."); }
  }

  function esc(t) { var d = document.createElement("div"); d.textContent = String(t == null ? "" : t); return d.innerHTML; }

  var btnSair = $("#btnSair");
  if (btnSair) { btnSair.addEventListener("click", function (e) { e.preventDefault(); if (typeof MZ.limparSessao === "function") MZ.limparSessao(); localStorage.removeItem("mzlink_sessao"); window.location.href = "index.html"; }); }

})();
