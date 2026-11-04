/* ============================================================
   MZLINK · Publicar e Editar Anúncio
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
  var ficheiros = []; // Guarda { file: File, url: string }
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

  // ===== MÁGICA: MOSTRAR/ESCONDER ESTADO =====
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

    // Conta apenas os anúncios (ignora a loja)
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

  // ===== LISTAR OS MEUS ANÚNCIOS E BOTÃO EDITAR =====
  var cacheMeusAnuncios = [];

  async function listarMeus() {
    lista.textContent = "";
    var r = await fetch(MZ.url + "/rest/v1/profissionais?select=*&user_id=eq." + encodeURIComponent(usuario.id) + "&categoria=neq.loja&order=criado_em.desc", { headers: cabecalhos({}) });

    if (!r.ok) { lista.textContent = "Erro ao carregar."; return; }

    var itens = await r.json();
    cacheMeusAnuncios = itens;

    if (itens.length === 0) { lista.innerHTML = "<p>Ainda não tens anúncios.</p>"; return; }

    itens.forEach(function (item) {
      var linha = document.createElement("div");
      linha.className = "meu-item";
      var nFotos = (item.fotos && item.fotos.length) || 0;
      var precoTxt = item.preco ? "💰 " + item.preco + " MT" : "A combinar";
      var estadoTxt = item.estado && item.estado !== "Serviço" ? " | " + item.estado : "";
      
      linha.innerHTML = `
        <div>
            <strong>${item.tipo}</strong><br>
            <small style="color:#667085;">${precoTxt}${estadoTxt} | 📸 ${nFotos}</small>
        </div>
        <div style="display:flex; gap:5px;">
            <button type="button" onclick="window.prepararEdicao('${item.id}')" style="background:#eff6ff; color:#1E40AF; border:1px solid #bfdbfe; padding:5px 10px; border-radius:6px; font-weight:bold; cursor:pointer;">✏️ Editar</button>
            <button type="button" onclick="window.apagarAnuncio('${item.id}')" style="background:#fee2e2; color:#E31937; border:none; padding:5px 10px; border-radius:6px; font-weight:bold; cursor:pointer;">Apagar</button>
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

  // ===== PREPARAR EDIÇÃO =====
  window.prepararEdicao = function(id) {
      var item = cacheMeusAnuncios.find(a => a.id === id);
      if (!item) return;

      idAnuncioEmEdicao = id;
      
      document.getElementById("tipo").value = item.tipo || "";
      document.getElementById("descricao").value = item.descricao || "";
      document.getElementById("local").value = item.local || "";
      document.getElementById("categoria").value = item.categoria || "";
      document.getElementById("whatsapp").value = String(item.whatsapp).replace(/^258/, "");
      
      // Preço
      if (item.preco) {
          inputPreco.value = item.preco;
          precoCombinar.checked = false;
          inputPreco.disabled = false;
      } else {
          inputPreco.value = "";
          precoCombinar.checked = true;
          inputPreco.disabled = true;
      }

      // Estado
      selectCategoria.dispatchEvent(new Event('change'));
      if (item.estado && item.estado !== "Serviço") {
          selectEstado.value = item.estado;
      }

      // Fotos (carrega as URLs antigas para a preview)
      ficheiros = [];
      if (item.fotos && item.fotos.length > 0) {
          item.fotos.forEach(url => {
              ficheiros.push({ file: null, url: url }); // file null = foto que já está no servidor
          });
      }
      renderPreview();
      atualizarContador();

      // Muda o visual do formulário
      tituloFormulario.textContent = "✏️ Editar Anúncio";
      botao.textContent = "💾 Guardar Alterações";
      btnCancelarEdicao.style.display = "block";
      btnPartilharWa.style.display = "none";
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

  /* ---------- Submeter (Criar ou Editar) ---------- */
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
          // É EDIÇÃO (PATCH)
          var r = await fetch(MZ.url + "/rest/v1/profissionais?id=eq." + idAnuncioEmEdicao, {
            method: "PATCH",
            headers: cabecalhos({ "Content-Type": "application/json" }),
            body: JSON.stringify(dadosAnuncio)
          });
          if (!r.ok) throw new Error("Erro ao editar");
      } else {
          // É NOVO (POST)
          dadosAnuncio.user_id = usuario.id;
          dadosAnuncio.plano = planoUser;
          dadosAnuncio.fotos = [];

          var r = await fetch(MZ.url + "/rest/v1/profissionais", {
            method: "POST",
            headers: cabecalhos({ "Content-Type": "application/json", Prefer: "return=representation" }),
            body: JSON.stringify(dadosAnuncio)
          });
          if (!r.ok) throw new Error("Erro na base de dados");
          var criado = await r.json();
          anuncioId = criado[0].id;
      }

      // UPLOAD DE FOTOS (Mantém as antigas e sobe as novas)
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
              urlsFinais.push(ficheiros[i].url); // Já estava no servidor
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
          var urlAnuncio = "https://mzlink601.github.io/mzlink/vendedor.html?id=" + usuario.id;
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
