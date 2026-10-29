/* ============================================================
   MZLINK · Login via Código (OTP)
   ============================================================ */

var SUPABASE_URL_LOGIN = "https://uuswtafwkgrzmzbkgnjq.supabase.co";
var SUPABASE_KEY_LOGIN = "sb_publishable_vd6DmOxZuXD0cVhIJMtbfQ_-8cWtU7P";
var emailGuardadoLogin = "";

// Função 1: Enviar o código (chamada pelo onclick do botão)
window.enviarCodigoLogin = async function() {
  var emailInput = document.getElementById("email");
  var btnEnviar = document.getElementById("btnEnviarCodigoLogin");
  var msgEmail = document.getElementById("msgEmail");
  
  if (!emailInput.value || !emailInput.value.includes("@")) {
    msgEmail.textContent = "Por favor, escreve um email válido.";
    return;
  }

  var email = emailInput.value.trim();
  
  btnEnviar.disabled = true;
  btnEnviar.textContent = "A enviar...";
  msgEmail.textContent = "";

  try {
    var r = await fetch(SUPABASE_URL_LOGIN + "/auth/v1/otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY_LOGIN
      },
      body: JSON.stringify({
        email: email,
        create_user: false 
      })
    });

    if (r.ok) {
      emailGuardadoLogin = email;
      document.getElementById("formEmailLogin").style.display = "none";
      document.getElementById("formCodigoLogin").style.display = "block";
      
      var msgCodigo = document.getElementById("msgCodigo");
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
};

// Função 2: Validar o código
window.validarCodigoLogin = async function() {
  var codigoInput = document.getElementById("codigo");
  var btnEntrar = document.getElementById("btnEntrar");
  var msgCodigo = document.getElementById("msgCodigo");

  if (!codigoInput.value) {
    msgCodigo.textContent = "Insere o código.";
    return;
  }

  var codigo = codigoInput.value.trim();
  
  btnEntrar.disabled = true;
  btnEntrar.textContent = "A validar...";
  msgCodigo.textContent = "";

  try {
    var r = await fetch(SUPABASE_URL_LOGIN + "/auth/v1/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY_LOGIN
      },
      body: JSON.stringify({
        type: "email",
        email: emailGuardadoLogin,
        token: codigo
      })
    });

    if (r.ok) {
      var dados = await r.json();
      
      try {
        localStorage.setItem("mzlink_sessao", JSON.stringify({
          access_token: dados.access_token,
          refresh_token: dados.refresh_token,
          expires_at: dados.expires_at,
          name: (dados.user.user_metadata && dados.user.user_metadata.name) || dados.user.email.split('@')[0],
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
};
