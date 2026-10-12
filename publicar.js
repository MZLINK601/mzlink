/* ============================================================
   MZLINK · Publicar Anúncio
   Básico: 4 fotos + máx 3 anúncios | Premium: 20 fotos + ilimitados
   ============================================================ */

(async function () {
  'use strict';

  var s = await MZ.sessaoValida();
  if (!s) {
    window.location.href = "login.html";
    return;
  }

  var form = document.getElementById("publicarForm");
  var message = document.getElementById("message");
  var lista = document.getElementById("meusAnuncios");
  var botao = form.querySelector("button[type='submit']");
  var usuario = null;
  var planoUser = "basico";
  var limiteFotos = 4;
  var limiteAnuncios = 3;
  var totalMeusAnuncios = 0;
  var ficheiros = [];

  var inputFotos = document.getElementById("inputFotos");
  var btnAddFoto = document.getElementById("btnAdicionarFoto");
  var preview = document.getElementById("previewFotos");
  var contador = document.getElementById("contadorFotos");
  var fotosInfo = document.getElementById("fotosInfo");
  var fotosVazio = document.getElementById("fotosVazio");
  var fotosAviso = document.getElementById("fotosAviso");
  var limiteTexto = document.getElementById("limiteTexto");

  function aviso(texto, erro) {
    message.textContent = texto;
    message.className = erro ? "error" : "";
  }

  function cabecalhos(extra) {
    var h = {
      apikey: MZ.key,
      Authorization: "Bearer " + s.access_token
    };
    for (var k in extra) h[k] = extra[k];
    return h;
  }

  function sessaoExpirada() {
    aviso("A sua sessão expirou. Entre de novo.", true);
    setTimeout(function () {
      window.location.href = "login.html";
    }, 1500);
  }

  /* ---------- Aviso de limite de anúncios ---------- */
  function bloquearFormulario() {
    // Esconde o formulário e mostra aviso premium
    if (form) form.style.display = "none";

    var aviso = document.createElement("div");
    aviso.className = "limite-anuncios-aviso";
    aviso.innerHTML =
      '<div class="limite-icone">🔒</div>' +
      '<h3>Atingiste o limite do plano Básico</h3>' +
      '<p>Já tens <strong>' + totalMeusAnuncios + ' anúncios ativos</strong>.<br>' +
      'O plano Básico permite até <strong>3 anúncios</strong>.</p>' +
      '<p class="limite-destaque">👑 Torna-te <strong>Premium</strong> para publicar <strong>anúncios ilimitados</strong>!</p>' +
      '<a href="premium.html" class="limite-btn">Quero ser Premium →</a>';

    if (form && form.parentNode) {
      form.parentNode.insertBefore(aviso, form);
    }
  }

  /* ---------- Carregar user + plano + contagem ---------- */
  async function carregarUsuario() {
    var r = await fetch(MZ.url + "/auth/v1/user", { headers: cabecalhos({}) });
    if (!r.ok) throw new Error("sessao");
    usuario = await r.json();

    var meta = usuario.user_metadata || {};
    document.getElementById("nome").value = meta.nome || "";
    document.getElementById("whatsapp").value = String(meta.whatsapp || "").replace(/^258/, "");

    // Buscar plano E contar anúncios numa só chamada
    var r2 = await fetch(
      MZ.url + "/rest/v1/profissionais?select=id,plano&user_id=eq." +
      encodeURIComponent(usuario.id),
      { headers: cabecalhos({}) }
    );

    if (r2.ok) {
      var dados = await r2.json();
      totalMeusAnuncios = dados.length;

      // Plano (pega do primeiro registo, ou 'basico' se vazio)
      planoUser = (dados[0] && dados[0].plano) || "basico";
    }

    limiteFotos = planoUser === "premium" ? 20 : 4;
    limiteAnuncios = planoUser === "premium" ? Infinity : 3;

    // Aplicar classe no body
    document.body.classList.remove("plano-basico", "plano-premium");
    document.body.classList.add(planoUser === "premium" ? "plano-premium" : "plano-basico");

    // Atualizar UI das fotos
    if (planoUser === "premium") {
      fotosInfo.className = "fotos-info premium";
      fotosInfo.innerHTML = "⭐ Plano <strong>Premium</strong>: até 20 fotos por anúncio.";
      if (limiteTexto) limiteTexto.textContent = "20 fotos";
    } else {
      fotosInfo.className = "fotos-info";
      fotosInfo.innerHTML =
        '🆓 Plano <strong>Básico</strong>: até 4 fotos. ' +
        '<a href="premium.html">Tornar-se Premium</a>';
      if (limiteTexto) limiteTexto.textContent = "4 fotos";
    }

    atualizarContador();

    // ⚠️ Verificar limite de anúncios
    if (planoUser === "basico" && totalMeusAnuncios >= limiteAnuncios) {
      bloquearFormulario();
    }
  }

  /* ---------- Contador + Estado ---------- */
  function atualizarContador() {
    contador.textContent = ficheiros.length + "/" + limiteFotos;

    var atingiuLimite = ficheiros.length >= limiteFotos;

    if (atingiuLimite) {
      contador.classList.add("limite");
      btnAddFoto.disabled = true;
      btnAddFoto.textContent = "Limite atingido";
      if (fotosAviso) fotosAviso.classList.add("visivel");
    } else {
      contador.classList.remove("limite");
      btnAddFoto.disabled = false;
      btnAddFoto.textContent = "Adicionar foto (" +
        (limiteFotos - ficheiros.length) + " restantes)";
      if (fotosAviso) fotosAviso.classList.remove("visivel");
    }

    if (fotosVazio) {
      if (ficheiros.length === 0) {
        fotosVazio.classList.remove("oculto");
      } else {
        fotosVazio.classList.add("oculto");
      }
    }
  }

  /* ---------- Preview ---------- */
  function renderPreview() {
    preview.innerHTML = "";
    ficheiros.forEach(function (item, i) {
      var div = document.createElement("div");
      div.className = "foto-item";

      var img = document.createElement("img");
      img.src = item.url;

      if (i === 0) {
        var selo = document.createElement("span");
        selo.className = "principal";
        selo.textContent = "PRINCIPAL";
        div.appendChild(selo);
      }

      var num = document.createElement("span");
      num.className = "numero";
      num.textContent = (i + 1) + "/" + limiteFotos;

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "remover";
      btn.textContent = "×";
      btn.onclick = function () {
        URL.revokeObjectURL(ficheiros[i].url);
        ficheiros.splice(i, 1);
        renderPreview();
        atualizarContador();
      };

      div.appendChild(img);
      div.appendChild(num);
      div.appendChild(btn);
      preview.appendChild(div);
    });
  }

  /* ---------- Adicionar fotos ---------- */
  btnAddFoto.addEventListener("click", function () {
    inputFotos.click();
  });

  inputFotos.addEventListener("change", function (e) {
    var novos = Array.prototype.slice.call(e.target.files);
    if (!novos.length) return;

    var espaco = limiteFotos - ficheiros.length;
    if (espaco <= 0) {
      alert("Limite atingido! Máximo: " + limiteFotos + " fotos.");
      inputFotos.value = "";
      return;
    }

    var aceitos = novos.slice(0, espaco);
    var ignorados = novos.length - aceitos.length;

    aceitos.forEach(function (f) {
      if (!f.type.startsWith("image/")) return;
      if (f.size > 5 * 1024 * 1024) {
        alert("A foto '" + f.name + "' é maior que 5MB. Ignorada.");
        return;
      }
      ficheiros.push({ file: f, url: URL.createObjectURL(f) });
    });

    if (ignorados > 0) {
      if (planoUser === "basico") {
        alert(
          "Limite do plano Básico: 4 fotos.\n\n" +
          "👑 Torna-te Premium para publicar até 20 fotos!"
        );
      } else {
        alert("Foram ignoradas " + ignorados + " fotos (limite de " + limiteFotos + ").");
      }
    }

    inputFotos.value = "";
    renderPreview();
    atualizarContador();
  });

  /* ---------- Listar os meus anúncios ---------- */
  async function listarMeus() {
    lista.textContent = "";
    var r = await fetch(
      MZ.url + "/rest/v1/profissionais?select=id,nome,tipo,local,categoria,fotos&user_id=eq." +
        encodeURIComponent(usuario.id) + "&order=criado_em.desc",
      { headers: cabecalhos({}) }
    );

    if (!r.ok) {
      lista.textContent = "Não foi possível carregar os seus anúncios.";
      return;
    }

    var itens = await r.json();
    totalMeusAnuncios = itens.length;

    if (itens.length === 0) {
      var vazio = document.createElement("p");
      vazio.textContent = "Ainda não publicou nenhum anúncio.";
      lista.appendChild(vazio);
      return;
    }

    itens.forEach(function (item) {
      var linha = document.createElement("div");
      linha.className = "meu-item";

      var info = document.createElement("div");
      var titulo = document.createElement("strong");
      titulo.textContent = item.tipo + " - " + item.nome;
      var detalhe = document.createElement("small");
      var nFotos = (item.fotos && item.fotos.length) || 0;
      detalhe.textContent = item.local + " | " + item.categoria +
        " | 📸 " + nFotos + " foto" + (nFotos === 1 ? "" : "s");
      info.appendChild(titulo);
      info.appendChild(detalhe);

      var apagar = document.createElement("button");
      apagar.type = "button";
      apagar.textContent = "Apagar";
      apagar.addEventListener("click", function () {
        apagarAnuncio(item.id);
      });

      linha.appendChild(info);
      linha.appendChild(apagar);
      lista.appendChild(linha);
    });
  }

  /* ---------- Apagar anúncio ---------- */
  async function apagarAnuncio(id) {
    if (!confirm("Apagar este anúncio?")) return;

    try {
      var r = await fetch(MZ.url + "/rest/v1/profissionais?id=eq." + encodeURIComponent(id), {
        method: "DELETE",
        headers: cabecalhos({})
      });
      if (r.status === 401) { sessaoExpirada(); return; }
      if (!r.ok) { aviso("Não foi possível apagar.", true); return; }
      aviso("Anúncio apagado.", false);
      await listarMeus();
      window.location.reload();
    } catch (e) {
      aviso("Sem ligação à internet.", true);
    }
  }

  /* ---------- Submeter ---------- */
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    // ⚠️ Verificar limite antes de submeter
    if (planoUser === "basico" && totalMeusAnuncios >= limiteAnuncios) {
      alert(
        "Limite do plano Básico: 3 anúncios.\n\n" +
        "👑 Torna-te Premium para publicar anúncios ilimitados!"
      );
      window.location.href = "premium.html";
      return;
    }

    var nome = document.getElementById("nome").value.trim();
    var tipo = document.getElementById("tipo").value.trim();
    var local = document.getElementById("local").value.trim();
    var categoria = document.getElementById("categoria").value;
    var telefone = document.getElementById("whatsapp").value.replace(/\s/g, "");

    if (nome.length < 2 || tipo.length < 2 || local.length < 2) {
      aviso("Preencha nome, o que oferece e local (mínimo 2 letras).", true);
      return;
    }
    if (nome.length > 60 || tipo.length > 60 || local.length > 60) {
      aviso("Cada campo pode ter no máximo 60 caracteres.", true);
      return;
    }
    if (!categoria) {
      aviso("Escolha uma categoria.", true);
      return;
    }
    if (!/^(8[2-7])\d{7}$/.test(telefone)) {
      aviso("Digite um número válido de Moçambique (ex: 841234567).", true);
      return;
    }

    botao.disabled = true;
    aviso("A publicar...", false);

    try {
      var r = await fetch(MZ.url + "/rest/v1/profissionais", {
        method: "POST",
        headers: cabecalhos({
          "Content-Type": "application/json",
          Prefer: "return=representation"
        }),
        body: JSON.stringify({
          nome: nome,
          tipo: tipo,
          local: local,
          categoria: categoria,
          whatsapp: "258" + telefone,
          user_id: usuario.id
        })
      });

      if (r.status === 401) { sessaoExpirada(); botao.disabled = false; return; }
      if (!r.ok) {
        aviso("Não foi possível publicar. Tente de novo.", true);
        botao.disabled = false;
        return;
      }

      var criado = await r.json();
      var anuncioId = criado && criado[0] && criado[0].id;

      // Upload das fotos
      var urls = [];
      if (anuncioId && ficheiros.length) {
        aviso("A enviar " + ficheiros.length + " foto(s)...", false);

        for (var i = 0; i < ficheiros.length; i++) {
          var f = ficheiros[i].file;
          var ext = (f.name.split(".").pop() || "jpg").toLowerCase();
          var caminho = usuario.id + "/" + anuncioId + "/" + i + "." + ext;

          try {
            var rUpload = await fetch(
              MZ.url + "/storage/v1/object/anuncios-fotos/" + caminho,
              {
                method: "POST",
                headers: {
                  apikey: MZ.key,
                  Authorization: "Bearer " + s.access_token,
                  "Content-Type": f.type || "image/jpeg",
                  "x-upsert": "true"
                },
                body: f
              }
            );

            if (rUpload.ok) {
              urls.push(MZ.url + "/storage/v1/object/public/anuncios-fotos/" + caminho);
            }
          } catch (errFoto) {
            console.warn("Falha ao enviar foto " + i, errFoto);
          }
        }

        if (urls.length) {
          await fetch(MZ.url + "/rest/v1/profissionais?id=eq." + anuncioId, {
            method: "PATCH",
            headers: cabecalhos({ "Content-Type": "application/json" }),
            body: JSON.stringify({ fotos: urls })
          });
        }
      }

      aviso("✅ Anúncio publicado com " + urls.length + " foto(s)!", false);

      document.getElementById("tipo").value = "";
      document.getElementById("local").value = "";
      document.getElementById("categoria").value = "";

      ficheiros.forEach(function (item) { URL.revokeObjectURL(item.url); });
      ficheiros = [];
      renderPreview();
      atualizarContador();

      await listarMeus();

      // Se acabou de atingir o limite, recarrega para bloquear
      if (planoUser === "basico" && totalMeusAnuncios >= limiteAnuncios) {
        setTimeout(function () { window.location.reload(); }, 1500);
      }
    } catch (err) {
      aviso("Sem ligação à internet. Tente de novo.", true);
    }

    botao.disabled = false;
  });

  /* ---------- Iniciar ---------- */
  try {
    await carregarUsuario();
    await listarMeus();
  } catch (e) {
    sessaoExpirada();
  }
})();
