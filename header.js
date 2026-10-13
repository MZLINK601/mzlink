/* ============================================================
   MZLINK · Header dinâmico
   Mostra o nome do user e muda botões conforme login
   ============================================================ */

(function () {
  'use strict';

  async function atualizarHeader() {
    var nomeEl = document.getElementById("nomeUserTopo");
    var nav = document.querySelector("header nav");
    var botaoPremium = document.querySelector(".btn-premium");

    if (!nav) return;

    // Verificar sessão
    if (typeof MZ === "undefined" || !MZ.sessaoValida) return;

    var sessao = await MZ.sessaoValida();

    if (sessao && sessao.access_token) {
      // ✅ USER LOGADO
      if (nomeEl) {
        nomeEl.textContent = sessao.nome || "Utilizador";
      }

      // Substituir botões Entrar/Criar conta por Publicar/Sair
      var navHTML =
        '<button onclick="location.href=\'premium.html\'" class="btn-premium">⭐ Premium</button>' +
        '<button onclick="location.href=\'publicar.html\'">Publicar anúncio</button>' +
        '<button id="btnSairHeader">Sair</button>';

      nav.innerHTML = navHTML;

      // Ligar botão Sair
      var btnSair = document.getElementById("btnSairHeader");
      if (btnSair) {
        btnSair.onclick = function () {
          if (typeof MZ.sair === "function") MZ.sair();
        };
      }
    } else {
      // ❌ USER NÃO LOGADO
      if (nomeEl) {
        nomeEl.textContent = "...";
      }
      // Já está com botões "Entrar" e "Criar conta" no HTML
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", atualizarHeader);
  } else {
    atualizarHeader();
  }
})();
