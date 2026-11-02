/* ============================================================
   MZLINK · Publicar Anúncio (Com Compressão e Partilha)
   ============================================================ */

(async function () {
  'use strict';

  var s = await MZ.sessaoValida();
  if (!s) { window.location.href = "login.html"; return; }

  var form = document.getElementById("publicarForm");
  var message = document.getElementById("message");
  var lista = document.getElementById("meusAnuncios");
  var botao = form.querySelector("button[type='submit']");
  var btnPartilharWa = document.getElementById("btnPartilharWa");
  
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
  var precoCombinar = document.getElementById("precoCombinar");
  var inputPreco = document.getElementById("preco");

  // Lógica do Preço a Combinar
  precoCombinar.addEventListener("change", function() {
      if(this.checked) {
          inputPreco.value = "";
          inputPreco.disabled = true;
          inputPreco.placeholder = "A combinar";
      } else {
          inputPreco.disabled = false;
          inputPreco.placeholder = "Ex: 1500";
      }
  });

  function aviso(texto, erro) {
    message.textContent = texto;
    message.className = erro ? "error" : "";
  }

  function cabecalhos(extra) {
    var h = { apikey: MZ.key, Authorization: "Bearer " + s.access_token };
    for (var k in extra) h[k] = extra[k];
    return h;
  }

  // ===== COMPRESSÃO DE IMAGEM NO TELEMÓVEL =====
  async function comprimirImagem(file) {
      return new Promise((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
              const img = new Image();
              img.src = event.target.result;
              img.onload = () => {
                  const canvas = document.createElement("canvas");
                  const MAX_WIDTH = 1000; // Largura máxima
                  let scale = MAX_WIDTH / img.width;
                  if (scale > 1) scale = 1;
                  
                  canvas.width = img.width * scale;
                  canvas.height = img.height * scale;
                  
                  const ctx = canvas.getContext("2d");
                  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                  
                  canvas.toBlob((blob) => {
                      const newFile = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
                      resolve(newFile);
                  }, 'image/jpeg', 0.7); // 70% de qualidade (perfeito para web)
              };
          };
      });
  }

  /* ---------- Carregar user + plano ---------- */
  async function carregarUsuario() {
    var r = await fetch(MZ.url + "/auth/v1/user", { headers: cabecalhos({}) });
    if (!r.ok) throw new Error("sessao");
    usuario = await r.json();

    var meta = usuario.user_metadata || {};
    document.getElementById("nome").value = meta.nome || "";
    document.getElementById("whatsapp").value = String(meta.whatsapp || "").replace(/^258/, "");

    var r2 = await fetch(MZ.url + "/rest/v1/profissionais?select=id,plano&user_id=eq." + encodeURIComponent(usuario.id), { headers: cabecalhos({}) });

    if (r2.ok) {
      var dados = await r2.json();
      totalMeusAnuncios = dados.length;
      planoUser = (dados[0] && dados[0].plano) || "basico";
    }

    limiteFotos = planoUser === "premium" ? 20 : 4;
    limiteAnuncios = planoUser === "premium" ? Infinity : 3;
    
    // Atualiza visual do limite
    if (limiteTexto) limiteTexto.textContent = limiteFotos + " fotos";
    if (planoUser === "premium") {
        fotosInfo.innerHTML = "⭐ Plano <strong>Premium</strong>: até 20 fotos.";
    }
    atualizarContador();
  }

  /* ---------- Preview das Fotos ---------- */
  function atualizarContador() {
    contador.textContent = ficheiros.length + "/" + limiteFotos;
    
    if (ficheiros.length >= limiteFotos) {
      btnAddFoto.disabled = true;
      btnAddFoto.textContent = "Limite atingido";
      fotosAviso.style.display = "block"; // Mostra o aviso
    } else {
      btnAddFoto.disabled = false;
      btnAddFoto.textContent = "Adicionar foto (" + (limiteFotos - ficheiros.length) + " restantes)";
      fotosAviso.style.display = "none"; // Esconde o aviso
    }
    
    if (ficheiros.length > 0) {
        fotosVazio.style.display = "none";
    } else {
        fotosVazio.style.display = "block";
    }
  }

  function renderPreview() {
    preview.innerHTML = "";
    ficheiros.forEach(function (item, i) {
      var div = document.createElement("div");
      div.className = "foto-item";
      div.innerHTML = `
        <img src="${item.url}">
        ${i === 0 ? '<span class="principal">PRINCIPAL</span>' : ''}
        <span class="numero">${(i + 1)}/${limiteFotos}</span>
        <button type="button" class="remover" onclick="window.removerFotoPublicar(${i})">×</button>
      `;
      preview.appendChild(div);
    });
  }

  window.removerFotoPublicar = function(i) {
      URL.revokeObjectURL(ficheiros[i].url);
      ficheiros.splice(i, 1);
      renderPreview();
      atualizarContador();
  };

  btnAddFoto.addEventListener("click", function () { inputFotos.click(); });

  inputFotos.addEventListener("change", function (e) {
    var novos = Array.prototype.slice.call(e.target.files);
    if (!novos.length) return;

    var espaco = limiteFotos - ficheiros.length;
    if (espaco <= 0) { alert("Limite atingido!"); return; }

    var aceitos = novos.slice(0, espaco);
    aceitos.forEach(function (f) {
      if (f.type.startsWith("image/")) {
        ficheiros.push({ file: f, url: URL.createObjectURL(f) });
      }
    });
    inputFotos.value = "";
    renderPreview();
    atualizarContador();
  });

  /* ---------- Listar os meus anúncios ---------- */
  async function listarMeus() {
    lista.textContent = "";
    var r = await fetch(MZ.url + "/rest/v1/profissionais?select=id,nome,tipo,categoria,preco,fotos&user_id=eq." + encodeURIComponent(usuario.id) + "&categoria=neq.loja&order=criado_em.desc", { headers: cabecalhos({}) });

    if (!r.ok) { lista.textContent = "Erro ao carregar."; return; }

    var itens = await r.json();
    if (itens.length === 0) { lista.innerHTML = "<p>Ainda não tens anúncios.</p>"; return; }

    itens.forEach(function (item) {
      var linha = document.createElement("div");
      linha.className = "meu-item";
      var nFotos = (item.fotos && item.fotos.length) || 0;
      var precoTxt = item.preco ? "💰 " + item.preco + " MT" : "A combinar";
      
      linha.innerHTML = `
        <div>
            <strong>${item.tipo}</strong><br>
            <small style="color:#667085;">${precoTxt} | 📸 ${nFotos}</small>
        </div>
        <button type="button" onclick="apagarAnuncio('${item.id}')" style="background:#fee2e2; color:#E31937; border:none; padding:5px 10px; border-radius:6px; font-weight:bold; cursor:pointer;">Apagar</button>
      `;
      lista.appendChild(linha);
    });
  }

  window.apagarAnuncio = async function(id) {
      if (!confirm("Apagar este anúncio?")) return;
      await fetch(MZ.url + "/rest/v1/profissionais?id=eq." + id, { method: "DELETE", headers: cabecalhos({}) });
      listarMeus();
  };

  /* ---------- Submeter ---------- */
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    
    var nome = document.getElementById("nome").value.trim();
    var tipo = document.getElementById("tipo").value.trim();
    var descricao = document.getElementById("descricao").value.trim();
    var estado = document.getElementById("estado").value;
    var local = document.getElementById("local").value.trim();
    var categoria = document.getElementById("categoria").value;
    var telefone = document.getElementById("whatsapp").value.replace(/\s/g, "");
    
    var precoFinal = null;
    if (!precoCombinar.checked) {
        precoFinal = inputPreco.value ? Number(inputPreco.value) : null;
    }

    if (!nome || !tipo || !local || !categoria || !telefone || !descricao) {
      aviso("Preenche todos os campos obrigatórios.", true);
      return;
    }

    botao.disabled = true;
    aviso("A publicar anúncio...", false);
    btnPartilharWa.style.display = "none"; 

    try {
      var r = await fetch(MZ.url + "/rest/v1/profissionais", {
        method: "POST",
        headers: cabecalhos({ "Content-Type": "application/json", Prefer: "return=representation" }),
        body: JSON.stringify({
          nome: nome,
          tipo: tipo,
          descricao: descricao,
          estado: estado,
          local: local,
          categoria: categoria,
          preco: precoFinal,
          whatsapp: "258" + telefone,
          user_id: usuario.id,
          plano: planoUser,
          fotos: []
        })
      });

      if (!r.ok) throw new Error("Erro na base de dados");
      var criado = await r.json();
      var anuncioId = criado[0].id;

      var urls = [];
      if (ficheiros.length) {
        aviso("A otimizar e enviar fotos...", false);
        for (var i = 0; i < ficheiros.length; i++) {
          var fOriginal = ficheiros[i].file;
          var fComprimido = await comprimirImagem(fOriginal); 
          var caminho = usuario.id + "/" + anuncioId + "/" + i + ".jpg";

          var rUpload = await fetch(MZ.url + "/storage/v1/object/anuncios-fotos/" + caminho, {
            method: "POST",
            headers: {
              apikey: MZ.key,
              Authorization: "Bearer " + s.access_token,
              "Content-Type": "image/jpeg",
              "x-upsert": "true"
            },
            body: fComprimido
          });

          if (rUpload.ok) {
            urls.push(MZ.url + "/storage/v1/object/public/anuncios-fotos/" + caminho);
          }
        }

        await fetch(MZ.url + "/rest/v1/profissionais?id=eq." + anuncioId, {
          method: "PATCH",
          headers: cabecalhos({ "Content-Type": "application/json" }),
          body: JSON.stringify({ fotos: urls })
        });
      }

      aviso("✅ Anúncio publicado com sucesso!", false);
      
      var urlAnuncio = "https://mzlink601.github.io/mzlink/vendedor.html?id=" + usuario.id;
      var msgZap = encodeURIComponent("Olha o que encontrei no MZLINK! " + tipo + " a " + (precoFinal ? precoFinal + " MT" : "combinar") + ". Fala direto comigo: " + urlAnuncio);
      btnPartilharWa.href = "https://wa.me/?text=" + msgZap;
      btnPartilharWa.style.display = "block";
      
      document.getElementById("tipo").value = "";
      document.getElementById("descricao").value = "";
      document.getElementById("preco").value = "";
      ficheiros = [];
      renderPreview();
      atualizarContador();
      listarMeus();

    } catch (err) {
      console.error(err);
      aviso("Erro ao publicar. Tenta novamente.", true);
    }

    botao.disabled = false;
  });

  try {
    await carregarUsuario();
    await listarMeus();
  } catch (e) { window.location.href = "login.html"; }
})();
