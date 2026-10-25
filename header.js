/* ============================================================
   MZLINK · Header dinâmico
   ============================================================ */

(function () {
  'use strict';

  var CHAVE = "mzlink_sessao";

  function lerSessao() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE));
    } catch (e) {
      return null;
    }
  }

  function sair() {
    try {
      localStorage.removeItem(CHAVE);
    } catch (e) {}
    window.location.href = "index.html";
  }

  function atualizarHeader() {
    var nomeEl = document.getElementById("nomeUserTopo");
    var nav = document.querySelector("header nav");

    if (!nav) return;

    var sessao = lerSessao();

    // ===== USER LOGADO =====
    if (sessao && sessao.access_token) {
      // Usa "name" (como o login.js guarda)
      var nome = sessao.name || sessao.nome || sessao.email || "Utilizador";

      if (nomeEl) {
        nomeEl.textContent = nome;
      }

      nav.innerHTML =
        '<button onclick="location.href=\'premium.html\'" class="btn-premium">⭐ Premium</button>' +
        '<button onclick="location.href=\'publicar.html\'" class="btn-nav">📢 Publicar</button>' +
        '<button onclick="location.href=\'perfil.html\'" class="btn-nav">👤 Perfil</button>' +
        '<button id="btnSairHeader" class="btn-nav">Sair</button>';

      var btnSair = document.getElementById("btnSairHeader");
      if (btnSair) {
        btnSair.onclick = sair;
      }
    }
    // ===== USER NÃO LOGADO =====
    else {
      if (nomeEl) nomeEl.textContent = "...";

      nav.innerHTML =
        '<button onclick="location.href=\'premium.html\'" class="btn-premium">⭐ Premium</button>' +
        '<button onclick="location.href=\'login.html\'" class="btn-nav">Entrar</button>' +
        '<button onclick="location.href=\'registo.html\'" class="btn-nav">📝 Registar</button>';
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", atualizarHeader);
  } else {
    atualizarHeader();
  }
})();
