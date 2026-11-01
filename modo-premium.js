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

    var header = document.querySelector('header');
    if (!header) return;
    if (document.querySelector('.premium-banner')) return;

    // CSS INJETADO PARA O BANNER BRILHANTE
    var style = document.createElement('style');
    style.innerHTML = `
      .premium-banner {
        background: linear-gradient(135deg, #111111 0%, #222222 100%);
        border: 2px solid #d4af37;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(212, 175, 55, 0.2);
        display: flex; flex-wrap: wrap; align-items: center;
        padding: 15px 20px; margin: 15px; gap: 15px;
        position: relative; overflow: hidden;
      }
      .premium-banner::before {
        content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
        background: linear-gradient(to right, transparent, rgba(255,255,255,0.15), transparent);
        transform: skewX(-25deg); animation: brilhoBanner 4s infinite;
      }
      @keyframes brilhoBanner { 100% { left: 200%; } }
      
      .premium-banner .coroa { font-size: 2rem; filter: drop-shadow(0 0 5px rgba(212,175,55,0.5)); }
      .premium-banner .texto { flex: 1; color: #fff; font-size: 0.9rem; line-height: 1.4; z-index: 2; }
      .premium-banner .texto strong { 
        background: linear-gradient(135deg, #f5d76e, #d4af37);
        -webkit-background-clip: text; background-clip: text; color: transparent;
        font-size: 1.1rem;
      }
      .premium-banner .data-validade { color: #a0a0a0; font-size: 0.75rem; display: block; margin-top: 4px; }
      .premium-banner .link-premium {
        background: linear-gradient(135deg, #f5d76e, #d4af37); color: #000;
        text-decoration: none; padding: 8px 16px; border-radius: 8px;
        font-weight: 800; font-size: 0.8rem; z-index: 2; transition: 0.3s;
      }
      .premium-banner .link-premium:hover { transform: scale(1.05); box-shadow: 0 5px 15px rgba(212,175,55,0.4); }
    `;
    document.head.appendChild(style);

    var banner = document.createElement('div');
    banner.className = 'premium-banner';
    
    var textoData = dataExpiracao 
      ? `<span class="data-validade">Válido até: ${dataExpiracao}</span>` : '';

    banner.innerHTML = `
      <span class="coroa">👑</span>
      <div class="texto">
        Bem-vindo, <strong>${nomeUser || 'Premium'}</strong>!<br>
        Estás no <strong>MODO PREMIUM</strong>. ${textoData}
      </div>
      <a href="premium.html" class="link-premium">Ver Vantagens</a>
    `;

    header.insertAdjacentElement('afterend', banner);
  }

  async function iniciar() {
    if (typeof MZ === 'undefined' || !MZ.sessaoValida) return;

    var sessao = lerSessao();
    if (!sessao || !sessao.access_token) return;

    try {
      var rUser = await fetch(MZ.url + '/auth/v1/user', {
        headers: {
          apikey: MZ.key,
          Authorization: 'Bearer ' + sessao.access_token
        }
      });
      if (!rUser.ok) return;
      var user = await rUser.json();

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
          var nomePerfil = (lista && lista[0]) ? lista[0].nome : null;
          var nome = nomePerfil || sessao.name || (user.user_metadata && user.user_metadata.name) || user.email.split('@')[0] || "Premium";
          
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
