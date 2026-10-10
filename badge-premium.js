/* ============================================================
   MZLINK · Badge Premium 👑
   Mostra o badge dourado em qualquer elemento com:
   <span data-badge-premium></span>
   ============================================================ */

(function () {
  'use strict';

  var CSS_BADGE = ''
    + '.badge-premium {'
    + '  display: inline-flex;'
    + '  align-items: center;'
    + '  gap: 4px;'
    + '  padding: 3px 10px;'
    + '  background: linear-gradient(135deg, rgb(212,175,55), rgb(245,215,110));'
    + '  color: rgb(26,26,26);'
    + '  font-size: .72rem;'
    + '  font-weight: 900;'
    + '  letter-spacing: .8px;'
    + '  text-transform: uppercase;'
    + '  border-radius: 999px;'
    + '  box-shadow: 0 3px 12px rgba(212,175,55,.4);'
    + '  vertical-align: middle;'
    + '  margin-left: 6px;'
    + '  white-space: nowrap;'
    + '  line-height: 1;'
    + '}'
    + '.badge-premium::before {'
    + '  content: "👑";'
    + '  font-size: .85rem;'
    + '  margin-right: 2px;'
    + '}';

  var cssInjetado = false;

  function injetarCSS() {
    if (cssInjetado) return;
    var style = document.createElement('style');
    style.textContent = CSS_BADGE;
    document.head.appendChild(style);
    cssInjetado = true;
  }

  function limparBadges() {
    var elementos = document.querySelectorAll('[data-badge-premium]');
    elementos.forEach(function (el) { el.innerHTML = ''; });
  }

  function aplicarBadges() {
    injetarCSS();

    var elementos = document.querySelectorAll('[data-badge-premium]');
    if (!elementos.length) return;

    // Verificar se há MZ
    if (typeof MZ === 'undefined' || !MZ.sessaoValida) {
      limparBadges();
      return;
    }

    MZ.sessaoValida().then(function (sessao) {
      if (!sessao || !sessao.access_token) {
        limparBadges();
        return;
      }

      // Passo 1: ir buscar o user (id + email) via /auth/v1/user
      return fetch(MZ.url + '/auth/v1/user', {
        headers: {
          apikey: MZ.key,
          Authorization: 'Bearer ' + sessao.access_token
        }
      })
      .then(function (r) {
        if (!r.ok) throw new Error('Sessão inválida');
        return r.json();
      })
      .then(function (user) {
        // Passo 2: procurar o plano deste user na tabela profissionais
        return fetch(
          MZ.url + '/rest/v1/profissionais?select=plano&user_id=eq.' +
          encodeURIComponent(user.id) +
          '&limit=1',
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
          var ehPremium = plano === 'premium';

          elementos.forEach(function (el) {
            if (ehPremium) {
              el.innerHTML = '<span class="badge-premium">Premium</span>';
            } else {
              el.innerHTML = '';
            }
          });
        });
      });
    })
    .catch(function (erro) {
      console.warn('Badge Premium:', erro);
      limparBadges();
    });
  }

  // Iniciar quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', aplicarBadges);
  } else {
    aplicarBadges();
  }

  // Expor função para outras páginas que precisem reaplicar
  window.MZBadge = { aplicar: aplicarBadges };

})();
