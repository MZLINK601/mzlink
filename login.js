/* ============================================================
   MZLINK · Login via Código (OTP)
   ============================================================ */

(function () {
  'use strict';

  var SUPABASE_URL = "https://uuswtafwkgrzmzbkgnjq.supabase.co";
  var SUPABASE_KEY = "sb_publishable_vd6DmOxZuXD0cVhIJMtbfQ_-8cWtU7P";

  var formEmail = document.getElementById("formEmailLogin");
  var formCodigo = document.getElementById("formCodigoLogin");
  var btnEnviar = document.getElementById("btnEnviarCodigoLogin");
  var btnEntrar = document.getElementById("btnEntrar");
  var msgEmail = document.getElementById("msgEmail");
  var msgCodigo = document.getElementById("msgCodigo");
  var emailGuardado = "";

  // PASSO 1: Pedir o código
  formEmail.addEventListener("submit", async function (e) {
    e.preventDefault();
    var email = document.getElementById("email").value.trim();
    
    btnEnviar.disabled = true;
    btnEnviar.textContent = "A enviar...";
    msgEmail.textContent = "";

    try {
      var r = await fetch(SUPABASE_URL + "/auth/v1/otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY
        },
        body: JSON.stringify({
          email: email,
          create_user: false // No login, não cria conta nova, apenas tenta entrar
        })
      });

      if (r.ok) {
        emailGuardado = email;
        formEmail.style.display = "none";
        formCodigo.style.display = "block";
        msgCodigo.style.color = "green";
        msgCodigo.textContent = "✅ Código enviado! Verifica o teu email.";
      } else {
        var erro = await r.json();
        msgEmail.textContent = "Erro: " + (erro.msg || "Este email não está registado.");
        btnEnviar.disabled = false;
        btnEnviar.textContent = "Receber Código de Acesso";
      }
    } catch (err) {
      msgEmail.textContent = "Erro de ligação à internet.";
      btnEnviar.disabled = false;
      btnEnviar.textContent = "Receber Código de Acesso";
    }
  });

  // PASSO 2: Validar o código e entrar
  formCodigo.addEventListener("submit", async function (e) {
    e.preventDefault();
    var codigo = document.getElementById("codigo").value.trim();
    
    btnEntrar.disabled = true;
    btnEntrar.textContent = "A validar...";
    msgCodigo.textContent = "";

    try {
      var r = await fetch(SUPABASE_URL + "/auth/v1/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY
        },
        body: JSON.stringify({
          type: "email",
          email: emailGuardado,
          token: codigo
        })
      });

      if (r.ok) {
        var dados = await r.json();
        
        // Guardar a sessão no navegador
        try {
          localStorage.setItem("mzlink_sessao", JSON.stringify({
            access_token: dados.access_token,
            refresh_token: dados.refresh_token,
            expires_at: dados.expires_at,
            name: dados.user.user_metadata?.name || dados.user.email.split('@')[0],
            email: dados.user.email
          }));
        } catch (e) {}

        msgCodigo.style.color = "green";
        msgCodigo.textContent = "✅ Sucesso! A entrar...";
        
        setTimeout(function () {
          window.location.href = "index.html";
        }, 1000);

      } else {
        msgCodigo.textContent = "❌ Código inválido ou expirado. Tenta de novo.";
        btnEntrar.disabled = false;
        btnEntrar.textContent = "Entrar";
      }
    } catch (err) {
      msgCodigo.textContent = "Erro de ligação à internet.";
      btnEntrar.disabled = false;
      btnEntrar.textContent = "Entrar";
    }
  });

})();
