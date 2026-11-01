document.addEventListener("DOMContentLoaded", function () {
    const SUPABASE_URL = "https://uuswtafwkgrzmzbkgnjq.supabase.co";
    const SUPABASE_KEY = "sb_publishable_vd6DmOxZuXD0cVhIJMtbfQ_-8cWtU7P";

    const formEmail = document.getElementById("formEmail");
    const formCodigo = document.getElementById("formCodigo");
    const emailInput = document.getElementById("email");
    const msgPrincipal = document.getElementById("msgPrincipal");
    const msgCodigo = document.getElementById("msgCodigo");
    const btnPedirCodigo = document.getElementById("btnPedirCodigo");
    const btnEntrarOtp = document.getElementById("btnEntrarOtp");

    let emailTemporario = "";

    // --- PASSO 1: ENVIAR O CÓDIGO ---
    formEmail.addEventListener("submit", async function (e) {
        e.preventDefault();
        const email = emailInput.value.trim();
        
        msgPrincipal.textContent = "";
        btnPedirCodigo.textContent = "A enviar...";
        btnPedirCodigo.disabled = true;

        try {
            // 'create_user: true' cria a conta automaticamente se não existir!
            let res = await fetch(SUPABASE_URL + "/auth/v1/otp", {
                method: "POST",
                headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
                body: JSON.stringify({ email: email, create_user: true })
            });

            if (res.ok) {
                emailTemporario = email;
                formEmail.style.display = "none";
                formCodigo.style.display = "block";
                msgCodigo.style.color = "green";
                msgCodigo.textContent = "Código enviado! Verifica o teu e-mail (ou o Spam).";
            } else {
                const data = await res.json();
                msgPrincipal.style.color = "red";
                msgPrincipal.textContent = data.msg || "Erro ao enviar o código. Tenta novamente.";
            }
        } catch (err) {
            msgPrincipal.style.color = "red";
            msgPrincipal.textContent = "Erro de rede. Verifica a tua ligação.";
        } finally {
            btnPedirCodigo.textContent = "📩 Receber Código de Acesso";
            btnPedirCodigo.disabled = false;
        }
    });

    // --- PASSO 2: VALIDAR O CÓDIGO E ENTRAR ---
    formCodigo.addEventListener("submit", async function (e) {
        e.preventDefault();
        const codigo = document.getElementById("codigo").value.trim();

        btnEntrarOtp.textContent = "A validar...";
        btnEntrarOtp.disabled = true;
        msgCodigo.textContent = "";

        try {
            let res = await fetch(SUPABASE_URL + "/auth/v1/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
                body: JSON.stringify({ type: "email", email: emailTemporario, token: codigo })
            });

            const data = await res.json();

            if (res.ok) {
                // O código está certo! A conta é confirmada e ele entra logo.
                const sessao = {
                    access_token: data.access_token,
                    refresh_token: data.refresh_token,
                    user: data.user,
                    name: data.user.email.split('@')[0]
                };
                localStorage.setItem("mzlink_sessao", JSON.stringify(sessao));
                
                msgCodigo.style.color = "green";
                msgCodigo.textContent = "Sucesso! A entrar no MZLINK...";
                setTimeout(() => window.location.href = "index.html", 800);
            } else {
                msgCodigo.style.color = "red";
                msgCodigo.textContent = "Código inválido ou expirado. Tenta novamente.";
            }
        } catch (err) {
            msgCodigo.style.color = "red";
            msgCodigo.textContent = "Erro ao validar o código.";
        } finally {
            btnEntrarOtp.textContent = "✅ Entrar na Conta";
            btnEntrarOtp.disabled = false;
        }
    });
});
