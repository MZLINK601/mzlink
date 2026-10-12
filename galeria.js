/* ============================================================
   MZLINK · Galeria de Fotos 📸
   Modal para ver todas as fotos do anúncio
   ============================================================ */

(function () {
  'use strict';

  let overlayEl = null;
  let fotosAtuais = [];
  let indiceAtual = 0;

  function criarGaleria() {
    if (document.getElementById("galeriaOverlay")) return;

    overlayEl = document.createElement("div");
    overlayEl.className = "galeria-overlay";
    overlayEl.id = "galeriaOverlay";

    overlayEl.innerHTML =
      '<div class="galeria-modal">' +
        '<button class="galeria-fechar" id="galeriaFechar" aria-label="Fechar">×</button>' +
        '<div class="galeria-titulo" id="galeriaTitulo">—</div>' +
        '<div class="galeria-conteudo">' +
          '<button class="galeria-nav galeria-prev" id="galeriaPrev" aria-label="Anterior">‹</button>' +
          '<div class="galeria-imagem-wrap">' +
            '<img id="galeriaImagem" src="" alt="">' +
          '</div>' +
          '<button class="galeria-nav galeria-next" id="galeriaNext" aria-label="Próxima">›</button>' +
        '</div>' +
        '<div class="galeria-rodape">' +
          '<div class="galeria-contador" id="galeriaContador">1 / 1</div>' +
          '<div class="galeria-miniaturas" id="galeriaMiniaturas"></div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlayEl);

    document.getElementById("galeriaFechar").onclick = fechar;
    overlayEl.addEventListener("click", function (e) {
      if (e.target === overlayEl) fechar();
    });

    document.getElementById("galeriaPrev").onclick = function (e) {
      e.stopPropagation();
      anterior();
    };
    document.getElementById("galeriaNext").onclick = function (e) {
      e.stopPropagation();
      proxima();
    };

    document.addEventListener("keydown", function (e) {
      if (!overlayEl.classList.contains("visivel")) return;
      if (e.key === "Escape") fechar();
      if (e.key === "ArrowLeft") anterior();
      if (e.key === "ArrowRight") proxima();
    });
  }

  function mostrarFoto() {
    const img = document.getElementById("galeriaImagem");
    img.src = fotosAtuais[indiceAtual];
    document.getElementById("galeriaContador").textContent =
      (indiceAtual + 1) + " / " + fotosAtuais.length;

    const minis = document.getElementById("galeriaMiniaturas");
    minis.innerHTML = "";
    fotosAtuais.forEach(function (url, i) {
      const m = document.createElement("img");
      m.src = url;
      m.className = i === indiceAtual ? "mini ativa" : "mini";
      m.onclick = function (e) {
        e.stopPropagation();
        indiceAtual = i;
        mostrarFoto();
      };
      minis.appendChild(m);
    });

    const prev = document.getElementById("galeriaPrev");
    const next = document.getElementById("galeriaNext");
    const total = fotosAtuais.length;
    prev.style.display = total > 1 ? "grid" : "none";
    next.style.display = total > 1 ? "grid" : "none";
  }

  function proxima() {
    if (fotosAtuais.length < 2) return;
    indiceAtual = (indiceAtual + 1) % fotosAtuais.length;
    mostrarFoto();
  }

  function anterior() {
    if (fotosAtuais.length < 2) return;
    indiceAtual = (indiceAtual - 1 + fotosAtuais.length) % fotosAtuais.length;
    mostrarFoto();
  }

  function abrir(fotos, nome) {
    if (!fotos || !fotos.length) return;
    criarGaleria();

    fotosAtuais = fotos;
    indiceAtual = 0;

    document.getElementById("galeriaTitulo").textContent = nome || "Fotos";

    mostrarFoto();
    overlayEl.classList.add("visivel");
    document.body.style.overflow = "hidden";
  }

  function fechar() {
    if (!overlayEl) return;
    overlayEl.classList.remove("visivel");
    document.body.style.overflow = "";
  }

  window.MZGaleria = {
    abrir: abrir,
    fechar: fechar
  };
})();
