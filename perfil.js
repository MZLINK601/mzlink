// perfil.js — MZLINK: página "Meu Perfil"
// Ajuste CHAVES_USUARIO se o seu sessao.js guarda o utilizador com outro nome.
(function () {
  'use strict';

  var CHAVES_USUARIO = ['usuario', 'user', 'mzlink_user', 'utilizador'];
  var conteudo = document.getElementById('conteudo');

  function lerUsuario() {
    for (var i = 0; i < CHAVES_USUARIO.length; i++) {
      try {
        var bruto = localStorage.getItem(CHAVES_USUARIO[i]);
        if (bruto) {
          var u = JSON.parse(bruto);
          if (u && typeof u === 'object') return { chave: CHAVES_USUARIO[i], dados: u };
        }
      } catch (e) { /* ignora e tenta a próxima chave */ }
    }
    return null;
  }

  function guardarUsuario(sessao) {
    try {
      localStorage.setItem(sessao.chave, JSON.stringify(sessao.dados));
      return true;
    } catch (e) {
      return false;
    }
  }

  function esc(texto) {
    var d = document.createElement('div');
    d.textContent = texto == null ? '' : String(texto);
    return d.innerHTML;
  }

  function ehPremium(u) {
    return u.premium === true || u.plano === 'premium';
  }

  function mostrarAviso(tipo, msg) {
    var el = document.getElementById('aviso');
    if (!el) return;
    el.className = 'aviso visivel ' + tipo;
    el.textContent = msg;
    setTimeout(function () { el.className = 'aviso'; }, 3000);
  }

  function campo(rotulo, valor, opcoes) {
    opcoes = opcoes || {};
    var vazio = !valor;
    var texto = vazio ? 'Não definido' : valor;
    var classe = 'valor' + (opcoes.bloqueado || vazio ? ' bloqueado' : '');
    var botao = opcoes.chave
      ? '<button class="btn-editar" data-editar="' + opcoes.chave + '" data-rotulo="' + esc(rotulo) + '">Editar</button>'
      : '';
    return (
      '<div class="campo">' +
        '<div class="campo-info">' +
          '<label>' + esc(rotulo) + '</label>' +
          '<div class="' + classe + '">' + esc(texto) + '</div>' +
        '</div>' + botao +
      '</div>'
    );
  }

  function desenhar(sessao) {
    var u = sessao.dados;
    var nome = u.nome || u.name || 'Utilizador';
    var premium = ehPremium(u);
    var inicial = nome.trim().charAt(0).toUpperCase() || '?';

    conteudo.innerHTML =
      '<section class="hero">' +
        '<div class="avatar-grande' + (premium ? ' premium' : '') + '">' + esc(inicial) + '</div>' +
        '<h1>' + esc(nome) + '</h1>' +
        '<div class="email">' + esc(u.email || '') + '</div>' +
        '<span class="plano-badge ' + (premium ? 'premium' : 'basico') + '">' +
          (premium ? '⭐ PREMIUM' : 'PLANO BÁSICO') +
        '</span>' +
      '</section>' +

      '<section class="card">' +
        '<h2>Dados pessoais</h2>' +
        campo('Nome', nome, { chave: 'nome' }) +
        campo('Email', u.email, { bloqueado: true }) +
        campo('Telefone', u.telefone, { chave: 'telefone' }) +
        campo('Cidade', u.cidade, { chave: 'cidade' }) +
      '</section>' +

      '<section class="card">' +
        '<h2>Conta</h2>' +
        (premium
          ? ''
          : '<a class="btn-acao principal" href="premium.html">⭐ Passar a Premium</a>') +
        '<button class="btn-acao sair" id="btnSair">Terminar sessão</button>' +
        '<div class="aviso" id="aviso"></div>' +
      '</section>' +

      '<a class="btn-voltar" href="index.html">← Voltar ao início</a>';

    ligarEventos(sessao);
  }

  function ligarEventos(sessao) {
    var botoes = conteudo.querySelectorAll('[data-editar]');
    Array.prototype.forEach.call(botoes, function (b) {
      b.addEventListener('click', function () {
        var chave = b.getAttribute('data-editar');
        var rotulo = b.getAttribute('data-rotulo');
        var atual = sessao.dados[chave] || '';
        var novo = window.prompt('Novo valor para ' + rotulo + ':', atual);
        if (novo === null) return;
        novo = novo.trim();
        if (chave === 'nome' && !novo) {
          mostrarAviso('erro', 'O nome não pode ficar vazio.');
          return;
        }
        sessao.dados[chave] = novo;
        if (guardarUsuario(sessao)) {
          desenhar(sessao);
          mostrarAviso('ok', 'Dados atualizados.');
        } else {
          mostrarAviso('erro', 'Não foi possível guardar.');
        }
      });
    });

    var sair = document.getElementById('btnSair');
    if (sair) {
      sair.addEventListener('click', function () {
        try { localStorage.removeItem(sessao.chave); } catch (e) {}
        location.href = 'index.html';
      });
    }
  }

  var sessao = lerUsuario();
  if (!sessao) {
    location.replace('login.html');
    return;
  }
  desenhar(sessao);
})();
