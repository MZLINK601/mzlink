/* ============================================================
   MZLINK · Sistema de Avaliações ⭐
   Modal dourado + envio para Supabase
   ============================================================ */

(function () {
  'use strict';

  const SUPABASE_URL = "https://uuswtafwkgrzmzbkgnjq.supabase.co";
  const SUPABASE_KEY = "sb_publishable_vd6DmOxZuXD0cVhIJMtbfQ_-8cWtU7P";

  let modalEl = null;
  let overlayEl = null;
  let notaSelecionada = 0;
  let anuncioAtualId = null;
  let anuncioAtualNome = "";

  /* ---------- Criar modal no DOM ---------- */
  function criarModal() {
    if (document.getElementById("avaliacaoOverlay")) return;

    overlayEl = document.createElement("div");
    overlayEl.className = "avaliacao-modal-overlay";
    overlayEl.id = "avaliacaoOverlay";

    overlayEl.innerHTML =
      '<div class="avaliacao-modal" role="dialog" aria-modal="true">' +
        '<button class="fechar" id="avaliacaoFechar" aria-label="Fechar">×</button>' +
        '<h3>⭐ Avaliar Profissional</h3>' +
        '<p class="sub">Como foi a tua experiência com<br><strong id="avaliacaoNomeAnuncio">—</strong>?</p>' +

        '<div class="estrelas-select" id="estrelasSelect">' +
          '<span class="estrela" data-nota="1">★</span>' +
          '<span class="estrela" data-nota="2">★</span>' +
          '<span class="estrela" data-nota="3">★</span>' +
          '<span class="estrela" data-nota="4">★</span>' +
          '<span class="estrela" data-nota="5">★</span>' +
        '</div>' +
        '<div class="avaliacao-nota-texto" id="notaTexto"></div>' +

        '<label for="comentarioAvaliacao">Comentário (opcional)</label>' +
        '<textarea id="comentarioAvaliacao" placeholder="Conta como foi o serviço..." maxlength="300"></textarea>' +

        '<div class="acoes">' +
          '<button class="btn-cancelar" id="avaliacaoCancelar">Cancelar</button>' +
          '<button class="btn-enviar" id="avaliacaoEnviar" disabled>Enviar Avaliação</button>' +
        '</div>' +

        '<div class="avaliacao-msg" id="avaliacaoMsg"></div>' +
      '</div>';

    document.body.appendChild(overlayEl);
    modalEl = overlayEl.querySelector(".avaliacao-modal");

    // Fechar ao clicar fora
    overlayEl.addEventListener("click", function (e) {
      if (e.target === overlayEl) fechar();
    });

    // Fechar botão X
    document.getElementById("avaliacaoFechar").onclick = fechar;
    document.getElementById("avaliacaoCancelar").onclick = fechar;

    // Fechar com ESC
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlayEl.classList.contains("visivel")) fechar();
    });

    // Estrelas
    const estrelas = overlayEl.querySelectorAll(".estrela");
    estrelas.forEach(function (estrela) {
      // Hover
      estrela.addEventListener("mouseenter", function () {
        const n = Number(estrela.getAttribute("data-nota"));
        estrelas.forEach(function (e2) {
          e2.classList.toggle("hover", Number(e2.getAttribute("data-nota")) <= n);
        });
      });

      // Sair do hover
      estrela.addEventListener("mouseleave", function () {
        estrelas.forEach(function (e2) { e2.classList.remove("hover"); });
      });

      // Clicar
      estrela.addEventListener("click", function () {
        notaSelecionada = Number(estrela.getAttribute("data-nota"));
        estrelas.forEach(function (e2) {
          e2.classList.toggle("ativa", Number(e2.getAttribute("data-nota")) <= notaSelecionada);
        });
        atualizarTextoNota();
        verificarPodeEnviar();
      });
    });

    // Enviar
    document.getElementById("avaliacaoEnviar").onclick = enviarAvaliacao;
  }

  /* ---------- Texto da nota ---------- */
  function atualizarTextoNota() {
    const textos = {
      1: "😞 Muito mau",
      2: "😐 Mau",
      3: "🙂 Razoável",
      4: "😊 Bom",
      5: "🤩 Excelente!"
    };
    document.getElementById("notaTexto").textContent = textos[notaSelecionada] || "";
  }

  /* ---------- Habilitar botão enviar ---------- */
  function verificarPodeEnviar() {
    const btn = document.getElementById("avaliacaoEnviar");
    btn.disabled = notaSelecionada < 1;
  }

  /* ---------- Abrir modal ---------- */
  async function abrir(anuncioId, anuncioNome) {
    criarModal();

    // Reset estado
    notaSelecionada = 0;
    anuncioAtualId = anuncioId;
    anuncioAtualNome = anuncioNome || "este profissional";

    document.getElementById("avaliacaoNomeAnuncio").textContent = anuncioAtualNome;
    document.getElementById("notaTexto").textContent = "";
    document.getElementById("comentarioAvaliacao").value = "";
    document.getElementById("avaliacaoMsg").textContent = "";
    document.getElementById("avaliacaoMsg").className = "avaliacao-msg";
    document.getElementById("avaliacaoEnviar").disabled = true;

    overlayEl.querySelectorAll(".estrela").forEach(function (e) {
      e.classList.remove("ativa", "hover");
    });

    overlayEl.classList.add("visivel");
    document.body.style.overflow = "hidden";
  }

  /* ---------- Fechar modal ---------- */
  function fechar() {
    if (!overlayEl) return;
    overlayEl.classList.remove("visivel");
    document.body.style.overflow = "";
  }

  /* ---------- Enviar avaliação ---------- */
  async function enviarAvaliacao() {
    if (notaSelecionada < 1) return;

    const btn = document.getElementById("avaliacaoEnviar");
    const msg = document.getElementById("avaliacaoMsg");
    btn.disabled = true;
    btn.textContent = "A enviar...";
    msg.textContent = "";
    msg.className = "avaliacao-msg";

    try {
      if (typeof MZ === "undefined" || !MZ.sessaoValida) {
        throw new Error("Sessão inválida");
      }

      const sessao = await MZ.sessaoValida();
      if (!sessao || !sessao.access_token) {
        throw new Error("Precisas de estar logado para avaliar.");
      }

      // Buscar user
      const rUser = await fetch(SUPABASE_URL + "/auth/v1/user", {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: "Bearer " + sessao.access_token
        }
      });
      if (!rUser.ok) throw new Error("Sessão expirada");
      const user = await rUser.json();

      const comentario = document.getElementById("comentarioAvaliacao").value.trim();

      // Enviar para Supabase
      const r = await fetch(SUPABASE_URL + "/rest/v1/avaliacoes", {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: "Bearer " + sessao.access_token,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify({
          anuncio_id: anuncioAtualId,
          user_id: user.id,
          nota: notaSelecionada,
          comentario: comentario || null
        })
      });

      if (r.status === 409) {
        throw new Error("Já avaliaste este profissional.");
      }
      if (!r.ok) {
        throw new Error("Não foi possível enviar. Tenta de novo.");
      }

      msg.textContent = "✅ Avaliação enviada! Obrigado.";
      msg.className = "avaliacao-msg ok";

      // Recarregar a página após 2 segundos para atualizar a média
      setTimeout(function () {
        fechar();
        window.location.reload();
      }, 1800);

    } catch (err) {
      msg.textContent = "❌ " + (err.message || "Erro desconhecido");
      msg.className = "avaliacao-msg erro";
      btn.disabled = false;
      btn.textContent = "Enviar Avaliação";
    }
  }

  /* ---------- API pública ---------- */
  window.MZAvaliacao = {
    abrir: abrir,
    fechar: fechar
  };

})();
