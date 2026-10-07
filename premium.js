
var PAGAMENTO_CONFIG = {
  mpesa:    { numero: "852337913", nome: "AMÓS ELDIO" },
  emola:    { numero: "879608566", nome: "CELESTE" },
  whatsapp: "258879608566",
  preco:    "500 MT / mês",
  plano:    "Premium MZLINK"
};

(function () {
  'use strict';

  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }

  function limparNumero(n) {
    return String(n).replace(/\D/g, '').replace(/^258/, '');
  }

  function formatarNumero(n) {
    var limpo = limparNumero(n);
    return limpo.replace(/^(\d{2})(\d{3})(\d{4})$/, '$1 $2 $3');
  }

  function copiarTexto(texto) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(texto).then(function () {
        return true;
      }).catch(function () {
        return copiaAntiga(texto);
      });
    }
    return Promise.resolve(copiaAntiga(texto));
  }

  function copiaAntiga(texto) {
    try {
      var ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      return false;
    }
  }

  function feedbackBotao(botao, sucesso) {
    var original = botao.getAttribute('data-original') || botao.innerHTML;
    botao.setAttribute('data-original', original);
    botao.classList.add(sucesso ? 'copiado-sucesso' : 'copiado-erro');
    botao.innerHTML = sucesso ? '✅ Copiado!' : '❌ Falhou';
    setTimeout(function () {
      botao.innerHTML = original;
      botao.classList.remove('copiado-sucesso', 'copiado-erro');
    }, 1800);
  }

  function preencher() {
    var elNumMpesa = $('#numMpesa');
    var elNomeMpesa = $('#nomeMpesa');
    if (elNumMpesa) elNumMpesa.textContent = formatarNumero(PAGAMENTO_CONFIG.mpesa.numero);
    if (elNomeMpesa) elNomeMpesa.textContent = 'Nome: ' + PAGAMENTO_CONFIG.mpesa.nome;

    var elNumEmola = $('#numEmola');
    var elNomeEmola = $('#nomeEmola');
    if (elNumEmola) elNumEmola.textContent = formatarNumero(PAGAMENTO_CONFIG.emola.numero);
    if (elNomeEmola) elNomeEmola.textContent = 'Nome: ' + PAGAMENTO_CONFIG.emola.nome;

    var elPreco = $('#preco');
    if (elPreco) {
      elPreco.textContent = PAGAMENTO_CONFIG.preco || 'Sob consulta';
    }

    var btnWa = $('#btnWa');
    if (btnWa) {
      var ref = 'MZ-' + Date.now().toString(36).toUpperCase();
      var msg = 'Olá! Quero ativar a conta ' + PAGAMENTO_CONFIG.plano + ' no MZLINK.\n\n' +
                'Referência: ' + ref + '\n' +
                'Plano: ' + PAGAMENTO_CONFIG.plano + '\n' +
                'Email da minha conta: \n' +
                'Nome do anúncio: \n\n' +
                'Vou enviar o comprovativo em seguida. Obrigado!';
      btnWa.href = 'https://wa.me/' + PAGAMENTO_CONFIG.whatsapp + '?text=' + encodeURIComponent(msg);
    }
  }

  function ativarCopias() {
    $$('[data-copiar]').forEach(function (botao) {
      botao.addEventListener('click', function () {
        var id = botao.getAttribute('data-copiar');
        var numero = '';

        if (id === 'numMpesa') numero = limparNumero(PAGAMENTO_CONFIG.mpesa.numero);
        else if (id === 'numEmola') numero = limparNumero(PAGAMENTO_CONFIG.emola.numero);
        else numero = botao.textContent.trim();

        copiarTexto(numero).then(function (ok) {
          feedbackBotao(botao, ok);
        });
      });
    });
  }

  function init() {
    preencher();
    ativarCopias();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
