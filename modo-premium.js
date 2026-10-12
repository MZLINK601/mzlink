/* ============================================================
   MZLINK · Modo Premium 👑
   Ativa o visual VIP para utilizadores Premium
   ============================================================ */

(function () {
  'use strict';

  function ativarModoPremium(nomeUser) {
    if (document.body.classList.contains('premium-mode')) return;

    document.body.classList.add('premium-mode');

    // Inserir banner depois do header
    var header = document.querySelector('header');
    if (!header) return;

    // Evitar duplicar
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

  function iniciar() {
    if (typeof MZ === 'undefined' || !MZ.sessaoValida) return;

    MZ.sessaoValida().then(function (sessao) {
      if (!sessao || !sessao.access_token) return;

      // Buscar user
      return fetch(MZ.url + '/auth/v1/user', {
        headers: {
          apikey: MZ.key,
          Authorization: 'Bearer ' + sessao.access_token
        }
      })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (user) {
        if (!user) return;

        // Verificar plano na tabela profissionais
        return fetch(
          MZ.url + '/rest/v1/profissionais?select=plano&user_id=eq.' +
          encodeURIComponent(user.id) + '&limit=1',
          {
            headers: {
              apikey: MZ.key,
              Authorization: 'Bearer ' + sessao.access_token
            }
          }
        )
        .then(function (r) { return r.json(); })
        .then(function (lista) {
          var plano = (lista && lista[0] && lista[0].plano) || 'basico';
          if (plano === 'premium') {
            var nome = (user.user_metadata && user.user_metadata.nome) ||
                       user.email.split('@')[0];
            ativarModoPremium(nome);
          }
        });
      });
    }).catch(function () {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
