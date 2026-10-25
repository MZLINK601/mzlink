/* ============================================================
   MZLINK · Verificador de Expiração Premium
   ============================================================ */

(function () {
  'use strict';

  var CHAVE = "mzlink_sessao";

  function lerSessao() {
    try { return JSON.parse(localStorage.getItem(CHAVE)); }
    catch (e) { return null; }
  }

  async function verificar() {
    if (typeof MZ === "undefined" || !MZ.sessaoValida) return;

    var sessao = lerSessao();
    if (!sessao || !sessao.access_token) return;

    try {
      // 1. Buscar o ID do utilizador
      var rUser = await fetch(MZ.url + "/auth/v1/user", {
        headers: {
          apikey: MZ.key,
          Authorization: "Bearer " + sessao.access_token
        }
      });
      if (!rUser.ok) return;
      var user = await rUser.json();

      // 2. Buscar os anúncios deste utilizador
      var r = await fetch(
        MZ.url + "/rest/v1/profissionais?select=id,plano,premium_ate&user_id=eq." + encodeURIComponent(user.id),
        { headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token } }
      );
      
      if (!r.ok) return;
      var lista = await r.json();

      var agora = new Date().getTime();
      var expirados = [];

      // 3. Verificar quem expirou
      lista.forEach(function (a) {
        if (a.plano === "premium" && a.premium_ate) {
          var ate = new Date(a.premium_ate).getTime();
          if (ate < agora) {
            expirados.push(a.id);
          }
        }
      });

      if (expirados.length === 0) return;

      // 4. Voltar para básico e remover a data
      for (var i = 0; i < expirados.length; i++) {
        await fetch(MZ.url + "/rest/v1/profissionais?id=eq." + expirados[i], {
          method: "PATCH",
          headers: {
            apikey: MZ.key,
            Authorization: "Bearer " + sessao.access_token,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ plano: "basico", premium_ate: null })
        });
      }

      // 5. Mostrar o aviso vermelho
      mostrarAviso();

    } catch (e) {
      console.warn("Erro verificar premium:", e);
    }
  }

  function mostrarAviso() {
    if (document.getElementById("avisoExpirado")) return;

    var div = document.createElement("div");
    div.id = "avisoExpirado";
    div.style.cssText =
      "position:fixed;top:0;left:0;right:0;background:linear-gradient(135deg,#dc2626,#b91c1c);" +
      "color:#fff;padding:16px;text-align:center;font-weight:800;font-size:0.9rem;z-index:99999;" +
      "box-shadow:0 4px 20px rgba(0,0,0,0.3);font-family:inherit;line-height:1.5;";
      
    div.innerHTML =
      "⚠️ A tua conta Premium <strong>expirou</strong>!<br>" +
      "<span style='font-weight:600;font-size:0.82rem;'>Voltaste ao plano Básico. Renova por 99 MT/mês para voltar ao Premium.</span><br>" +
      "<a href='premium.html' style='display:inline-block;margin-top:10px;padding:10px 20px;background:#fff;color:#dc2626;border-radius:8px;text-decoration:none;font-weight:900;font-size:0.85rem;'>👑 Renovar Agora</a>" +
      "<button onclick='this.parentElement.remove()' style='position:absolute;top:8px;right:12px;background:transparent;border:none;color:#fff;font-size:1.5rem;cursor:pointer;font-weight:900;'>&times;</button>";

    document.body.appendChild(div);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", verificar);
  } else {
    verificar();
  }

})();
