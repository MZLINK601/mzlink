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

  function ativarModoPremium(nomeUser, dataExpiracao) {
    if (document.body.classList.contains('premium-mode')) return;

    document.body.classList.add('premium-mode');

    // Inserir banner depois do header
    var header = document.querySelector('header');
    if (!header) return;

    if (document.querySelector('.premium-banner')) return;

    var textoData = dataExpiracao 
      ? '<br><span style="font-size:0.8em; opacity:0.85;">Válido até: <strong>' + dataExpiracao + '</strong></span>' 
      : '';

    var banner = document.createElement('div');
    banner.className = 'premium-banner';
    banner.innerHTML =
      '<span class="coroa">👑</span>' +
      '<div class="texto">' +
        'Bem-vindo, <strong>' + (nomeUser || 'Premium') + '</strong>!<br>' +
        'Estás no <strong>MODO PREMIUM</strong> — aproveita o destaque.' + textoData +
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

      // 2. Verificar o plano na tabela (AGORA BUSCA O NOME TAMBÉM)
      var rPlano = await fetch(
        MZ.url + '/rest/v1/profissionais?select=nome,plano,premium_ate&user_id=eq.' +
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
        var premiumAte = (lista && lista[0]) ? lista[0].premium_ate : null;
        
        if (plano === 'premium') {
          // 3. PUXA O NOME DA BASE DE DADOS (lista[0].nome)
          var nomePerfil = (lista && lista[0]) ? lista[0].nome : null;
          
          // Se não houver nome no perfil, tenta na sessão, depois no login, e por fim "Premium"
          var nome = nomePerfil || sessao.name || (user.user_metadata && user.user_metadata.name) || user.email.split('@')[0] || "Premium";
          
          // Formatar a data
          var dataFormatada = "";
          if (premiumAte) {
            var d = new Date(premiumAte);
            var dia = String(d.getDate()).padStart(2, '0');
            var mes = String(d.getMonth() + 1).padStart(2, '0');
            var ano = d.getFullYear();
            dataFormatada = dia + '/' + mes + '/' + ano;
          }
          
          ativarModoPremium(nome, dataFormatada);
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
