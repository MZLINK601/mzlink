document.addEventListener("DOMContentLoaded", function () {
    const SUPABASE_URL = "https://uuswtafwkgrzmzbkgnjq.supabase.co";
    const SUPABASE_KEY = "sb_publishable_vd6DmOxZuXD0cVhIJMtbfQ_-8cWtU7P";

    const formPrincipal = document.getElementById("formPrincipal");
    const formCodigo = document.getElementById("formCodigo");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const msgPrincipal = document.getElementById("msgPrincipal");
    const msgEmail = document.getElementById("msgEmail");
    const msgCodigo = document.getElementById("msgCodigo");
    
    const btnAcao = document.getElementById("btnAcao");
    const btnPedirCodigo = document.getElementById("btnPedirCodigo");
    const toggleSenha = document.getElementById("toggleSenha");

    let emailTemporario = "";

    // --- MOSTRAR / OCULTAR PALAVRA-PASSE ---
    if (toggleSenha) {
        toggleSenha.addEventListener("click", function () {
            if (passwordInput.type === "password") {
                passwordInput.type = "text";
                toggleSenha.textContent = "🙈";
            } else {
                passwordInput.type = "password";
                toggleSenha.textContent = "👁️";
            }
        });
    }

    // --- LÓGICA 1: RECEBER CÓDIGO OTP (O Acesso Imediato) ---
    btnPedirCodigo.addEventListener("click", async function () {
        const email = emailInput.value.trim();
        msgPrincipal.textContent = "";
        msgEmail.textContent = "";

        if (!email) {
            msgPrincipal.style.color = "red";
            msgPrincipal.textContent = "Insere o teu e-mail primeiro.";
            return;
        }

        btnPedirCodigo.textContent = "A enviar código...";
        btnPedirCodigo.disabled = true;

        try {
            // O 'create_user: true' é a magia aqui. Ele cria a conta se não existir.
            let res = await fetch(SUPABASE_URL + "/auth/v1/otp", {
                method: "POST",
                headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
                body: JSON.stringify({ email: email, create_user: true })
            });

            if (res.ok) {
                emailTemporario = email;
                // Esconde o formulário de senha e mostra o campo do código
                formPrincipal.style.display = "none";
                document.querySelector(".divisor-ou").style.display = "none";
                btnPedirCodigo.style.display = "none";
                formCodigo.style.display = "block";
                
                msgEmail.style.color = "green";
                msgEmail.textContent = "Código enviado! Verifica o teu e-mail (ou o Spam).";
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

    // --- LÓGICA 2: VALIDAR O CÓDIGO E ENTRAR ---
    formCodigo.addEventListener("submit", async function (e) {
        e.preventDefault();
        const codigo = document.getElementById("codigo").value.trim();
        const btnEntrarOtp = document.getElementById("btnEntrarOtp");

        btnEntrarOtp.textContent = "A validar...";
        btnEntrarOtp.disabled = true;
        msgCodigo.textContent = "";

        try {
            // Ao verificar o código, o Supabase confirma o e-mail e devolve a sessão!
            let res = await fetch(SUPABASE_URL + "/auth/v1/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
                body: JSON.stringify({ type: "email", email: emailTemporario, token: codigo })
            });

            const data = await res.json();

            if (res.ok) {
                guardarSessao(data);
                msgCodigo.style.color = "green";
                msgCodigo.textContent = "Código válido! A entrar...";
                setTimeout(() => window.location.href = "index.html", 800);
            } else {
                msgCodigo.style.color = "red";
                msgCodigo.textContent = "Código inválido ou expirado. Tenta novamente.";
            }
        } catch (err) {
            msgCodigo.style.color = "red";
            msgCodigo.textContent = "Erro ao validar o código.";
        } finally {
            btnEntrarOtp.textContent = "✅ Validar Código e Entrar";
            btnEntrarOtp.disabled = false;
        }
    });

    // --- LÓGICA 3: ENTRAR COM PALAVRA-PASSE (Secundário) ---
    formPrincipal.addEventListener("submit", async function (e) {
        e.preventDefault();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        btnAcao.textContent = "A entrar...";
        btnAcao.disabled = true;
        msgPrincipal.textContent = "";

        try {
            let res = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=password", {
                method: "POST",
                headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
                body: JSON.stringify({ email: email, password: password })
            });

            let data = await res.json();

            if (res.ok) {
                guardarSessao(data);
                msgPrincipal.style.color = "green";
                msgPrincipal.textContent = "Login efetuado! A redirecionar...";
                setTimeout(() => window.location.href = "index.html", 800);
            } else {
                msgPrincipal.style.color = "red";
                // Dica para o utilizador: se a senha falhar, ele deve usar o OTP!
                msgPrincipal.textContent = "Senha incorreta. Tenta usar o Código por E-mail.";
            }
        } catch (error) {
            msgPrincipal.style.color = "red";
            msgPrincipal.textContent = "Erro de rede. Tenta novamente.";
        } finally {
            btnAcao.textContent = "Entrar com Palavra-passe";
            btnAcao.disabled = false;
        }
    });

    // --- FUNÇÃO AUXILIAR: GUARDAR SESSÃO ---
    function guardarSessao(data) {
        const sessao = {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            user: data.user,
            name: data.user.user_metadata?.name || data.user.email.split('@')[0]
        };
        localStorage.setItem("mzlink_sessao", JSON.stringify(sessao));
    }
});
