document.addEventListener("DOMContentLoaded", function () {
    // Variáveis do Supabase (usa as tuas globais se existirem, senão usa estas)
    const SUPABASE_URL = "https://uuswtafwkgrzmzbkgnjq.supabase.co";
    const SUPABASE_KEY = "sb_publishable_vd6DmOxZuXD0cVhIJMtbfQ_-8cWtU7P";

    // Elementos do HTML
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

    let emailTemporario = ""; // Guarda o email para o passo do OTP

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

    // --- LÓGICA 1: ENTRAR / CRIAR CONTA COM PALAVRA-PASSE ---
    formPrincipal.addEventListener("submit", async function (e) {
        e.preventDefault();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (password.length < 6) {
            msgPrincipal.style.color = "red";
            msgPrincipal.textContent = "A palavra-passe deve ter pelo menos 6 caracteres.";
            return;
        }

        btnAcao.textContent = "A processar...";
        btnAcao.disabled = true;
        msgPrincipal.textContent = "";

        try {
            // 1. Tenta fazer login com a password
            let res = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=password", {
                method: "POST",
                headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
                body: JSON.stringify({ email: email, password: password })
            });

            let data = await res.json();

            if (res.ok) {
                // Login com sucesso!
                guardarSessao(data);
                msgPrincipal.style.color = "green";
                msgPrincipal.textContent = "Login efetuado! A redirecionar...";
                setTimeout(() => window.location.href = "index.html", 1000);
                return;
            }

            // 2. Se falhou o login, pode ser um utilizador novo. Vamos tentar criar a conta.
            if (data.error_description === "Invalid login credentials" || data.error === "invalid_grant") {
                let resSignUp = await fetch(SUPABASE_URL + "/auth/v1/signup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
                    body: JSON.stringify({ email: email, password: password })
                });

                let dataSignUp = await resSignUp.json();

                if (resSignUp.ok) {
                    // Conta criada! (Pode requerer confirmação de email dependendo das configs do Supabase)
                    if (dataSignUp.session) {
                        // Se o Supabase estiver configurado para não confirmar email, entra logo
                        guardarSessao(dataSignUp);
                        msgPrincipal.style.color = "green";
                        msgPrincipal.textContent = "Conta criada! A redirecionar...";
                        setTimeout(() => window.location.href = "index.html", 1000);
                    } else {
                        msgPrincipal.style.color = "#f59e0b";
                        msgPrincipal.textContent = "Conta criada! Verifica o teu e-mail para confirmar o registo.";
                    }
                } else {
                    msgPrincipal.style.color = "red";
                    msgPrincipal.textContent = dataSignUp.msg || dataSignUp.error_description || "Erro ao criar conta.";
                }
            } else {
                msgPrincipal.style.color = "red";
                msgPrincipal.textContent = data.error_description || "Erro ao entrar.";
            }

        } catch (error) {
            console.error(error);
            msgPrincipal.style.color = "red";
            msgPrincipal.textContent = "Erro de rede. Tenta novamente.";
        } finally {
            btnAcao.textContent = "Entrar / Criar Conta";
            btnAcao.disabled = false;
        }
    });

    // --- LÓGICA 2: RECEBER CÓDIGO OTP (MAGIC LINK) ---
    btnPedirCodigo.addEventListener("click", async function () {
        const email = emailInput.value.trim();
        if (!email) {
            msgPrincipal.style.color = "red";
            msgPrincipal.textContent = "Insere o teu e-mail primeiro para receber o código.";
            return;
        }

        btnPedirCodigo.textContent = "A enviar código...";
        btnPedirCodigo.disabled = true;
        msgEmail.textContent = "";
        
        try {
            let res = await fetch(SUPABASE_URL + "/auth/v1/otp", {
                method: "POST",
                headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
                body: JSON.stringify({ email: email, create_user: true })
            });

            if (res.ok) {
                emailTemporario = email;
                formPrincipal.style.display = "none";
                document.querySelector(".divisor-ou").style.display = "none";
                btnPedirCodigo.style.display = "none";
                formCodigo.style.display = "block";
                msgEmail.style.color = "green";
                msgEmail.textContent = "Código enviado! Verifica o teu e-mail.";
            } else {
                const data = await res.json();
                msgPrincipal.style.color = "red";
                msgPrincipal.textContent = data.msg || "Erro ao enviar o código.";
            }
        } catch (err) {
            msgPrincipal.style.color = "red";
            msgPrincipal.textContent = "Erro de rede.";
        } finally {
            btnPedirCodigo.textContent = "Receber Código por E-mail";
            btnPedirCodigo.disabled = false;
        }
    });

    // --- LÓGICA 3: VALIDAR O CÓDIGO OTP ---
    formCodigo.addEventListener("submit", async function (e) {
        e.preventDefault();
        const codigo = document.getElementById("codigo").value.trim();
        const btnEntrarOtp = document.getElementById("btnEntrarOtp");

        btnEntrarOtp.textContent = "A validar...";
        btnEntrarOtp.disabled = true;

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
            btnEntrarOtp.textContent = "Validar Código e Entrar";
            btnEntrarOtp.disabled = false;
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
