/* ============================================================
   MZLINK · Modo Premium 👑
   ============================================================ */

(function () {
  'use strict';

  var CHAVE = "mzlink_sessao";

  function lerSessao() {
    try { return JSON.parse(localStorage.getItem(CHAVE)); }
    catch (e) { return null; }
  }

  function ativarModoPremium(nomeUser) {
    if (document.body.classList.contains('premium-mode')) return;

    document.body.classList.add('premium-mode');

    // Inserir banner depois do header
    var header = document.querySelector('header');
    if (!header) return;

    if (document.querySelector('.premium-banner')) return;

    var banner = document.createElement('div');
    banner.className = 'premium-banner';
    banner.innerHTML =
      '<span class="coroa">👑</span>' +
      '<div class="texto">' +
        'Bem-vindo, <strong>' + (nomeUser || 'Premium') + '</strong>!<br>' +
        'Estás no <strong>MODO PREMIUM</strong> — aproveita o destaque.' +
      '</div>' +
      '<a href="premium.html" class="link-premium">Ver vantagens</a>';

    header.insertAdjacentElement('afterend', banner);
  }

  async function iniciar() {
    if (typeof MZ === 'undefined' || !MZ.sessaoValida) return;

    var sessao = lerSessao();
    if (!sessao || !sessao.access_token) return;

    try {
      // 1. Ir buscar o ID do user
      var rUser = await fetch(MZ.url + '/auth/v1/user', {
        headers: {
          apikey: MZ.key,
          Authorization: 'Bearer ' + sessao.access_token
        }
      });
      if (!rUser.ok) return;
      var user = await rUser.json();

      // 2. Verificar o plano na tabela
      var rPlano = await fetch(
        MZ.url + '/rest/v1/profissionais?select=plano&user_id=eq.' +
        encodeURIComponent(user.id) + '&limit=1',
        {
          headers: {
            apikey: MZ.key,
            Authorization: 'Bearer ' + sessao.access_token
          }
        }
      );

      if (rPlano.ok) {
        var lista = await rPlano.json();
        var plano = (lista && lista[0] && lista[0].plano) || 'basico';
        
        if (plano === 'premium') {
          // 3. AQUI ESTÁ A CORREÇÃO: Usar o nome da sessão em vez do anúncio
          var nome = sessao.name || user.user_metadata?.name || user.email.split('@')[0] || "Premium";
          
          ativarModoPremium(nome);
        }
      }
    } catch (e) {
      console.warn("Erro no modo premium:", e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
