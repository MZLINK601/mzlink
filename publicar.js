(async function () {
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

  async function carregarUsuario() {
    var r = await fetch(MZ.url + "/auth/v1/user", { headers: cabecalhos({}) });
    if (!r.ok) throw new Error("sessao");
    usuario = await r.json();

    var meta = usuario.user_metadata || {};
    document.getElementById("nome").value = meta.nome || "";
    document.getElementById("whatsapp").value = String(meta.whatsapp || "").replace(/^258/, "");
  }

  async function listarMeus() {
    lista.textContent = "";

    var r = await fetch(
      MZ.url + "/rest/v1/profissionais?select=id,nome,tipo,local,categoria&user_id=eq." +
        encodeURIComponent(usuario.id) + "&order=criado_em.desc",
      { headers: cabecalhos({}) }
    );

    if (!r.ok) {
      lista.textContent = "Não foi possível carregar os seus anúncios.";
      return;
    }

    var itens = await r.json();

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
      detalhe.textContent = item.local + " | " + item.categoria;
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

  async function apagarAnuncio(id) {
    if (!confirm("Apagar este anúncio?")) return;

    try {
      var r = await fetch(MZ.url + "/rest/v1/profissionais?id=eq." + encodeURIComponent(id), {
        method: "DELETE",
        headers: cabecalhos({})
      });

      if (r.status === 401) {
        sessaoExpirada();
        return;
      }

      if (!r.ok) {
        aviso("Não foi possível apagar o anúncio.", true);
        return;
      }

      aviso("Anúncio apagado.", false);
      await listarMeus();
    } catch (e) {
      aviso("Sem ligação à internet. Tente de novo.", true);
    }
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

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
          Prefer: "return=minimal"
        }),
        body: JSON.stringify({
          nome: nome,
          tipo: tipo,
          local: local,
          categoria: categoria,
          whatsapp: "258" + telefone
        })
      });

      if (r.status === 401) {
        sessaoExpirada();
        return;
      }

      if (!r.ok) {
        aviso("Não foi possível publicar. Verifique os dados e tente de novo.", true);
        botao.disabled = false;
        return;
      }

      aviso("Anúncio publicado! Já aparece na pesquisa.", false);
      document.getElementById("tipo").value = "";
      document.getElementById("local").value = "";
      document.getElementById("categoria").value = "";
      await listarMeus();
    } catch (err) {
      aviso("Sem ligação à internet. Tente de novo.", true);
    }

    botao.disabled = false;
  });

  try {
    await carregarUsuario();
    await listarMeus();
  } catch (e) {
    sessaoExpirada();
  }
})();
