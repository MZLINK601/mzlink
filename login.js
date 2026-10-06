document.getElementById("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  // Ligacao ao Supabase (chave publica)
  const SUPABASE_URL = "https://uuswtafwkgrzmzbkgnjq.supabase.co";
  const SUPABASE_KEY = "sb_publishable_vd6DmOxZuXD0cVhIJMtbfQ_-8cWtU7P";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const message = document.getElementById("message");
  const button = document.querySelector("#loginForm button[type='submit']");

  function erro(texto) {
    message.textContent = texto;
    message.className = "error";
  }

  if (password.length < 6) {
    erro("A palavra-passe deve ter pelo menos 6 caracteres.");
    return;
  }

  button.disabled = true;
  message.className = "";
  message.textContent = "A entrar...";

  try {
    const resposta = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY
      },
      body: JSON.stringify({ email: email, password: password })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      const texto = String(dados.error_description || dados.msg || dados.message || "").toLowerCase();

      if (texto.includes("not confirmed")) {
        erro("Confirme primeiro o seu email (verifique também o spam).");
      } else if (texto.includes("invalid login")) {
        erro("Email ou palavra-passe incorretos.");
      } else if (texto.includes("rate limit")) {
        erro("Muitas tentativas. Espere alguns minutos e tente de novo.");
      } else {
        erro("Não foi possível entrar. Tente de novo.");
      }
      button.disabled = false;
      return;
    }

    // Guarda a sessao neste navegador
    try {
      localStorage.setItem("mzlink_sessao", JSON.stringify({
        access_token: dados.access_token,
        refresh_token: dados.refresh_token,
        expires_at: dados.expires_at,
        nome: dados.user && dados.user.user_metadata ? dados.user.user_metadata.nome : "",
        email: dados.user ? dados.user.email : email
      }));
    } catch (err) {
      // Se o navegador bloquear o armazenamento, o login continua a funcionar so nesta visita
    }

    message.className = "";
    message.textContent = "Bem-vindo! A abrir a página inicial...";
    setTimeout(function () {
      window.location.href = "index.html";
    }, 1000);
  } catch (err) {
    erro("Sem ligação à internet. Verifique e tente de novo.");
    button.disabled = false;
  }
});
