/* ============================================================
   MZLINK · Publicar e Editar Anúncio (Com Botão Vendido)
   ============================================================ */

(async function () {
  'use strict';

  var s = await MZ.sessaoValida();
  if (!s) { window.location.href = "login.html"; return; }

  var form = document.getElementById("publicarForm");
  var message = document.getElementById("message");
  var lista = document.getElementById("meusAnuncios");
  var botao = document.getElementById("btnSubmit");
  var btnCancelarEdicao = document.getElementById("btnCancelarEdicao");
  var tituloFormulario = document.getElementById("tituloFormulario");
  var btnPartilharWa = document.getElementById("btnPartilharWa");
  
  var usuario = null;
  var planoUser = "basico";
  var limiteFotos = 4;
  var totalMeusAnuncios = 0;
  var ficheiros = []; 
  var idAnuncioEmEdicao = null; 

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
  
  var selectCategoria = document.getElementById("categoria");
  var divEstado = document.getElementById("divEstado");
  var selectEstado = document.getElementById("estado");

  selectCategoria.addEventListener("change", function() {
      var cat = this.value;
      if (cat === "servicos" || cat === "profissionais" || cat === "instituicoes" || cat === "empresas" || cat === "") {
          divEstado.style.display = "none";
          selectEstado.required = false;
      } else {
          divEstado.style.display = "block";
          selectEstado.required = true;
          if (selectEstado.value !== "Novo" && selectEstado.value !== "Usado") {
              selectEstado.value = "Novo";
          }
      }
  });

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

  async function comprimirImagem(file) {
      return new Promise((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
              const img = new Image();
              img.src = event.target.result;
              img.onload = () => {
                  const canvas = document.createElement("canvas");
                  const MAX_WIDTH = 1000; 
                  let scale = MAX_WIDTH / img.width;
                  if (scale > 1) scale = 1;
                  canvas.width = img.width * scale;
                  canvas.height = img.height * scale;
                  const ctx = canvas.getContext("2d");
                  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                  canvas.toBlob((blob) => {
                      const newFile = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
                      resolve(newFile);
                  }, 'image/jpeg', 0.7); 
              };
          };
      });
  }

  async function carregarUsuario() {
    var r = await fetch(MZ.url + "/auth/v1/user", { headers: cabecalhos({}) });
    if (!r.ok) throw new Error("sessao");
    usuario = await r.json();

    var meta = usuario.user_metadata || {};
    document.getElementById("nome").value = meta.nome || "";
    document.getElementById("whatsapp").value = String(meta.whatsapp || "").replace(/^258/, "");

    var r2 = await fetch(MZ.url + "/rest/v1/profissionais?select=id,plano,categoria&user_id=eq." + encodeURIComponent(usuario.id), { headers: cabecalhos({}) });

    if (r2.ok) {
      var dados = await r2.json();
      var perfilLoja = dados.find(function(item) { return item.categoria === 'loja'; });
      planoUser = (perfilLoja && perfilLoja.plano) ? perfilLoja.plano : "basico";
      
      var anunciosReais = dados.filter(function(item) { return item.categoria !== 'loja'; });
      totalMeusAnuncios = anunciosReais.length;
    }

    limiteFotos = planoUser === "premium" ? 20 : 4;
    
    if (limiteTexto) limiteTexto.textContent = limiteFotos + " fotos";
    if (planoUser === "premium") {
        fotosInfo.innerHTML = "⭐ Plano <strong>Premium</strong>: até 20 fotos.";
    } else {
        fotosInfo.innerHTML = "🆓 Plano <strong>Básico</strong>: até 4 fotos. <a href='premium.html'>Tornar-se Premium</a>";
    }
    
    atualizarContador();
  }

  function atualizarContador() {
    contador.textContent = ficheiros.length + "/" + limiteFotos;
    if (ficheiros.length >= limiteFotos) {
      btnAddFoto.disabled = true;
      btnAddFoto.textContent = "Limite atingido";
      fotosAviso.style.display = "block"; 
    } else {
      btnAddFoto.disabled = false;
      btnAddFoto.textContent = "Adicionar foto (" + (limiteFotos - ficheiros.length) + " restantes)";
      fotosAviso.style.display = "none"; 
    }
    fotosVazio.style.display = ficheiros.length > 0 ? "none" : "block";
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
      if (ficheiros[i].url.startsWith('blob:')) {
          URL.revokeObjectURL(ficheiros[i].url);
      }
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

  async function listarMeus() {
    lista.textContent = "";
    var r = await fetch(MZ.url + "/rest/v1/profissionais?select=*&user_id=eq." + encodeURIComponent(usuario.id) + "&categoria=neq.loja&order=criado_em.desc", { headers: cabecalhos({}) });

    if (!r.ok) { lista.textContent = "Erro ao carregar."; return; }

    var itens = await r.json();

    if (itens.length === 0) { lista.innerHTML = "<p>Ainda não tens anúncios.</p>"; return; }

    itens.forEach(function (item) {
      var linha = document.createElement("div");
      linha.className = "meu-item";
      var nFotos = (item.fotos && item.fotos.length) || 0;
      var precoTxt = item.preco ? "💰 " + item.preco + " MT" : "A combinar";
      var estadoTxt = item.estado && item.estado !== "Serviço" ? " | " + item.estado : "";
      
      // Lógica do botão Vendido
      var isVendido = item.vendido === true;
      var btnVendido = isVendido 
        ? '<button type="button" onclick="window.alternarVendido(\'' + item.id + '\', true)" style="background:#fef3c7; color:#d97706; border:1px solid #fcd34d; padding:6px 10px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:0.75rem;">🔄 Disponível</button>'
        : '<button type="button" onclick="window.alternarVendido(\'' + item.id + '\', false)" style="background:#dcfce7; color:#15803d; border:1px solid #86efac; padding:6px 10px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:0.75rem;">✅ Vendido</button>';

      linha.innerHTML = `
        <div style="${isVendido ? 'opacity: 0.6;' : ''}">
            <strong>${item.tipo} ${isVendido ? '<span style="color:#d97706; font-size:0.7rem;">(VENDIDO)</span>' : ''}</strong><br>
            <small style="color:#667085;">${precoTxt}${estadoTxt} | 📸 ${nFotos}</small>
        </div>
        <div style="display:flex; gap:5px; flex-wrap: wrap; justify-content: flex-end;">
            ${btnVendido}
            <button type="button" onclick="window.prepararEdicao('${item.id}')" style="background:#eff6ff; color:#1E40AF; border:1px solid #bfdbfe; padding:6px 10px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:0.75rem;">✏️ Editar</button>
            <button type="button" onclick="window.apagarAnuncio('${item.id}')" style="background:#fee2e2; color:#E31937; border:none; padding:6px 10px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:0.75rem;">Apagar</button>
        </div>
      `;
      lista.appendChild(linha);
    });
  }

  window.apagarAnuncio = async function(id) {
      if (!confirm("Apagar este anúncio permanentemente?")) return;
      await fetch(MZ.url + "/rest/v1/profissionais?id=eq." + id, { method: "DELETE", headers: cabecalhos({}) });
      listarMeus();
  };

  // FUNÇÃO MÁGICA DO VENDIDO
  window.alternarVendido = async function(id, isVendido) {
      var msg = isVendido ? "Marcar este anúncio como Disponível novamente?" : "Marcar como Vendido? Ele desaparecerá da página inicial, mas continuará no teu perfil.";
      if (!confirm(msg)) return;

      try {
          await fetch(MZ.url + "/rest/v1/profissionais?id=eq." + id, {
              method: "PATCH",
              headers: cabecalhos({ "Content-Type": "application/json" }),
              body: JSON.stringify({ vendido: !isVendido })
          });
          listarMeus();
      } catch (e) {
          alert("Erro ao atualizar. Tenta novamente.");
      }
  };

  window.prepararEdicao = async function(id) {
      try {
          var res = await fetch(MZ.url + "/rest/v1/profissionais?id=eq." + id + "&select=*", { headers: cabecalhos({}) });
          if (!res.ok) throw new Error("Falha de rede.");
          
          var dados = await res.json();
          if (dados.length === 0) {
              alert("Erro: Este anúncio já não existe.");
              listarMeus();
              return;
          }
          
          var item = dados[0];

          idAnuncioEmEdicao = id;
          
          document.getElementById("tipo").value = item.tipo || "";
          document.getElementById("descricao").value = item.descricao || "";
          document.getElementById("local").value = item.local || "";
          document.getElementById("categoria").value = item.categoria || "";
          document.getElementById("whatsapp").value = String(item.whatsapp || "").replace(/^258/, "");
          
          if (item.preco) {
              inputPreco.value = item.preco;
              precoCombinar.checked = false;
              inputPreco.disabled = false;
          } else {
              inputPreco.value = "";
              precoCombinar.checked = true;
              inputPreco.disabled = true;
          }

          selectCategoria.dispatchEvent(new Event('change'));
          if (item.estado && item.estado !== "Serviço") {
              selectEstado.value = item.estado;
          }

          ficheiros = [];
          if (item.fotos && item.fotos.length > 0) {
              item.fotos.forEach(function(url) {
                  ficheiros.push({ file: null, url: url });
              });
          }
          renderPreview();
          atualizarContador();

          tituloFormulario.textContent = "✏️ Editar Anúncio";
          botao.textContent = "💾 Guardar Alterações";
          btnCancelarEdicao.style.display = "block";
          btnPartilharWa.style.display = "none";
          
          window.scrollTo({ top: 0, behavior: 'smooth' });
          
      } catch (erro) {
          console.error(erro);
          alert("Erro ao tentar carregar: " + erro.message);
      }
  };

  btnCancelarEdicao.addEventListener("click", function() {
      resetarFormulario();
  });

  function resetarFormulario() {
      form.reset();
      idAnuncioEmEdicao = null;
      ficheiros = [];
      renderPreview();
      atualizarContador();
      inputPreco.disabled = false;
      tituloFormulario.textContent = "Publicar anúncio";
      botao.textContent = "🚀 Publicar Anúncio";
      btnCancelarEdicao.style.display = "none";
      btnPartilharWa.style.display = "none";
      selectCategoria.dispatchEvent(new Event('change'));
      aviso("", false);
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    
    var nome = document.getElementById("nome").value.trim();
    var tipo = document.getElementById("tipo").value.trim();
    var descricao = document.getElementById("descricao").value.trim();
    var local = document.getElementById("local").value.trim();
    var categoria = selectCategoria.value;
    var telefone = document.getElementById("whatsapp").value.replace(/\s/g, "");
    
    var estado = "Serviço";
    if (categoria === "produtos" || categoria === "vendedores") {
        estado = selectEstado.value || "Novo";
    }

    var precoFinal = null;
    if (!precoCombinar.checked) {
        precoFinal = inputPreco.value ? Number(inputPreco.value) : null;
    }

    if (!nome || !tipo || !local || !categoria || !telefone || !descricao) {
      aviso("Preenche todos os campos obrigatórios.", true);
      return;
    }

    botao.disabled = true;
    aviso(idAnuncioEmEdicao ? "A guardar alterações..." : "A publicar anúncio...", false);
    
    try {
      var dadosAnuncio = {
          nome: nome,
          tipo: tipo,
          descricao: descricao,
          estado: estado,
          local: local,
          categoria: categoria,
          preco: precoFinal,
          whatsapp: "258" + telefone,
      };

      var anuncioId = idAnuncioEmEdicao;

      if (idAnuncioEmEdicao) {
          var r = await fetch(MZ.url + "/rest/v1/profissionais?id=eq." + idAnuncioEmEdicao, {
            method: "PATCH",
            headers: cabecalhos({ "Content-Type": "application/json" }),
            body: JSON.stringify(dadosAnuncio)
          });
          if (!r.ok) throw new Error("Erro ao editar");
      } else {
          dadosAnuncio.user_id = usuario.id;
          dadosAnuncio.plano = planoUser;
          dadosAnuncio.fotos = [];
          dadosAnuncio.vendido = false; // Garante que nasce como não vendido

          var r = await fetch(MZ.url + "/rest/v1/profissionais", {
            method: "POST",
            headers: cabecalhos({ "Content-Type": "application/json", Prefer: "return=representation" }),
            body: JSON.stringify(dadosAnuncio)
          });
          if (!r.ok) throw new Error("Erro na base de dados");
          var criado = await r.json();
          anuncioId = criado[0].id;
      }

      var urlsFinais = [];
      var houveNovasFotos = false;

      for (var i = 0; i < ficheiros.length; i++) {
          if (ficheiros[i].file) {
              houveNovasFotos = true;
              aviso("A enviar fotos...", false);
              var fComprimido = await comprimirImagem(ficheiros[i].file); 
              var caminho = usuario.id + "/" + anuncioId + "/" + Date.now() + "_" + i + ".jpg";

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
                urlsFinais.push(MZ.url + "/storage/v1/object/public/anuncios-fotos/" + caminho);
              }
          } else {
              urlsFinais.push(ficheiros[i].url); 
          }
      }

      if (houveNovasFotos) {
          await fetch(MZ.url + "/rest/v1/profissionais?id=eq." + anuncioId, {
            method: "PATCH",
            headers: cabecalhos({ "Content-Type": "application/json" }),
            body: JSON.stringify({ fotos: urlsFinais })
          });
      }

      aviso("✅ " + (idAnuncioEmEdicao ? "Anúncio atualizado!" : "Anúncio publicado!"), false);
      
      if (!idAnuncioEmEdicao) {
          var urlAnuncio = "https://mzlink.co.mz/vendedor.html?id=" + usuario.id;
          var msgZap = encodeURIComponent("Olha o que encontrei no MZLINK! " + tipo + " a " + (precoFinal ? precoFinal + " MT" : "combinar") + ". Fala direto comigo: " + urlAnuncio);
          btnPartilharWa.href = "https://wa.me/?text=" + msgZap;
          btnPartilharWa.style.display = "block";
      }
      
      resetarFormulario();
      listarMeus();

    } catch (err) {
      console.error(err);
      aviso("Erro ao guardar. Tenta novamente.", true);
    }

    botao.disabled = false;
  });

  try {
    await carregarUsuario();
    await listarMeus();
  } catch (e) { window.location.href = "login.html"; }
})();
