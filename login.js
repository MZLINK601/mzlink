document.addEventListener("DOMContentLoaded", function () {
    // Variáveis do Supabase
    const SUPABASE_URL = "https://uuswtafwkgrzmzbkgnjq.supabase.co";
    const SUPABASE_KEY = "sb_publishable_vd6DmOxZuXD0cVhIJMtbfQ_-8cWtU7P";

    // Elementos HTML
    const formLogin = document.getElementById("formLogin");
    const formCodigoLogin = document.getElementById("formCodigoLogin");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const msgLogin = document.getElementById("msgLogin");
    const msgEmail = document.getElementById("msgEmail");
    const msgCodigo = document.getElementById("msgCodigo");
    
    const btnEntrarSenha = document.getElementById("btnEntrarSenha");
    const btnAtivarOtp = document.getElementById("btnAtivarOtp");
    const toggleSenha = document.getElementById("toggleSenha");

    let emailTemporario = ""; // Para o fluxo do OTP

    // --- MOSTRAR / OCULTAR PALAVRA-PASSE ---
    toggleSenha.addEventListener("click", function () {
        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            toggleSenha.textContent = "🙈";
        } else {
            passwordInput.type = "password";
            toggleSenha.textContent = "👁️";
        }
    });

    // --- LÓGICA 1: ENTRAR COM PALAVRA-PASSE ---
    formLogin.addEventListener("submit", async function (e) {
        e.preventDefault();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        btnEntrarSenha.textContent = "A entrar...";
        btnEntrarSenha.disabled = true;
        msgLogin.textContent = "";

        try {
            let res = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=password", {
                method: "POST",
                headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
                body: JSON.stringify({ email: email, password: password })
            });

            let data = await res.json();

            if (res.ok) {
                guardarSessao(data);
                msgLogin.style.color = "green";
                msgLogin.textContent = "Login efetuado! A redirecionar...";
                setTimeout(() => window.location.href = "index.html", 1000);
            } else {
                msgLogin.style.color = "red";
                // Se a senha estiver errada ou a conta não existir
                msgLogin.textContent = "E-mail ou palavra-passe incorretos.";
            }

        } catch (error) {
            console.error(error);
            msgLogin.style.color = "red";
            msgLogin.textContent = "Erro de rede. Tenta novamente.";
        } finally {
            btnEntrarSenha.textContent = "Entrar";
            btnEntrarSenha.disabled = false;
        }
    });

    // --- LÓGICA 2: ATIVAR FLUXO DE CÓDIGO (OTP) ---
    btnAtivarOtp.addEventListener("click", async function () {
        const email = emailInput.value.trim();
        if (!email) {
            msgLogin.style.color = "red";
            msgLogin.textContent = "Insere o teu e-mail primeiro para receber o código.";
            return;
        }

        btnAtivarOtp.textContent = "A enviar código...";
        btnAtivarOtp.disabled = true;
        
        try {
            let res = await fetch(SUPABASE_URL + "/auth/v1/otp", {
                method: "POST",
                headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
                body: JSON.stringify({ email: email, create_user: false }) // create_user false: só entra se já tiver conta
            });

            if (res.ok) {
                emailTemporario = email;
                // Esconde o formulário de senha e mostra o do código
                formLogin.style.display = "none";
                document.querySelector(".divisor-ou").style.display = "none";
                btnAtivarOtp.style.display = "none";
                formCodigoLogin.style.display = "block";
                
                msgEmail.style.color = "green";
                msgEmail.textContent = "Código enviado! Verifica o teu e-mail.";
            } else {
                const data = await res.json();
                msgLogin.style.color = "red";
                msgLogin.textContent = data.msg || "Erro ao enviar o código. Verifica se a conta existe.";
            }
        } catch (err) {
            msgLogin.style.color = "red";
            msgLogin.textContent = "Erro de rede.";
        } finally {
            btnAtivarOtp.textContent = "Receber Código por E-mail";
            btnAtivarOtp.disabled = false;
        }
    });

    // --- LÓGICA 3: VALIDAR O CÓDIGO (OTP) ---
    formCodigoLogin.addEventListener("submit", async function (e) {
        e.preventDefault();
        const codigo = document.getElementById("codigo").value.trim();
        const btnValidarOtp = document.getElementById("btnValidarOtp");

        btnValidarOtp.textContent = "A validar...";
        btnValidarOtp.disabled = true;

        try {
            let res = await fetch(SUPABASE_URL + "/auth/v1/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
                body: JSON.stringify({ type: "email", email: emailTemporario, token: codigo })
            });

            const data = await res.json();

            if (res.ok) {
                guardarSessao(data);
                msgCodigo.style.color = "green";
                msgCodigo.textContent = "Código válido! A redirecionar...";
                setTimeout(() => window.location.href = "index.html", 1000);
            } else {
                msgCodigo.style.color = "red";
                msgCodigo.textContent = "Código inválido ou expirado. Tenta novamente.";
            }
        } catch (err) {
            msgCodigo.style.color = "red";
            msgCodigo.textContent = "Erro ao validar o código.";
        } finally {
            btnValidarOtp.textContent = "Validar Código e Entrar";
            btnValidarOtp.disabled = false;
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
