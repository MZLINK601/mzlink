/* ============================================================
   MZLINK · Header Dinâmico (Focado em Conversão)
   ============================================================ */

(function () {
  'use strict';

  var CHAVE = "mzlink_sessao";

  // ===== INJETAR CSS DO NOVO HEADER =====
  var style = document.createElement('style');
  style.innerHTML = `
    /* Container do Header */
    header {
      background: #ffffff;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      border-bottom: 2px solid #d4af37;
      padding: 12px 15px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    /* Topo (Logo e Saudação) */
    .header-topo {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo-header img {
      height: 36px;
    }
    
    .saudacao {
      font-size: 0.9rem;
      font-weight: 600;
      color: #667085;
      background: #f8f9fb;
      padding: 6px 12px;
      border-radius: 20px;
      border: 1px solid #eef1f5;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .saudacao span:first-child {
      color: #1E40AF;
      font-weight: 900;
    }

    /* Navegação (Botões) */
    header nav {
      display: flex;
      gap: 8px;
      overflow-x: auto; 
      padding-bottom: 4px;
      scrollbar-width: none; 
    }
    header nav::-webkit-scrollbar {
      display: none; 
    }

    /* Botão Premium (Dourado) */
    .btn-premium {
      background: linear-gradient(135deg, #f5d76e, #d4af37);
      color: #0f1115;
      font-weight: 800;
      font-size: 0.85rem;
      border: none;
      padding: 10px 16px;
      border-radius: 10px;
      cursor: pointer;
      white-space: nowrap;
      box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
      transition: transform 0.2s;
    }
    .btn-premium:active { transform: scale(0.95); }

    /* Botão Normal (Azul Escuro) */
    .btn-nav {
      background: #1E40AF;
      color: #ffffff;
      font-weight: 700;
      font-size: 0.85rem;
      border: none;
      padding: 10px 16px;
      border-radius: 10px;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.2s;
    }
    .btn-nav:active { background: #152c7a; }

    /* Botão Secundário (Outline - Ex: Sair) */
    .btn-outline {
      background: #ffffff;
      color: #667085;
      font-weight: 700;
      font-size: 0.85rem;
      border: 2px solid #e2e8f0;
      padding: 8px 16px;
      border-radius: 10px;
      cursor: pointer;
      white-space: nowrap;
    }
  `;
  document.head.appendChild(style);

  // ===== LÓGICA DE SESSÃO =====
  function lerSessao() {
    try { return JSON.parse(localStorage.getItem(CHAVE)); }
    catch (e) { return null; }
  }

  function sair() {
    try { localStorage.removeItem(CHAVE); } catch (e) {}
    window.location.href = "index.html";
  }

  function atualizarHeader() {
    var nomeEl = document.getElementById("nomeUserTopo");
    var nav = document.querySelector("header nav");

    if (!nav) return;

    var sessao = lerSessao();

    // ===== USER LOGADO =====
    if (sessao && sessao.access_token) {
      var nome = sessao.name || sessao.nome || sessao.email || "Utilizador";
      if(nome.length > 12) nome = nome.substring(0, 10) + "...";

      if (nomeEl) {
        nomeEl.textContent = nome;
      }

      // Aqui o utilizador já tem conta, então mostramos tudo (incluindo o Premium)
      nav.innerHTML =
        '<button onclick="location.href=\'premium.html\'" class="btn-premium">⭐ Premium</button>' +
        '<button onclick="location.href=\'publicar.html\'" class="btn-nav">📢 Publicar</button>' +
        '<button onclick="location.href=\'perfil.html\'" class="btn-nav">👤 Perfil</button>' +
        '<button id="btnSairHeader" class="btn-outline">Sair</button>';

      var btnSair = document.getElementById("btnSairHeader");
      if (btnSair) btnSair.onclick = sair;
    }
    // ===== USER NÃO LOGADO =====
    else {
      if (nomeEl) nomeEl.textContent = "...";

      // O botão Premium NÃO aparece aqui. Só aparece o Criar Conta!
      nav.innerHTML =
        '<button onclick="location.href=\'login.html\'" class="btn-nav" style="background: #1E40AF; font-weight: 900; padding: 10px 20px;">🚀 Criar Conta Grátis</button>';
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", atualizarHeader);
  } else {
    atualizarHeader();
  }
})();
