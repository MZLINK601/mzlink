document.getElementById("registerForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  // Ligacao ao Supabase (chave publica)
  const SUPABASE_URL = "https://uuswtafwkgrzmzbkgnjq.supabase.co";
  const SUPABASE_KEY = "sb_publishable_vd6DmOxZuXD0cVhIJMtbfQ_-8cWtU7P";

  const accountType = document.getElementById("accountType").value;
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.replace(/\s/g, "");
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const message = document.getElementById("message");
  const button = document.querySelector("#registerForm button[type='submit']");

  function erro(texto) {
    message.textContent = texto;
    message.className = "error";
  }

  if (password.length < 6) {
    erro("A palavra-passe deve ter pelo menos 6 caracteres.");
    return;
  }

  if (password !== confirmPassword) {
    erro("As palavras-passe não coincidem.");
    return;
  }

  if (!/^(8[2-7])\d{7}$/.test(phone)) {
    erro("Digite um número válido de Moçambique (ex: 841234567).");
    return;
  }

  button.disabled = true;
  message.className = "";
  message.textContent = "A criar a conta...";

  try {
    const resposta = await fetch(SUPABASE_URL + "/auth/v1/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY
      },
      body: JSON.stringify({
        email: email,
        password: password,
        data: {
          nome: name,
          tipo_conta: accountType,
          whatsapp: "258" + phone
        }
      })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      const texto = String(dados.msg || dados.error_description || dados.message || "");

      if (texto.toLowerCase().includes("already")) {
        erro("Este email já tem conta. Vá a Entrar.");
      } else if (texto.toLowerCase().includes("rate limit")) {
        erro("Muitas tentativas. Espere alguns minutos e tente de novo.");
      } else {
        erro("Não foi possível criar a conta. " + texto);
      }
      button.disabled = false;
      return;
    }

    message.className = "";
    message.textContent = "Conta criada! Verifique o seu email para confirmar e depois entre.";
    document.getElementById("registerForm").reset();
  } catch (err) {
    erro("Sem ligação à internet. Verifique e tente de novo.");
  }

  button.disabled = false;
});
