/* ============================================================
   MZLINK · Perfil do Utilizador 👤 (100% Moçambicano)
   ============================================================ */

(async function () {
  'use strict';

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
  var plano = "basico";
  var userMeta = null;

  function cabecalhos() {
    return {
      apikey: MZ.key,
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
      var rUser = await fetch(MZ.url + "/auth/v1/user", { headers: cabecalhos() });
      if (!rUser.ok) throw new Error("sessao");
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
      conteudo.innerHTML = '<div class="loading">Sessão expirada. Faz login de novo.</div>';
      setTimeout(function () { window.location.href = "login.html"; }, 1500);
    }
  }

  function renderizar() {
    var nome = userMeta.nome || userMeta.name || user.email.split("@")[0];
    var telefone = String(userMeta.whatsapp || "").replace(/^258/, "");
    var inicial = nome.charAt(0).toUpperCase();
    var ehPremium = plano === "premium";
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
        '<h2>📝 Dados pessoais</h2>' +
        '<div class="campo">' +
          '<div class="campo-info">' +
            '<label>Nome</label>' +
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
        '<button class="btn-acao sair" onclick="window.MZPerfil.sair()">🚪 Sair da conta</button>' +
      '</div>' +

      '<a href="index.html" class="btn-voltar">← Voltar ao MZLINK</a>';

    conteudo.innerHTML = html;

    // Ligar o upload da foto
    var inputAvatar = document.getElementById("inputAvatar");
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

        // 1. Upload para o Supabase Storage (bucket avatares)
        var rUpload = await fetch(MZ.url + "/storage/v1/object/avatares/" + caminho, {
          method: "POST",
          headers: {
            apikey: MZ.key,
            Authorization: "Bearer " + sessao.access_token,
            "Content-Type": file.type,
            "x-upsert": "true"
          },
          body: file
        });

        if (!rUpload.ok) {
          alert("Erro ao enviar a foto.");
          renderizar();
          return;
        }

        // 2. Link público
        var urlPublica = MZ.url + "/storage/v1/object/public/avatares/" + caminho;

        // 3. Guardar no perfil do utilizador
        var novoMeta = Object.assign({}, userMeta, { avatar_url: urlPublica });
        
        await fetch(MZ.url + "/auth/v1/user", {
          method: "PUT",
          headers: Object.assign({ "Content-Type": "application/json" }, cabecalhos()),
          body: JSON.stringify({ data: novoMeta })
        });

        userMeta = novoMeta;
        renderizar();
        alert("✅ Foto de perfil atualizada!");

      } catch (err) {
        alert("Erro de ligação ao enviar a foto.");
        renderizar();
      }
    });
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

  window.MZPerfil = {
    editarNome: editarNome,
    editarTelefone: editarTelefone,
    sair: sair
  };

  carregar();

})();
