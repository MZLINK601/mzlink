/* ============================================================
   MZLINK · Perfil do Utilizador 👤 (Integrado c/ Marketplace)
   ============================================================ */

(async function () {
  'use strict';

  // Links diretos do teu Supabase para garantir que nunca falha
  const SUPABASE_URL = "https://uuswtafwkgrzmzbkgnjq.supabase.co";
  const SUPABASE_KEY = "sb_publishable_vd6DmOxZuXD0cVhIJMtbfQ_-8cWtU7P";

  var conteudo = document.getElementById("conteudo");
  var CHAVE = "mzlink_sessao";

  function lerSessao() {
    try { return JSON.parse(localStorage.getItem(CHAVE)); } catch (e) { return null; }
  }

  var sessao = lerSessao();

  if (!sessao || !sessao.access_token) {
    window.location.href = "login.html?next=perfil.html";
    return;
  }

  var user = null;
  var userMeta = null;
  var perfilDB = null; 

  function cabecalhos() {
    return {
      apikey: SUPABASE_KEY,
      Authorization: "Bearer " + sessao.access_token
    };
  }

  function limpar(t) {
    var d = document.createElement("div");
    d.textContent = String(t == null ? "" : t);
    return d.innerHTML;
  }

  async function carregar() {
    try {
      // 1. Dados de Autenticação
      var rUser = await fetch(SUPABASE_URL + "/auth/v1/user", { headers: cabecalhos() });
      
      // Se o token expirou, manda para o login
      if (!rUser.ok) {
          localStorage.removeItem(CHAVE);
          window.location.href = "login.html";
          return;
      }
      
      user = await rUser.json();
      userMeta = user.user_metadata || {};

      // 2. Dados do Marketplace (tabela profissionais)
      var rPerfil = await fetch(
        SUPABASE_URL + "/rest/v1/profissionais?user_id=eq." + encodeURIComponent(user.id) + "&limit=1",
        { headers: cabecalhos() }
      );

      if (rPerfil.ok) {
        var lista = await rPerfil.json();
        perfilDB = (lista && lista.length > 0) ? lista[0] : null;
      }

      // Se o perfil no marketplace ainda não existe, mostra o formulário de boas-vindas
      if (!perfilDB) {
        renderizarOnboarding();
      } else {
        renderizar();
      }

    } catch (e) {
      conteudo.innerHTML = '<div class="loading">Erro de ligação. Verifica a tua internet e tenta novamente.</div>';
    }
  }

  // ==========================================
  // ECRÃ DE BOAS-VINDAS (CRIAR LOJA)
  // ==========================================
  function renderizarOnboarding() {
    var nomeAuth = userMeta.nome || userMeta.name || user.email.split("@")[0];
    var telAuth = String(userMeta.whatsapp || "").replace(/^258/, "");

    conteudo.innerHTML = `
      <div class="hero" style="padding-top: 10px;">
        <h1 style="color: #1E40AF; font-size: 1.6rem;">👋 Bem-vindo ao MZLINK!</h1>
        <p style="color: #667085; margin-bottom: 20px; font-size: 0.95rem;">A tua conta foi criada. Para começares a vender e a aparecer no site, preenche os dados da tua loja abaixo.</p>
      </div>

      <div class="card" style="border-left-color: #1E40AF;">
        <h2>🏪 Criar Perfil de Vendedor</h2>
        <form id="formOnboarding">
          <div class="campo">
            <div class="campo-info">
              <label>Nome da Loja / Negócio</label>
              <input type="text" id="novoNome" required value="${limpar(nomeAuth)}" placeholder="Ex: João Telemóveis" style="width:100%; border:none; border-bottom:1px solid #ccc; font-size:1rem; font-weight:700; padding:5px 0; outline:none;">
            </div>
          </div>
          <div class="campo">
            <div class="campo-info">
              <label>WhatsApp (9 dígitos)</label>
              <input type="tel" id="novoWhats" required value="${limpar(telAuth)}" placeholder="Ex: 841234567" style="width:100%; border:none; border-bottom:1px solid #ccc; font-size:1rem; font-weight:700; padding:5px 0; outline:none;">
            </div>
          </div>
          <div class="campo">
            <div class="campo-info">
              <label>Província</label>
              <select id="novoLocal" required style="width:100%; border:none; border-bottom:1px solid #ccc; font-size:1rem; font-weight:700; padding:5px 0; outline:none; background:transparent;">
                <option value="">Escolhe a tua província</option>
                <option value="Maputo">Maputo</option>
                <option value="Gaza">Gaza</option>
                <option value="Inhambane">Inhambane</option>
                <option value="Sofala">Sofala</option>
                <option value="Manica">Manica</option>
                <option value="Tete">Tete</option>
                <option value="Zambézia">Zambézia</option>
                <option value="Nampula">Nampula</option>
                <option value="Niassa">Niassa</option>
                <option value="Cabo Delgado">Cabo Delgado</option>
              </select>
            </div>
          </div>
          <button type="submit" id="btnCriarLoja" class="btn-acao principal" style="margin-top: 20px;">Guardar e Começar a Vender</button>
          <p id="msgOnboarding" style="text-align:center; font-weight:bold; margin-top:10px; color:red; font-size:0.85rem;"></p>
        </form>
      </div>
    `;

    document.getElementById("formOnboarding").addEventListener("submit", async function (e) {
      e.preventDefault();
      var btn = document.getElementById("btnCriarLoja");
      var msg = document.getElementById("msgOnboarding");
      
      var nome = document.getElementById("novoNome").value.trim();
      var whats = document.getElementById("novoWhats").value.replace(/\s/g, "");
      var local = document.getElementById("novoLocal").value;

      if (!/^(8[2-7])\d{7}$/.test(whats)) {
        msg.textContent = "Número de WhatsApp inválido (ex: 841234567).";
        return;
      }

      btn.textContent = "A criar loja...";
      btn.disabled = true;

      var dadosLoja = {
        user_id: user.id,
        nome: nome,
        whatsapp: "258" + whats,
        local: local,
        plano: "basico",
        categoria: "servicos"
      };

      try {
        var res = await fetch(SUPABASE_URL + "/rest/v1/profissionais", {
          method: "POST",
          headers: Object.assign({ "Content-Type": "application/json", "Prefer": "return=representation" }, cabecalhos()),
          body: JSON.stringify(dadosLoja)
        });

        if (res.ok) {
          msg.style.color = "green";
          msg.textContent = "Loja criada com sucesso! A carregar o teu perfil...";
          
          await fetch(SUPABASE_URL + "/auth/v1/user", {
            method: "PUT",
            headers: Object.assign({ "Content-Type": "application/json" }, cabecalhos()),
            body: JSON.stringify({ data: { nome: nome, whatsapp: "258" + whats } })
          });

          setTimeout(function () { carregar(); }, 1000);
        } else {
          var erro = await res.json();
          msg.textContent = "Erro: " + (erro.message || "Tenta novamente.");
          btn.textContent = "Guardar e Começar a Vender";
          btn.disabled = false;
        }
      } catch (err) {
        msg.textContent = "Erro de ligação.";
        btn.textContent = "Guardar e Começar a Vender";
        btn.disabled = false;
      }
    });
  }

  // ==========================================
  // ECRÃ NORMAL DO PERFIL
  // ==========================================
  function renderizar() {
    var nome = perfilDB.nome;
    var telefone = String(perfilDB.whatsapp).replace(/^258/, "");
    var inicial = nome.charAt(0).toUpperCase();
    var ehPremium = perfilDB.plano === "premium";
    var urlAvatar = userMeta.avatar_url;

    var html =
      '<div class="hero">' +
        '<div class="avatar-grande ' + (ehPremium ? 'premium' : '') + '" id="avatarContainer" onclick="document.getElementById(\'inputAvatar\').click()">' +
          '<span id="avatarLetra" style="' + (urlAvatar ? 'display:none;' : '') + '">' + limpar(inicial) + '</span>' +
          '<img id="avatarImagem" src="' + (urlAvatar || '') + '" style="' + (urlAvatar ? 'display:block;' : 'display:none;') + '">' +
          '<div class="icone-camara">📷</div>' +
        '</div>' +
        '<input type="file" id="inputAvatar" accept="image/*" style="display: none;">' +
        '<div class="badge-moz">🇲🇿 Orgulho Nacional</div>' +
        '<h1>' + limpar(nome) + '</h1>' +
        '<p class="email">' + limpar(user.email) + '</p>' +
        '<span class="plano-badge ' + (ehPremium ? 'premium' : 'basico') + '">' +
          (ehPremium ? '⭐ PREMIUM' : '🆓 Básico') +
        '</span>' +
      '</div>' +

      '<div class="card">' +
        '<h2>📝 Dados da Loja</h2>' +
        '<div class="campo">' +
          '<div class="campo-info">' +
            '<label>Nome do Negócio</label>' +
            '<div class="valor" id="nomeValor">' + limpar(nome) + '</div>' +
          '</div>' +
          '<button class="btn-editar" onclick="window.MZPerfil.editarNome()">✏️ Editar</button>' +
        '</div>' +
        '<div class="campo">' +
          '<div class="campo-info">' +
            '<label>WhatsApp</label>' +
            '<div class="valor" id="telValor">' + (telefone ? '258' + limpar(telefone) : '—') + '</div>' +
          '</div>' +
          '<button class="btn-editar" onclick="window.MZPerfil.editarTelefone()">✏️ Editar</button>' +
        '</div>' +
        '<div class="campo">' +
          '<div class="campo-info">' +
            '<label>Localização</label>' +
            '<div class="valor">📍 ' + limpar(perfilDB.local) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="campo">' +
          '<div class="campo-info">' +
            '<label>Email</label>' +
            '<div class="valor bloqueado">' + limpar(user.email) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="aviso" id="avisoPerfil"></div>' +
      '</div>' +

      '<div class="card">' +
        '<h2>📢 Os meus anúncios</h2>' +
        '<a href="publicar.html" class="btn-acao principal">📢 Publicar novo anúncio</a>' +
        '<a href="index.html" class="btn-voltar" style="margin-top:10px; border-color:#ccc;">Ver anúncios no site</a>' +
      '</div>' +

      '<div class="card">' +
        '<h2>🔐 Segurança</h2>' +
        '<button class="btn-acao sair" onclick="window.MZPerfil.sair()">🚪 Sair da conta</button>' +
      '</div>';

    conteudo.innerHTML = html;

    var inputAvatar = document.getElementById("inputAvatar");
    if (inputAvatar) {
      inputAvatar.addEventListener("change", async function (e) {
        var file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
          alert("A foto é muito grande. Escolhe uma menor que 2MB.");
          return;
        }

        try {
          document.getElementById("avatarLetra").textContent = "...";
          var ext = file.name.split(".").pop() || "jpg";
          var caminho = user.id + "/avatar." + ext;

          var rUpload = await fetch(SUPABASE_URL + "/storage/v1/object/avatares/" + caminho, {
            method: "POST",
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: "Bearer " + sessao.access_token,
              "Content-Type": file.type,
              "x-upsert": "true"
            },
            body: file
          });

          if (!rUpload.ok) {
            alert("Erro ao enviar a foto.");
            return;
          }

          var urlPublica = SUPABASE_URL + "/storage/v1/object/public/avatares/" + caminho;
          var novoMeta = Object.assign({}, userMeta, { avatar_url: urlPublica });
          
          await fetch(SUPABASE_URL + "/auth/v1/user", {
            method: "PUT",
            headers: Object.assign({ "Content-Type": "application/json" }, cabecalhos()),
            body: JSON.stringify({ data: novoMeta })
          });

          userMeta = novoMeta;
          renderizar();
          alert("✅ Foto de perfil atualizada!");
        } catch (err) {
          alert("Erro de ligação ao enviar a foto.");
        }
      });
    }
  }

  function mostrarAviso(texto, tipo) {
    var el = document.getElementById("avisoPerfil");
    if (!el) return;
    el.textContent = texto;
    el.className = "aviso visivel " + (tipo === "ok" ? "ok" : "erro");
    setTimeout(function () { el.classList.remove("visivel"); }, 3500);
  }

  function editarNome() {
    var atual = perfilDB.nome;
    var novo = prompt("✏️ Editar nome da loja:", atual);
    if (novo === null) return;
    novo = novo.trim();
    if (novo.length < 2) { mostrarAviso("Nome muito curto.", "erro"); return; }
    guardar({ nome: novo });
  }

  function editarTelefone() {
    var atual = String(perfilDB.whatsapp).replace(/^258/, "");
    var novo = prompt("✏️ Editar WhatsApp (ex: 841234567):", atual);
    if (novo === null) return;
    novo = novo.replace(/\s/g, "");
    if (!/^(8[2-7])\d{7}$/.test(novo)) { mostrarAviso("Número inválido.", "erro"); return; }
    guardar({ whatsapp: "258" + novo });
  }

  async function guardar(dados) {
    try {
      var resDB = await fetch(SUPABASE_URL + "/rest/v1/profissionais?user_id=eq." + user.id, {
        method: "PATCH",
        headers: Object.assign({ "Content-Type": "application/json" }, cabecalhos()),
        body: JSON.stringify(dados)
      });

      if (!resDB.ok) throw new Error("Erro DB");

      var novoMeta = Object.assign({}, userMeta, dados);
      await fetch(SUPABASE_URL + "/auth/v1/user", {
        method: "PUT",
        headers: Object.assign({ "Content-Type": "application/json" }, cabecalhos()),
        body: JSON.stringify({ data: novoMeta })
      });

      userMeta = novoMeta;
      Object.assign(perfilDB, dados);

      try {
        var s = JSON.parse(localStorage.getItem(CHAVE)) || {};
        if (dados.nome) s.name = dados.nome;
        localStorage.setItem(CHAVE, JSON.stringify(s));
      } catch (e) {}

      renderizar();
      mostrarAviso("✅ Guardado com sucesso!", "ok");
    } catch (e) {
      mostrarAviso("Erro ao guardar. Tenta de novo.", "erro");
    }
  }

  function sair() {
    if (!confirm("Queres sair da conta?")) return;
    try { localStorage.removeItem(CHAVE); } catch (e) {}
    window.location.href = "index.html";
  }

  window.MZPerfil = { editarNome: editarNome, editarTelefone: editarTelefone, sair: sair };

  carregar();
})();
