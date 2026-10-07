(function () {
  var form = document.getElementById("esqueciForm");
  var message = document.getElementById("message");
  var botao = form.querySelector("button[type='submit']");

  function aviso(texto, erro) {
    message.textContent = texto;
    message.className = erro ? "error" : "";
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    var email = document.getElementById("email").value.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      aviso("Digite um email válido.", true);
      return;
    }

    botao.disabled = true;
    aviso("A enviar...", false);

    try {
      // O link do email abre a pagina nova-senha.html (na mesma pasta do site)
      var destino = new URL("nova-senha.html", window.location.href).href;

      var r = await fetch(
        MZ.url + "/auth/v1/recover?redirect_to=" + encodeURIComponent(destino),
        {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: MZ.key },
          body: JSON.stringify({ email: email })
        }
      );

      if (r.status === 429) {
        aviso("Muitos pedidos. Espere alguns minutos e tente de novo.", true);
        setTimeout(function () { botao.disabled = false; }, 30000);
        return;
      }

      if (!r.ok) {
        aviso("Não foi possível enviar. Tente de novo.", true);
        botao.disabled = false;
        return;
      }

      // Mesma resposta exista ou nao o email (nao revela quem tem conta)
      aviso("Se este email estiver registado, enviámos um link para criar nova palavra-passe. Verifique também o spam.", false);
      setTimeout(function () { botao.disabled = false; }, 30000);
    } catch (err) {
      aviso("Sem ligação à internet. Tente de novo.", true);
      botao.disabled = false;
    }
  });
})();
